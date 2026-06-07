import { describe, it, expect, vi, afterEach } from 'vitest';
import { DefinitionService, bucketKey, type BucketFetcher } from './DefinitionService.ts';

// Fixtures mirror the REAL on-disk shape (verified against public/definitions/).
// Typing them as the fetcher's bucket type means a drift from the real shape
// fails to compile — the fixtures can't lie about the format.
type Bucket = NonNullable<Awaited<ReturnType<BucketFetcher>>>;

const FIXTURES: Record<string, Bucket> = {
  'en/kn': {
    knight: {
      s: [{ p: 'noun', g: 'An armored and mounted warrior of the Middle Ages.' }],
      x: 'King Arthur and the Knights of the Round Table',
      i: '/ˈnaɪt/',
      f: 3379,
    },
  },
  'es/ca': {
    casa: {
      s: [
        { p: 'noun', g: 'Edificación destinada a vivienda.' },
        { p: 'noun', g: 'Domicilio.' },
      ],
    },
  },
  'es/ab': {
    abaleador: { s: [{ p: 'noun', g: 'Persona que abalea.' }] },
    abaleadora: { r: 'abaleador', t: 'feminine' }, // inflected form → lemma
    loopa: { r: 'loopb' }, // redirect → redirect (must NOT resolve)
    loopb: { r: 'loopa' },
    orphan: { r: 'ghost' }, // redirect → missing lemma
  },
  'de/ha': {
    haus: { s: [{ p: 'noun', g: 'house' }], gl: 'en' }, // English-fallback gloss
  },
};

function makeFetcher(): { fetcher: BucketFetcher; calls: () => number } {
  let n = 0;
  const fetcher: BucketFetcher = async (locale, bucket) => {
    n += 1;
    return FIXTURES[`${locale}/${bucket}`] ?? null;
  };
  return { fetcher, calls: () => n };
}

describe('bucketKey (mirrors package-defs.mjs)', () => {
  it('takes the first two ascii letters, case-folded', () => {
    expect(bucketKey('knight')).toBe('kn');
    expect(bucketKey('KNIGHT')).toBe('kn');
  });

  it('folds diacritics before bucketing', () => {
    expect(bucketKey('Café')).toBe('ca');
    expect(bucketKey('éclair')).toBe('ec');
    expect(bucketKey('ñu')).toBe('nu'); // ñ → n
    expect(bucketKey('über')).toBe('ub');
  });

  it('maps non-letters to underscore, empty to "__"', () => {
    expect(bucketKey('3d')).toBe('_d');
    expect(bucketKey('a')).toBe('a'); // single letter → single char
    expect(bucketKey('')).toBe('__');
    expect(bucketKey('!!')).toBe('__');
  });
});

describe('DefinitionService.lookup', () => {
  it('returns a native definition (en knight), case-insensitively', async () => {
    const svc = new DefinitionService(makeFetcher().fetcher);
    const e = await svc.lookup('en', 'Knight');
    expect(e).not.toBeNull();
    expect(e!.senses[0]).toEqual({ pos: 'noun', gloss: expect.stringContaining('warrior') });
    expect(e!.example).toContain('Round Table');
    expect(e!.ipa).toBe('/ˈnaɪt/');
    expect(e!.freqRank).toBe(3379);
    expect(e!.formOf).toBeUndefined();
    expect(e!.glossLang).toBeUndefined();
  });

  it('returns every sense (es casa)', async () => {
    const svc = new DefinitionService(makeFetcher().fetcher);
    const e = await svc.lookup('es', 'casa');
    expect(e!.senses).toHaveLength(2);
  });

  it('resolves an inflected form to its lemma (es abaleadora → abaleador)', async () => {
    const svc = new DefinitionService(makeFetcher().fetcher);
    const e = await svc.lookup('es', 'abaleadora');
    expect(e).not.toBeNull();
    expect(e!.senses[0].gloss).toContain('abalea'); // the lemma's gloss
    expect(e!.formOf).toEqual({ lemma: 'abaleador', tags: 'feminine' });
  });

  it('surfaces glossLang when the gloss is an English fallback', async () => {
    const svc = new DefinitionService(makeFetcher().fetcher);
    const e = await svc.lookup('de', 'haus');
    expect(e!.glossLang).toBe('en');
  });

  it('returns null for an undefined word', async () => {
    const svc = new DefinitionService(makeFetcher().fetcher);
    expect(await svc.lookup('en', 'zzzznope')).toBeNull();
  });

  it('does not follow redirect chains or dangling redirects', async () => {
    const svc = new DefinitionService(makeFetcher().fetcher);
    expect(await svc.lookup('es', 'loopa')).toBeNull(); // redirect → redirect
    expect(await svc.lookup('es', 'orphan')).toBeNull(); // redirect → missing lemma
  });

  it('caches buckets and coalesces concurrent loads', async () => {
    const { fetcher, calls } = makeFetcher();
    const svc = new DefinitionService(fetcher);
    await Promise.all([svc.lookup('en', 'knight'), svc.lookup('en', 'knight')]);
    await svc.lookup('en', 'knight');
    expect(calls()).toBe(1); // one fetch for en/kn despite three lookups
  });
});

