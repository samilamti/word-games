/**
 * After `vite build` for the iOS bundle, strip web-only assets from dist/
 * so they don't get copied into the .ipa via `cap sync ios`:
 *   - non-English dictionaries (runtime fetches them from the GitHub Pages
 *     CDN URL instead — the "Hybrid: EN bundled, others on demand" preference)
 *   - social-preview.png (an OG card only crawlers on the web build need)
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

// Web-only OG social card — not needed inside the app bundle.
const ogCard = resolve(root, 'dist/social-preview.png');
if (existsSync(ogCard)) {
  unlinkSync(ogCard);
  console.log('[strip-non-en-dicts] removed dist/social-preview.png (web-only OG card)');
}
