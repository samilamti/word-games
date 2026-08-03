# Lexica Knights — Word Combat RPG

Multi-language tile-based word combat game shipping to iOS App Store (TestFlight as of build 9) and the web.

## Tech stack

- Vite 7 + React 19 + TypeScript 5.9 + Zustand 5
- PixiJS 8 for combat overlay (characters, HP bars, damage numbers)
- Capacitor 8 (Swift Package Manager) for iOS native shell
- Blender 5 for procedural enemy renders (run via `--background --python`)
- Web Audio API for procedural sound effects
- Custom App Store Connect REST API client in `scripts/asc/` (ES256 JWT, Node 24 `--env-file`)
- Web3Forms transport for beta feedback (set `VITE_WEB3FORMS_KEY` to enable; empty = localStorage only)

## Commands

- `npm run dev` — Vite dev (port 5188)
- `npm run build` — `tsc -b && vite build` → `dist/`
- `npm run ios:build` — `CAPACITOR=1 npm run build && node scripts/strip-non-bundled-assets.mjs && npx cap sync ios`
- `npm run ios:release` — full TestFlight pipeline (build→archive→export→altool); **dry-run by default**, add `-- --confirm` to ship, `-- --status` to query build states. Auto-picks the next build number from ASC. See `scripts/asc/release.mjs`.
- `npm run ios:open` — open Xcode workspace
- `npm run ios:assets` — rasterize SVG → PNG + `npx capacitor-assets generate --ios`
- `npm run android:build` — web build + strip + `cap sync android`; then Gradle: `cd android && JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleDebug`
- `scripts/android-smoke.sh [--avd NAME] [--skip-build] [--keep-running]` — full Android smoke: build → boot AVD headless → install → launch → screenshot (`/tmp/lexica-android-smoke.png`) → logcat fatal scan
- `npm run data:publish` — publish `public/definitions/` to the R2 CDN bucket (dry-run by default, `-- --confirm` to upload; needs the four `R2_*`/`CLOUDFLARE_API_TOKEN` vars in `.env.local` — see `scripts/publish-definitions.mjs` header)
- `npx tsc -b` — TypeScript check only

## Key directories

- `src/i18n/` — 6 LocaleDef bundles (tile distribution + UI strings + dict URL), per-locale accepted-words list, `useUI()` hook
- `src/engine/` — Pure logic: `BoardState`, `WordValidator` (Set-based, locale-aware), `ScoreCalculator`, `TileBag` (takes a `LocaleDef`)
- `src/store/gameStore.ts` — Zustand store: game state, run stats, current locale, Game Center alias, enemy progression. Enemy attacks are deferred via `pendingEnemyTurn` so the tile-drop juice plays before damage lands (`resolveEnemyAttack`)
- `src/store/settingsStore.ts` — Zustand store for accessibility/feel toggles (`reduceMotion` / `soundEnabled` / `hapticsEnabled`), persisted to `lexica_knights_settings`; read by `SoundManager` mute + `triggerHaptic`/`triggerRumble` + the tile-drop controller
- `src/components/` — React UI including `LanguagePicker`, `LeaderboardButton`, `LeaderboardModal`, `EnemyAppearToast`, `SettingsButton` (gear → sound/vibration/reduce-motion)
- `src/combat/BattleOverlay.tsx` — PixiJS app with `CharacterController`, `HpBar`, `DamageNumberManager`, ResizeObserver-driven responsive canvas
- `src/leaderboard/leaderboard.ts` — Local per-device run records
- `src/native/init.ts` — StatusBar / SplashScreen / Game Center auth / Haptics
- `ios/App/App/GameCenterPlugin.swift` — Custom CAPBridgedPlugin wrapping `GKLocalPlayer.authenticateHandler`
- `public/enemies/*.png` — Blender-rendered chibi sprites (1024×1024, transparent BG)
- `public/dictionaries/*.txt` — 6 word lists, 3.3M words total (native bundle ships only `en`+`pt`; others fetched on demand from the CDN). `public/definitions/<locale>/<bucket>.json` — bucketed defs, 346 MB total, same Option B delivery (en+pt bundled ~58 MB, rest via `VITE_DEFS_CDN_BASE`); gitignored/durable-local
- `scripts/asc/` — App Store Connect API automation (bundle ID, app metadata, age rating, build attach, encryption, screenshots)
- `scripts/blender/render_enemies.py` — Procedural Blender script for all 5 enemies
- `scripts/normalize-dictionaries.mjs` — Raw word lists → clean per-locale text files
- `scripts/strip-non-bundled-assets.mjs` — Post-build hook (Option B delivery): keeps only the `BUNDLED_LOCALES` starter set (`en`+`pt`) of **both** dictionaries and definitions in the native bundle; the rest are CDN-fetched + cached at runtime. Edit the one `BUNDLED_LOCALES` set to change the offline baseline

