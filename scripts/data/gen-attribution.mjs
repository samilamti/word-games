/**
 * Stage 4 — generate the attribution/credits file that MUST ship with the app.
 *
 * The definition data is derived from Wiktionary (CC BY-SA 4.0 + GFDL) via
 * Wiktextract/Kaikki, and frequency ranks from FrequencyWords (CC BY-SA 4.0).
 * Those licenses require attribution; bundle this file and link it from an
 * in-app credits screen.
 *
 * Reads public/definitions/manifest.json to credit only the locales actually
 * built. Output: public/definitions/CREDITS.md
 *
 * Usage: node scripts/data/gen-attribution.mjs
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const OUT_ROOT = resolve(root, 'public/definitions');

const EDITIONS = {
  en: 'English Wiktionary — en.wiktionary.org',
  de: 'German Wiktionary (Deutsch) — de.wiktionary.org',
  es: 'Spanish Wiktionary (Español) — es.wiktionary.org',
  fr: 'French Wiktionary (Français) — fr.wiktionary.org',
  it: 'Italian Wiktionary (Italiano) — it.wiktionary.org',
  pt: 'Portuguese Wiktionary (Português) — pt.wiktionary.org',
};

const manifestPath = resolve(OUT_ROOT, 'manifest.json');
if (!existsSync(manifestPath)) {
  console.error('! public/definitions/manifest.json missing — run package-defs.mjs first.');
  process.exit(1);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const locales = Object.keys(manifest.locales || {}).sort();
const date = new Date().toISOString().slice(0, 10);

const editionLines = locales
  .map((l) => `- **${l}** — ${EDITIONS[l] || l}` + (l !== 'en' ? ' (English Wiktionary used to fill gaps where the native edition is sparse)' : ''))
  .join('\n');

const md = `# Word definitions — sources & attribution

Generated ${date}. The in-game word definitions, example sentences, and
pronunciations in Lexica Knights are derived from the sources below. Their
licenses require attribution; this notice ships with the app.

## Definitions, examples & pronunciations — Wiktionary

Text is from **Wiktionary**, the free dictionary (wiktionary.org), used under
the **Creative Commons Attribution-ShareAlike 4.0** license (CC BY-SA 4.0) and
the **GNU Free Documentation License** (GFDL). Definitions have been extracted,
trimmed, and filtered for this app; the derived definition data remains under
CC BY-SA 4.0.

Editions used:

${editionLines}

Extraction via **Wiktextract** / **Kaikki.org** (Tatu Ylönen) —
https://kaikki.org · https://github.com/tatuylonen/wiktextract

## Word frequencies — FrequencyWords

Frequency ranks (used for difficulty and review ordering) are from
**hermitdave/FrequencyWords** (github.com/hermitdave/FrequencyWords), derived
from the **OpenSubtitles** corpus, under **CC BY-SA 4.0**.

## License

Full text: https://creativecommons.org/licenses/by-sa/4.0/ ·
https://www.gnu.org/licenses/fdl-1.3.html
`;

writeFileSync(resolve(OUT_ROOT, 'CREDITS.md'), md);
console.log(`Wrote public/definitions/CREDITS.md (${locales.length} locale(s): ${locales.join(', ')})`);
