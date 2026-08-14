// Catalog of enemies for the campaign progression. After defeating one, the
// next one in this list spawns. Stats scale up to keep the difficulty curve
// interesting (more HP and more incoming damage per turn).
//
// `spriteUrl` points to a Blender-rendered PNG in public/enemies/. If the file
// is missing at runtime the BattleOverlay falls back to its vector goblin
// drawing.

export type EnemyType = 'goblin' | 'orc' | 'troll' | 'undead' | 'wraith';

/** The player character, rendered by the same Blender rig as the enemies so the
 *  cast shares one camera and one light. Not an EnemyType — it never spawns as
 *  an opponent — but it lives beside them because it is the same kind of asset. */
export type CharacterName = EnemyType | 'hero';

export const HERO_SPRITE_URL = 'enemies/hero.png';

/** Bust art for the large surfaces: the arrival toast and the victory and defeat
 *  cards. Separate from the combat sprite because those surfaces show a
 *  character an order of magnitude larger, where painterly detail actually
 *  survives. Relative path, like spriteUrl, for the capacitor:// scheme. */
export function portraitUrl(name: CharacterName): string {
  return `art/portraits/${name}.webp`;
}

export interface EnemyDef {
  type: EnemyType;
  name: string;
  maxHp: number;
  /** Cosmetic stat shown in the HP-bar text. Kept in sync with
   *  `maxDamagePerTurn` so the number the player reads is the number they can
   *  actually take in one hit. */
  attack: number;
  defense: number;
  spriteUrl: string;
  /** Spoken hook shown in the appears-toast under the name. */
  tagline: string;
  /** NPC word-damage scaling, applied to the NPC's word score. Ramps up across
   *  the campaign. Early enemies sit well below 1 (under-damaging the player's
   *  same word) to give beginners breathing room; later enemies climb above 1.
   *  This shapes small and medium hits; `maxDamagePerTurn` bounds the big ones. */
  damageMultiplier: number;
  /** Where in the ranked move list the NPC picks, as a fraction: 0 = the
   *  strongest legal word found, 1 = the weakest. Replaces the old absolute
   *  `pickRank`, which silently inverted on sparse boards — a rank of 4 clamps
   *  to "best move" whenever the search finds fewer than 5 candidates, i.e.
   *  exactly during the opening turns when a beginner is most vulnerable. */
  pickPercentile: number;
  /** Longest candidate word the NPC search will consider. Low values keep weak
   *  enemies playing short words, which visibly telegraphs difficulty. */
  maxWordLen: number;
  /** How many rack letters the NPC may spend on one move. */
  maxNewTiles: number;
  /** Hard ceiling on post-multiplier damage from a single enemy turn. The
   *  guarantee that makes the difficulty curve provable: a lucky premium-square
   *  hit can no longer spike a beginner out of a fight. */
  maxDamagePerTurn: number;
}

// Difficulty curve (rebalanced 2026-08-14 after beta feedback that the opening
// fights demanded long words). Three levers move together per enemy:
//   - maxWordLen/maxNewTiles bound the NPC's raw score at the source,
//   - damageMultiplier shapes the small-to-medium hits,
//   - maxDamagePerTurn caps the spikes.
// Expected incoming damage per turn lands near 6 / 10 / 13 / 16 / 19 — a linear
// ramp, where the old curve compounded HP, multiplier and move quality at once.
// See enemies.test.ts, which asserts the monotonicity and the goblin guarantee.
export const ENEMY_CATALOG: EnemyDef[] = [
  {
    type: 'goblin',
    name: 'Ink Goblin',
    maxHp: 60,
    attack: 8,
    defense: 0,
    spriteUrl: 'enemies/goblin.png',
    tagline: 'A scrappy little scribbler with a poisoned pen.',
    damageMultiplier: 0.5,
    pickPercentile: 0.75,
    maxWordLen: 4,
    maxNewTiles: 3,
    maxDamagePerTurn: 8,
  },
  {
    type: 'orc',
    name: 'Brute Orc',
    maxHp: 90,
    attack: 13,
    defense: 1,
    spriteUrl: 'enemies/orc.png',
    tagline: 'Tusked, axe-handed, and unimpressed by your vocabulary.',
    damageMultiplier: 0.7,
    pickPercentile: 0.5,
    maxWordLen: 5,
    maxNewTiles: 4,
    maxDamagePerTurn: 13,
  },
  {
    type: 'troll',
    name: 'Cave Troll',
    maxHp: 130,
    attack: 16,
    defense: 2,
    spriteUrl: 'enemies/troll.png',
    tagline: 'Bigger than a bookshelf and twice as stubborn.',
    damageMultiplier: 0.9,
    pickPercentile: 0.3,
    maxWordLen: 6,
    maxNewTiles: 5,
    maxDamagePerTurn: 16,
  },
  {
    type: 'undead',
    name: 'Risen Undead',
    maxHp: 165,
    attack: 21,
    defense: 1,
    spriteUrl: 'enemies/undead.png',
    tagline: 'Whispering forgotten words from a forgotten tongue.',
    damageMultiplier: 1.05,
    pickPercentile: 0.12,
    maxWordLen: 7,
    maxNewTiles: 5,
    maxDamagePerTurn: 21,
  },
  {
    type: 'wraith',
    name: 'Shadow Wraith',
    maxHp: 210,
    attack: 26,
    defense: 3,
    spriteUrl: 'enemies/wraith.png',
    tagline: 'A grief without a body, hungry for sentences.',
    damageMultiplier: 1.2,
    pickPercentile: 0,
    maxWordLen: 8,
    maxNewTiles: 5,
    maxDamagePerTurn: 26,
  },
];
