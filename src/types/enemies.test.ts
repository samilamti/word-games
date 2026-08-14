import { describe, it, expect } from 'vitest';
import { ENEMY_CATALOG } from './enemies.ts';
import { pickMoveIndex } from '../engine/NpcWordAI.ts';

/** Player HP is fixed for the whole campaign (gameStore.initGame). */
const PLAYER_HP = 100;

/** Damage per turn a player is expected to manage at each stage of the campaign,
 *  rising as they learn the game. Stage 0 is deliberately pessimistic: a beginner
 *  laying three common letters with no premium square scores ~15. */
const STAGE_PLAYER_DPT = [15, 18, 22, 28, 36];

/** Enemy turns a player can survive at each enemy's worst case (every hit at the
 *  cap). This is the floor the cap buys us, and it is what makes the curve
 *  provable rather than merely tuned. */
const WORST_CASE_SURVIVABLE_TURNS = [13, 8, 7, 5, 4];

describe('enemy catalog difficulty curve', () => {
  it('ramps every difficulty lever monotonically', () => {
    for (let i = 1; i < ENEMY_CATALOG.length; i++) {
      const prev = ENEMY_CATALOG[i - 1];
      const cur = ENEMY_CATALOG[i];
      expect(cur.maxHp, `${cur.type} hp`).toBeGreaterThan(prev.maxHp);
      expect(cur.damageMultiplier, `${cur.type} dmgMult`).toBeGreaterThan(prev.damageMultiplier);
      expect(cur.maxDamagePerTurn, `${cur.type} cap`).toBeGreaterThan(prev.maxDamagePerTurn);
      // Lower percentile = picks a stronger move, so this one descends.
      expect(cur.pickPercentile, `${cur.type} pickPercentile`).toBeLessThan(prev.pickPercentile);
      expect(cur.maxWordLen, `${cur.type} maxWordLen`).toBeGreaterThanOrEqual(prev.maxWordLen);
      expect(cur.maxNewTiles, `${cur.type} maxNewTiles`).toBeGreaterThanOrEqual(prev.maxNewTiles);
    }
  });

  it('keeps every pickPercentile a valid fraction', () => {
    for (const e of ENEMY_CATALOG) {
      expect(e.pickPercentile, e.type).toBeGreaterThanOrEqual(0);
      expect(e.pickPercentile, e.type).toBeLessThanOrEqual(1);
    }
  });

  it('shows an honest attack stat (the HP-bar number equals the real ceiling)', () => {
    for (const e of ENEMY_CATALOG) {
      expect(e.attack, e.type).toBe(e.maxDamagePerTurn);
    }
  });

  // The headline promise of the rebalance: the first fight cannot be lost by a
  // player who only ever makes minimal three-letter words. Beta feedback was
  // that the opening demanded long words; this is the assertion that it doesn't.
  it('makes the first enemy unloseable at minimal play', () => {
    const goblin = ENEMY_CATALOG[0];
    const feeblePlayerDpt = 5; // well below even a minimum-scoring 3-letter word
    const turnsToKill = Math.ceil(goblin.maxHp / feeblePlayerDpt);
    const damageTaken = (turnsToKill - 1) * goblin.maxDamagePerTurn;
    expect(damageTaken).toBeLessThan(PLAYER_HP);
  });

  it('guarantees a survivable number of turns against every enemy', () => {
    ENEMY_CATALOG.forEach((e, i) => {
      const survivable = Math.ceil(PLAYER_HP / e.maxDamagePerTurn);
      expect(survivable, `${e.type} survivable turns`).toBeGreaterThanOrEqual(
        WORST_CASE_SURVIVABLE_TURNS[i],
      );
    });
  });

  // The two free enemies are the conversion funnel: a player who bounces off
  // them never sees the paywall, so they must stay winnable at beginner pace.
  it('keeps the free campaign (first two enemies) winnable at casual pace', () => {
    const casualDpt = STAGE_PLAYER_DPT[0];
    for (const e of ENEMY_CATALOG.slice(0, 2)) {
      const turnsToKill = Math.ceil(e.maxHp / casualDpt);
      const worstCaseDamage = (turnsToKill - 1) * e.maxDamagePerTurn;
      expect(worstCaseDamage, `${e.type} worst-case damage taken`).toBeLessThan(PLAYER_HP);
    }
  });

  // Documents the intended curve: the margin a player finishes each fight with
  // should shrink steadily, not cliff. Guards against a future tweak that makes
  // one enemy an outlier.
  it('descends in expected margin without a cliff', () => {
    const margins = ENEMY_CATALOG.map((e, i) => {
      const dpt = STAGE_PLAYER_DPT[i];
      const turnsToKill = Math.ceil(e.maxHp / dpt);
      // Expected (not worst-case) incoming damage sits below the cap; the cap
      // binds only on the enemy's best boards.
      const expectedIncoming = e.maxDamagePerTurn * 0.75;
      return PLAYER_HP - (turnsToKill - 1) * expectedIncoming;
    });

    for (let i = 1; i < margins.length; i++) {
      expect(margins[i], `margin vs ${ENEMY_CATALOG[i].type}`).toBeLessThan(margins[i - 1]);
    }
    // Every fight is still winnable at its stage pace, and the last one is tight.
    expect(Math.min(...margins)).toBeGreaterThan(0);
    expect(margins[0]).toBeGreaterThan(60);
  });
});

describe('pickMoveIndex', () => {
  it('picks the best move at percentile 0 and the weakest at 1', () => {
    expect(pickMoveIndex(0, 41)).toBe(0);
    expect(pickMoveIndex(1, 41)).toBe(40);
  });

  // The bug this replaced: an absolute rank of 4 clamps to index 0 ("best move")
  // whenever the search finds fewer than five candidates — i.e. on the sparse
  // opening board, against a beginner. A percentile stays weak at any length.
  it('stays weak on a sparse board where an absolute rank would not', () => {
    expect(pickMoveIndex(0.75, 3)).toBe(2);
    expect(pickMoveIndex(0.75, 2)).toBe(1);
    expect(pickMoveIndex(0.75, 41)).toBe(30);
  });

  it('clamps out-of-range input and degenerate lengths', () => {
    expect(pickMoveIndex(-1, 10)).toBe(0);
    expect(pickMoveIndex(2, 10)).toBe(9);
    expect(pickMoveIndex(0.5, 1)).toBe(0);
    expect(pickMoveIndex(0.5, 0)).toBe(0);
  });
});
