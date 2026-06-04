import { describe, it, expect } from 'vitest';
import { createEmptyBoard, placeTile, resolveFormedWords } from './BoardState.ts';
import { createTile } from './TileBag.ts';
import type { BoardCell } from '../types/index.ts';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/** Place letters left-to-right on `row` starting at `startCol`. '*' => a wild. */
function placeWord(
  grid: BoardCell[][],
  row: number,
  startCol: number,
  letters: string[],
): [number, number][] {
  const cells: [number, number][] = [];
  letters.forEach((ch, i) => {
    const tile = ch === '*' ? createTile('*', 0, true) : createTile(ch, 1);
    placeTile(grid, row, startCol + i, tile);
    cells.push([row, startCol + i]);
  });
  return cells;
}

describe('resolveFormedWords — blank/wild tiles', () => {
  it('resolves a blank to the letter that completes a word (HO*EL -> HOTEL)', () => {
    const grid = createEmptyBoard();
    const cells = placeWord(grid, 6, 4, ['H', 'O', '*', 'E', 'L']);
    const dict = new Set(['hotel']);

    const res = resolveFormedWords(grid, cells, w => dict.has(w.toLowerCase()), ALPHABET);

    expect(res.failedWord).toBeNull();
    expect(res.formedWords).toHaveLength(1);
    expect(res.formedWords[0].text).toBe('HOTEL');
    // The blank now carries the resolved letter, still worth 0 points.
    const wild = grid[6][6].tile!;
    expect(wild.letter).toBe('T');
    expect(wild.isWild).toBe(true);
    expect(wild.pointValue).toBe(0);
  });

  it('rejects when no assignment forms a valid word, restoring the blank to *', () => {
    const grid = createEmptyBoard();
    // The actual attempt: H-O-*-T-E-L is 6 tiles ("HO_TEL") — no such word.
    const cells = placeWord(grid, 6, 4, ['H', 'O', '*', 'T', 'E', 'L']);
    const dict = new Set(['hotel']);

    const res = resolveFormedWords(grid, cells, w => dict.has(w.toLowerCase()), ALPHABET);

    expect(res.failedWord).not.toBeNull();
    expect(res.failedWord).toContain('*');
    expect(grid[6][6].tile!.letter).toBe('*');
  });

  it('validates an ordinary word with no blanks', () => {
    const grid = createEmptyBoard();
    const cells = placeWord(grid, 6, 5, ['C', 'A', 'T']);
    const dict = new Set(['cat']);

    const res = resolveFormedWords(grid, cells, w => dict.has(w.toLowerCase()), ALPHABET);

    expect(res.failedWord).toBeNull();
    expect(res.formedWords[0].text).toBe('CAT');
  });
});
