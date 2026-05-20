/**
 * Per-locale persistence of dispute-accepted words.
 *
 * When a player disputes a rejected word, the game accepts it for the
 * current battle. We also persist it locally so the same word counts as
 * valid in future games on the same device — until the developer either
 * incorporates it into the next bundled dictionary refresh, or it gets
 * cleared from this device.
 *
 * Storage key: lexica_knights_accepted_words_<locale>
 */

import type { LocaleCode } from './locales.ts';

const KEY_PREFIX = 'lexica_knights_accepted_words_';

function key(locale: LocaleCode): string {
  return KEY_PREFIX + locale;
}

export function getAcceptedWords(locale: LocaleCode): string[] {
  try {
    const raw = localStorage.getItem(key(locale));
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function addAcceptedWord(locale: LocaleCode, word: string): void {
  const norm = word.toLowerCase().trim();
  if (!norm) return;
  try {
    const list = new Set(getAcceptedWords(locale));
    list.add(norm);
    localStorage.setItem(key(locale), JSON.stringify([...list]));
  } catch {}
}

export function clearAcceptedWords(locale: LocaleCode): void {
  try {
    localStorage.removeItem(key(locale));
  } catch {}
}
