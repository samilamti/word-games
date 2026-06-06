import { create } from 'zustand';
import type { LocaleCode } from '../i18n/locales.ts';
import type { DefEntry } from '../definitions/DefinitionService.ts';

/**
 * Word journal + spaced-repetition scheduling — the saved-word retention layer
 * (Phase C / M2). Persisted to localStorage, keyed per (locale, word) so the
 * same spelling in two languages is tracked separately.
 *
 * The scheduler is a simple Leitner ladder (the plan leans simple over full
 * SM-2): a correct answer promotes the word up the interval ladder; a miss
 * drops it back. Scheduling helpers (newSrs / schedule / isDue / listByLocale /
 * listDue) are PURE and unit-tested; the store is a thin reactive + localStorage
 * wrapper. Components subscribe to `entries` and derive lists via the pure
 * helpers + useMemo (a selector returning a fresh array each render would loop
 * under Zustand v5 / useSyncExternalStore).
 */

export type Grade = 'again' | 'good' | 'easy';

export interface SrsState {
  /** Leitner box index into LADDER_DAYS (0 = new / just-lapsed, due same-day). */
  box: number;
  intervalDays: number;
  /** Epoch ms when this word is next due for review. */
  nextReviewAt: number;
  reps: number;
  lastGrade?: Grade;
}

export interface JournalEntry {
  word: string; // lowercased headword as played
  locale: LocaleCode;
  def: DefEntry; // snapshot of the definition at save time (so review works offline)
  savedAt: number;
  srs: SrsState;
}

const STORAGE_KEY = 'lexica_knights_journal';
const DAY_MS = 86_400_000;
// Leitner interval ladder in days. Box 0 = brand-new / just-lapsed (due now).
const LADDER_DAYS = [0, 1, 3, 7, 16, 35];
const MAX_BOX = LADDER_DAYS.length - 1;

const key = (locale: LocaleCode, word: string) => `${locale}:${word.toLowerCase()}`;

/** Fresh schedule for a newly saved word — due immediately (box 0). Pure. */
export function newSrs(now: number): SrsState {
  return { box: 0, intervalDays: 0, nextReviewAt: now, reps: 0 };
}

/** Advance (or lapse) a word's schedule given a review grade. Pure. */
export function schedule(prev: SrsState, grade: Grade, now: number): SrsState {
  let box: number;
  if (grade === 'again') box = 1; // lapse → back to a 1-day interval
  else if (grade === 'easy') box = Math.min(prev.box + 2, MAX_BOX);
  else box = Math.min(prev.box + 1, MAX_BOX); // 'good'
  const intervalDays = LADDER_DAYS[box];
  return {
    box,
    intervalDays,
    nextReviewAt: now + intervalDays * DAY_MS,
    reps: prev.reps + 1,
    lastGrade: grade,
  };
}

export function isDue(entry: JournalEntry, now: number): boolean {
  return entry.srs.nextReviewAt <= now;
}

/** Saved words for a locale, newest first. Pure. */
export function listByLocale(
  entries: Record<string, JournalEntry>,
  locale: LocaleCode,
): JournalEntry[] {
  return Object.values(entries)
    .filter((e) => e.locale === locale)
    .sort((a, b) => b.savedAt - a.savedAt);
}

/** Words due for review in a locale, soonest-due first. Pure. */
export function listDue(
  entries: Record<string, JournalEntry>,
  locale: LocaleCode,
  now: number,
): JournalEntry[] {
  return Object.values(entries)
    .filter((e) => e.locale === locale && isDue(e, now))
    .sort((a, b) => a.srs.nextReviewAt - b.srs.nextReviewAt);
}

interface JournalState {
  entries: Record<string, JournalEntry>;
  save: (word: string, locale: LocaleCode, def: DefEntry) => void;
  remove: (word: string, locale: LocaleCode) => void;
  isSaved: (word: string, locale: LocaleCode) => boolean;
  byLocale: (locale: LocaleCode) => JournalEntry[];
  due: (locale: LocaleCode, now?: number) => JournalEntry[];
  grade: (word: string, locale: LocaleCode, grade: Grade, now?: number) => void;
  clear: () => void;
}

function load(): Record<string, JournalEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, JournalEntry>) : {};
  } catch {
    return {};
  }
}

function persist(entries: Record<string, JournalEntry>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* localStorage full/unavailable — journal is best-effort */
  }
}

export const useJournalStore = create<JournalState>((set, get) => ({
  entries: load(),

  save: (word, locale, def) => {
    const k = key(locale, word);
    const now = Date.now();
    const existing = get().entries[k];
    // Re-saving an existing word refreshes its definition snapshot but keeps
    // its learning progress (srs + savedAt).
    const entry: JournalEntry = existing
      ? { ...existing, def }
      : { word: word.toLowerCase(), locale, def, savedAt: now, srs: newSrs(now) };
    const entries = { ...get().entries, [k]: entry };
    set({ entries });
    persist(entries);
  },

  remove: (word, locale) => {
    const entries = { ...get().entries };
    delete entries[key(locale, word)];
    set({ entries });
    persist(entries);
  },

  isSaved: (word, locale) => !!get().entries[key(locale, word)],

  byLocale: (locale) => listByLocale(get().entries, locale),

  due: (locale, now = Date.now()) => listDue(get().entries, locale, now),

  grade: (word, locale, grade, now = Date.now()) => {
    const k = key(locale, word);
    const e = get().entries[k];
    if (!e) return;
    const entries = { ...get().entries, [k]: { ...e, srs: schedule(e.srs, grade, now) } };
    set({ entries });
    persist(entries);
  },

  clear: () => {
    set({ entries: {} });
    persist({});
  },
}));
