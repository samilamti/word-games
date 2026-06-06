# Game-data pipeline — local sourcing of word definitions (and beyond)

**Status:** BUILT & RUN (2026-06-06). Suite complete in `scripts/data/`; all six
locales sourced, built, and packaged to `public/definitions/`.

## Built — final results (2026-06-06)

Suite (each wired as `npm run data:*`): `fetch-sources` · `build-definitions` ·
`package-defs` · `report-coverage` · `gen-attribution`. Shipped record shape:
`{w, s:[{p,g}], x?, i?, f?, gl?}` — `gl:"en"` marks an English fallback gloss.
Sources: each language's OWN Wiktionary edition via Kaikki (monolingual glosses);
English-edition extracts backfill gaps for pt/de/es/it (hybrid); frequency ranks
from FrequencyWords (OpenSubtitles). All CC BY-SA.
Paths: raw → `tmp/wiktextract/` + `tmp/freq/`; intermediate → `tmp/normalized/`;
reports → `tmp/reports/`; shipped → `public/definitions/`. (Supersedes the
`data/…` placeholders in §4 below.)

| locale | effective coverage | packaged | gzip |
|---|---|---|---|
| fr | 99.0% | 57 MB | 9.3 MB |
| it | 79.5% | 60 MB | 7.2 MB |
| en | 78.6% | 40 MB | 11.9 MB |
| es | 71.7% | 79 MB | 8.2 MB |
| de | 37.8% | 97 MB | 14.3 MB |
| pt | 20.9% | 8 MB | 2.3 MB |

Total: ~2.0M defs + ~22K form-redirects, **~340 MB on disk / ~53 MB gzipped**.

**Forms-resolution (BUILT): a small win, not the lever I expected.** The builder
extracts Wiktextract `forms` and redirects a played inflection to its lemma's
gloss (merged into the same buckets; runtime resolver still TODO). Gains were
modest — en +678, de +7.6K, es +3.9K, fr +364, it +8.9K, pt +312 redirects.
WHY small: the validity lists' gaps are NOT mostly resolvable inflections.
Verified — `corremos` is not even in the pt validity list (it has ~30 `-mos`
words total; the list barely contains conjugations). The real limits: **pt** =
poor ptwiktionary overlap with its word list; **de** = a 1M-word list (3× the
others) full of compounds no free dictionary defines. Common/real words ARE
covered everywhere; the low % on de/pt is word-list composition, not a pipeline
gap — a hard limit of free dictionary data for those particular lists.
**Goal:** A reusable, Mac-local automation suite that sources rich word data
(definitions first; POS / examples / IPA / frequency later) from open corpora,
trims it to exactly what the game accepts, and packages it into app-ready,
**bundled** datasets shipped inside the iOS/Android binary — no runtime CDN.

This is the long pole of the monetization work. The IAP plumbing is ~a week;
*building the educational product and its data* is the real project.

---

## 1. Why this exists / decisions it serves

- **Monetization = "taste + retain" hybrid.** Live, ephemeral definitions are
  **free in all 6 languages** (worldwide funnel). The one-time unlock buys the
  **retention layer** (word journal, spaced review, per-language vocab tracking)
  **+ the rest of the campaign** (enemies 3–5). Languages are NOT gated.
- **Ship all datasets in-bundle**, offline-first. Reverses
  `scripts/strip-non-en-dicts.mjs` (which slimmed the iOS bundle to en-only).
- The app today ships **validity-only word lists** (`public/dictionaries/*.txt`,
  one word per line). Definitions are an entirely new, much heavier dataset.

## 2. What data we need

**v1 (ship first):** `word → short gloss(es)` per locale.
**Extensible (same source, same stream — add later cheaply):**
part-of-speech, one example sentence, IPA pronunciation, frequency rank
(for difficulty tiers + review ordering).

Design the normalized intermediate schema to already carry these fields so
adding them later is a packaging change, not a re-extract:

