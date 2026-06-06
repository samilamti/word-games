/**
 * Stage 3 — coverage + size report. The QA gate that hands us the real bundle
 * numbers BEFORE we commit to a packaging format and (on Android) asset packs.
 *
 * For each locale, reports:
 *   - coverage %: validity words that got at least one gloss;
 *   - field-fill: how many have an example / IPA / frequency rank;
 *   - sense-count distribution;
 *   - size: normalized bytes, gzipped (≈ what the store ships), and a
 *     glosses-only projection (the "rich set" tax);
 *   - largest entries + a sample of still-missing validity words.
 *
 * Output: tmp/reports/<locale>.md (+ stdout summary).
 *
 * Usage: node scripts/data/report-coverage.mjs [locale ...]   (default: en)
 */

import { createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { gzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const REPORT_DIR = resolve(root, 'tmp/reports');

const fmtMB = (b) => `${(b / 1024 / 1024).toFixed(2)} MB`;
const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : '0.0');

function loadValidity(locale) {
  const set = new Set();
  for (const line of readFileSync(resolve(root, `public/dictionaries/${locale}.txt`), 'utf8').split(/\r?\n/)) {
    const w = line.trim().toLowerCase();
    if (w.length >= 2) set.add(w);
  }
  return set;
}

async function reportLocale(locale) {
  const normPath = resolve(root, `tmp/normalized/${locale}.jsonl`);
  const validity = loadValidity(locale);
  const covered = new Set();
  let withExample = 0, withIpa = 0, withFreq = 0;
  const senseDist = { 1: 0, 2: 0, 3: 0 };
  let glossOnlyBytes = 0;
  const largest = []; // {w, len}

  const rl = createInterface({ input: createReadStream(normPath, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line) continue;
    const r = JSON.parse(line);
    covered.add(r.w);
    if (r.x) withExample += 1;
    if (r.i) withIpa += 1;
    if (r.f != null) withFreq += 1;
    senseDist[Math.min(r.s.length, 3)] = (senseDist[Math.min(r.s.length, 3)] || 0) + 1;
    glossOnlyBytes += Buffer.byteLength(JSON.stringify({ w: r.w, s: r.s }) + '\n');
    const len = Buffer.byteLength(line);
    if (largest.length < 10) largest.push({ w: r.w, len });
    else if (len > largest[9].len) {
      largest[9] = { w: r.w, len };
      largest.sort((a, b) => b.len - a.len);
    }
  }
  rl.close();
  largest.sort((a, b) => b.len - a.len);

  const raw = readFileSync(normPath);
  const gz = gzipSync(raw);
  const missing = [];
  for (const w of validity) {
    if (!covered.has(w)) missing.push(w);
    if (missing.length >= 5000) break; // cap scan work for the sample
  }
  const missSample = missing.slice(0, 25);

  let formsCount = 0;
  const formsPath = resolve(root, `tmp/normalized/${locale}.forms.jsonl`);
  if (existsSync(formsPath)) {
    const frl = createInterface({ input: createReadStream(formsPath, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const ln of frl) if (ln) formsCount += 1;
    frl.close();
  }
  const V = validity.size, C = covered.size;
  const effective = C + formsCount;
  const md = `# Definition coverage — ${locale}

| metric | value |
|---|---|
| validity words | ${V.toLocaleString()} |
| covered (≥1 gloss) | ${C.toLocaleString()} (**${pct(C, V)}%**) |
| form-redirects | ${formsCount.toLocaleString()} |
| effective (defs + forms) | ${effective.toLocaleString()} (**${pct(effective, V)}%**) |
| with example | ${withExample.toLocaleString()} (${pct(withExample, C)}%) |
| with IPA | ${withIpa.toLocaleString()} (${pct(withIpa, C)}%) |
| with frequency rank | ${withFreq.toLocaleString()} (${pct(withFreq, C)}%) |
| senses: 1 / 2 / 3 | ${senseDist[1].toLocaleString()} / ${senseDist[2].toLocaleString()} / ${senseDist[3].toLocaleString()} |

## Size
| variant | bytes |
|---|---|
| normalized JSONL (rich) | ${fmtMB(raw.length)} |
| gzipped (≈ store ships) | ${fmtMB(gz.length)} |
| glosses-only projection | ${fmtMB(glossOnlyBytes)} (rich-set tax: +${fmtMB(raw.length - glossOnlyBytes)}) |

## Largest entries
${largest.map((e) => `- ${e.w} — ${(e.len / 1024).toFixed(1)} KB`).join('\n')}

## Sample of still-missing validity words (${missing.length >= 5000 ? '5000+' : missing.length} total)
${missSample.join(', ')}
`;

  mkdirSync(REPORT_DIR, { recursive: true });
  const outPath = resolve(REPORT_DIR, `${locale}.md`);
  writeFileSync(outPath, md);

  console.log(`\n=== ${locale.toUpperCase()} ===`);
  console.log(`  coverage: ${pct(C, V)}% def → ${pct(effective, V)}% effective (${C.toLocaleString()} defs + ${formsCount.toLocaleString()} forms / ${V.toLocaleString()})`);
  console.log(`  example ${pct(withExample, C)}% | IPA ${pct(withIpa, C)}% | freq ${pct(withFreq, C)}%`);
  console.log(`  size: rich ${fmtMB(raw.length)} | gzip ${fmtMB(gz.length)} | glosses-only ${fmtMB(glossOnlyBytes)}`);
  console.log(`  → ${outPath}`);
}

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const locales = requested.length ? requested : ['en', 'de', 'es', 'fr', 'it', 'pt'];
for (const locale of locales) await reportLocale(locale);
