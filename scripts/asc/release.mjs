// Lexica Knights → TestFlight release pipeline (build → archive → export → upload).
//
// Dry-run by default; pass --confirm to actually build + upload (matches the
// repo convention in submit-for-review.mjs and the dry-run-first preference).
//
//   node --env-file=.env.local scripts/asc/release.mjs                  # dry-run: show the plan
//   node --env-file=.env.local scripts/asc/release.mjs --confirm        # ship the next build
//   node --env-file=.env.local scripts/asc/release.mjs --status         # just query build states
//   node --env-file=.env.local scripts/asc/release.mjs --confirm --whats-new "…"
//
// Staged mode — the full chain can outrun a 600s foreground timeout, and the
// worst place to be killed is mid-upload (the .ipa is shipped but the release
// note never lands). Each stage is independently re-runnable:
//
//   … --confirm --no-upload      # 1. build + archive + export, stop before altool
//   … --confirm --upload-only    # 2. altool upload of the exported .ipa
//   … --confirm --finalize       # 3. poll ASC + set the What-to-Test note
//
// Stages 2 and 3 read the build number back from the on-disk archive, so it
// cannot drift from what was actually built (asking ASC again would return the
// NEXT free number once the upload has registered).
//
// Or via npm: `npm run ios:release` (dry-run) / `npm run ios:release -- --confirm`.
//
// Why this exists: builds 1–9 were cut by hand with no committed script, so each
// release meant reverse-engineering xcodebuild/altool from build/ios/*.log.
//
// Key choices (see memory: lexica-knights-testflight-release):
//  • The next build number comes from App Store Connect (the real source of truth) —
//    NOT a hardcoded value or CLAUDE.md (Apple rejects duplicate build numbers).
//  • It's applied as an xcodebuild CLI override (CURRENT_PROJECT_VERSION=N), so the
//    committed pbxproj stays at 1 and per-release bumps are never committed.
//  • Capacitor 8 = SPM, so we archive the .xcodeproj (there is no .xcworkspace).
//  • The ExportOptions.plist is generated here (the build/ copy is gitignored).

import { execSync } from 'node:child_process';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { asc } from './lib.mjs';

const APP_ID = '6765603467'; // Lexica Knights — stable ASC resource id (see CLAUDE.md)
const ARCHIVE_PATH = 'build/ios/App.xcarchive';
const EXPORT_DIR = 'build/ios/export';
const EXPORT_PLIST = 'build/ios/ExportOptions.plist';
const IPA_PATH = `${EXPORT_DIR}/App.ipa`;

const argv = process.argv.slice(2);
const CONFIRM = argv.includes('--confirm');
const STATUS_ONLY = argv.includes('--status');
const NO_UPLOAD = argv.includes('--no-upload');
const UPLOAD_ONLY = argv.includes('--upload-only');
const FINALIZE = argv.includes('--finalize');
const wnIdx = argv.indexOf('--whats-new');
const WHATS_NEW = wnIdx >= 0 ? argv[wnIdx + 1] : null;

function reqEnv(name) {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env ${name} — set it in .env.local and run via: node --env-file=.env.local scripts/asc/release.mjs`);
  }
  return v;
}

async function recentBuilds(limit = 6) {
  const r = await asc(
    'GET',
    `/v1/builds?filter[app]=${APP_ID}&fields[builds]=version,processingState,uploadedDate,expired&sort=-uploadedDate&limit=${limit}`,
  );
  return r.data;
}

function nextBuildNumber(builds) {
  const nums = builds.map(b => parseInt(b.attributes.version, 10)).filter(n => Number.isFinite(n));
  return (nums.length ? Math.max(...nums) : 0) + 1;
}

function sh(label, cmd, logFile) {
  console.log(`\n▶ ${label}`);
  console.log(`  $ ${cmd}${logFile ? ` > ${logFile} 2>&1` : ''}`);
  try {
    execSync(logFile ? `${cmd} > ${logFile} 2>&1` : cmd, { stdio: 'inherit', shell: '/bin/bash' });
  } catch {
    if (logFile && existsSync(logFile)) {
      const lines = readFileSync(logFile, 'utf8').trimEnd().split('\n');
      console.error(`  ✗ failed — last lines of ${logFile}:`);
      console.error('  ' + lines.slice(-20).join('\n  '));
    }
    throw new Error(`${label} failed`);
  }
}

function writeExportOptions(teamId) {
  mkdirSync('build/ios', { recursive: true });
  writeFileSync(
    EXPORT_PLIST,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key><string>app-store-connect</string>
    <key>teamID</key><string>${teamId}</string>
    <key>uploadSymbols</key><true/>
    <key>signingStyle</key><string>automatic</string>
    <key>destination</key><string>export</string>
    <key>stripSwiftSymbols</key><true/>
</dict>
</plist>
`,
  );
}

