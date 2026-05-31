/**
 * NPC word-move generator.
 *
 * The dictionary is a flat `Set<string>` (chosen over a Trie for mobile memory
 * on 3.3M words), so `getValidator().hasPrefix` is an O(n) full-scan and is
 * unusable in a loop. We therefore cannot walk a prefix structure — instead we
 * ENUMERATE concrete candidate placements and validate each with the O(1)
 * `isWord`, reusing the exact same engine the player path uses
 * (`validatePlacement` / `getFormedWords` / `calculatePlacementDamage`).
 *
 * Strategy (non-empty board): for each "anchor" (an empty cell next to an
 * existing tile) and each direction, slide *maximal* windows through it — a
 * window whose immediately-adjacent outside cells are empty, so the tiles in it
 * form one complete word. Each window splits into FIXED cells (existing tiles,
 * reused as locked letters — this is the hook/extension that connects the move)
 * and empty SLOTS we fill from the rack. We require ≥1 fixed and ≥1 slot, which
 * guarantees the placement connects and skips pure-parallel plays (they almost
 * always fail the perpendicular cross-word check and waste the time budget).
 *
 * For each window we enumerate rack-tile assignments to the slots, cheap-reject
 * with one `isWord` on the main word before any grid mutation, then do the full
 * `validatePlacement` + cross-word check + score on a single mutate/undo grid
 * (no cloning). The whole search is wall-clock bounded so it stays well under
 * the existing ~1s "enemy thinking" delay.
 *
 * Difficulty: callers pass `pickRank` — 0 returns the strongest legal move
 * found, higher returns a deliberately weaker (k-th best) one so early enemies
 * feel less clever. The damage multiplier is applied by the caller, not here.
 */
import type { BoardCell, Tile, Direction } from '../types/index.ts';
import { BOARD_SIZE } from '../types/index.ts';
import { placeTile, removeTile, validatePlacement, getCell } from './BoardState.ts';
import { getValidator } from './WordValidator.ts';
import { calculatePlacementDamage } from './ScoreCalculator.ts';
import type { ScoreBreakdown } from './ScoreCalculator.ts';
import { createTile } from './TileBag.ts';

interface PlacedTile {
  tile: Tile;
  row: number;
  col: number;
  /** id of the originating rack tile (for a wild, the original '*' tile) so the
   *  caller removes the right tile from the NPC rack even when a lettered clone
   *  is committed. */
  rackTileId: string;
}

export interface NpcMove {
  placedTiles: PlacedTile[];
  formedWords: { text: string; cells: [number, number][]; direction: Direction }[];
  score: ScoreBreakdown; // pre-difficulty-multiplier
  mainWord: string; // longest formed word, for the HUD message
}

export interface NpcMoveOpts {
  maxNewTiles?: number; // default 5 — rack letters spent per move
  maxWordLen?: number; // default 8 — longest candidate window
  timeBudgetMs?: number; // default 120 — wall-clock cap
  pickRank?: number; // 0 = best; k = k-th best (difficulty word-strength lever)
  alphabet?: string[]; // letters a wild may stand for; default A–Z
}

interface RecordedMove extends NpcMove {
  totalDamage: number;
}

interface WindowCell {
  row: number;
  col: number;
  fixedLetter: string | null; // letter if an existing tile sits here, else null (empty slot)
}

const DEFAULT_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const MAX_ANCHORS = 24;
const MAX_WINDOWS_PER_ANCHOR = 8;
const CENTER = Math.floor(BOARD_SIZE / 2);

function hasTile(grid: BoardCell[][], r: number, c: number): boolean {
  const cell = getCell(grid, r, c);
  return !!cell && cell.tile !== null;
}

