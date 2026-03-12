# Lexicon Quest

**A word combat RPG where spelling is your weapon.**

Spell words on a 13x13 board to deal damage to enemies. Chain premium squares, build longer words for multiplier bonuses, and defeat monsters with your vocabulary.

> **Status:** Beta — [play it now](#deployment) or run locally.

---

## Features

- **Word Combat** — Place tiles, form words, deal damage. Longer and rarer words hit harder.
- **13x13 Board** — Premium squares (Double/Triple Letter, Double/Triple Word, Gem Forge) amplify your attacks.
- **Turn-Based Battles** — Spell a word, deal damage, survive the enemy counterattack, draw new tiles.
- **Combat Animations** — PixiJS-powered character sprites (Wizard vs. Goblin) with attack lunges, hit reactions, and floating damage numbers.
- **Procedural Audio** — Synthesized sound effects via Web Audio API — no external audio files needed.
- **Word Dispute System** — Think the dictionary is wrong? Dispute a rejected word, provide a definition, and the game accepts it (stored for review).
- **Beta Feedback** — Built-in bug reports and suggestions, saved locally and optionally forwarded to a remote API.

---

## How to Play

1. **Place tiles** from your rack onto the board by dragging or tapping.
2. **Form a word** — tiles must be in a straight line (horizontal or vertical) with no gaps.
3. **First move** must cover the center star square.
4. **Submit** your word. If it's valid, damage is dealt to the enemy.
5. **Survive** the enemy's counterattack.
6. **Draw** new tiles to refill your rack to 7.
7. **Repeat** until you defeat the enemy — or fall in battle.

### Damage Formula

```
damage = base_score x word_multiplier x length_multiplier x 3
```

| Word Length | Multiplier |
|:-----------:|:----------:|
| 2 letters   | 0.5x       |
| 3 letters   | 1.0x       |
| 4 letters   | 1.2x       |
| 5 letters   | 1.5x       |
| 6 letters   | 1.8x       |
| 7 letters   | 2.2x       |
| 8+ letters  | 2.5x+      |

### Tile Tiers

| Tier       | Points | Letters                        |
|:----------:|:------:|:-------------------------------|
| Common     | 1      | A E I O U S T R N L            |
| Uncommon   | 1.5    | D G C M P H B F W Y            |
| Rare       | 2.5    | K V J X                        |
| Legendary  | 4      | Q Z                            |

### Premium Squares

| Square       | Effect                                     |
|:------------:|:-------------------------------------------|
| DL           | Double letter value                        |
| TL           | Triple letter value                        |
| DW           | Double word multiplier                     |
| TW           | Triple word multiplier                     |
| Gem Forge    | Double tile value (gem system planned)     |
| Void         | Blocked — no tiles can be placed           |
| Center (star)| Double word multiplier; first word goes here|

Premium bonuses only apply the turn a tile is placed on that square.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- npm

### Install & Run

```bash
git clone <your-repo-url>
cd Wordgames
npm install
npm run dev
```

Open `http://localhost:5173` (or the port Vite reports).

### Commands

| Command              | Description                                 |
|:---------------------|:--------------------------------------------|
| `npm run dev`        | Start Vite dev server with HMR              |
| `npm run build`      | TypeScript check + production build to `dist/` |
| `npm run preview`    | Preview the production build locally        |
| `npm run lint`       | Run ESLint                                  |
| `npm run test`       | Run tests with Vitest                       |
| `npx tsc -b`         | TypeScript type check only                  |

---

## Project Structure

```
src/
  types/index.ts           Shared types, constants, tile & board config
  engine/
    BoardState.ts          Board logic: placement, validation, word detection
    WordValidator.ts       Trie-based dictionary (2,582-word fallback)
    ScoreCalculator.ts     Damage formulas for all play types
    TileBag.ts             Tile bag: shuffle, draw, return
  store/
    gameStore.ts           Zustand store: state, actions, game phases
  components/
    Game.tsx               Root component, enemy init, phase management
    GameBoard.tsx          13x13 interactive grid with drag-drop
    TileRack.tsx           Player tile rack (7 tiles)
    CombatHUD.tsx          HP bars, stats, score breakdown
    ActionBar.tsx          Submit / Recall / Dispute buttons
    DisputeDialog.tsx      Word dispute modal
    FeedbackButton.tsx     Floating beta feedback modal
  combat/
    BattleOverlay.tsx      PixiJS combat animations & damage floaters
  audio/
    SoundManager.ts        Procedural Web Audio sound effects
  beta/
    feedbackService.ts     localStorage + optional remote POST
```

---

## Tech Stack

| Layer          | Technology                         |
|:---------------|:-----------------------------------|
| Build          | Vite 7                             |
| UI             | React 19 + TypeScript 5.9          |
| State          | Zustand 5                          |
| Graphics       | PixiJS 8 (combat animations)       |
| Audio          | Web Audio API (procedural synthesis)|
| Deployment     | GitHub Pages via Actions            |
| Testing        | Vitest                             |

---

## Beta Features

### Word Dispute System

When the dictionary rejects a word you believe is valid:

1. A **Dispute!** button appears after rejection.
2. Click it to open the dispute dialog.
3. Optionally describe what the word means.
4. Submit — the word is **accepted**, damage is scored, and the dispute is saved for review.

### Feedback

A floating **Beta Feedback** button in the bottom-right lets players submit:
- Bug reports
- Suggestions
- Word issues
- General feedback

All data is stored in `localStorage`. To enable remote forwarding, set `FEEDBACK_API_URL` in `src/beta/feedbackService.ts`.

**localStorage keys:** `lexicon_quest_disputes`, `lexicon_quest_feedback`

---

## Deployment

The game auto-deploys to **GitHub Pages** on every push to `main`.

**How it works:**
- `.github/workflows/deploy.yml` runs `npm ci && npm run build`
- The `dist/` folder is uploaded as a Pages artifact
- `vite.config.ts` uses `base: './'` so assets load from any subpath

**To enable:**
1. Push the repo to GitHub.
2. Go to **Settings > Pages** and set the source to **GitHub Actions**.
3. Your game will be live at `https://<user>.github.io/<repo>/`.

---

## Roadmap

- [x] **Phase 1** — Board, rack, tile placement, word validation, combat loop
- [x] **Beta** — Feedback system, word disputes, GitHub Pages deployment
- [ ] **Phase 2** — INSERT mechanic (inject letters mid-word) and BRANCH mechanic (perpendicular word branching)
- [ ] **Phase 3** — Gem tiles, status effects (poison, stun, shield), enemy AI
- [ ] **Phase 4** — Campaign Chapter 1: 5 enemies + boss, treasures, RPG progression

---

## License

TBD
