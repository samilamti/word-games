import type {
  BoardCell,
  PremiumType,
  Tile,
  WordRecord,
  Direction,
} from '../types/index.ts';
import { BOARD_SIZE, PREMIUM_LAYOUT } from '../types/index.ts';

export function createEmptyBoard(): BoardCell[][] {
  const grid: BoardCell[][] = [];

  // Build premium lookup for O(1) access
  const premiumMap = new Map<string, PremiumType>();
  for (const [type, positions] of Object.entries(PREMIUM_LAYOUT) as [PremiumType, [number, number][]][]) {
    for (const [r, c] of positions) {
      premiumMap.set(`${r},${c}`, type);
    }
  }

  for (let row = 0; row < BOARD_SIZE; row++) {
    const rowCells: BoardCell[] = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      rowCells.push({
        row,
        col,
        tile: null,
        premiumType: premiumMap.get(`${row},${col}`) ?? null,
        premiumUsed: false,
        branchArrow: null,
        wordMemberships: [],
      });
    }
    grid.push(rowCells);
  }

  return grid;
}

export function getCell(grid: BoardCell[][], row: number, col: number): BoardCell | null {
  if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
  return grid[row][col];
}

export function isVoid(grid: BoardCell[][], row: number, col: number): boolean {
  const cell = getCell(grid, row, col);
  return cell?.premiumType === 'VOID';
}

export function isCellEmpty(grid: BoardCell[][], row: number, col: number): boolean {
  const cell = getCell(grid, row, col);
  if (!cell) return false;
  return cell.tile === null && cell.premiumType !== 'VOID';
}

export function placeTile(grid: BoardCell[][], row: number, col: number, tile: Tile): boolean {
  const cell = getCell(grid, row, col);
  if (!cell || cell.tile !== null || cell.premiumType === 'VOID') return false;
  cell.tile = tile;
  return true;
}

export function removeTile(grid: BoardCell[][], row: number, col: number): Tile | null {
  const cell = getCell(grid, row, col);
  if (!cell || !cell.tile) return null;
  const tile = cell.tile;
  cell.tile = null;
  return tile;
}

/** Read a word from the board starting at (row,col) in the given direction */
export function readWord(
  grid: BoardCell[][],
  startRow: number,
  startCol: number,
  direction: Direction,
): { text: string; cells: [number, number][] } | null {
  const dr = direction === 'vertical' ? 1 : 0;
  const dc = direction === 'horizontal' ? 1 : 0;
  const cells: [number, number][] = [];
  let text = '';
  let r = startRow;
  let c = startCol;

  while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
    const cell = grid[r][c];
    if (!cell.tile) break;
    text += cell.tile.letter;
    cells.push([r, c]);
    r += dr;
    c += dc;
  }

  if (cells.length < 2) return null; // words must be 2+ letters (we'll enforce 3+ for scoring)
  return { text, cells };
}

/** Find the start of a word containing (row, col) in the given direction */
export function findWordStart(
  grid: BoardCell[][],
  row: number,
  col: number,
  direction: Direction,
): [number, number] {
  const dr = direction === 'vertical' ? -1 : 0;
  const dc = direction === 'horizontal' ? -1 : 0;
  let r = row;
  let c = col;

  while (true) {
    const nr = r + dr;
    const nc = c + dc;
    const cell = getCell(grid, nr, nc);
    if (!cell || !cell.tile) break;
    r = nr;
    c = nc;
  }

  return [r, c];
}

