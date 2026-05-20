# Lexica Knights

**A multi-language word combat RPG where spelling is your weapon.**

Spell words on a 13×13 board to deal damage to monsters. Chain premium squares, build longer words for multipliers, defeat five increasingly tough enemies. Available on iOS (TestFlight, App Store pending) and on the web.

---

## Features

- **Word combat** — Place tiles, form words, deal damage. Longer and rarer words hit harder.
- **6 languages** — English, Español, Français, Deutsch, Italiano, Português. Each with its own Scrabble-standard tile distribution and dictionary (3.3 M words total).
- **5-enemy campaign** — Ink Goblin → Brute Orc → Cave Troll → Risen Undead → Shadow Wraith. Each spawned with a volatile "A wild X appears!" toast.
- **PixiJS combat scene** — hand-coded wizard + Blender-rendered enemy sprites with attack lunges, hurt shakes, death tilts, and floating damage numbers.
- **Floating HP bars** above each character (player and enemy) with name, ATK/DEF, and live HP.
- **Touch + mouse drag** — pointer-event-based tile drag works on iOS and desktop. Single-tap on a placed tile returns it to the rack.
- **Dispute system with persistence** — challenge a rejected word, optionally explain why, and the word is accepted both for this game and every future game on this device (per-locale list). Submissions are emailed to the dev via Web3Forms for curation into future dictionary refreshes.
- **Local leaderboard** — per-device top runs, sortable by total damage / best hit / longest word / fewest turns.
- **Game Center integration** (iOS) — the player's Game Center alias appears above the wizard's HP bar.
- **Procedural audio** — synthesized sound effects via Web Audio API (no audio files shipped).

---

## How to play

1. **Place tiles** from your rack onto the board by dragging or tapping.
2. **Form a word** in a straight line (horizontal or vertical), no gaps.
3. **First move** must cover the center star.
4. **Submit**. If the word's valid, the enemy takes damage. If not, the **Dispute!** button lets you accept it anyway.
5. **Survive** the enemy's counterattack and **draw** tiles to refill your rack.
6. **Repeat** until you defeat the enemy → **Next Enemy** advances the campaign.

### Damage formula

```
damage = base_score × word_multiplier × length_multiplier × 3
```

Length multipliers: 2-letter 0.5×, 3-letter 1.0×, 4-letter 1.2×, 5-letter 1.5×, 6-letter 1.8×, 7-letter 2.2×, 8+ letter 2.5×+.

### Premium squares

| Square | Effect |
|:------:|:-------|
| DL / TL | Double / triple letter value |
| DW / TW | Double / triple word multiplier |
| Gem Forge | Double tile value |
| Void | Blocked — no tiles can be placed |
| Center ★ | Double word multiplier; first word goes here |

Premium bonuses only apply the turn a tile is placed on that square.

---

## Getting started

### Prerequisites

- Node.js 20+ and npm
- For iOS dev: macOS, Xcode 15+, an Apple Developer account

### Web dev

```bash
git clone https://github.com/samilamti/word-games.git
cd word-games
npm install
npm run dev    # http://localhost:5188
```

### iOS build → TestFlight

Set up secrets in `.env.local` (gitignored):

```
ASC_KEY_ID=…
ASC_ISSUER_ID=…
ASC_KEY_PATH=/Users/you/.appstoreconnect/private_keys/AuthKey_<id>.p8
ASC_TEAM_ID=…
ASC_BUNDLE_ID=com.samixavierlamti.lexiconquest
ASC_APP_NAME=Lexica Knights
VITE_WEB3FORMS_KEY=…   # optional, for live beta feedback
```

Then:

```bash
npm run ios:build      # vite build + strip non-EN dicts + cap sync ios
# Archive + upload via xcodebuild + altool (see scripts/asc/ for the chain)
```

### Commands

| Command | Description |
|:--------|:------------|
| `npm run dev` | Vite dev server with HMR (port 5188) |
| `npm run build` | TypeScript check + production build to `dist/` |
| `npm run ios:build` | iOS-targeted build: bundles only EN dict, syncs Xcode project |
| `npm run ios:open` | Opens `ios/App/App.xcodeproj` in Xcode |
| `npm run ios:assets` | Rasterize SVG → PNG + generate iOS icon/splash variants |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

