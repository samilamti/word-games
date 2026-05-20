/**
 * Normalize raw word lists into clean, locale-specific Scrabble-style
 * dictionaries:
 *   - lowercase
 *   - filter to language's allowed alphabet (including locale-specific
 *     accented letters)
 *   - drop words shorter than 2 or longer than 15 (board is 13×13; some
 *     slack for hooks and wraparound)
 *   - dedupe + sort
 *
 * Input:  tmp/dict-source/<locale>-raw.txt
 * Output: public/dictionaries/<locale>.txt
 */

import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

// Locale-specific allowed-character regex. Includes accented characters that
// real Scrabble variants use in their tile sets. Anything outside is filtered.
const ALPHABETS = {
  en: /^[a-z]+$/,
  es: /^[a-záéíóúüñ]+$/,
  fr: /^[a-zàâçéèêëîïôùûüœÿæ]+$/,
  de: /^[a-zäöüß]+$/,
  it: /^[a-zàèéìíòóùú]+$/,
  pt: /^[a-záâãàçéêíóôõúü]+$/,
};

const MIN_LEN = 2;
const MAX_LEN = 15;

for (const locale of Object.keys(ALPHABETS)) {
  const inPath = resolve(root, `tmp/dict-source/${locale}-raw.txt`);
  const outPath = resolve(root, `public/dictionaries/${locale}.txt`);
  const allowed = ALPHABETS[locale];

  console.log(`\n${locale.toUpperCase()}: reading ${inPath}`);
  const raw = readFileSync(inPath, 'utf8');
  const lines = raw.split(/\r?\n/);
  console.log(`  raw lines: ${lines.length.toLocaleString()}`);

  const seen = new Set();
  for (const line of lines) {
    const word = line.trim().toLowerCase();
    if (word.length < MIN_LEN || word.length > MAX_LEN) continue;
    if (!allowed.test(word)) continue;
    seen.add(word);
  }

  const sorted = [...seen].sort();
  const out = sorted.join('\n') + '\n';
  writeFileSync(outPath, out);
  const sz = statSync(outPath).size;
  console.log(`  → ${sorted.length.toLocaleString()} unique words, ${(sz / 1024 / 1024).toFixed(2)} MB`);
}

console.log('\nDone.');