```jsonc
// data/normalized/<locale>.jsonl — one object per accepted word
{ "w": "knight",
  "pos": "noun",
  "g": ["A mounted warrior serving a sovereign."],  // 1–N trimmed glosses
  "ex": "The knight drew his sword.",               // optional, v-later
  "ipa": "/naɪt/",                                  // optional, v-later
  "freq": 4120 }                                    // optional, v-later
```

## 3. Source: Wiktextract / Kaikki.org

- **Kaikki.org** publishes per-language machine-readable (JSONL) extractions of
  Wiktionary. Covers all 6 target locales (en, de, es, fr, it, pt).
- Each line = one entry: `senses[].glosses`, `pos`, `forms`, `sounds` (IPA),
  `translations`, `categories`/`tags`. **Multi-GB per language** → must stream.
- **License: CC BY-SA (+ GFDL).** Requires attribution and that the *definition
  dataset itself* stays share-alike. Fine to ship inside a **paid** app — it is
  not GPL-style viral across the game code; only the data file carries the
  license. Ship an in-app credits/attribution screen (stage 5). *Verify the
  exact dump URLs + sizes at fetch time; they version by Wiktionary dump date.*

## 4. The automation suite (`scripts/data/`)

Each stage is one script, mirroring the existing `scripts/normalize-dictionaries.mjs`
convention (Node, `.mjs`, streaming, idempotent). Raw + intermediate artifacts
live under the already-gitignored `tmp/` tree. The packaged output under
`public/definitions/` is **durable LOCAL storage**: gitignored, bundled into app
builds (public/ → dist/ → cap sync), but **never committed** and regenerated
only manually (`npm run data:all`). A fresh clone / new Mac must re-run the
pipeline (needs the ~11 GB raw `tmp/` cache, or a re-download).

| # | Script | In → Out | Notes / gotchas |
|---|--------|----------|-----------------|
| 0 | `fetch-sources.mjs` | Kaikki dumps → `data/raw/<locale>.jsonl(.gz)` | Idempotent, resumable, checksummed. Big files — progress bar. Skip if present. |
| 1 | `build-definitions.mjs` | `data/raw/*` + `public/dictionaries/<locale>.txt` → `data/normalized/<locale>.jsonl` | **Stream** (readline + JSON.parse per line — never load whole file). **Intersect with the validity list** (only keep words the game accepts — the big size-reducer). Cap senses (top 1–3). Strip wiki markup. Apply **family-friendly filter** (§6). Normalize case/diacritics exactly as `WordValidator` keys words. |
| 2 | `package-defs.mjs` | `data/normalized/*` → `public/definitions/<locale>/<bucket>.json` | Storage format = **prefix-bucketed JSON** (§5). Deterministic output (sorted keys) so diffs are clean. |
| 3 | `report-coverage.mjs` | normalized + packaged → `data/reports/<locale>.md` + summary | **The QA + size gate.** Per locale: % of validity words with a gloss, total packaged bytes, largest buckets, sample of missing words. This is how we get the real bundle-size number. |
| 4 | `gen-attribution.mjs` | source manifest → `public/credits/definitions-attribution.md` | CC BY-SA notice + per-locale Wiktionary dump dates. Bundled + linked from an in-app credits screen. |

**Orchestration (package.json):**
```
"data:fetch":   "node scripts/data/fetch-sources.mjs",
"data:build":   "node scripts/data/build-definitions.mjs",
"data:package": "node scripts/data/package-defs.mjs && node scripts/data/gen-attribution.mjs",
"data:report":  "node scripts/data/report-coverage.mjs",
"data:all":     "npm run data:fetch && npm run data:build && npm run data:package && npm run data:report"
```
`data:all` is run **manually on the Mac**, occasionally (only when refreshing
from a new Wiktionary dump) — not in the app build. The app build just bundles
whatever sits in `public/definitions/`.

