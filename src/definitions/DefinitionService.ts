/**
 * Definition lookup service — reads the bundled, prefix-bucketed definition
 * dataset produced by scripts/data/package-defs.mjs and resolves a played word
 * into a displayable DefEntry.
 *
 * On-disk layout (public/definitions/<locale>/<bucket>.json):
 *     { "<word>":  {s:[{p,g}], x?, i?, f?, gl?}   // a definition
 *     , "<form>":  {r:lemma, t?:tags} }           // a redirect to its lemma
 *
 * Lookup contract (MUST mirror package-defs.mjs):
 *     bucket = bucketKey(word); entry = json[word.toLowerCase()]
 * Get bucketKey wrong and every lookup silently misses — DefinitionService.test
 * pins the fold against the cases the packager produces.
 *
 * Pure and game-state-free. The bucket transport is injectable so the logic
 * (fold, cache, coalesce, redirect resolution) is unit-tested against in-memory
 * fixtures without the multi-hundred-MB (gitignored) dataset.
 */

import type { LocaleCode } from '../i18n/locales.ts';

// ─── Public types ────────────────────────────────────────────────────────────

export interface DefSense {
  /** Part of speech, e.g. "noun"; null when the source carried none. */
  pos: string | null;
  gloss: string;
}

export interface DefEntry {
  senses: DefSense[];
  example?: string;
  ipa?: string;
  /** Global frequency rank (1 = most common); absent for rare words. */
  freqRank?: number;
  /** 'en' when the gloss is an English fallback rather than the native language. */
  glossLang?: 'en';
  /** Present when the looked-up word was an inflected form resolved to its lemma. */
  formOf?: { lemma: string; tags?: string };
}

// ─── On-disk (compact) shapes ────────────────────────────────────────────────

interface RawDef {
  s: { p: string | null; g: string }[];
  x?: string;
  i?: string;
  f?: number;
  gl?: string;
}
interface RawRedirect {
  r: string;
  t?: string;
}
type RawEntry = RawDef | RawRedirect;
type RawBucket = Record<string, RawEntry>;

const isRedirect = (e: RawEntry): e is RawRedirect =>
  typeof (e as RawRedirect).r === 'string';

// ─── bucketKey — byte-for-byte mirror of package-defs.mjs ─────────────────────

/**
 * First two letters, diacritics folded, non-[a-z] → '_', '__' when empty.
 * MUST stay identical to bucketKey() in scripts/data/package-defs.mjs, or
 * lookups load the wrong file and silently miss.
 */
export function bucketKey(word: string): string {
  const folded = word.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return folded.slice(0, 2).replace(/[^a-z]/g, '_') || '__';
}

// ─── Bucket transport (injectable) ────────────────────────────────────────────

/** Fetch a bucket's raw JSON, or null when it doesn't exist / isn't JSON. */
export type BucketFetcher = (locale: string, bucket: string) => Promise<RawBucket | null>;

/**
 * Default transport: fetch the bundled file. Mirrors WordValidator.loadDictionary's
 * content-type guard — Vite serves an HTML 200 for missing static files, so a
 * non-JSON content-type means "no such bucket", not a parse error. Bundled-only
 * (every locale ships in-app), so there's no CDN fallback.
 */
const fetchBucket: BucketFetcher = async (locale, bucket) => {
  let res: Response;
  try {
    res = await fetch(`definitions/${locale}/${bucket}.json`);
  } catch {
    return null; // offline / network error
  }
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json') && !contentType.includes('text/plain')) {
    return null; // SPA HTML fallback for a missing file
  }
  try {
    return (await res.json()) as RawBucket;
  } catch {
    return null;
  }
};

// ─── Service ──────────────────────────────────────────────────────────────────

export class DefinitionService {
  /** bucketKey-keyed cache; a cached `null` means "known absent" (don't refetch). */
  private cache = new Map<string, RawBucket | null>();
  private inflight = new Map<string, Promise<RawBucket | null>>();
  private readonly fetcher: BucketFetcher;

  constructor(fetcher: BucketFetcher = fetchBucket) {
    this.fetcher = fetcher;
  }

  /** Load (and cache) a bucket. Concurrent loads of the same bucket coalesce. */
  async loadBucket(locale: string, bucket: string): Promise<RawBucket | null> {
    const key = `${locale}/${bucket}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const pending = this.inflight.get(key);
    if (pending) return pending;

    const load = (async () => {
      try {
        const data = await this.fetcher(locale, bucket);
        this.cache.set(key, data);
        return data;
      } catch {
        this.cache.set(key, null);
        return null;
      } finally {
        this.inflight.delete(key);
      }
    })();
    this.inflight.set(key, load);
    return load;
  }

  /**
   * Resolve a word to a displayable entry, or null if undefined. An inflected
   * form (redirect) resolves one hop to its lemma's definition, annotated with
   * formOf. Redirect→redirect chains are not followed (the builder guarantees a
   * redirect always points at a real definition).
   */
  async lookup(locale: LocaleCode, word: string): Promise<DefEntry | null> {
    const key = word.toLowerCase();
    const bucket = await this.loadBucket(locale, bucketKey(key));
    const raw = bucket?.[key];
    if (!raw) return null;

    if (isRedirect(raw)) {
      const lemma = raw.r;
      const lemmaBucket = await this.loadBucket(locale, bucketKey(lemma));
      const lemmaRaw = lemmaBucket?.[lemma.toLowerCase()];
      if (!lemmaRaw || isRedirect(lemmaRaw)) return null; // no chained redirects
      const entry = toEntry(lemmaRaw);
      entry.formOf = raw.t ? { lemma, tags: raw.t } : { lemma };
      return entry;
    }
    return toEntry(raw);
  }
}

/** Map the compact on-disk def into the public DefEntry shape. */
function toEntry(raw: RawDef): DefEntry {
  const entry: DefEntry = {
    senses: (raw.s || []).map((s) => ({ pos: s.p ?? null, gloss: s.g })),
  };
  if (raw.x) entry.example = raw.x;
  if (raw.i) entry.ipa = raw.i;
  if (raw.f != null) entry.freqRank = raw.f;
  if (raw.gl === 'en') entry.glossLang = 'en';
  return entry;
}

/** App-wide singleton — Phase B's definition toast imports this. */
export const definitionService = new DefinitionService();
