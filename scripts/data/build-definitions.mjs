/**
 * Stage 1 — build normalized definition records from the raw sources.
 *
 * For each locale:
 *   - load the validity list (public/dictionaries/<locale>.txt) into a Set,
 *     keyed EXACTLY as WordValidator keys words (trim + toLowerCase, len >= 2);
 *   - NATIVE pass: stream the locale's own Wiktionary edition (monolingual
 *     glosses), keeping only validity words with lang_code === locale, pulling
 *     rich fields (POS + gloss + example + IPA), dropping vulgar/slur senses
 *     and section-marker artifact glosses;
 *   - FALLBACK pass (hybrid): if tmp/wiktextract/<locale>.fallback.jsonl exists
 *     (the English-edition extract), fill ONLY words the native edition missed,
 *     with English glosses, tagged `gl:"en"`;
 *   - FORMS resolution: collect each lemma's inflected forms; a playable form
 *     with no gloss of its own becomes a redirect to its lemma — so a played
 *     "corremos" resolves to "correr". Written to <locale>.forms.jsonl;
 *   - merge the per-word frequency rank from the FrequencyWords list.
 *
 * Outputs (tmp/normalized/):
 *   <locale>.jsonl        — definitions: { w, s:[{p,g}], x?, i?, f?, gl? }
 *   <locale>.forms.jsonl  — redirects:   { w, r:lemma, t?:tagLabel }
 *
 * Usage: node scripts/data/build-definitions.mjs [locale ...]  (default: all 6)
 */

import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');

const MAX_SENSES = 3; // cap glosses kept per word
const MAX_GLOSS_LEN = 300; // bound a pathological gloss
const MAX_EXAMPLE_LEN = 160; // short, illustrative — not a literary citation
const NORM_DIR = resolve(root, 'tmp/normalized');

// Senses whose tags / categories match these are dropped (family-friendly 9+).
const BLOCK_TAGS = new Set([
  'vulgar', 'offensive', 'derogatory', 'slur', 'ethnic slur', 'ethnic-slur',
  'pejorative', 'obscene', 'profanity', 'swear',
]);
const BLOCK_CATEGORY_RE = /\b(vulgar|vulgarit|offensive|ethnic slur|\bslur|derogatory|profan|obscen|swear word)/i;

// Bare grammatical markers that some editions (e.g. it.wikt) emit instead of a
// real definition, e.g. "casa (approfondimento) f sing".
const GRAM = new Set(['m', 'f', 'n', 'sing', 'pl', 'inv', 'mf', 'agg', 'avv', 'sost', 'v', 'ecc', 'ecc.']);

function isBlockedSense(sense) {
  const tags = sense.tags || [];
  if (tags.some((t) => BLOCK_TAGS.has(String(t).toLowerCase()))) return true;
  for (const c of sense.categories || []) {
    const name = typeof c === 'string' ? c : c?.name;
    if (name && BLOCK_CATEGORY_RE.test(name)) return true;
  }
  return false;
}

function cleanGloss(g) {
  return String(g)
    .replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, '$2') // [[a|b]] -> b, [[a]] -> a
    .replace(/\{\{[^}]*\}\}/g, '') // strip residual templates
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_GLOSS_LEN);
}

/** Reject section-marker / headword-echo artifacts that carry no real meaning. */
function isUsefulGloss(word, gloss) {
  let g = gloss.replace(/\([^)]*\)/g, ' '); // drop parentheticals
  if (g.trim().toLowerCase().startsWith(word)) g = g.trim().slice(word.length);
  const rest = g.split(/[\s,;]+/).filter((t) => t && !GRAM.has(t.toLowerCase()));
  return rest.join(' ').trim().length >= 3;
}

/** Compact grammatical label for an inflected form, e.g. "plural" / "past tense". */
function tagLabel(tags) {
  if (!Array.isArray(tags) || !tags.length) return undefined;
  const t = tags.filter((x) => typeof x === 'string').slice(0, 5).join(' ').trim();
  return t.length ? t.slice(0, 48) : undefined;
}

