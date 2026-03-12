// ─── Core Game Types ───

export const BOARD_SIZE = 13;

export type Direction = 'horizontal' | 'vertical';
export type ArrowDirection = 'down' | 'right' | 'up' | 'left';

export type TileType =
  | 'STANDARD'
  | 'GEM_EMERALD'
  | 'GEM_RUBY'
  | 'GEM_SAPPHIRE'
  | 'GEM_CRYSTAL'
  | 'GEM_AMETHYST'
  | 'GEM_RAINBOW'
  | 'ARROW'
  | 'CURSED'
  | 'LOCKED'
  | 'GOLDEN';

export type PremiumType =
  | 'DOUBLE_LETTER'
  | 'TRIPLE_LETTER'
  | 'DOUBLE_WORD'
  | 'TRIPLE_WORD'
  | 'GEM_FORGE'
  | 'VOID'
  | 'CENTER';

export interface Tile {
  id: string;
  letter: string;
  pointValue: number;
  tileType: TileType;
  isWild: boolean;
  ownerId: string;
  turnPlaced: number;
}

export interface BoardCell {
  row: number;
  col: number;
  tile: Tile | null;
  premiumType: PremiumType | null;
  premiumUsed: boolean;
  branchArrow: ArrowDirection | null;
  wordMemberships: string[]; // WordRecord IDs
}

export interface WordRecord {
  id: string;
  text: string;
  cells: [number, number][];
  direction: Direction;
  branchParent: string | null;
  insertHistory: InsertEvent[];
}

export interface InsertEvent {
  turn: number;
  playerId: string;
  lettersInserted: string;
  positionInWord: number;
  previousText: string;
  newText: string;
}

// ─── Tile Distribution ───

export interface LetterDef {
  letter: string;
  count: number;
  points: number;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export const LETTER_DISTRIBUTION: LetterDef[] = [
  // Tier 1 - Common (1 point)
  { letter: 'A', count: 9, points: 1, tier: 'common' },
  { letter: 'E', count: 9, points: 1, tier: 'common' },
  { letter: 'I', count: 7, points: 1, tier: 'common' },
  { letter: 'O', count: 7, points: 1, tier: 'common' },
  { letter: 'U', count: 5, points: 1, tier: 'common' },
  { letter: 'S', count: 5, points: 1, tier: 'common' },
  { letter: 'T', count: 5, points: 1, tier: 'common' },
  { letter: 'R', count: 5, points: 1, tier: 'common' },
  { letter: 'N', count: 5, points: 1, tier: 'common' },
  { letter: 'L', count: 4, points: 1, tier: 'common' },
  // Tier 2 - Uncommon (1.5 points)
  { letter: 'D', count: 4, points: 1.5, tier: 'uncommon' },
  { letter: 'G', count: 3, points: 1.5, tier: 'uncommon' },
  { letter: 'C', count: 3, points: 1.5, tier: 'uncommon' },
  { letter: 'M', count: 3, points: 1.5, tier: 'uncommon' },
  { letter: 'P', count: 3, points: 1.5, tier: 'uncommon' },
  { letter: 'H', count: 3, points: 1.5, tier: 'uncommon' },
  { letter: 'B', count: 2, points: 1.5, tier: 'uncommon' },
  { letter: 'F', count: 2, points: 1.5, tier: 'uncommon' },
  { letter: 'W', count: 2, points: 1.5, tier: 'uncommon' },
  { letter: 'Y', count: 2, points: 1.5, tier: 'uncommon' },
  // Tier 3 - Rare (2.5 points)
  { letter: 'K', count: 2, points: 2.5, tier: 'rare' },
  { letter: 'V', count: 2, points: 2.5, tier: 'rare' },
  { letter: 'J', count: 1, points: 2.5, tier: 'rare' },
  { letter: 'X', count: 1, points: 2.5, tier: 'rare' },
  // Tier 4 - Legendary (4 points)
  { letter: 'Q', count: 1, points: 4, tier: 'legendary' },
  { letter: 'Z', count: 1, points: 4, tier: 'legendary' },
];

// Two blank/wild tiles
export const WILD_TILE_COUNT = 2;

// ─── Premium Square Layout ───
// Positions are [row, col] (0-indexed on 13x13 grid)

export const PREMIUM_LAYOUT: Record<PremiumType, [number, number][]> = {
  CENTER: [[6, 6]],
  TRIPLE_WORD: [
    [0, 0], [0, 6], [0, 12],
    [6, 0], [6, 12],
    [12, 0], [12, 6], [12, 12],
  ],
  DOUBLE_WORD: [
    [1, 1], [1, 11],
    [2, 2], [2, 10],
    [3, 3], [3, 9],
    [4, 4], [4, 8],
    [8, 4], [8, 8],
    [9, 3], [9, 9],
    [10, 2], [10, 10],
    [11, 1], [11, 11],
  ],
  TRIPLE_LETTER: [
    [1, 5], [1, 7],
    [5, 1], [5, 5], [5, 7], [5, 11],
    [7, 1], [7, 5], [7, 7], [7, 11],
    [11, 5], [11, 7],
  ],
  DOUBLE_LETTER: [
    [0, 3], [0, 9],
    [2, 6],
    [3, 0], [3, 6], [3, 12],
    [6, 2], [6, 4], [6, 8], [6, 10],
    [9, 0], [9, 6], [9, 12],
    [10, 6],
    [12, 3], [12, 9],
  ],
  GEM_FORGE: [
    [2, 4], [2, 8],
    [10, 4], [10, 8],
  ],
  VOID: [
    [4, 0], [4, 12],
    [8, 0], [8, 12],
  ],
};

// ─── Word Length Damage Multipliers ───

export function getWordLengthMultiplier(length: number): number {
  if (length <= 2) return 0.5;
  if (length === 3) return 1.0;
  if (length === 4) return 1.2;
  if (length === 5) return 1.5;
  if (length === 6) return 1.8;
  if (length === 7) return 2.2;
  return 2.5 + 0.3 * (length - 8);
}

export const COMBAT_SCALAR = 3;
export const INSERT_BONUS_PER_LETTER = 5;
export const INSERT_CASCADE_BONUS = 3;
export const BRANCH_DAMAGE_MULTIPLIER = 1.1;
export const RACK_SIZE = 7;

// ─── Combat Animation Events ───

export type CombatEventType =
  | 'player_attack'
  | 'enemy_attack'
  | 'player_hurt'
  | 'enemy_hurt'
  | 'enemy_death'
  | 'player_death';

export interface CombatEvent {
  id: string;
  type: CombatEventType;
  damage?: number;
  timestamp: number;
}

// ─── Beta Feedback Types ───

export interface WordDispute {
  id: string;
  word: string;
  definition: string;
  timestamp: number;
  turnNumber: number;
}

export interface BetaFeedback {
  id: string;
  category: 'bug' | 'suggestion' | 'word' | 'other';
  message: string;
  timestamp: number;
}
