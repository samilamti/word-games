/**
 * Stage 0 — acquire raw game-data sources into the (gitignored) tmp/ cache.
 *
 * Two sources per locale:
 *   1. Wiktextract / Kaikki.org — each language from its OWN Wiktionary edition
 *      so glosses are MONOLINGUAL (German words defined in German, etc.).
 *      English uses enwiktionary (/dictionary/); the others use their native
 *      edition (/<code>wiktionary/<NativeName>/). Big (0.3–3.1 GB each).
 *      CC BY-SA — attribution shipped via stage 4.
 *   2. FrequencyWords (hermitdave) — OpenSubtitles-derived frequency lists,
 *      `word count` per line, ranked by descending frequency. ~17–20 MB.
 *
 * Downloads are resumable + idempotent: we HEAD each URL for its size, skip if
 * the local file already matches, otherwise `curl -C -` resumes a partial.
 *
 * Usage:
 *   node scripts/data/fetch-sources.mjs            # all locales
 *   node scripts/data/fetch-sources.mjs en         # just English
 *   node scripts/data/fetch-sources.mjs pt it      # a subset
 *
 * Output: tmp/wiktextract/<locale>.jsonl , tmp/freq/<locale>.txt
 */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

// locale → its own Wiktionary-edition bulk JSONL + FrequencyWords language code.
const SOURCES = {
  en: { wiktextract: 'https://kaikki.org/dictionary/English/kaikki.org-dictionary-English.jsonl', freq: 'en' },
  de: { wiktextract: 'https://kaikki.org/dewiktionary/Deutsch/kaikki.org-dictionary-Deutsch.jsonl', freq: 'de' },
  es: { wiktextract: 'https://kaikki.org/eswiktionary/Español/kaikki.org-dictionary-Español.jsonl', freq: 'es' },
  fr: { wiktextract: 'https://kaikki.org/frwiktionary/Français/kaikki.org-dictionary-Français.jsonl', freq: 'fr' },
  it: { wiktextract: 'https://kaikki.org/itwiktionary/Italiano/kaikki.org-dictionary-Italiano.jsonl', freq: 'it' },
  pt: { wiktextract: 'https://kaikki.org/ptwiktionary/Português/kaikki.org-dictionary-Português.jsonl', freq: 'pt' },
};

const freqUrl = (code) =>
  `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/${code}/${code}_full.txt`;

// English-edition extracts (English glosses) used to backfill thin native
// editions in hybrid mode — fetched with `--fallback <locale ...>`.
const FALLBACK = { de: 'German', es: 'Spanish', fr: 'French', it: 'Italian', pt: 'Portuguese' };
const fallbackUrl = (name) => `https://kaikki.org/dictionary/${name}/kaikki.org-dictionary-${name}.jsonl`;

const RAW_WIKT = resolve(root, 'tmp/wiktextract');
const RAW_FREQ = resolve(root, 'tmp/freq');

/** Remote content-length via HEAD, or null if the server won't say. */
function remoteSize(url) {
  const res = spawnSync('curl', ['-sIL', '--max-time', '30', encodeURI(url)], { encoding: 'utf8' });
  if (res.status !== 0) return null;
  const matches = [...res.stdout.matchAll(/^content-length:\s*(\d+)/gim)];
  if (!matches.length) return null;
  return Number(matches[matches.length - 1][1]); // last hop after redirects
}

const fmtMB = (b) => `${(b / 1024 / 1024).toFixed(1)} MB`;

function download(url, outPath) {
  const expected = remoteSize(url);
  if (expected != null && existsSync(outPath) && statSync(outPath).size === expected) {
    console.log(`  ✓ already complete (${fmtMB(expected)}) — skip`);
    return;
  }
  const haveBytes = existsSync(outPath) ? statSync(outPath).size : 0;
  console.log(
    `  ↓ ${url}\n    → ${outPath}` +
      (expected != null ? `  (${fmtMB(expected)}${haveBytes ? `, resuming from ${fmtMB(haveBytes)}` : ''})` : ''),
  );
  // -C - resumes a partial; --fail errors on 4xx/5xx; --retry rides out blips.
  execFileSync(
    'curl',
    ['-L', '-C', '-', '--fail', '--retry', '3', '--retry-delay', '2', '-o', outPath, encodeURI(url)],
    { stdio: 'inherit' },
  );
  if (expected != null && statSync(outPath).size !== expected) {
    throw new Error(`size mismatch for ${outPath}: got ${statSync(outPath).size}, expected ${expected}`);
  }
  console.log(`  ✓ done (${fmtMB(statSync(outPath).size)})`);
}

const fallbackMode = process.argv.includes('--fallback');
const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const locales = requested.length ? requested : Object.keys(SOURCES);

mkdirSync(RAW_WIKT, { recursive: true });
mkdirSync(RAW_FREQ, { recursive: true });

for (const locale of locales) {
  if (fallbackMode) {
    const name = FALLBACK[locale];
    if (!name) {
      console.warn(`! no English-edition fallback for "${locale}" — skipping`);
      continue;
    }
    console.log(`\n=== ${locale.toUpperCase()} (fallback / English-edition) ===`);
    download(fallbackUrl(name), resolve(RAW_WIKT, `${locale}.fallback.jsonl`));
    continue;
  }
  const src = SOURCES[locale];
  if (!src) {
    console.warn(`! unknown locale "${locale}" — skipping`);
    continue;
  }
  console.log(`\n=== ${locale.toUpperCase()} ===`);
  console.log(`[wiktextract]`);
  download(src.wiktextract, resolve(RAW_WIKT, `${locale}.jsonl`));
  console.log(`[frequency]`);
  download(freqUrl(src.freq), resolve(RAW_FREQ, `${locale}.txt`));
}

console.log('\nDone. Next: node scripts/data/build-definitions.mjs ' + locales.join(' '));
