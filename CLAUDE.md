# Lexicon Quest - Word Combat RPG

## Tech Stack
- Vite + React 19 + TypeScript + Zustand (state management)
- DOM-based rendering (PixiJS planned for later phases)
- Dev server: `npx vite --port 5188`

## Project Structure
- `src/types/index.ts` — All shared types, constants, tile distribution, board layout
- `src/engine/` — Pure logic: BoardState, WordValidator, TileBag, ScoreCalculator
- `src/store/gameStore.ts` — Zustand store with full game state and actions
- `src/components/` — React UI: Game, GameBoard, TileRack, CombatHUD, ActionBar

## Commands
- `npx tsc -b` — TypeScript check (strict mode, unused vars are errors)
- `npx vite --port 5188` — Dev server

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
- Phase 2 TODO: INSERT and BRANCH mechanics
- Phase 3 TODO: Gems, status effects, enemy AI
- Phase 4 TODO: Campaign Chapter 1 (5 enemies + boss, treasures, RPG progression)