function isVoidCell(grid: BoardCell[][], r: number, c: number): boolean {
  const cell = getCell(grid, r, c);
  return !!cell && cell.premiumType === 'VOID';
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

export function findBestNpcMove(
  grid: BoardCell[][],
  npcRack: Tile[],
  opts: NpcMoveOpts = {},
): NpcMove | null {
  const maxNewTiles = opts.maxNewTiles ?? 5;
  const maxWordLen = opts.maxWordLen ?? 8;
  const timeBudgetMs = opts.timeBudgetMs ?? 120;
  const pickRank = opts.pickRank ?? 0;
  const alphabet = opts.alphabet ?? DEFAULT_ALPHABET;
  const validator = getValidator();
  const deadline = Date.now() + timeBudgetMs;
  const maxSlots = Math.min(maxNewTiles, npcRack.length);
  if (maxSlots < 1) return null;

  const moves: RecordedMove[] = [];
  const evalWindow = (windowCells: WindowCell[], isFirstMove: boolean) =>
    processWindow(grid, npcRack, windowCells, isFirstMove, alphabet, validator, moves, deadline);

  // Empty board → first move; the only constraint is covering the center.
  let boardEmpty = true;
  for (let r = 0; r < BOARD_SIZE && boardEmpty; r++) {
    for (let c = 0; c < BOARD_SIZE && boardEmpty; c++) {
      if (grid[r][c].tile) boardEmpty = false;
    }
  }

  if (boardEmpty) {
    generateFirstMoveWindows(grid, maxWordLen, maxSlots, evalWindow, deadline);
  } else {
    const anchors: [number, number][] = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = grid[r][c];
        if (cell.tile || cell.premiumType === 'VOID') continue;
        if (
          hasTile(grid, r - 1, c) ||
          hasTile(grid, r + 1, c) ||
          hasTile(grid, r, c - 1) ||
          hasTile(grid, r, c + 1)
        ) {
          anchors.push([r, c]);
        }
      }
    }
    shuffle(anchors);

    const seenWindows = new Set<string>();
    for (let i = 0; i < anchors.length && i < MAX_ANCHORS; i++) {
      if (Date.now() > deadline) break;
      const [ar, ac] = anchors[i];
      for (const dir of ['horizontal', 'vertical'] as Direction[]) {
        if (Date.now() > deadline) break;
        const windows = collectWindows(grid, ar, ac, dir, maxWordLen, maxSlots, seenWindows);
        for (const w of windows) {
          if (Date.now() > deadline) break;
          evalWindow(w, false);
        }
      }
    }
  }

  if (moves.length === 0) return null;
  moves.sort((a, b) => b.totalDamage - a.totalDamage);
  const idx = Math.min(Math.max(0, pickRank), moves.length - 1);
  const chosen = moves[idx];
  return {
    placedTiles: chosen.placedTiles,
    formedWords: chosen.formedWords,
    score: chosen.score,
    mainWord: chosen.mainWord,
  };
}

/** Maximal windows through (ar,ac) along `dir`. Each returned window has empty
 *  (or edge/void) boundaries, ≥1 existing tile, and 1..maxSlots empty cells. */
function collectWindows(
  grid: BoardCell[][],
  ar: number,
  ac: number,
  dir: Direction,
  maxWordLen: number,
  maxSlots: number,
  seenWindows: Set<string>,
): WindowCell[][] {
  const horizontal = dir === 'horizontal';
  const lineFixed = horizontal ? ar : ac;
  const p = horizontal ? ac : ar;
  const rc = (idx: number): [number, number] => (horizontal ? [lineFixed, idx] : [idx, lineFixed]);

  const windows: WindowCell[][] = [];
  // Longer windows first — they tend to score more.
  for (let len = maxWordLen; len >= 3 && windows.length < MAX_WINDOWS_PER_ANCHOR; len--) {
    const minStart = Math.max(0, p - len + 1);
    const maxStart = Math.min(p, BOARD_SIZE - len);
    for (let s = minStart; s <= maxStart && windows.length < MAX_WINDOWS_PER_ANCHOR; s++) {
      const e = s + len - 1;
      const key = `${dir}:${s}:${e}`;
      if (seenWindows.has(key)) continue;
      seenWindows.add(key);

      // Maximal-window boundaries: the cells just outside must be empty/edge.
      if (s - 1 >= 0) {
        const [br, bc] = rc(s - 1);
        if (hasTile(grid, br, bc)) continue;
      }
      if (e + 1 <= BOARD_SIZE - 1) {
        const [br, bc] = rc(e + 1);
        if (hasTile(grid, br, bc)) continue;
      }

      let fixed = 0;
      let slots = 0;
      let voidHit = false;
      const wc: WindowCell[] = [];
      for (let i = s; i <= e; i++) {
        const [r, c] = rc(i);
        if (isVoidCell(grid, r, c)) {
          voidHit = true;
          break;
        }
        const cell = grid[r][c];
        if (cell.tile) {
          fixed++;
          wc.push({ row: r, col: c, fixedLetter: cell.tile.letter });
        } else {
          slots++;
          wc.push({ row: r, col: c, fixedLetter: null });
        }
      }
      if (voidHit) continue;
      if (slots < 1 || slots > maxSlots) continue;
      if (fixed < 1) continue; // must reuse a board tile to connect (skip parallel plays)
      windows.push(wc);
    }
  }
  return windows;
}

