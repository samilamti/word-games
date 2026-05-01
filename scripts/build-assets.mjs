import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

const targets = [
  { svg: 'resources/icon.svg',   png: 'resources/icon.png',   size: 1024 },
  { svg: 'resources/splash.svg', png: 'resources/splash.png', size: 2732 },
  { svg: 'resources/splash.svg', png: 'resources/splash-dark.png', size: 2732 },
  { svg: 'resources/icon.svg',   png: 'public/favicon.png',   size: 256 },
];

for (const t of targets) {
  const inPath = resolve(root, t.svg);
  const outPath = resolve(root, t.png);
  const buf = readFileSync(inPath);
  await sharp(buf, { density: 384 })
    .resize(t.size, t.size, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toFile(outPath);
  console.log(`wrote ${t.png} (${t.size}x${t.size})`);
}
