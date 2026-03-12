# Lexicon Quest - Word Combat RPG

## Tech Stack
- Vite + React 19 + TypeScript + Zustand (state management)
- DOM-based rendering (PixiJS planned for later phases)
- Dev server: `npx vite --port 5188`

## Project Structure
- `src/types/index.ts` — All shared types, constants, tile distribution, board layout
- `src/engine/` — Pure logic: BoardState, WordValidator, TileBag, ScoreCalculator
- `src/store/gameStore.ts` — Zustand store with full game state and actions
- `src/components/` — React UI: Game, GameBoard, TileRack, CombatHUD, ActionBar, FeedbackButton, DisputeDialog
- `src/beta/` — Beta feedback: feedbackService (localStorage + optional remote POST)
- `src/combat/` — Combat visuals: BattleOverlay (PixiJS character animations, damage floaters)
- `src/audio/` — Sound management: SoundManager

## Commands
- `npx tsc -b` — TypeScript check (strict mode, unused vars are errors)
- `npx vite --port 5188` — Dev server
- `npm run build` — Production build (tsc + vite build → `dist/`)
- `npx vite preview` — Preview production build locally

## Build & Deploy
- GitHub Pages via `.github/workflows/deploy.yml` — auto-deploys on push to `main`
- `vite.config.ts` uses `base: './'` for relative asset paths (works on any subpath)
- Build output goes to `dist/` (gitignored)

## Key Gotchas
- Windows: use `cmd /c npx ...` in launch.json runtimeExecutable (bare `npx` causes ENOENT)
- Vite returns HTML with 200 for missing static files — always check content-type header
- Dictionary: fetches `/dictionary.txt`, falls back to built-in 2,582-word list in WordValidator.ts
- Window debug exposure requires double cast: `(window as unknown as Record<string, unknown>)`

## Game Design
- 13x13 board with premium squares (DL, TL, DW, TW, GEM_FORGE, VOID, CENTER)
- Turn-based combat: spell words → deal damage → enemy counterattacks → refill tiles
- Damage = SUM(tile_values) × word_length_multiplier × COMBAT_SCALAR(3)
- Planned mechanics: INSERT (inject letters mid-word), BRANCH/Fork (additive word branching)

## Implementation Status
- Phase 1 DONE: Board, rack, drag+tap tile placement, word validation, combat loop
- Beta features DONE: Feedback button, word dispute system (localStorage + remote POST)
- Deployment DONE: GitHub Pages via Actions workflow
- Phase 2 TODO: INSERT and BRANCH mechanics
- Phase 3 TODO: Gems, status effects, enemy AI
- Phase 4 TODO: Campaign Chapter 1 (5 enemies + boss, treasures, RPG progression)

## Beta Feedback System
- `src/beta/feedbackService.ts` — Set `FEEDBACK_API_URL` to enable remote POST (empty = localStorage only)
- localStorage keys: `lexicon_quest_disputes`, `lexicon_quest_feedback`
- Word disputes: when a word is rejected, player can dispute it → word is accepted, scored, and dispute is stored for review
- `disputeWord()` in gameStore replays the scoring path, skipping dictionary validation