## Key gotchas

- **iOS HTML5 drag/drop doesn't work from touch.** TileRack uses pointer events with a 6px threshold to distinguish tap from drag. Board cells expose `data-cell-row` / `data-cell-col` attrs for `elementFromPoint` hit-testing.
- **Set, not Trie, for the dictionary.** A Trie at 1M+ entries (German) was prohibitively memory-heavy on mobile. Set lookup is O(1) average; per-locale `loadDictionary(locale)` is coalesced and falls back to a CDN URL when the local file is missing.
- **PixiJS 8 + Capacitor 8** uses Swift Package Manager (no CocoaPods, no `.xcworkspace`). Custom plugins added directly to the App target are picked up at runtime via Objective-C runtime discovery — see `GameCenterPlugin.swift` and the four manual injections in `project.pbxproj`.
- **First archive after adding a new capability** needs an explicit `-authenticationKeyPath` flag, not just `-authenticationKeyID`. Provisioning profile auto-discovery via the canonical `.p8` location works for steady-state but not the initial fetch with a new entitlement. Delete cached profiles at `~/Library/Developer/Xcode/UserData/Provisioning Profiles/` if a profile mismatch persists.
- **HP bars float above characters as PixiJS children of `app.stage`** (NOT the character containers) so they stay at constant on-screen size regardless of responsive board scaling. X is clamped to canvas bounds.
- **Wild-toast animation uses CSS keyframes + `key={enemyAppearAt}` to force re-mount.** React `useState`-based timing had a bug where the toast never showed — pure CSS keyframes with `forwards` is simpler and reliable.
- **Vite returns HTML 200 for missing static files** — `WordValidator.loadDictionary` checks `content-type` to distinguish a real dictionary fetch from a SPA fallback page.
- **Window debug exposure** uses double cast: `(window as unknown as Record<string, unknown>).__store = useGameStore`.
- **The `Defaults.properties` altool transient error** sometimes fires on the FIRST upload after a chained build. Just retry the `xcrun altool --upload-app` command; second run typically succeeds.
- **CocoaPods 1.16 + Ruby 4.0 crashes** without `LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8`. We use SPM so this only matters if someone re-introduces CocoaPods.
- **Android Gradle builds need JDK 21** — Capacitor 8's `capacitor-android` compiles at source release 21; JDK 17 fails with `invalid source release: 21`. No install needed: Android Studio's bundled JBR is 21 (`JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"`). SDK path comes from gitignored `android/local.properties`.
- **M2/M3 is UN-GATED as of 2026-07-29 — `devStore` and its `m2Enabled` flag are DELETED.** The journal/review/paywall are now normal user-facing features; the hidden 7-tap Settings-title trigger and `__lexicaDev` are gone too. `requireUnlock()` is the single gate: **enemies 1–2 free, 3–5 + the retention layer behind the `full_unlock` IAP** (`FREE_ENEMY_COUNT = 2` in `Game.tsx`). `__lexicaUnlock` remains as the dev entitlement toggle.
- **The PRODUCTION WEB build is deliberately never gated** (`requireUnlock` short-circuits when `!isNativePlatform() && !import.meta.env.DEV`). Web has no store and per the platform-scope decision gets no accounts/license backend, so a web paywall could never be satisfied — but `.github/workflows/static.yml` still publishes the web build to GitHub Pages, so it must stay playable. The **dev server IS gated** so the paywall stays testable locally (`billing.purchase()` simulates success under `npm run dev`).

## App Store Connect notes

