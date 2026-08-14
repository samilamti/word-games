#!/usr/bin/env node
/**
 * Lexica Knights — contact sheets for art review.
 *
 * The whole point is to judge each candidate at the size it will actually be
 * seen. A sprite that looks superb at 1024px routinely turns to mud at the ~86px
 * the combat overlay draws it at, and picking from full-size renders is how a
 * set ends up looking worse in the game than it did in the folder. So sprites
 * are shown at their real size against the app's own background, with a 2x blow-up
 * beside them for detail, and portraits are shown inside a mock of the arrival
 * toast rather than bare.
 *
 * Sheets are written to a unique timestamped filename every run, because macOS
 * Quick Look happily serves a stale cached copy of an overwritten path and you
 * end up comparing two renders that are pixel-identical on screen.
 *
 * Usage:
 *   node scripts/art/contact.mjs --mode sprite
 *   node scripts/art/contact.mjs --mode portrait
 */
import { readdirSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..', '..');
const RAW = { sprite: join(REPO, 'resources', 'art', 'raw', 'sprites'),
              portrait: join(REPO, 'resources', 'art', 'raw', 'portraits') };
const BLENDER_DIR = join(REPO, 'resources', 'enemies');
const OUT_DIR = join(REPO, 'resources', 'art', 'contact');

// The app's ground colour, so contrast is judged against the real thing.
const BG = { r: 13, g: 13, b: 26, alpha: 1 };
const PANEL = { r: 20, g: 8, b: 40, alpha: 1 };

/** In-game combat sprite height, from BattleOverlay's scale constants. */
const GAME_PX = 86;
const ZOOM_PX = GAME_PX * 2;
const PORTRAIT_PX = 140;
const PAD = 16;
const LABEL_H = 18;

function stamp() {
  // Date is unavailable inside workflow scripts but fine here; this runs as a
  // plain node script.
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function label(text, width) {
  const safe = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `<svg width="${width}" height="${LABEL_H}">
    <text x="0" y="13" font-family="monospace" font-size="12" fill="#aaa">${safe}</text>
  </svg>`;
  return Buffer.from(svg);
}

/** Apply the Blender master's alpha, mirroring what compose.mjs ships, so the
 *  sheet shows the asset as it will actually appear rather than the raw square. */
async function maskedSprite(rawPath, name, size) {
  const master = join(BLENDER_DIR, `${name}.png`);
  if (!existsSync(master)) return sharp(rawPath).resize(size, size, { fit: 'fill' }).png().toBuffer();

  const meta = await sharp(master).metadata();
  // toColourspace('b-w') keeps this a single channel; see compose.mjs.
  const alpha = await sharp(master).ensureAlpha().extractChannel('alpha')
    .toColourspace('b-w').blur(1).linear(3, -2 * 255).blur(0.6).toBuffer();
  const painted = await sharp(rawPath).resize(meta.width, meta.height, { fit: 'fill' })
    .removeAlpha().toBuffer();
  return sharp(painted).joinChannel(alpha).resize(size, size, { fit: 'fill' }).png().toBuffer();
}

async function spriteSheet() {
  const files = readdirSync(RAW.sprite).filter(f => f.endsWith('.png')).sort();
  if (!files.length) throw new Error(`no candidates in ${RAW.sprite}`);

  const rowH = Math.max(ZOOM_PX, GAME_PX) + LABEL_H + PAD;
  const cellW = GAME_PX + ZOOM_PX + PAD * 3;
  const width = cellW + PAD;
  const height = rowH * files.length + PAD;

  const layers = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const name = basename(f).split('-')[0];
    const y = PAD + i * rowH;
    layers.push({ input: label(f.replace('.png', ''), width - PAD * 2), left: PAD, top: y });
    layers.push({
      input: await maskedSprite(join(RAW.sprite, f), name, GAME_PX),
      left: PAD,
      top: y + LABEL_H,
    });
    layers.push({
      input: await maskedSprite(join(RAW.sprite, f), name, ZOOM_PX),
      left: PAD * 2 + GAME_PX,
      top: y + LABEL_H,
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, `sprites-${stamp()}.png`);
  await sharp({ create: { width, height, channels: 4, background: BG } })
    .composite(layers)
    .png()
    .toFile(out);
  return { out, count: files.length };
}

async function portraitSheet() {
  const files = readdirSync(RAW.portrait).filter(f => f.endsWith('.png')).sort();
  if (!files.length) throw new Error(`no candidates in ${RAW.portrait}`);

  const cols = Math.min(3, files.length);
  const rows = Math.ceil(files.length / cols);
  const cellW = PORTRAIT_PX + PAD * 2;
  const cellH = PORTRAIT_PX + LABEL_H + PAD * 2;
  const width = cols * cellW + PAD;
  const height = rows * cellH + PAD;

  const layers = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const cx = PAD + (i % cols) * cellW;
    const cy = PAD + Math.floor(i / cols) * cellH;

    // Mock of the arrival toast: the panel colour and gold edge the portrait
    // will really sit inside.
    layers.push({
      input: await sharp({
        create: { width: PORTRAIT_PX + 8, height: PORTRAIT_PX + 8, channels: 4, background: PANEL },
      }).png().toBuffer(),
      left: cx - 4,
      top: cy + LABEL_H - 4,
    });
    layers.push({ input: label(f.replace('.png', ''), cellW - PAD), left: cx, top: cy });
    layers.push({
      input: await sharp(join(RAW.portrait, f))
        .resize(PORTRAIT_PX, PORTRAIT_PX, { fit: 'cover' })
        .png()
        .toBuffer(),
      left: cx,
      top: cy + LABEL_H,
    });
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const out = join(OUT_DIR, `portraits-${stamp()}.png`);
  await sharp({ create: { width, height, channels: 4, background: BG } })
    .composite(layers)
    .png()
    .toFile(out);
  return { out, count: files.length };
}

async function main() {
  const idx = process.argv.indexOf('--mode');
  const mode = idx >= 0 ? process.argv[idx + 1] : 'sprite';
  const { out, count } = mode === 'portrait' ? await portraitSheet() : await spriteSheet();
  console.log(`  ✓ ${count} candidates -> ${out}`);
}

main().catch(err => {
  console.error(`contact sheet failed: ${err.message}`);
  process.exit(1);
});
