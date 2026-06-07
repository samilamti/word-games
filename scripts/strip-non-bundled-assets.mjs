/**
 * After `vite build` for a native bundle, strip the assets that ship from the
 * CDN instead of the app bundle, so `cap sync` doesn't copy them into the app:
 *   - dictionaries (word-validity lists) for non-bundled locales
 *   - definitions for non-bundled locales
 *   - social-preview.png (an OG card only web crawlers need)
 *
 * Delivery model — Option B, docs/definitions-delivery-decision.md: the app
 * bundles only the BUNDLED_LOCALES starter set so installs stay small (a real
 * acquisition win in metered-data / budget-device markets); every other
 * language's dictionary + definition buckets are fetched on demand from the CDN
 * and cached at runtime (WordValidator.loadDictionary + DefinitionService).
 *
 * BUNDLED_LOCALES = en + pt:
 *   - en is the global default.
 *   - pt is the cheapest locale on BOTH datasets (pt dict 2.6 MB + pt defs
 *     8.6 MB ≈ +11 MB) and makes Brazil — a large budget-Android market —
 *     fully offline for both validity and definitions.
 *   - de/es/fr/it definitions are 58–98 MB each, so they stay CDN-only.
 * To change the offline baseline, edit BUNDLED_LOCALES below (one place, both
 * datasets stay coherent).
 */

import { existsSync, readdirSync, unlinkSync, statSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Locales shipped inside the app bundle; everything else is CDN-on-demand. */
const BUNDLED_LOCALES = new Set(['en', 'pt']);

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

let removedDicts = 0;
let removedDefLocales = 0;

// ── Dictionaries: keep <locale>.txt only for bundled locales ──────────────────
const dictDir = resolve(root, 'dist/dictionaries');
if (existsSync(dictDir)) {
  for (const file of readdirSync(dictDir)) {
    if (!file.endsWith('.txt')) continue;
    const locale = file.slice(0, -'.txt'.length);
    if (BUNDLED_LOCALES.has(locale)) continue;
    unlinkSync(resolve(dictDir, file));
    removedDicts++;
    console.log(`  removed dist/dictionaries/${file}`);
  }
} else {
  console.log('[strip] dist/dictionaries/ does not exist — skipping dictionaries');
}

// ── Definitions: keep <locale>/ dirs only for bundled locales ─────────────────
// Top-level files (manifest.json, CREDITS.md) are tiny and stay — CREDITS.md is
// the source attribution we want shipped in-app.
const defsDir = resolve(root, 'dist/definitions');
if (existsSync(defsDir)) {
  for (const entry of readdirSync(defsDir)) {
    const full = resolve(defsDir, entry);
    if (!statSync(full).isDirectory()) continue;
    if (BUNDLED_LOCALES.has(entry)) continue;
    rmSync(full, { recursive: true, force: true });
    removedDefLocales++;
    console.log(`  removed dist/definitions/${entry}/`);
  }
} else {
  console.log('[strip] dist/definitions/ does not exist — skipping definitions');
}

console.log(
  `[strip] bundled locales: ${[...BUNDLED_LOCALES].join(', ')} · ` +
    `removed ${removedDicts} dictionaries, ${removedDefLocales} definition locales`,
);

// Web-only OG social card — not needed inside the app bundle.
const ogCard = resolve(root, 'dist/social-preview.png');
if (existsSync(ogCard)) {
  unlinkSync(ogCard);
  console.log('[strip] removed dist/social-preview.png (web-only OG card)');
}