function archiveBuildNumber() {
  const out = execSync(
    `/usr/libexec/PlistBuddy -c "Print :ApplicationProperties:CFBundleVersion" "${ARCHIVE_PATH}/Info.plist"`,
    { encoding: 'utf8' },
  );
  return out.trim();
}

function altoolUpload(key, issuer) {
  // altool occasionally fails the FIRST run of a chained build with a transient
  // "Defaults.properties" error — the .ipa is fine, just rerun. Retry up to 3×.
  const cmd = `xcrun altool --upload-app -f "${IPA_PATH}" -t ios --apiKey "${key}" --apiIssuer "${issuer}"`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    console.log(`\n▶ Upload to TestFlight (attempt ${attempt}/3)`);
    let out = '';
    try {
      out = execSync(`${cmd} 2>&1`, { encoding: 'utf8', shell: '/bin/bash' });
    } catch (e) {
      out = `${e.stdout || ''}${e.stderr || ''}`;
      console.error(out);
      writeFileSync('build/ios/upload.log', out);
      if (/Defaults\.properties/.test(out) && attempt < 3) {
        console.log('  (transient Defaults.properties error — retrying)');
        continue;
      }
      throw new Error('altool upload failed');
    }
    console.log(out);
    writeFileSync('build/ios/upload.log', out);
    if (/UPLOAD SUCCEEDED|No errors uploading/.test(out)) return;
  }
  throw new Error('altool upload did not report success after retries');
}

async function pollForBuild(version, { tries = 8, intervalMs = 30000 } = {}) {
  for (let i = 1; i <= tries; i++) {
    const b = (await recentBuilds(8)).find(x => x.attributes.version === String(version));
    if (b) return b;
    console.log(`  …build ${version} not registered yet (${i}/${tries}); Apple is ingesting`);
    await new Promise(r => setTimeout(r, intervalMs));
  }
  return null;
}

async function setWhatsNew(buildId, text) {
  const locs = await asc(
    'GET',
    `/v1/builds/${buildId}/betaBuildLocalizations?fields[betaBuildLocalizations]=locale,whatsNew`,
  );
  const enUS = locs.data.find(l => l.attributes.locale === 'en-US');
  if (enUS) {
    await asc('PATCH', `/v1/betaBuildLocalizations/${enUS.id}`, {
      data: { type: 'betaBuildLocalizations', id: enUS.id, attributes: { whatsNew: text } },
    });
  } else {
    await asc('POST', '/v1/betaBuildLocalizations', {
      data: {
        type: 'betaBuildLocalizations',
        attributes: { locale: 'en-US', whatsNew: text },
        relationships: { build: { data: { type: 'builds', id: buildId } } },
      },
    });
  }
}

// ── main ──────────────────────────────────────────────────────────────────
const builds = await recentBuilds();
console.log('Recent TestFlight builds (newest first):');
for (const b of builds) {
  console.log(`  v${b.attributes.version}  ${b.attributes.processingState}  uploaded=${b.attributes.uploadedDate}`);
}

if (STATUS_ONLY) process.exit(0);

const next = nextBuildNumber(builds);
// Built per-build-number, not once: in --finalize the shipped build has already
// registered, so `next` is one HIGHER than the build we're annotating.
const whatsNewFor = n =>
  WHATS_NEW || `Build ${n}. Please test the latest changes (see the most recent commits) and report anything off.`;

console.log(`\nNext build number: ${next}  (marketing version stays as configured, 1.0)`);

if (!CONFIRM) {
  console.log('\n[dry-run] With --confirm this would:');
  console.log('  1. npm run ios:build');
  console.log(`  2. xcodebuild archive  (CURRENT_PROJECT_VERSION=${next}, DEVELOPMENT_TEAM=$ASC_TEAM_ID, auth via $ASC_KEY_*)`);
  console.log('  3. xcodebuild -exportArchive  (generated ExportOptions.plist)');
  console.log('  4. xcrun altool --upload-app  (retry on Defaults.properties)');
  console.log('  5. poll ASC until the build registers, then set the "What to Test" note:');
  console.log('     ┄┄┄');
  console.log('     ' + whatsNewFor(next).replace(/\n/g, '\n     '));
  console.log('     ┄┄┄');
  console.log('\nRe-run with --confirm to ship.');
  console.log('Or stage it (safer under a command timeout — see the header):');
  console.log('  --confirm --no-upload  →  --confirm --upload-only  →  --confirm --finalize');
  process.exit(0);
}