/** Get all words on the board */
export function findAllWords(grid: BoardCell[][]): WordRecord[] {
  const words: WordRecord[] = [];
  const seen = new Set<string>();
  let wordId = 0;

  for (let row = 0; row < BOARD_SIZE; row++) {
    for (let col = 0; col < BOARD_SIZE; col++) {
      if (!grid[row][col].tile) continue;

      for (const dir of ['horizontal', 'vertical'] as Direction[]) {
        const [sr, sc] = findWordStart(grid, row, col, dir);
        const key = `${sr},${sc},${dir}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const result = readWord(grid, sr, sc, dir);
        if (result && result.cells.length >= 2) {
          words.push({
            id: `word_${wordId++}`,
            text: result.text,
            cells: result.cells,
            direction: dir,
            branchParent: null,
            insertHistory: [],
          });
        }
      }
    }
  }

  return words;
}

/** Get all new words formed by a placement (for validation and scoring) */
export function getFormedWords(
  grid: BoardCell[][],
  placedCells: [number, number][],
): { text: string; cells: [number, number][]; direction: Direction }[] {
  const formed: { text: string; cells: [number, number][]; direction: Direction }[] = [];
  const seen = new Set<string>();

  for (const [row, col] of placedCells) {
    for (const dir of ['horizontal', 'vertical'] as Direction[]) {
      const [sr, sc] = findWordStart(grid, row, col, dir);
      const key = `${sr},${sc},${dir}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const result = readWord(grid, sr, sc, dir);
      if (result && result.cells.length >= 2) {
        formed.push({ ...result, direction: dir });
      }
    }
  }

  return formed;
}

/** Check if this is the first word (board center must be covered) */
export function isBoardEmpty(grid: BoardCell[][]): boolean {
  // Check if any tile is on the board
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (grid[r][c].tile) return false;
    }
  }
  return true;
}

/** Check if placed tiles connect to existing tiles (or cover center on first move) */
export function isConnected(
  grid: BoardCell[][],
  placedCells: [number, number][],
  isFirstMove: boolean,
): boolean {
  if (isFirstMove) {
    const center = Math.floor(BOARD_SIZE / 2);
    return placedCells.some(([r, c]) => r === center && c === center);
  }

  // At least one placed tile must be adjacent to an existing tile
  for (const [row, col] of placedCells) {
    for (const [dr, dc] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nr = row + dr;
      const nc = col + dc;
      const cell = getCell(grid, nr, nc);
      if (cell?.tile && !placedCells.some(([r, c]) => r === nr && c === nc)) {
        return true;
      }
    }
  }

  return false;
}

/** Validate that placed tiles are in a straight line */
export function getPlacementDirection(
  placedCells: [number, number][],
): Direction | null {
  if (placedCells.length === 0) return null;
  if (placedCells.length === 1) return 'horizontal'; // single tile: either direction works

  const allSameRow = placedCells.every(([r]) => r === placedCells[0][0]);
  const allSameCol = placedCells.every(([, c]) => c === placedCells[0][1]);

  if (allSameRow) return 'horizontal';
  if (allSameCol) return 'vertical';
  return null; // invalid: tiles not in a line
}

/** Check that placed tiles are contiguous (no gaps unless filled by existing tiles) */
export function isContiguous(
  grid: BoardCell[][],
  placedCells: [number, number][],
  direction: Direction,
): boolean {
  if (placedCells.length <= 1) return true;

  const sorted = [...placedCells].sort((a, b) =>
    direction === 'horizontal' ? a[1] - b[1] : a[0] - b[0],
  );

  const idx = direction === 'horizontal' ? 1 : 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const curr = sorted[i][idx];
    const next = sorted[i + 1][idx];
    // Check all cells between must have tiles
    for (let pos = curr + 1; pos < next; pos++) {
      const r = direction === 'horizontal' ? sorted[0][0] : pos;
      const c = direction === 'horizontal' ? pos : sorted[0][1];
      if (!grid[r][c].tile) return false;
    }
  }

  return true;
}

export interface PlacementValidation {
  valid: boolean;
  error?: string;
  formedWords: { text: string; cells: [number, number][]; direction: Direction }[];
}

/** Full validation of a tile placement (before dictionary check) */
export function validatePlacement(
  grid: BoardCell[][],
  placedCells: [number, number][],
  isFirstMove: boolean,
): PlacementValidation {
  if (placedCells.length === 0) {
    return { valid: false, error: 'No tiles placed', formedWords: [] };
  }

  const direction = getPlacementDirection(placedCells);
  if (!direction) {
    return { valid: false, error: 'Tiles must be in a straight line', formedWords: [] };
  }

  if (!isContiguous(grid, placedCells, direction)) {
    return { valid: false, error: 'Tiles must be contiguous (no gaps)', formedWords: [] };
  }

  if (!isConnected(grid, placedCells, isFirstMove)) {
    return {
      valid: false,
      error: isFirstMove
        ? 'First word must cover the center square'
        : 'Word must connect to an existing tile',
      formedWords: [],
    };
  }

  const formedWords = getFormedWords(grid, placedCells);
  if (formedWords.length === 0) {
    return { valid: false, error: 'No valid words formed', formedWords: [] };
  }

  return { valid: true, formedWords };
}
