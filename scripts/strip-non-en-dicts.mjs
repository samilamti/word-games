/**
 * After `vite build` for the iOS bundle, delete non-English dictionaries
 * from dist/dictionaries/ so they don't get copied into the .ipa via
 * `cap sync ios`. At runtime the WordValidator falls back to fetching
 * non-EN dictionaries from the GitHub Pages CDN URL — this implements
 * the user's "Hybrid: EN bundled, others on demand" preference.
 */

import { existsSync, readdirSync, unlinkSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const dictDir = resolve(root, 'dist/dictionaries');

if (!existsSync(dictDir)) {
  console.log('[strip-non-en-dicts] dist/dictionaries/ does not exist — nothing to strip');
  process.exit(0);
}

let removed = 0;
let kept = 0;
for (const file of readdirSync(dictDir)) {
  if (file === 'en.txt') {
    kept++;
    continue;
  }
  if (file.endsWith('.txt')) {
    unlinkSync(resolve(dictDir, file));
    removed++;
    console.log(`  removed dist/dictionaries/${file}`);
  }
}
console.log(`[strip-non-en-dicts] kept ${kept}, removed ${removed}`);