- Bundle ID: `com.samixavierlamti.lexiconquest` → resource id `99822XJB2Y` (Universal)
- ASC app id: `6765603467` ("Lexica Knights")
- Categories: primary `GAMES` with subcategories `GAMES_PUZZLE` (primary), `GAMES_STRATEGY` (secondary). **There's no `GAMES_WORD`** — Apple consolidated taxonomy.
- Capabilities enabled on App ID: `IN_APP_PURCHASE` (default), `GAME_CENTER` (added in v6)
- Age rating profile: `violenceCartoonOrFantasy=INFREQUENT_OR_MILD`, everything else `NONE` / `false` → 9+
- Encryption: `usesNonExemptEncryption=false` (HTTPS via WKWebView is exempt). `ITSAppUsesNonExemptEncryption=false` is in `Info.plist`, so builds skip the TestFlight "Missing Compliance" gate.
- Privacy declaration in App Store Connect web UI must include the Web3Forms feedback transmission when `VITE_WEB3FORMS_KEY` is set in production
- **Cutting a build:** `npm run ios:release` (dry-run) → `-- --confirm` to ship. The script (`scripts/asc/release.mjs`) reads the next build number from ASC, archives with a `CURRENT_PROJECT_VERSION` CLI override (so `pbxproj` stays at `1` — bumps are never committed), exports, uploads via `altool` (retries the transient `Defaults.properties` error), and sets the en-US "What to Test" note. The `scripts/asc/*.mjs` API helpers run via `node --env-file=.env.local` (creds: `ASC_KEY_ID`/`ISSUER_ID`/`KEY_PATH`/`TEAM_ID`; signing key `6368K27LRK`).

## Storage keys (localStorage)

- `lexica_knights_disputes` — dispute submissions (mirror of what Web3Forms emails)
- `lexica_knights_feedback` — beta feedback submissions
- `lexica_knights_runs` — leaderboard entries (capped at 50)
- `lexica_knights_locale` — current language code
- `lexica_knights_accepted_words_<locale>` — per-locale dispute-accepted words
- `lexica_knights_unlock` — cached `full_unlock` entitlement (`billing.ts`); persisted so a returning owner never flashes the paywall before RevenueCat answers. (`lexica_knights_dev`, the old M2 preview flag, is retired — the flag was deleted 2026-07-29.)
- `lexica_knights_settings` — accessibility/feel toggles (`reduceMotion`, `soundEnabled`, `hapticsEnabled`); `settingsStore`, defaults `reduceMotion` from `prefers-reduced-motion`

## Game design

- 13×13 board with premium squares (DL, TL, DW, TW, GEM_FORGE, VOID, CENTER ★)
- Turn-based combat: spell word → deal damage → enemy counterattacks → refill tiles → repeat
- Damage = `SUM(tile values) × word_length_multiplier × COMBAT_SCALAR(3)`
- 5-enemy campaign with stats curve (HP 80 → 240, ATK 8 → 18)
- Per-locale tile distributions and point values follow Wikipedia Scrabble standards
- Planned mechanics (TODO): INSERT (inject letters mid-word), BRANCH (perpendicular word branching), gem effects, status effects
- **Shipped (build 9, pulled forward ahead of monetization):** **game feel / juice** — when the enemy plays a word, its tiles tumble in (3D CSS `rotateX` under board `perspective`, reading-order stagger) and slam down with a screen shake + impact thud + device rumble. A free *core retention* feature, **not** an IAP (juice belongs in the free demo as conversion fuel, not behind a paywall). Implementation: DOM/CSS tumble via `.tile-drop-in` keyframes (`index.css`) applied in `GameBoard`; WAAPI screen shake on the board+canvas wrapper; **delayed** sequencing (tiles land → *then* attack) via `pendingEnemyTurn` deferral in `gameStore` + a controller hook in `Game.tsx`; `tileImpact` SFX (`SoundManager`); `triggerRumble()` (`native/init.ts`). Gated by a new `settingsStore` (sound / vibration / reduce-motion) surfaced via `SettingsButton`. Runbook + decisions: `docs/tile-drop-3d-juice-plan.md`. Possible future upgrades: per-tile thuds, Pixi particle burst on land, low-end Android jank check (Android still greenfield).
- Planned polish (TODO): symmetric player-side "lock-in" pulse on submit (a lighter pulse, **not** a sky-drop — the player drags their tiles, so a fall would feel wrong).
