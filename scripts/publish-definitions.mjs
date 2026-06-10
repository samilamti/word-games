// Publish public/definitions/ (346 MB, 6 locales) to the Cloudflare R2 bucket
// behind VITE_DEFS_CDN_BASE — finishes Option B delivery
// (docs/definitions-delivery-decision.md). Dictionaries stay on GitHub Pages.
//
// Dry-run by default; --confirm uploads. Idempotent: admin ops tolerate
// "already exists", and the bulk sync is rclone --checksum (re-runs no-op).
//
//   npm run data:publish                 # dry-run: admin plan + file diff
//   npm run data:publish -- --confirm    # create/configure bucket + upload
//   npm run data:publish -- --verify     # probe the public URL only
//
// One-time setup (dashboard-only — minting R2 tokens has no API):
//   1. dash.cloudflare.com → R2 → enable R2 on the account (free tier 10 GB)
//   2. R2 → Manage R2 API Tokens → Create API Token, "Admin Read & Write".
//      The creation screen shows FOUR values; copy them into .env.local:
//        R2_ACCOUNT_ID=…           (account id — also on the R2 overview URL)
//        CLOUDFLARE_API_TOKEN=…    (Token Value → bucket/dev-url/CORS via REST)
//        R2_ACCESS_KEY_ID=…        (S3 Access Key ID → rclone bulk sync)
//        R2_SECRET_ACCESS_KEY=…    (S3 Secret Access Key)
//   3. rerun with --confirm. The script prints the VITE_DEFS_CDN_BASE line to
//      add to .env.local when done.
//
// Host note: the public r2.dev "dev url" is rate-limited by Cloudflare — fine
// for launch traffic (each bucket file is ~15 KB gzipped, cached on-device
// after first read), upgrade to a custom domain on the bucket later without
// re-uploading anything.

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';

const SRC_DIR = 'public/definitions';
const BUCKET = process.env.R2_BUCKET || 'lexica-defs';
const ACCOUNT = process.env.R2_ACCOUNT_ID || '';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const S3_KEY = process.env.R2_ACCESS_KEY_ID || '';
const S3_SECRET = process.env.R2_SECRET_ACCESS_KEY || '';

const argv = process.argv.slice(2);
const CONFIRM = argv.includes('--confirm');
const VERIFY_ONLY = argv.includes('--verify');

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function missingCreds() {
  const missing = [];
  if (!ACCOUNT) missing.push('R2_ACCOUNT_ID');
  if (!API_TOKEN) missing.push('CLOUDFLARE_API_TOKEN');
  if (!S3_KEY) missing.push('R2_ACCESS_KEY_ID');
  if (!S3_SECRET) missing.push('R2_SECRET_ACCESS_KEY');
  return missing;
}

// ─── Cloudflare R2 admin (REST — no prompts, unlike `wrangler r2 dev-url`) ───

async function cf(method, path, body) {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}${path}`, {
    method,
    headers: {
      authorization: `Bearer ${API_TOKEN}`,
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({ success: false, errors: [{ message: `HTTP ${res.status} (non-JSON)` }] }));
  return { status: res.status, ...json };
}

async function ensureBucket() {
  const r = await cf('POST', '/r2/buckets', { name: BUCKET });
  if (r.success) return console.log(`✓ bucket "${BUCKET}" created`);
  const msg = r.errors?.[0]?.message || '';
  if (r.status === 409 || /already exists/i.test(msg)) return console.log(`✓ bucket "${BUCKET}" exists`);
  fail(`bucket create failed: ${msg}`);
}

async function ensureDevUrl() {
  const get = await cf('GET', `/r2/buckets/${BUCKET}/domains/managed`);
  if (get.success && get.result?.enabled && get.result?.domain) {
    console.log(`✓ public dev-url enabled: https://${get.result.domain}`);
    return `https://${get.result.domain}`;
  }
  const put = await cf('PUT', `/r2/buckets/${BUCKET}/domains/managed`, { enabled: true });
  if (!put.success || !put.result?.domain) fail(`enable dev-url failed: ${put.errors?.[0]?.message}`);
  console.log(`✓ public dev-url enabled: https://${put.result.domain}`);
  return `https://${put.result.domain}`;
}