/** validity list → Set, same keying as WordValidator. */
function loadValidity(locale) {
  const set = new Set();
  for (const line of readFileSync(resolve(root, `public/dictionaries/${locale}.txt`), 'utf8').split(/\r?\n/)) {
    const w = line.trim().toLowerCase();
    if (w.length >= 2) set.add(w);
  }
  return set;
}

/** FrequencyWords list → Map<word, rank>, but only for words in `validity`. */
function loadFreqRanks(locale, validity) {
  const path = resolve(root, `tmp/freq/${locale}.txt`);
  const ranks = new Map();
  if (!existsSync(path)) {
    console.warn(`  ! no frequency file for ${locale} — freq ranks omitted`);
    return ranks;
  }
  let rank = 0;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line) continue;
    rank += 1; // global rank = position in the full frequency-sorted list
    const word = line.split(/\s+/)[0]?.toLowerCase();
    if (word && validity.has(word) && !ranks.has(word)) ranks.set(word, rank);
  }
  return ranks;
}

/**
 * Stream one raw JSONL file into `records` (definitions) and `formMap`
 * (inflected form -> lemma). In fallback mode, only fills words the native
 * pass left uncovered, tagging them gl:"en".
 */
async function scanFile(rawPath, locale, validity, records, formMap, { fallback }) {
  const stats = { lines: 0, blocked: 0, junked: 0 };
  const rl = createInterface({ input: createReadStream(rawPath, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    stats.lines += 1;
    if (stats.lines % 200000 === 0) {
      process.stdout.write(`\r  ${fallback ? 'fallback' : 'native'}: scanned ${stats.lines.toLocaleString()}…`);
    }
    if (!line) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch {
      continue;
    }
    if (entry.lang_code !== locale) continue; // editions hold many languages
    const word = String(entry.word || '').toLowerCase();
    if (!validity.has(word)) continue;

    let rec = records.get(word);
    if (fallback && rec && rec.gl !== 'en') continue; // native already covers it
    if (!rec) {
      rec = { w: word, s: [] };
      if (fallback) rec.gl = 'en';
      records.set(word, rec);
    }
    const pos = entry.pos || null;

    let contributed = false;
    for (const sense of entry.senses || []) {
      const glosses = sense.glosses || sense.raw_glosses;
      if (!glosses || !glosses.length) continue;
      if (isBlockedSense(sense)) {
        stats.blocked += 1;
        continue;
      }
      const g = cleanGloss(glosses[glosses.length - 1]);
      if (!isUsefulGloss(word, g)) {
        stats.junked += 1;
        continue;
      }
      contributed = true;
      if (rec.s.length < MAX_SENSES) rec.s.push({ p: pos, g });
      // first GOOD example: short, preferring made-up "example" over citations
      if (!rec.x && sense.examples?.length) {
        const usable = sense.examples
          .filter((e) => e?.text)
          .map((e) => ({ t: cleanGloss(e.text), type: e.type }))
          .filter((e) => e.t.length >= 4 && e.t.length <= MAX_EXAMPLE_LEN);
        const pick = usable.find((e) => e.type === 'example') || usable[0];
        if (pick) rec.x = pick.t;
      }
    }
    // first REAL IPA across this entry's pronunciations (skip "…" placeholders)
    if (!rec.i) {
      const ipa = (entry.sounds || [])
        .map((s) => s?.ipa)
        .find((x) => x && x.replace(/[[\]/…\s]/g, '').length >= 2);
      if (ipa) rec.i = ipa;
    }

    // Record this lemma's inflected forms for forms-resolution. Only for entries
    // that contributed a real gloss, and only playable forms (bounds memory).
    if (contributed && Array.isArray(entry.forms)) {
      for (const f of entry.forms) {
        const fl = String(f?.form || '').toLowerCase();
        if (fl.length < 2 || fl === word || !validity.has(fl) || formMap.has(fl)) continue;
        formMap.set(fl, { l: word, t: tagLabel(f.tags) });
      }
    }
  }
  rl.close();
  return stats;
}

const dropEmpty = (records) => {
  for (const [w, r] of records) if (!r.s.length) records.delete(w);
};

const pct = (n, d) => (d ? ((n / d) * 100).toFixed(1) : '0.0');

async function buildLocale(locale) {
  const nativePath = resolve(root, `tmp/wiktextract/${locale}.jsonl`);
  if (!existsSync(nativePath)) {
    console.warn(`! ${nativePath} missing — run fetch-sources.mjs ${locale} first. Skipping.`);
    return;
  }
  console.log(`\n=== ${locale.toUpperCase()} ===`);
  const validity = loadValidity(locale);
  console.log(`  validity words: ${validity.size.toLocaleString()}`);
  const freqRanks = loadFreqRanks(locale, validity);

  const records = new Map();
  const formMap = new Map(); // inflected form -> { l: lemma, t: tagLabel }
  const t0 = Date.now();

  const nat = await scanFile(nativePath, locale, validity, records, formMap, { fallback: false });
  dropEmpty(records);
  const nativeCount = records.size;
  process.stdout.write('\r');
  console.log(`  native: ${nativeCount.toLocaleString()} words (${nat.blocked.toLocaleString()} blocked, ${nat.junked.toLocaleString()} junk glosses)`);

  // Hybrid: fill native gaps from the English-edition extract, if present.
  const fbPath = resolve(root, `tmp/wiktextract/${locale}.fallback.jsonl`);
  let fbCount = 0;
  if (existsSync(fbPath)) {
    await scanFile(fbPath, locale, validity, records, formMap, { fallback: true });
    dropEmpty(records);
    fbCount = records.size - nativeCount;
    process.stdout.write('\r');
    console.log(`  fallback (English glosses): +${fbCount.toLocaleString()} words the native edition missed`);
  }

  mkdirSync(NORM_DIR, { recursive: true });
  const outPath = resolve(NORM_DIR, `${locale}.jsonl`);
  const out = createWriteStream(outPath);
  let written = 0;
  for (const w of [...records.keys()].sort()) {
    const rec = records.get(w);
    const f = freqRanks.get(w);
    if (f != null) rec.f = f;
    out.write(JSON.stringify(rec) + '\n');
    written += 1;
  }
  await new Promise((res) => out.end(res));

  // Forms-resolution: a playable inflected form with no gloss of its own becomes
  // a redirect to its covered lemma (so a played "corremos" → "correr").
  const formsOut = [];
  for (const [fl, info] of formMap) {
    if (records.has(fl)) continue; // the form has its own definition
    if (!records.has(info.l)) continue; // lemma uncovered → nothing to resolve to
    formsOut.push(info.t ? { w: fl, r: info.l, t: info.t } : { w: fl, r: info.l });
  }
  formsOut.sort((a, b) => (a.w < b.w ? -1 : 1));
  const fout = createWriteStream(resolve(NORM_DIR, `${locale}.forms.jsonl`));
  for (const r of formsOut) fout.write(JSON.stringify(r) + '\n');
  await new Promise((res) => fout.end(res));

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  const nativePct = written ? Math.round((nativeCount / written) * 100) : 0;
  const effective = written + formsOut.length;
  console.log(
    `  → ${written.toLocaleString()} defs` +
      (fbCount ? ` (${nativePct}% native, ${100 - nativePct}% English)` : '') +
      ` + ${formsOut.length.toLocaleString()} form-redirects | ` +
      `${pct(written, validity.size)}% def → ${pct(effective, validity.size)}% effective | ${secs}s`,
  );
}

const requested = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const locales = requested.length ? requested : ['en', 'de', 'es', 'fr', 'it', 'pt'];
for (const locale of locales) await buildLocale(locale);
console.log('\nDone. Next: node scripts/data/package-defs.mjs ' + locales.join(' '));
