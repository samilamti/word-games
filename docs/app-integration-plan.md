# App integration plan — definitions in-game + monetization

**Status:** plan (2026-06-06), for next session. The data layer is DONE
(`docs/data-pipeline-plan.md`): `public/definitions/<locale>/<bucket>.json`
(+ `manifest.json`, `CREDITS.md`), ~2.0M defs across 6 locales, durable-local,
gitignored, auto-bundled via `public/ → dist/ → cap sync`.

This phase turns that data into the in-game learning feature and the one-time
unlock. Monetization rails: see memory `monetization-direction` + `platform-scope`.

## 0. Entitlement map (what we're building toward)

| | Free demo | One-time unlock (`full_unlock`) |
|---|---|---|
| Languages | all 6 | all 6 |
| Live definitions (ephemeral, on play) | ✅ all 6 — the hook | ✅ |
| Campaign | enemies 1–2 | enemies 3–5 |
| Word journal (save words) | — | ✅ |
| Spaced review / quiz | — | ✅ |
| Per-language vocab tracking | — | ✅ |

Single boolean entitlement flips campaign 3–5 + the retention layer. Definitions
are **free to view** in every language; you pay to **keep + study** them and to
finish the campaign.

---

## Phase A — Definition lookup service (foundation, no UI)

**New:** `src/definitions/DefinitionService.ts`

- `bucketKey(word)` — **must byte-for-byte mirror** `scripts/data/package-defs.mjs`:
  `word.normalize('NFD')` → strip U+0300–U+036F → lowercase → first 2 chars →
  non-`[a-z]` → `_`. (Get this wrong and lookups miss.)
- `loadBucket(locale, bucket)` — `fetch('definitions/<locale>/<bucket>.json')`,
  **content-type guard** (Vite serves HTML 200 for missing files — copy the guard
  from `WordValidator.loadDictionary`), cache in a `Map`, coalesce concurrent
  loads (mirror `inflightLoad`). Bundled-only — no CDN fallback needed.
- `lookup(locale, word): Promise<DefEntry | null>` — load bucket, get entry; if
  it's a **redirect** (`{r, t}`), do a second lookup for the lemma and return its
  def annotated `formOf: { lemma, tags }`; surface `glossLang:'en'` when `gl` set.
- Types: `DefEntry = { senses:{pos,gloss}[], example?, ipa?, freqRank?, glossLang?, formOf? }`.
- Pure, game-state-free, unit-testable. Optionally read `manifest.json` to know
  which buckets exist (skip fetches that would 404).

## Phase B — Free "taste": show definitions in-game (M1, highest value)

**Changed:** `src/store/gameStore.ts`
- In `submitWord()` (line ~400) and `disputeWord()`, on success also set
  `lastDefinedWord: string` + `lastDefinedAt: number`. Pick the **longest** of
  `formedWords` (most meaningful). Mirror the volatile-timestamp pattern already
  used by `enemyAppearAt`.

**New:** `src/components/DefinitionToast.tsx`
- Watch `lastDefinedAt`; `key={lastDefinedAt}` to force remount (same trick as
  `EnemyAppearToast` + the CSS-keyframe toast in CLAUDE.md). On mount, await
  `DefinitionService.lookup(locale, word)`; render word · POS · gloss(es) ·
  example · IPA · "form of X" · "(EN)" badge when `glossLang==='en'`.
- Ephemeral by default (CSS auto-dismiss). A "★ Save" affordance appears but is
  **gated** (Phase D) — tapping it when locked opens the paywall.
- Mount in `src/components/Game.tsx` render tree (alongside `EnemyAppearToast`).

**Why first:** pure conversion fuel, free, all 6 languages, no billing
dependency. Shippable as a standalone free update.

## Phase C — Retention layer (the paid value; build ungated, gate in D)

**New stores/components:**
- `src/store/journalStore.ts` — persisted `lexica_knights_journal`. Entries:
  `{ word, locale, snapshot (senses/example/ipa), savedAt, srs:{ease,intervalDays,nextReviewAt,reps} }`.
  Actions: `save`, `remove`, `byLocale`, `due()`. Follow `settingsStore`'s
  persistence pattern.
- `src/components/JournalModal.tsx` + `JournalButton.tsx` — per-locale saved list,
  search, remove (pattern after `LeaderboardModal`/`LeaderboardButton`).
- `src/components/ReviewModal.tsx` — flashcard quiz over `due()` words; grade
  again/good/easy → update SRS (SM-2-lite or Leitner). 
- Per-language vocab tracking = a view derived from `journalStore` grouped by
  locale (words saved/reviewed per language).

## Phase D — Monetization (entitlement + paywall + gating)

**New:** `src/billing/billing.ts` + `src/store/entitlementStore.ts`
- `@revenuecat/purchases-capacitor` (verify **Capacitor 8 / SPM** support first —
  see the GameCenter custom-plugin notes in CLAUDE.md if native glue is needed).
