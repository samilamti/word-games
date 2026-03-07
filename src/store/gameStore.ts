import { create } from 'zustand';
import type { BoardCell, Tile } from '../types/index.ts';
import { BOARD_SIZE, RACK_SIZE } from '../types/index.ts';
import { createEmptyBoard, placeTile, removeTile, validatePlacement } from '../engine/BoardState.ts';
import { TileBag } from '../engine/TileBag.ts';
import { getValidator } from '../engine/WordValidator.ts';
import { calculatePlacementDamage } from '../engine/ScoreCalculator.ts';
import type { ScoreBreakdown } from '../engine/ScoreCalculator.ts';

export type GamePhase = 'loading' | 'playing' | 'enemy_turn' | 'victory' | 'defeat';

export interface EnemyState {
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
}

interface PendingTile {
  tile: Tile;
  row: number;
  col: number;
}

export interface GameState {
  // Board
  grid: BoardCell[][];
  tileBag: TileBag;

  // Player
  rack: Tile[];
  playerHp: number;
  playerMaxHp: number;
  playerAttack: number;
  playerDefense: number;

  // Enemy
  enemy: EnemyState | null;

  // Turn state
  phase: GamePhase;
  turnNumber: number;
  pendingTiles: PendingTile[];
  lastScore: ScoreBreakdown | null;
  message: string;

  // Dictionary loaded
  dictionaryLoaded: boolean;

  // Actions
  initGame: (enemy: EnemyState) => void;
  setDictionaryLoaded: (loaded: boolean) => void;
  placePendingTile: (tile: Tile, row: number, col: number) => boolean;
  tapPlaceTile: (tile: Tile) => boolean;
  removePendingTile: (row: number, col: number) => void;
  returnPendingToRack: () => void;
  submitWord: () => { success: boolean; damage: number; error?: string };
  swapTiles: (tilesToSwap: Tile[]) => void;
  enemyTurn: () => void;
  drawTiles: () => void;
  setMessage: (msg: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  grid: createEmptyBoard(),
  tileBag: new TileBag(),
  rack: [],
  playerHp: 100,
  playerMaxHp: 100,
  playerAttack: 0,
  playerDefense: 0,
  enemy: null,
  phase: 'loading',
  turnNumber: 1,
  pendingTiles: [],
  lastScore: null,
  message: 'Loading dictionary...',
  dictionaryLoaded: false,

  initGame: (enemy: EnemyState) => {
    const tileBag = new TileBag();
    const rack = tileBag.draw(RACK_SIZE);
    set({
      grid: createEmptyBoard(),
      tileBag,
      rack,
      playerHp: 100,
      playerMaxHp: 100,
      playerAttack: 0,
      playerDefense: 0,
      enemy,
      phase: 'playing',
      turnNumber: 1,
      pendingTiles: [],
      lastScore: null,
      message: `A wild ${enemy.name} appears! Spell words to attack!`,
    });
  },

  setDictionaryLoaded: (loaded: boolean) => set({ dictionaryLoaded: loaded }),

  placePendingTile: (tile: Tile, row: number, col: number) => {
    const { grid, pendingTiles, rack, phase } = get();
    if (phase !== 'playing') return false;

    const cell = grid[row]?.[col];
    if (!cell || cell.tile || cell.premiumType === 'VOID') return false;

    // Check tile is in rack and not already pending
    const inRack = rack.some(t => t.id === tile.id);
    const alreadyPending = pendingTiles.some(p => p.tile.id === tile.id);
    if (!inRack || alreadyPending) return false;

    // Place on grid
    placeTile(grid, row, col, tile);

    set({
      grid: [...grid.map(r => [...r])], // shallow copy for reactivity
      pendingTiles: [...pendingTiles, { tile, row, col }],
      rack: rack.filter(t => t.id !== tile.id),
    });
    return true;
  },

  tapPlaceTile: (tile: Tile) => {
    const { grid, pendingTiles, phase } = get();
    if (phase !== 'playing') return false;

    const center = Math.floor(BOARD_SIZE / 2);
    let targetRow: number;
    let targetCol: number;

    if (pendingTiles.length === 0) {
      // No pending tiles yet — find a good starting position
      // If board is empty (no non-pending tiles), start at center
      let boardHasTiles = false;
      for (let r = 0; r < BOARD_SIZE && !boardHasTiles; r++) {
        for (let c = 0; c < BOARD_SIZE && !boardHasTiles; c++) {
          if (grid[r][c].tile) boardHasTiles = true;
        }
      }

      if (!boardHasTiles) {
        // Empty board: place at center
        targetRow = center;
        targetCol = center;
      } else {
        // Board has existing words: find first empty cell adjacent to any existing tile
        // scanning horizontally from center outward
        let found = false;
        // Try cells to the right of existing tiles first (most natural for horizontal play)
        for (let r = 0; r < BOARD_SIZE && !found; r++) {
          for (let c = 0; c < BOARD_SIZE && !found; c++) {
            if (grid[r][c].tile) {
              // Check right neighbor
              if (c + 1 < BOARD_SIZE && !grid[r][c + 1].tile && grid[r][c + 1].premiumType !== 'VOID') {
                targetRow = r;
                targetCol = c + 1;
                found = true;
              }
            }
          }
        }
        if (!found) {
          // Fallback: find any empty cell adjacent to existing tiles
          for (let r = 0; r < BOARD_SIZE && !found; r++) {
            for (let c = 0; c < BOARD_SIZE && !found; c++) {
              if (!grid[r][c].tile && grid[r][c].premiumType !== 'VOID') {
                const adj = [[0,1],[0,-1],[1,0],[-1,0]];
                for (const [dr, dc] of adj) {
                  const nr = r + dr, nc = c + dc;
                  if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc].tile) {
                    targetRow = r;
                    targetCol = c;
                    found = true;
                    break;
                  }
                }
              }
            }
          }
        }
        if (!found) return false;
      }
    } else {
      // Has pending tiles — place to the right of the last pending tile
      const last = pendingTiles[pendingTiles.length - 1];

      // Determine direction from pending tiles
      let dr = 0, dc = 1; // default: horizontal (rightward)
      if (pendingTiles.length >= 2) {
        const prev = pendingTiles[pendingTiles.length - 2];
        dr = Math.sign(last.row - prev.row);
        dc = Math.sign(last.col - prev.col);
      }

      // Walk in that direction until we find an empty cell
      let r = last.row + dr;
      let c = last.col + dc;
      let found = false;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        const cell = grid[r][c];
        if (cell.premiumType === 'VOID') break;
        if (!cell.tile) {
          targetRow = r;
          targetCol = c;
          found = true;
          break;
        }
        // Skip over existing tiles (they might be in the middle of the word)
        r += dr;
        c += dc;
      }

