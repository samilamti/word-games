/**
 * Stage 2 — package normalized records into app-ready, bundled lookup files.
 *
 * Format: prefix-bucketed JSON. Each locale becomes a directory of small files
 * bucketed by the word's first two (diacritic-folded) letters:
 *
 *   public/definitions/<locale>/<bucket>.json   = { "<word>": {s,x,i,f,gl}, ... }
 *   public/definitions/<locale>/index.json      = { count, coverage?, buckets:[...] }
 *   public/definitions/manifest.json            = { locales: { <l>: {count} } }
 *
 * Runtime lookup contract (the app must mirror bucketKey()):
 *   bucket = bucketKey(word); load <locale>/<bucket>.json; entry = json[word.toLowerCase()]
 * A lookup touches ONE small bucket (tens of KB), cached after first read — we
 * never load a whole locale into RAM.
 *
 * Output is deterministic (sorted bucket + word keys) so git diffs stay clean.
 *
 * Usage: node scripts/data/package-defs.mjs [locale ...]   (default: en)
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const OUT_ROOT = resolve(root, 'public/definitions');

/**
 * Bucket key = first two letters, diacritics folded, non-[a-z] → '_'. MUST be
 * mirrored by the runtime reader so it loads the right file.
 */
export function bucketKey(word) {
  const folded = word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return (folded.slice(0, 2).replace(/[^a-z]/g, '_') || '__');
}

async function packageLocale(locale) {
  const normPath = resolve(root, `tmp/normalized/${locale}.jsonl`);
  if (!existsSync(normPath)) {
    console.warn(`! ${normPath} missing — run build-definitions.mjs ${locale} first. Skipping.`);
    return null;
  }
  const buckets = new Map(); // bucketKey -> { word -> {s,x,i,f,gl} }
  let count = 0;

  const rl = createInterface({ input: createReadStream(normPath, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const r = JSON.parse(line);
    const { w, ...rest } = r; // word becomes the map key — don't store it twice
    const k = bucketKey(w);
    let b = buckets.get(k);
    if (!b) buckets.set(k, (b = {}));
    b[w] = rest;
    count += 1;
  }
  rl.close();

  // Merge forms-resolution redirects into the same buckets (single runtime
  // lookup): a redirect is { r: lemma, t?: tags } stored at the form's key.
  let forms = 0;
  const formsPath = resolve(root, `tmp/normalized/${locale}.forms.jsonl`);
  if (existsSync(formsPath)) {
    const frl = createInterface({ input: createReadStream(formsPath, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of frl) {
      if (!line) continue;
      const { w, ...rest } = JSON.parse(line);
      const k = bucketKey(w);
      let b = buckets.get(k);
      if (!b) buckets.set(k, (b = {}));
      if (b[w]) continue; // a real definition already occupies this key
      b[w] = rest;
      forms += 1;
    }
    frl.close();
  }

  // Fresh output dir (so deleted words don't linger across rebuilds).
  const outDir = resolve(OUT_ROOT, locale);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  const bucketKeys = [...buckets.keys()].sort();
  let bytes = 0;
  for (const k of bucketKeys) {
    const obj = buckets.get(k);
    const sorted = {};
    for (const w of Object.keys(obj).sort()) sorted[w] = obj[w];
    const json = JSON.stringify(sorted);
    bytes += Buffer.byteLength(json);
    writeFileSync(resolve(outDir, `${k}.json`), json);
  }
  writeFileSync(resolve(outDir, 'index.json'), JSON.stringify({ count, forms, buckets: bucketKeys }));

  console.log(
    `  ${locale}: ${count.toLocaleString()} defs + ${forms.toLocaleString()} forms → ` +
      `${bucketKeys.length} buckets, ${(bytes / 1024 / 1024).toFixed(2)} MB`,
  );
  return { locale, count, forms, buckets: bucketKeys.length, bytes };
}

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const locales = requested.length ? requested : ['en', 'de', 'es', 'fr', 'it', 'pt'];

mkdirSync(OUT_ROOT, { recursive: true });
const results = [];
for (const locale of locales) {
  const r = await packageLocale(locale);
  if (r) results.push(r);
}

// Merge into the top-level manifest (preserve locales not built this run).
const manifestPath = resolve(OUT_ROOT, 'manifest.json');
let manifest = { locales: {} };
if (existsSync(manifestPath)) {
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    /* corrupt/partial manifest — start fresh */
  }
}
for (const r of results) manifest.locales[r.locale] = { count: r.count, forms: r.forms, buckets: r.buckets };
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

console.log(`\nPackaged ${results.length} locale(s) → public/definitions/. Next: node scripts/data/gen-attribution.mjs`);
