import { describe, it, expect } from 'vitest';
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