## 5. Storage / lookup format (v1: bucketed JSON, no native dep)

Runtime access pattern = **single-key lookup, on demand** (show the gloss for
the one word the player just spelled). We must **never load a whole locale into
RAM** — the validity `Set` is already ~30 MB; definitions are bigger, and the
project's founding sin was an 800 MB Trie.

- **v1 — prefix-bucketed JSON.** `public/definitions/en/kn.json` = `{ "knight": [...], ... }`
  bucketed by first 2 chars. Look up a word → load+cache its bucket (tens of KB,
  parses in <5 ms) → keep cached for the session. ~hundreds of small files per
  locale. **Zero new native dependency** — works with the existing bundled-asset
  fetch + `content-type` guard. Ships today on Cap 8 SPM without pbxproj surgery.
- **Later optimization — bundled read-only SQLite** (`@capacitor-community/sqlite`)
  if lookup ergonomics demand it. Better random access, but adds a native plugin
  to both iOS (SPM) and Android. Defer until v1 proves insufficient. Stage 2 is
  the only stage that knows the format, so swapping is localized.

Word **validation stays as-is** (`.txt` → in-memory `Set`) — fast per-tile
checks. Definitions are a *separate* read-only keyed store. Don't merge them.

## 6. Family-friendly filter (9+ / educational brand)

Wiktionary carries vulgar / offensive / slur senses. The 9+ rating + educational
positioning means stage 1 must filter. Wiktextract tags senses with
`vulgar` / `offensive` / `ethnic slur` / `derogatory` in `tags`/`categories`.
Drop those **senses**; if a word's only senses are filtered, ship **no gloss**
for it (the word may still be *playable* — it's in the validity list — it just
shows no definition). Keep the blocklist/tag-set in a config constant, reviewable.

## 7. Bundle size + store implications

- **Estimate (pre-measurement):** intersecting glosses with validity lists,
  one short gloss/word → en ~25–30 MB, de larger (compounds), 6 locales plausibly
  **~150–300 MB uncompressed**, less after store compression. *Stage 3 gives the
  real number — measure before committing.*
- **iOS:** total-size cap is generous (GBs). Crossing **~200 MB** trips the
  cellular auto-download line (users on cellular get prompted) — acceptable, but
  worth knowing.
- **Android:** Google Play caps the base download; a large bundle **requires
  Play Asset Delivery** (install-time asset pack). Folds into Android bring-up
  (`docs/android-bringup-plan.md`).
- **Reverses `strip-non-en-dicts.mjs`** — we now bundle all 6 validity lists too,
  not just `en.txt`. Retire or repurpose that script.

## 8. Optional: capture as a Skill

Once the English slice proves the approach, consider a `source-game-data` skill
capturing the cross-project methodology: Kaikki source + license, the
streaming-JSONL requirement, the validity-intersection trick, family-friendly
filtering, the bundled-keyed-store pattern, store size budgets, and the
attribution reflex. Reusable for new languages, new data types, or a future game.
*Capture after the slice — don't encode an unproven procedure.*

## 9. Build sequence (de-risk before scaling)

1. **English vertical slice:** `fetch → build → report` for `en` only.
   Produces the real coverage % + size number, validates the streaming +
   intersection + filter logic. **No format/bundle commitment yet.**
2. Review the slice report with Sami → confirm storage format + size budget.
3. `package` the slice → wire one definition lookup into the demo UI end-to-end.
4. Scale stages to all 6 locales.
5. Android: add Play Asset Delivery if the measured size requires it.

## 10. Open decisions

- **Data fields for v1:** glosses only, or also POS / example / IPA / frequency
  now? (Same stream — cheap to include, bigger payload.)
- **Storage format:** confirm bucketed-JSON v1 vs jump straight to SQLite.
- **Size budget:** acceptance of ~100–300 MB app + Android asset packs (pending
  the real number from stage 3).
