import { describe, it, expect } from 'vitest';
import {
  newSrs,
  schedule,
  isDue,
  listByLocale,
  listDue,
  type JournalEntry,
} from './journalStore.ts';
import type { DefEntry } from '../definitions/DefinitionService.ts';

const DAY = 86_400_000;
const T0 = 1_000_000_000_000; // fixed "now" for deterministic scheduling

const def: DefEntry = { senses: [{ pos: 'noun', gloss: 'x' }] };
const entry = (over: Partial<JournalEntry>): JournalEntry => ({
  word: 'w',
  locale: 'en',
  def,
  savedAt: T0,
  srs: newSrs(T0),
  ...over,
});

describe('newSrs', () => {
  it('starts a word at box 0, due immediately', () => {
    const s = newSrs(T0);
    expect(s).toEqual({ box: 0, intervalDays: 0, nextReviewAt: T0, reps: 0 });
  });
});

describe('schedule (Leitner ladder)', () => {
  it('"good" climbs the ladder one box at a time', () => {
    let s = newSrs(T0);
    s = schedule(s, 'good', T0);
    expect([s.box, s.intervalDays]).toEqual([1, 1]);
    s = schedule(s, 'good', T0);
    expect([s.box, s.intervalDays]).toEqual([2, 3]);
    s = schedule(s, 'good', T0);
    expect([s.box, s.intervalDays]).toEqual([3, 7]);
  });

  it('"easy" jumps two boxes', () => {
    const s = schedule(newSrs(T0), 'easy', T0);
    expect([s.box, s.intervalDays]).toEqual([2, 3]);
  });

  it('"again" lapses back to box 1 (1-day interval)', () => {
    let s = newSrs(T0);
    for (let i = 0; i < 4; i++) s = schedule(s, 'good', T0); // climb to box 4
    expect(s.box).toBe(4);
    s = schedule(s, 'again', T0);
    expect([s.box, s.intervalDays]).toEqual([1, 1]);
  });

  it('clamps at the top of the ladder', () => {
    let s = newSrs(T0);
    for (let i = 0; i < 20; i++) s = schedule(s, 'easy', T0);
    expect([s.box, s.intervalDays]).toEqual([5, 35]);
  });

  it('sets nextReviewAt = now + interval and increments reps', () => {
    const s = schedule(newSrs(T0), 'good', T0);
    expect(s.nextReviewAt).toBe(T0 + 1 * DAY);
    expect(s.reps).toBe(1);
    expect(s.lastGrade).toBe('good');
  });
});

describe('isDue', () => {
  it('is due when nextReviewAt <= now', () => {
    const e = entry({ srs: { box: 1, intervalDays: 1, nextReviewAt: T0 + DAY, reps: 1 } });
    expect(isDue(e, T0)).toBe(false);
    expect(isDue(e, T0 + DAY)).toBe(true);
    expect(isDue(e, T0 + 2 * DAY)).toBe(true);
  });
});

describe('listByLocale / listDue', () => {
  const entries: Record<string, JournalEntry> = {
    'en:alpha': entry({ word: 'alpha', locale: 'en', savedAt: T0 + 1 }),
    'en:beta': entry({ word: 'beta', locale: 'en', savedAt: T0 + 2, srs: { box: 2, intervalDays: 3, nextReviewAt: T0 + 3 * DAY, reps: 2 } }),
    'es:casa': entry({ word: 'casa', locale: 'es', savedAt: T0 + 3 }),
  };

  it('byLocale filters by locale, newest first', () => {
    const en = listByLocale(entries, 'en');
    expect(en.map((e) => e.word)).toEqual(['beta', 'alpha']); // savedAt desc
    expect(listByLocale(entries, 'es').map((e) => e.word)).toEqual(['casa']);
  });

  it('due returns only words past their nextReviewAt, soonest first', () => {
    // At T0: alpha (box0, due now) is due; beta (due in 3d) is not.
    expect(listDue(entries, 'en', T0).map((e) => e.word)).toEqual(['alpha']);
    // After 3 days both en words are due, soonest-due (alpha at T0) first.
    expect(listDue(entries, 'en', T0 + 3 * DAY).map((e) => e.word)).toEqual(['alpha', 'beta']);
  });
});