      if (!found) return false;
    }

    return get().placePendingTile(tile, targetRow!, targetCol!);
  },

  removePendingTile: (row: number, col: number) => {
    const { grid, pendingTiles, rack } = get();
    const pending = pendingTiles.find(p => p.row === row && p.col === col);
    if (!pending) return;

    removeTile(grid, row, col);

    set({
      grid: [...grid.map(r => [...r])],
      pendingTiles: pendingTiles.filter(p => p !== pending),
      rack: [...rack, pending.tile],
    });
  },

  returnPendingToRack: () => {
    const { grid, pendingTiles, rack } = get();
    for (const p of pendingTiles) {
      removeTile(grid, p.row, p.col);
    }
    set({
      grid: [...grid.map(r => [...r])],
      pendingTiles: [],
      rack: [...rack, ...pendingTiles.map(p => p.tile)],
    });
  },

  submitWord: () => {
    const { grid, pendingTiles, enemy, turnNumber, playerAttack } = get();
    if (pendingTiles.length === 0) {
      return { success: false, damage: 0, error: 'Place some tiles first!' };
    }

    const placedCells: [number, number][] = pendingTiles.map(p => [p.row, p.col]);
    // Check: is the board "empty" except for pending tiles?
    let tileCountExcludingPending = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (grid[r][c].tile && !pendingTiles.some(p => p.row === r && p.col === c)) {
          tileCountExcludingPending++;
        }
      }
    }
    const isFirst = tileCountExcludingPending === 0;

    const validation = validatePlacement(grid, placedCells, isFirst);
    if (!validation.valid) {
      return { success: false, damage: 0, error: validation.error };
    }

    // Dictionary check
    const validator = getValidator();
    for (const word of validation.formedWords) {
      if (!validator.isWord(word.text)) {
        return { success: false, damage: 0, error: `"${word.text}" is not a valid word` };
      }
    }

    // Score calculation
    const score = calculatePlacementDamage(grid, validation.formedWords, placedCells);

    // Apply attack bonus
    const attackBonus = 1 + playerAttack / 100;
    const totalDamage = Math.round(score.totalDamage * attackBonus);

    // Mark premium squares as used
    for (const [r, c] of placedCells) {
      grid[r][c].premiumUsed = true;
    }

    // Apply damage to enemy
    let newEnemyHp = enemy?.hp ?? 0;
    if (enemy) {
      newEnemyHp = Math.max(0, enemy.hp - totalDamage);
    }

    const wordTexts = validation.formedWords.map(w => w.text).join(', ');

    set({
      grid: [...grid.map(r => [...r])],
      pendingTiles: [],
      lastScore: { ...score, totalDamage },
      turnNumber: turnNumber + 1,
      enemy: enemy ? { ...enemy, hp: newEnemyHp } : null,
      message: `${wordTexts}! ${totalDamage} damage!`,
      phase: newEnemyHp <= 0 ? 'victory' : 'enemy_turn',
    });

    // Draw tiles after a short delay (handled by component)
    return { success: true, damage: totalDamage };
  },

  swapTiles: (tilesToSwap: Tile[]) => {
    const { rack, tileBag, turnNumber } = get();
    const remaining = rack.filter(t => !tilesToSwap.some(s => s.id === t.id));
    tileBag.returnTiles(tilesToSwap);
    const newTiles = tileBag.draw(tilesToSwap.length);
    set({
      rack: [...remaining, ...newTiles],
      turnNumber: turnNumber + 1,
      message: `Swapped ${tilesToSwap.length} tiles. Enemy's turn!`,
      phase: 'enemy_turn',
    });
  },

  enemyTurn: () => {
    const { enemy, playerHp, playerDefense } = get();
    if (!enemy || enemy.hp <= 0) return;

    // Simple enemy attack
    const rawDamage = enemy.attack + Math.floor(Math.random() * 5);
    const damage = Math.max(1, rawDamage - playerDefense);
    const newHp = Math.max(0, playerHp - damage);

    set({
      playerHp: newHp,
      message: `${enemy.name} attacks for ${damage} damage!`,
      phase: newHp <= 0 ? 'defeat' : 'playing',
    });
  },

  drawTiles: () => {
    const { rack, tileBag } = get();
    const need = RACK_SIZE - rack.length;
    if (need > 0) {
      const drawn = tileBag.draw(need);
      set({ rack: [...rack, ...drawn] });
    }
  },

  setMessage: (msg: string) => set({ message: msg }),
}));

// Expose store for debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__store = useGameStore;
}