---

## Project structure

```
src/
  types/index.ts            Shared types, board layout, premium squares
  types/enemies.ts          5-enemy catalog with stats, tagline, sprite URL
  i18n/
    locales.ts              6 LocaleDef bundles: tile distribution + UI strings + dict URL
    accepted-words.ts       Per-locale dispute-accepted words (localStorage)
    useUI.ts                Hook returning the active locale's UI strings
  engine/
    BoardState.ts           Board logic: placement, validation, word detection
    WordValidator.ts        Set-based dict (locale-aware, supports user accepted list)
    ScoreCalculator.ts      Damage formulas
    TileBag.ts              Tile bag (constructor takes a LocaleDef)
  leaderboard/leaderboard.ts  Local high-score persistence + sort
  store/gameStore.ts        Zustand store: state, actions, game phases, locale, run stats
  components/
    Game.tsx                Root: dictionary loading, enemy progression, scroll fix
    GameBoard.tsx           13×13 grid with [data-cell-row/col] hit-test attrs
    TileRack.tsx            Touch drag + tap, pointer events, ghost element
    CombatHUD.tsx           Slim message strip + score breakdown + tile counter
    ActionBar.tsx           Submit / Recall / Dispute (with Haptics on Submit)
    DisputeDialog.tsx       Word dispute modal
    EnemyAppearToast.tsx    Fixed-position "A wild X appears!" toast
    FeedbackButton.tsx      Beta feedback floating button
    LeaderboardButton.tsx   🏆 floating button + LeaderboardModal
    LanguagePicker.tsx      🌐 top-right flag button + picker modal
  combat/BattleOverlay.tsx  PixiJS scene: characters, HP bars, damage numbers
  audio/SoundManager.ts     Procedural Web Audio sound effects
  beta/feedbackService.ts   localStorage + Web3Forms email transport
  native/init.ts            StatusBar / SplashScreen / Game Center / Haptics
public/
  enemies/                  Blender-rendered enemy sprites (PNG, 1024×1024)
  dictionaries/             Per-locale word lists (en.txt bundled in iOS; rest via CDN)
  favicon.png               Brand icon
ios/                        Capacitor 8 Xcode project with App.entitlements + GameCenterPlugin.swift
resources/                  SVG icon source + Blender output (icon.png, splash.png, enemies/)
scripts/
  asc/                      App Store Connect REST API automation (ES256 JWT, bundleIds, app metadata, screenshot upload, build attach)
  blender/render_enemies.py Procedural chibi-enemy renders (Eevee, orthographic, 3-point lit)
  build-assets.mjs          SVG → PNG rasterizer (sharp)
  normalize-dictionaries.mjs Locale-aware dict cleanup (lowercase, alpha-only, dedupe, sort)
  strip-non-en-dicts.mjs    Hybrid delivery: removes non-EN dicts from dist/ before iOS sync
```

---

## Tech stack

| Layer | Technology |
|:------|:-----------|
| Build | Vite 7 |
| UI | React 19 + TypeScript 5.9 |
| State | Zustand 5 |
| Graphics | PixiJS 8 (combat overlay) |
| Audio | Web Audio API |
| Native shell | Capacitor 8 (iOS) with Swift Package Manager |
| 3D renders | Blender 5 (procedural Python builds, Eevee Next renderer) |
| Web hosting | GitHub Pages via Actions |
| Native hosting | TestFlight / App Store Connect |

---

## Deployment

- **Web**: pushes to `main` trigger `.github/workflows/static.yml` which runs `npm ci && npm run build` and uploads `dist/` as a Pages artifact. Live at https://samilamti.github.io/word-games/.
- **iOS**: `npm run ios:build` produces an iOS-ready bundle. `scripts/asc/` contains the full pipeline (archive, export, altool upload, attach-to-version, encryption declaration). Build numbers must be unique per TestFlight upload.

---

## License

Released under the [Business Source License 1.1](./LICENSE.MD) (effective 2026-04-26). Converts to a GPL 2.0+-compatible license on the fourth anniversary of the first publicly available distribution.