// confirmed → ship it
const KEY = reqEnv('ASC_KEY_ID');
const ISS = reqEnv('ASC_ISSUER_ID');
const KEYPATH = reqEnv('ASC_KEY_PATH');
const TEAM = reqEnv('ASC_TEAM_ID');

const doBuild = !UPLOAD_ONLY && !FINALIZE;
const doUpload = !NO_UPLOAD && !FINALIZE;
const doFinalize = !NO_UPLOAD && !UPLOAD_ONLY;

if (doBuild) {

sh('Web build (vite + strip dicts + cap sync)', 'npm run ios:build', 'build/ios/ios-build.log');

writeExportOptions(TEAM);

const archiveCmd = [
  'xcodebuild',
  '-project ios/App/App.xcodeproj',
  '-scheme App',
  '-configuration Release',
  `-destination 'generic/platform=iOS'`,
  `-archivePath ${ARCHIVE_PATH}`,
  'archive',
  '-allowProvisioningUpdates',
  `-authenticationKeyID "${KEY}"`,
  `-authenticationKeyIssuerID "${ISS}"`,
  `-authenticationKeyPath "${KEYPATH}"`,
  `DEVELOPMENT_TEAM="${TEAM}"`,
  `CURRENT_PROJECT_VERSION=${next}`,
].join(' ');
sh(`Archive build ${next}`, archiveCmd, 'build/ios/archive.log');

const produced = archiveBuildNumber();
if (produced !== String(next)) {
  throw new Error(`Archive CFBundleVersion=${produced} but expected ${next} — aborting before upload.`);
}
console.log(`  ✓ archive verified: CFBundleVersion=${produced}`);

const exportCmd = [
  'xcodebuild -exportArchive',
  `-archivePath ${ARCHIVE_PATH}`,
  `-exportPath ${EXPORT_DIR}`,
  `-exportOptionsPlist ${EXPORT_PLIST}`,
  '-allowProvisioningUpdates',
  `-authenticationKeyID "${KEY}"`,
  `-authenticationKeyIssuerID "${ISS}"`,
  `-authenticationKeyPath "${KEYPATH}"`,
].join(' ');
sh('Export IPA', `rm -rf ${EXPORT_DIR} && ${exportCmd}`, 'build/ios/export.log');
if (!existsSync(IPA_PATH)) throw new Error(`Export did not produce ${IPA_PATH}`);

}

// Later stages read the number back from the archive rather than trusting `next`
// — once an upload registers, ASC would hand out the following number instead.
if (!existsSync(ARCHIVE_PATH) && !doBuild) {
  throw new Error(`No archive at ${ARCHIVE_PATH} — run with --no-upload first to build one.`);
}
const shipped = doBuild ? String(next) : archiveBuildNumber();

if (doUpload) {
  if (!existsSync(IPA_PATH)) throw new Error(`No .ipa at ${IPA_PATH} — run with --no-upload first.`);
  altoolUpload(KEY, ISS);
  console.log(`\n✓ Uploaded build ${shipped}. Apple processes it (typically VALID within 5–30 min).`);
}

if (doFinalize) {
  console.log('\nWaiting for the build to register so we can set the What-to-Test note…');
  const registered = await pollForBuild(shipped);
  if (registered) {
    await setWhatsNew(registered.id, whatsNewFor(shipped));
    console.log(`✓ Set "What to Test" on build ${shipped} (state: ${registered.attributes.processingState}).`);
  } else {
    console.log(`Build ${shipped} hadn't registered yet. Re-run with --confirm --finalize to retry the note,`);
    console.log('or set it in App Store Connect → TestFlight.');
  }
}

if (NO_UPLOAD) {
  console.log(`\n✓ Built + exported build ${shipped}, stopped before upload (--no-upload).`);
  console.log('   Next: npm run ios:release -- --confirm --upload-only');
}
console.log('\nDone. Check processing later with: npm run ios:release -- --status');
