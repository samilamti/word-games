#!/usr/bin/env node
/**
 * Lexica Knights — turn raw SDXL output into shippable assets.
 *
 * Sprites: SDXL has no notion of alpha, so the transparency comes from the
 * Blender master the paint-over was seeded with. The mask is eroded a pixel and
 * feathered before it is re-applied, because img2img nudges edges outward and an
 * un-eroded mask leaves a bright halo where the painted edge overshoots the
 * original silhouette.
 *
 * Portraits: cropped inward before scaling. SDXL bakes a border in no matter how
 * hard the negative prompt argues, and the crop is what removes it.
 *
 * Usage:
 *   node scripts/art/compose.mjs --mode sprite   resources/art/raw/sprites/goblin-s7-d0.5.png --name goblin
 *   node scripts/art/compose.mjs --mode portrait resources/art/raw/portraits/goblin-s7.png    --name goblin
 *   node scripts/art/compose.mjs --all        # rebuild everything named in picks.json
 */
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const BLENDER_DIR = join(REPO, 'resources', 'enemies');
const SPRITE_OUT = join(REPO, 'public', 'enemies');
const PORTRAIT_OUT = join(REPO, 'public', 'art', 'portraits');
const PICKS = join(HERE, 'picks.json');

/** Ship at half the generated resolution. The combat sprite draws at ~86px and
 *  the portrait at ~140px, so 512 is already generous, and it halves the bundle
 *  against the 1024px originals. */
const SHIP_SIZE = 512;

/** How much of the frame survives the portrait crop. SDXL's baked border sits
 *  in the outer few percent; 92% clears it without eating the subject. */
const PORTRAIT_KEEP = 0.92;

async function composeSprite(rawPath, name) {
  const master = join(BLENDER_DIR, `${name}.png`);
  if (!existsSync(master)) {
    throw new Error(`no Blender master at ${master} — the alpha comes from there`);
  }

  const { width, height } = await sharp(master).metadata();

  // Erode, then feather. Erode pulls the mask inside the painted edge so no
  // overshoot survives; the blur that follows softens the cut so the sprite
  // doesn't read as a sticker at small sizes.
  const alpha = await sharp(master)
    .ensureAlpha()
    .extractChannel('alpha')
    .blur(1)
    .linear(3, -2 * 255) // steepen: pushes soft edge pixels to 0, keeps the core at 255
    .blur(0.6)
    .toBuffer();

  const painted = await sharp(rawPath).resize(width, height, { fit: 'fill' }).removeAlpha().toBuffer();

  mkdirSync(SPRITE_OUT, { recursive: true });
  const out = join(SPRITE_OUT, `${name}.png`);
  await sharp(painted)
    .joinChannel(alpha)
    .resize(SHIP_SIZE, SHIP_SIZE, { fit: 'fill' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);

  return out;
}

async function composePortrait(rawPath, name) {
  const { width, height } = await sharp(rawPath).metadata();
  const keepW = Math.round(width * PORTRAIT_KEEP);
  const keepH = Math.round(height * PORTRAIT_KEEP);
  // Bias the crop upward: these compositions put the figure low, so trimming
  // evenly would take the chin before it takes the empty headroom.
  const left = Math.round((width - keepW) / 2);
  const top = Math.round((height - keepH) * 0.35);

  mkdirSync(PORTRAIT_OUT, { recursive: true });
  const out = join(PORTRAIT_OUT, `${name}.webp`);
  await sharp(rawPath)
    .extract({ left, top, width: keepW, height: keepH })
    .resize(SHIP_SIZE, SHIP_SIZE, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(out);

  return out;
}

function parseArgs(argv) {
  const args = { mode: null, name: null, file: null, all: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--mode') args.mode = argv[++i];
    else if (a === '--name') args.name = argv[++i];
    else if (a === '--all') args.all = true;
    else if (!a.startsWith('--')) args.file = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.all) {
    if (!existsSync(PICKS)) {
      throw new Error(`no ${PICKS} — record the chosen seed per asset there first`);
    }
    const picks = JSON.parse(readFileSync(PICKS, 'utf8'));
    for (const [name, pick] of Object.entries(picks.sprites ?? {})) {
      const out = await composeSprite(resolve(REPO, pick), name);
      console.log(`  ✓ sprite   ${name} -> ${out}`);
    }
    for (const [name, pick] of Object.entries(picks.portraits ?? {})) {
      const out = await composePortrait(resolve(REPO, pick), name);
      console.log(`  ✓ portrait ${name} -> ${out}`);
    }
    return;
  }

  if (!args.mode || !args.name || !args.file) {
    throw new Error('need --mode sprite|portrait, --name <character>, and a raw file (or --all)');
  }
  const out =
    args.mode === 'sprite'
      ? await composeSprite(resolve(args.file), args.name)
      : await composePortrait(resolve(args.file), args.name);
  console.log(`  ✓ ${args.mode} ${args.name} -> ${out}`);
}

main().catch(err => {
  console.error(`compose failed: ${err.message}`);
  process.exit(1);
});