/** Empty-board opening: words covering the center, both directions. */
function generateFirstMoveWindows(
  grid: BoardCell[][],
  maxWordLen: number,
  maxSlots: number,
  evalWindow: (windowCells: WindowCell[], isFirstMove: boolean) => void,
  deadline: number,
): void {
  const maxLen = Math.min(maxWordLen, maxSlots);
  for (const dir of ['horizontal', 'vertical'] as Direction[]) {
    const horizontal = dir === 'horizontal';
    for (let len = maxLen; len >= 3; len--) {
      if (Date.now() > deadline) return;
      const minStart = Math.max(0, CENTER - len + 1);
      const maxStart = Math.min(CENTER, BOARD_SIZE - len);
      for (let s = minStart; s <= maxStart; s++) {
        if (Date.now() > deadline) return;
        const e = s + len - 1;
        let voidHit = false;
        const wc: WindowCell[] = [];
        for (let i = s; i <= e; i++) {
          const r = horizontal ? CENTER : i;
          const c = horizontal ? i : CENTER;
          if (isVoidCell(grid, r, c)) {
            voidHit = true;
            break;
          }
          wc.push({ row: r, col: c, fixedLetter: null });
        }
        if (voidHit) continue;
        evalWindow(wc, true);
      }
    }
  }
}

/** Enumerate rack-tile assignments to a window's empty slots, validate, score. */
function processWindow(
  grid: BoardCell[][],
  rack: Tile[],
  windowCells: WindowCell[],
  isFirstMove: boolean,
  alphabet: string[],
  validator: ReturnType<typeof getValidator>,
  moves: RecordedMove[],
  deadline: number,
): void {
  const slotPositions: number[] = [];
  for (let i = 0; i < windowCells.length; i++) {
    if (windowCells[i].fixedLetter === null) slotPositions.push(i);
  }
  const k = slotPositions.length;
  if (k < 1 || k > rack.length) return;

  const used = new Array<boolean>(rack.length).fill(false);
  const assign = new Array<number>(k);

  const commitIfWord = (letters: (string | null)[]): void => {
    let word = '';
    for (const L of letters) {
      if (L === null) return;
      word += L;
    }
    if (word.length < 3) return;
    if (!validator.isWord(word)) return;

    const placedTiles: PlacedTile[] = [];
    const placedCells: [number, number][] = [];
    for (let s = 0; s < k; s++) {
      const pos = slotPositions[s];
      const cell = windowCells[pos];
      const t = rack[assign[s]];
      const tileToPlace = t.isWild ? createTile(letters[pos] as string, 0, true) : t;
      placedTiles.push({ tile: tileToPlace, row: cell.row, col: cell.col, rackTileId: t.id });
      placedCells.push([cell.row, cell.col]);
    }

    // Simulate on the live grid, then restore.
    const placed: PlacedTile[] = [];
    let ok = true;
    for (const pt of placedTiles) {
      if (!placeTile(grid, pt.row, pt.col, pt.tile)) {
        ok = false;
        break;
      }
      placed.push(pt);
    }
    if (ok) {
      const v = validatePlacement(grid, placedCells, isFirstMove);
      if (v.valid) {
        let allValid = true;
        for (const w of v.formedWords) {
          if (!validator.isWord(w.text)) {
            allValid = false;
            break;
          }
        }
        if (allValid) {
          const score = calculatePlacementDamage(grid, v.formedWords, placedCells);
          let mainWord = '';
          for (const w of v.formedWords) {
            if (w.text.length > mainWord.length) mainWord = w.text;
          }
          moves.push({ placedTiles, formedWords: v.formedWords, score, mainWord, totalDamage: score.totalDamage });
        }
      }
    }
    for (const pt of placed) removeTile(grid, pt.row, pt.col);
  };

  const evaluateLeaf = (): void => {
    const letters: (string | null)[] = windowCells.map(wc => wc.fixedLetter);
    const wildPositions: number[] = [];
    for (let s = 0; s < k; s++) {
      const pos = slotPositions[s];
      const t = rack[assign[s]];
      if (t.isWild) {
        wildPositions.push(pos);
        letters[pos] = null;
      } else {
        letters[pos] = t.letter;
      }
    }
    if (wildPositions.length === 0) {
      commitIfWord(letters);
      return;
    }
    // A wild can stand for any alphabet letter — brute-force the ≤2 holes.
    const expand = (wi: number): void => {
      if (Date.now() > deadline) return;
      if (wi === wildPositions.length) {
        commitIfWord(letters);
        return;
      }
      const pos = wildPositions[wi];
      for (const L of alphabet) {
        letters[pos] = L;
        expand(wi + 1);
        if (Date.now() > deadline) return;
      }
      letters[pos] = null;
    };
    expand(0);
  };

  const recurse = (j: number): void => {
    if (Date.now() > deadline) return;
    if (j === k) {
      evaluateLeaf();
      return;
    }
    for (let r = 0; r < rack.length; r++) {
      if (used[r]) continue;
      used[r] = true;
      assign[j] = r;
      recurse(j + 1);
      used[r] = false;
      if (Date.now() > deadline) return;
    }
  };

  recurse(0);
}
