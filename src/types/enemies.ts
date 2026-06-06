// Catalog of enemies for the campaign progression. After defeating one, the
// next one in this list spawns. Stats scale up to keep the difficulty curve
// interesting (more HP and more incoming damage per turn).
//
// `spriteUrl` points to a Blender-rendered PNG in public/enemies/. If the file
// is missing at runtime the BattleOverlay falls back to its vector goblin
// drawing.

export type EnemyType = 'goblin' | 'orc' | 'troll' | 'undead' | 'wraith';

export interface EnemyDef {
  type: EnemyType;
  name: string;
  maxHp: number;
  attack: number;
  defense: number;
  spriteUrl: string;
  /** Spoken hook shown in the appears-toast under the name. */
  tagline: string;
  /** NPC word-damage scaling, applied to the NPC's word score. Ramps up across
   *  the campaign. The earliest enemy sits below 1 (under-damages the player's
   *  same word) to give beginners breathing room; later enemies climb above 1. */
  damageMultiplier: number;
  /** Word-strength lever passed to the NPC move search: 0 = play the strongest
   *  legal word found; higher = deliberately pick a weaker (k-th best) word so
   *  early enemies feel less clever. */
  pickRank: number;
}

export const ENEMY_CATALOG: EnemyDef[] = [
  {
    type: 'goblin',
    name: 'Ink Goblin',
    maxHp: 80,
    attack: 8,
    defense: 0,
    spriteUrl: 'enemies/goblin.png',
    tagline: 'A scrappy little scribbler with a poisoned pen.',
    damageMultiplier: 0.85,
    pickRank: 4,
  },
  {
    type: 'orc',
    name: 'Brute Orc',
    maxHp: 120,
    attack: 11,
    defense: 1,
    spriteUrl: 'enemies/orc.png',
    tagline: 'Tusked, axe-handed, and unimpressed by your vocabulary.',
    damageMultiplier: 1.05,
    pickRank: 3,
  },
  {
    type: 'troll',
    name: 'Cave Troll',
    maxHp: 170,
    attack: 13,
    defense: 2,
    spriteUrl: 'enemies/troll.png',
    tagline: 'Bigger than a bookshelf and twice as stubborn.',
    damageMultiplier: 1.25,
    pickRank: 2,
  },
  {
    type: 'undead',
    name: 'Risen Undead',
    maxHp: 200,
    attack: 15,
    defense: 1,
    spriteUrl: 'enemies/undead.png',
    tagline: 'Whispering forgotten words from a forgotten tongue.',
    damageMultiplier: 1.45,
    pickRank: 1,
  },
  {
    type: 'wraith',
    name: 'Shadow Wraith',
    maxHp: 240,
    attack: 18,
    defense: 3,
    spriteUrl: 'enemies/wraith.png',
    tagline: 'A grief without a body, hungry for sentences.',
    damageMultiplier: 1.70,
    pickRank: 0,
  },
];