// ─── Default transport (bundled → CDN fallback) ───────────────────────────────
// Exercise the REAL fetchBucket (no injected fetcher) by stubbing global fetch,
// pinning the bundled→CDN fallback and the transient-vs-absent caching that
// keeps a brief disconnect from permanently hiding a bucket's definitions.

function jsonRes(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  } as unknown as Response;
}

/** Vite's SPA fallback for a missing static file: 200 + text/html. */
function htmlMiss(): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-type' ? 'text/html' : null) },
    json: async () => {
      throw new Error('not json');
    },
  } as unknown as Response;
}

function statusRes(code: number): Response {
  return {
    ok: code >= 200 && code < 300,
    status: code,
    headers: { get: () => null },
    json: async () => ({}),
  } as unknown as Response;
}

describe('DefinitionService default transport (bundled → CDN fallback)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolves from the bundle without touching the CDN', async () => {
    const fetchMock = vi.fn(async (_url: string) =>
      jsonRes({ knight: { s: [{ p: 'noun', g: 'a warrior' }] } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const svc = new DefinitionService(); // default transport
    const e = await svc.lookup('en', 'knight');
    expect(e!.senses[0].gloss).toBe('a warrior');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('definitions/en/kn.json'); // relative = bundle
  });

  it('falls back to the CDN when the bucket is not bundled', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url.startsWith('definitions/') ? htmlMiss() : jsonRes({ casa: { s: [{ p: 'noun', g: 'house' }] } }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const svc = new DefinitionService();
    const e = await svc.lookup('es', 'casa');
    expect(e!.senses[0].gloss).toBe('house');
    expect(fetchMock).toHaveBeenCalledTimes(2); // bundle miss → CDN hit
    expect(fetchMock.mock.calls[1][0]).toContain('/definitions/es/ca.json'); // absolute CDN url
  });

  it('returns null when a bucket is absent in both the bundle and the CDN', async () => {
    const fetchMock = vi.fn(async (_url: string) => statusRes(404));
    vi.stubGlobal('fetch', fetchMock);
    const svc = new DefinitionService();
    expect(await svc.lookup('es', 'casa')).toBeNull();
  });

  it('caches a definitive absence — no refetch of the same bucket', async () => {
    const fetchMock = vi.fn(async (_url: string) => statusRes(404));
    vi.stubGlobal('fetch', fetchMock);
    const svc = new DefinitionService();
    await svc.lookup('es', 'casa'); // bundle 404 → CDN 404 → null (cached)
    await svc.lookup('es', 'casa'); // served from cache
    expect(fetchMock).toHaveBeenCalledTimes(2); // 2 (bundle+CDN) once, 0 the second time
  });

  it('does NOT cache a transient CDN failure — a later lookup retries and succeeds', async () => {
    let online = false;
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith('definitions/')) return htmlMiss(); // never bundled
      if (!online) throw new TypeError('Failed to fetch'); // CDN unreachable
      return jsonRes({ casa: { s: [{ p: 'noun', g: 'house' }] } });
    });
    vi.stubGlobal('fetch', fetchMock);
    const svc = new DefinitionService();

    expect(await svc.lookup('es', 'casa')).toBeNull(); // offline → graceful no-def
    online = true;
    const e = await svc.lookup('es', 'casa'); // retries because nothing was cached
    expect(e!.senses[0].gloss).toBe('house');
  });
});
