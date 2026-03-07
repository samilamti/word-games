import type { BoardCell, Direction } from '../types/index.ts';
import {
  COMBAT_SCALAR,
  getWordLengthMultiplier,
  INSERT_BONUS_PER_LETTER,
  INSERT_CASCADE_BONUS,
  BRANCH_DAMAGE_MULTIPLIER,
} from '../types/index.ts';

export interface ScoreBreakdown {
  baseWordScore: number;
  wordMultiplier: number;
  lengthMultiplier: number;
  combatScalar: number;
  mechanicBonus: number;
  totalDamage: number;
  words: {
    text: string;
    rawScore: number;
    wordMultiplier: number;
    finalScore: number;
  }[];
}

/** Calculate score for a word on the board */
export function scoreWord(
  grid: BoardCell[][],
  cells: [number, number][],
  newlyPlacedCells: Set<string>, // "row,col" strings for newly placed tiles
): { rawScore: number; wordMultiplier: number } {
  let rawScore = 0;
  let wordMultiplier = 1;

  for (const [r, c] of cells) {
    const cell = grid[r][c];
    if (!cell.tile) continue;

    let tileScore = cell.tile.pointValue;
    const key = `${r},${c}`;
    const isNew = newlyPlacedCells.has(key);

    // Premium squares only activate for newly placed tiles
    if (isNew && cell.premiumType && !cell.premiumUsed) {
      switch (cell.premiumType) {
        case 'DOUBLE_LETTER':
          tileScore *= 2;
          break;
        case 'TRIPLE_LETTER':
          tileScore *= 3;
          break;
        case 'DOUBLE_WORD':
        case 'CENTER':
          wordMultiplier *= 2;
          break;
        case 'TRIPLE_WORD':
          wordMultiplier *= 3;
          break;
        case 'GEM_FORGE':
          // Gem forge doubles gem potency (handled in combat system)
          tileScore *= 2;
          break;
      }
    }

    rawScore += tileScore;
  }

  return { rawScore, wordMultiplier };
}

/** Calculate total damage from a standard word placement */
export function calculatePlacementDamage(
  grid: BoardCell[][],
  formedWords: { text: string; cells: [number, number][]; direction: Direction }[],
  placedCells: [number, number][],
): ScoreBreakdown {
  const newlyPlaced = new Set(placedCells.map(([r, c]) => `${r},${c}`));
  const words: ScoreBreakdown['words'] = [];
  let totalBase = 0;

  for (const word of formedWords) {
    const { rawScore, wordMultiplier } = scoreWord(grid, word.cells, newlyPlaced);
    const lengthMult = getWordLengthMultiplier(word.text.length);
    const finalScore = Math.round(rawScore * wordMultiplier * lengthMult * COMBAT_SCALAR);
    words.push({
      text: word.text,
      rawScore,
      wordMultiplier,
      finalScore,
    });
    totalBase += finalScore;
  }

  return {
    baseWordScore: totalBase,
    wordMultiplier: 1,
    lengthMultiplier: 1,
    combatScalar: COMBAT_SCALAR,
    mechanicBonus: 0,
    totalDamage: totalBase,
    words,
  };
}

/** Calculate damage from an INSERT move */
export function calculateInsertDamage(
  grid: BoardCell[][],
  formedWords: { text: string; cells: [number, number][]; direction: Direction }[],
  insertedCells: [number, number][],
  cascadeWords: number,
): ScoreBreakdown {
  const base = calculatePlacementDamage(grid, formedWords, insertedCells);
  const insertBonus = insertedCells.length * INSERT_BONUS_PER_LETTER;
  const cascadeBonus = cascadeWords * INSERT_CASCADE_BONUS;
  const mechanicBonus = insertBonus + cascadeBonus;

  return {
    ...base,
    mechanicBonus,
    totalDamage: base.totalDamage + mechanicBonus,
  };
}

/** Calculate damage from a BRANCH move */
export function calculateBranchDamage(
  grid: BoardCell[][],
  branchWord: { text: string; cells: [number, number][]; direction: Direction },
  placedCells: [number, number][],
): ScoreBreakdown {
  const base = calculatePlacementDamage(grid, [branchWord], placedCells);
  const branchBonus = Math.round(base.totalDamage * (BRANCH_DAMAGE_MULTIPLIER - 1));

  return {
    ...base,
    mechanicBonus: branchBonus,
    totalDamage: base.totalDamage + branchBonus,
  };
}