async function ensureCors() {
  // Public read-only data; the app fetches from capacitor://localhost (iOS) and
  // http(s)://localhost (Android/web), so origins must be wildcard.
  const rules = [{ allowed: { methods: ['GET', 'HEAD'], origins: ['*'] }, maxAgeSeconds: 86400 }];
  const r = await cf('PUT', `/r2/buckets/${BUCKET}/cors`, { rules });
  if (!r.success) fail(`set CORS failed: ${r.errors?.[0]?.message}`);
  console.log('✓ CORS: GET/HEAD from any origin');
}

// ─── Bulk sync (rclone, S3 API; creds via env so nothing lands on disk) ──────

function rcloneSync({ dryRun }) {
  const args = [
    'sync', SRC_DIR, `:s3:${BUCKET}/definitions`,
    '--checksum', '--fast-list', '--transfers', '16',
    '--s3-no-check-bucket', // bucket existence handled via REST above
    '--stats-one-line', '--stats', '15s', '-v',
  ];
  if (dryRun) args.push('--dry-run');
  const r = spawnSync('rclone', args, {
    stdio: 'inherit',
    env: {
      ...process.env,
      RCLONE_S3_PROVIDER: 'Cloudflare',
      RCLONE_S3_ENDPOINT: `https://${ACCOUNT}.r2.cloudflarestorage.com`,
      RCLONE_S3_ACCESS_KEY_ID: S3_KEY,
      RCLONE_S3_SECRET_ACCESS_KEY: S3_SECRET,
    },
  });
  if (r.status !== 0) fail(`rclone sync exited ${r.status}`);
}

// ─── Post-publish verification through the PUBLIC url (what the app sees) ────

async function verify(base) {
  const firstLocale = readdirSync(SRC_DIR, { withFileTypes: true }).find(d => d.isDirectory())?.name;
  const firstBucket = firstLocale && readdirSync(`${SRC_DIR}/${firstLocale}`).find(f => f.endsWith('.json'));
  const probes = ['definitions/manifest.json'];
  if (firstLocale && firstBucket) probes.push(`definitions/${firstLocale}/${firstBucket}`);

  let ok = true;
  for (const p of probes) {
    const res = await fetch(`${base}/${p}`, { headers: { origin: 'capacitor://localhost' } });
    const ct = res.headers.get('content-type') || '';
    const cors = res.headers.get('access-control-allow-origin') || '';
    // DefinitionService's guard requires a JSON content-type; CORS '*' for WKWebView.
    const pass = res.ok && ct.includes('application/json') && cors === '*';
    console.log(`${pass ? '✓' : '✗'} ${p} → ${res.status}, content-type=${ct || '∅'}, allow-origin=${cors || '∅'}`);
    ok &&= pass;
  }
  return ok;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

if (!existsSync(SRC_DIR)) fail(`${SRC_DIR}/ not found — definitions are durable-local (see data-pipeline-plan.md)`);
try {
  execFileSync('rclone', ['version'], { stdio: 'ignore' });
} catch {
  fail('rclone not found — brew install rclone');
}

const missing = missingCreds();
if (missing.length) {
  console.log('Missing credentials in .env.local:\n  ' + missing.join('\n  '));
  console.log('\nMint them (≈2 min, dashboard-only): dash.cloudflare.com → R2 →');
  console.log('Manage R2 API Tokens → Create API Token (Admin Read & Write),');
  console.log('then copy all four values shown on the creation screen. See the');
  console.log('header of this script for the exact variable names.');
  process.exit(CONFIRM || VERIFY_ONLY ? 1 : 0);
}

if (VERIFY_ONLY) {
  const base = await ensureDevUrl();
  process.exit((await verify(base)) ? 0 : 1);
}

console.log(`${CONFIRM ? 'PUBLISH' : 'DRY-RUN'}: ${SRC_DIR} → r2:${BUCKET}/definitions (account ${ACCOUNT.slice(0, 6)}…)`);
await ensureBucket();
const base = await ensureDevUrl();
await ensureCors();
rcloneSync({ dryRun: !CONFIRM });

if (CONFIRM) {
  const ok = await verify(base);
  if (!ok) fail('verification failed — see probes above');
  console.log(`\nDone. Add to .env.local (and CI env if any):\n  VITE_DEFS_CDN_BASE=${base}`);
  console.log('Then rebuild the apps so the base is inlined (npm run ios:build / android:build).');
} else {
  console.log(`\nDry-run only. Re-run with --confirm to upload. Public base will be: ${base}`);
}
