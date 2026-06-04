/**
 * Locale-aware word validator.
 *
 * Switched from a Trie to a Set when we added multi-language support — a
 * Trie at 1M+ entries (German) was prohibitively memory-heavy on mobile.
 * Set lookup is O(1) average and memory is dominated by the raw word data.
 *
 * Per-locale lifecycle:
 *   loadDictionary(locale) — fetches the right .txt, populates the Set,
 *   layers user-accepted (disputed) words on top, and caches the result.
 *   Calling again with the same locale is a no-op; switching locales
 *   triggers a fresh load.
 */

import { LOCALES } from '../i18n/locales.ts';
import type { LocaleCode } from '../i18n/locales.ts';
import { getAcceptedWords, addAcceptedWord } from '../i18n/accepted-words.ts';

export class WordValidator {
  private words = new Set<string>();
  private acceptedWords = new Set<string>();
  private currentLocale: LocaleCode | null = null;

  /** Replace the current dictionary with the given normalized list. */
  loadWords(text: string): void {
    this.words = new Set();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const word = line.trim().toLowerCase();
      if (word.length >= 2) this.words.add(word);
    }
  }

  /** Layer per-locale dispute-accepted words on top of the main dictionary. */
  loadAcceptedWords(locale: LocaleCode): void {
    this.acceptedWords = new Set(getAcceptedWords(locale).map(w => w.toLowerCase()));
  }

  /** Record a dispute-accepted word so it's valid in future games. */
  acceptWord(word: string): void {
    if (!this.currentLocale) return;
    // A word still carrying an unresolved blank ('*') is never a real word —
    // don't let it pollute the accepted-words list or its persisted storage.
    if (word.includes('*')) return;
    const norm = word.toLowerCase();
    this.acceptedWords.add(norm);
    addAcceptedWord(this.currentLocale, norm);
  }

  /** Set the locale this validator is currently serving. */
  setLocale(locale: LocaleCode): void {
    this.currentLocale = locale;
  }

  isWord(word: string): boolean {
    const norm = word.toLowerCase();
    return this.words.has(norm) || this.acceptedWords.has(norm);
  }

  hasPrefix(prefix: string): boolean {
    const norm = prefix.toLowerCase();
    // O(n) over the dictionary — only used in hints/suggestions, infrequent.
    for (const w of this.words) {
      if (w.startsWith(norm)) return true;
    }
    for (const w of this.acceptedWords) {
      if (w.startsWith(norm)) return true;
    }
    return false;
  }

  get size(): number {
    return this.words.size + this.acceptedWords.size;
  }

  get locale(): LocaleCode | null {
    return this.currentLocale;
  }
}

// ─── Singleton + loader ───────────────────────────────────────────────────

let validatorInstance: WordValidator | null = null;
let inflightLoad: Promise<WordValidator> | null = null;

export function getValidator(): WordValidator {
  if (!validatorInstance) validatorInstance = new WordValidator();
  return validatorInstance;
}

/**
 * Fetch and install the dictionary for the given locale. Falls back to the
 * built-in minimal English list if the network fetch fails (dev mode or
 * offline first-launch in a non-bundled locale).
 *
 * Returns the validator after it's ready.
 */
export async function loadDictionary(locale: LocaleCode = 'en'): Promise<WordValidator> {
  const validator = getValidator();
  if (validator.locale === locale && validator.size > 0) return validator;

  // Coalesce concurrent loads of the same locale
  if (inflightLoad && validator.locale === locale) return inflightLoad;

  inflightLoad = (async () => {
    const def = LOCALES[locale];
    try {
      // Try bundled first (works offline). For non-EN in iOS hybrid mode,
      // this 404s and we fall back to the remote URL.
      const localUrl = def.dictUrl; // e.g. 'dictionaries/en.txt'
      let response = await fetch(localUrl);
      const contentType = response.headers.get('content-type') || '';
      // Vite/SPA returns HTML 200 for missing files — guard against that.
      if (!response.ok || (!contentType.includes('text/plain') && !contentType.includes('octet-stream'))) {
        // Fall back to remote CDN-style URL
        const remoteUrl = `https://samilamti.github.io/word-games/${localUrl}`;
        response = await fetch(remoteUrl);
        if (!response.ok) throw new Error(`Dictionary ${locale} not found locally or remotely`);
      }
      const text = await response.text();
      if (text.split('\n').length < 100) throw new Error('Dictionary file appears invalid');
      validator.loadWords(text);
      validator.setLocale(locale);
      validator.loadAcceptedWords(locale);
      console.log(`Dictionary loaded (${locale}): ${validator.size} words`);
    } catch (err) {
      console.warn(`[WordValidator] ${locale} fetch failed, using fallback:`, err);
      loadFallbackDictionary(validator);
      validator.setLocale(locale);
      validator.loadAcceptedWords(locale);
    }
    inflightLoad = null;
    return validator;
  })();

  return inflightLoad;
}

/** Tiny built-in English list — used only when a real dictionary fetch fails. */
function loadFallbackDictionary(validator: WordValidator): void {
  const words = [
    'aa', 'ab', 'ad', 'ae', 'ag', 'ah', 'ai', 'al', 'am', 'an', 'ar', 'as', 'at', 'aw', 'ax', 'ay',
    'be', 'by', 'do', 'go', 'he', 'hi', 'if', 'in', 'is', 'it', 'me', 'my', 'no', 'of', 'oh', 'on', 'or', 'so', 'to', 'up', 'us', 'we',
    'and', 'are', 'cat', 'dog', 'eat', 'fly', 'get', 'has', 'how', 'jam', 'key', 'log', 'mat', 'now', 'oak', 'pan', 'run', 'sun', 'top', 'use', 'van', 'who', 'you', 'zoo',
    'able', 'best', 'call', 'door', 'easy', 'fish', 'give', 'home', 'jump', 'kind', 'love', 'mind', 'note', 'open', 'play', 'read', 'soul', 'time', 'used', 'vine', 'walk', 'year', 'zone',
    'about', 'after', 'apple', 'beach', 'cloud', 'dance', 'early', 'flame', 'great', 'happy', 'iron', 'judge', 'knife', 'light', 'magic', 'night', 'orbit', 'place', 'quiet', 'river', 'storm', 'truth', 'under', 'voice', 'water', 'youth', 'zebra',
  ];
  validator.loadWords(words.join('\n'));
}