- One non-consumable product → entitlement id `unlock`. `configure()`, read
  `customerInfo` on launch, `purchase()`, `restorePurchases()`.
- `entitlementStore.isUnlocked` hydrated from RevenueCat; **dev override** via a
  localStorage flag so we can test gating without a sandbox purchase.
- Web/dev: stub billing to the dev flag (web is dropped, but `npm run dev` must
  still run).

**New:** `src/components/Paywall.tsx` — the unlock offer (price pulled from the
RevenueCat offering), Buy + **Restore** (Apple requires a restore path). Localized.

**Gating hooks:**
- `gameStore.nextEnemy()` / advancing to `enemyIndex >= 2` → if `!isUnlocked`,
  show `Paywall` instead of `initGame`. Free = enemies index 0,1.
- Journal save / open Journal / open Review → paywall when locked.
- Definitions **view stays free**.

**Store config:** ASC non-consumable IAP (the `app-store-connect-api` skill —
note IAP product creation may be web-UI-only; confirm) + Play Console managed
product. `IN_APP_PURCHASE` capability already enabled on the bundle ID.

## Phase E — Bundling & build pipeline

- **Retire `scripts/strip-non-en-dicts.mjs`** — it slims the iOS bundle to en
  only; we now ship all 6. Remove it from the `ios:build` script (or repurpose to
  a verify/no-op). Ship all `public/dictionaries/*.txt` + all `public/definitions/`.
- Verify Vite copies `public/definitions/` into `dist/` and `cap sync` lands it in
  the iOS bundle; confirm WKWebView `fetch('definitions/...')` resolves (the
  dictionaries already prove the relative-fetch path).
- **Bundle size:** ~340 MB raw assets. Archive + altool upload must succeed; note
  the iOS ~200 MB cellular-download line (acceptable). 
- **Android (greenfield, biggest lift):** add `@capacitor/android`, generate
  `android/`; the 340 MB exceeds Play's base AAB cap → **Play Asset Delivery**
  (install-time asset pack) for `definitions/`. Fold into `docs/android-bringup-plan.md`.

## Phase F — i18n for new UI

Extend `UIStrings` (`src/i18n/locales.ts`) + `useUI` with keys for: definition
labels ("form of", "in English", POS abbreviations), journal (save/saved/title/
empty), review (review/again/good/easy/due), paywall (title/features/CTA/restore).
Add all 6 translations. **Recommendation:** English-first through M1–M3; localize
all 6 before store submission.

---

## Milestones (each independently shippable)

- **M1 = A + B** — definitions show in-game, free, 6 languages. Pure conversion
  fuel; ship as a free TestFlight/Play update. **Do first.**
- **M2 = C** — journal + review + vocab built, behind a dev flag.
- **M3 = D** — RevenueCat + paywall + gating live (campaign 3–5 + retention).
- **M4 = E + F** — retire strip, verify iOS bundle, localize, then Android + PAD.

## Open decisions (resolve at session start)

1. **Definition UX** — auto-toast on every play vs tap-to-reveal? Toast vs
   persistent card? (Lean: auto toast, tap to expand/save.)
2. **Which word to define** — longest formed word, or main-direction word, or all?
   (Lean: longest.)
3. **Campaign split** — free = first 2 enemies, gate at the 3rd? (Confirm.)
4. **Pricing** — the IAP tier. Account is SEK; match price to SEK to avoid double
   FX (machine memory). Apple + Google tier mapping.
5. **Billing** — RevenueCat (default) vs native StoreKit2/Play Billing. (Confirm.)
6. **Entitlement scope** — anonymous per-store now (no accounts), cross-platform
   login later? (Lean: per-store now.)
7. **SRS depth** — full SM-2 vs simple Leitner/flashcards for v1. (Lean: simple.)
8. **i18n timing** — English-first then localize, vs all-6 upfront. (Lean: EN-first.)

## Risks / gotchas

- **bucketKey drift** — runtime fold MUST match `package-defs.mjs` exactly.
- **WKWebView bundled fetch** — keep the content-type guard (Vite HTML-200 trap).
- **RevenueCat × Capacitor 8 SPM** — confirm plugin support before committing;
  custom native glue follows the GameCenter pattern if needed.
- **App Review** — paid unlock needs a working Restore; paywall must state plainly
  what's unlocked; 9+/educational is otherwise clean.
- **Android PAD** — non-trivial; the single biggest task in M4.
- **Bundle size** — first ~340 MB archive may surface new altool quirks; the
  `Defaults.properties` retry trick (CLAUDE.md) still applies.

## Suggested first session move

Build **Phase A** (`DefinitionService` + a unit test against a known word like
`knight`/`casa`, incl. a redirect case) → then **Phase B** (toast) → see a real
definition pop in `npm run dev` when you play a word. That's M1, the conversion
hook, end-to-end before any billing work.
