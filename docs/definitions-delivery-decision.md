# Definitions delivery — decision memo

**Status:** decision needed (drafted 2026-06-06). Blocks Phase E, the iOS ship,
and Android bring-up. Everything upstream (Phases A–D) is built and verified;
this is the one gate left before M4.

## The problem

The definitions dataset is **346 MB** (`public/definitions/`, 6 locales,
gitignored/durable-local). Phases A–D fetch it with a relative
`fetch('definitions/<locale>/<bucket>.json')` that today only resolves against
the **app bundle**. We need to decide how those 346 MB actually reach the iOS
and Android apps. The original intent (memory `platform-scope`) was "ship ALL
datasets in-bundle, offline-first" — but that was written before the size was
known, and 346 MB changes the maths.

### The numbers

| Locale | Size | | |
|---|---|---|---|
| de | 98 MB | es | 79 MB |
| it | 61 MB | fr | 58 MB |
| en | 41 MB | pt | 8.6 MB |
| **total** | **346 MB** | | |

- A single bucket (one lookup) is ~**52 KB raw / ~15 KB gzipped**, cached after first read.
- A whole locale gzips ~3.4× (en 41 MB → ~12 MB over the wire).
- Today the **dictionaries** (validity lists, 37 MB) already ship this way: `en.txt`
  (3.6 MB) bundled, the other five fetched from **`samilamti.github.io/word-games`**
  with a content-type-guarded fallback (`WordValidator.loadDictionary`). Definitions
  can reuse that exact pattern.

### Platform constraints

- **iOS:** apps may be up to 4 GB, but **>200 MB won't auto-download over cellular**
  (Apple's cap), and a ~360 MB app means slow first installs + heavy TestFlight
  uploads (the plan already flags possible altool quirks at this size).
- **Android:** Google Play caps the **base download at ~200 MB**. 346 MB in the base
  bundle is **rejected** — anything over the cap must use **Play Asset Delivery
  (PAD)** asset packs or feature modules. So "just bundle it" isn't even an option
  on Android.

## Options

| | App size | Offline | Infra cost | Complexity | Cross-platform |
|---|---|---|---|---|---|
| **A. Bundle everything** | ~360 MB | 100% (all langs) | $0 | iOS trivial; **Android still needs PAD** | asymmetric |
| **B. CDN-fetch, bundle a starter** ⭐ | ~small (≤ bundled locale) | default locale yes; others on-demand+cached | ~$0 | low (reuses dictionary pattern) | **uniform** |
| **D. iOS bundle + Android PAD** | iOS ~360 MB / Android small | 100% | $0 | high (two mechanisms; PAD native glue) | asymmetric |

(Option C "hybrid bundle some / fetch rest" collapses into B with a larger starter set.)

### A — Bundle everything in both apps
Maximal offline, zero infra, and on **iOS** it already works (Vite copies `public/`
→ `dist/` → the app). But **Android can't bundle 346 MB** — you'd be forced into PAD
for the over-cap portion anyway, and Capacitor's WebView can't read a PAD asset pack
as a `fetch`-able file without native glue to extract the pack to the filesystem
first. So "bundle all" doesn't actually save you the Android complexity, and it
costs a ~360 MB iOS app.

### B — CDN-fetch, bundle a starter locale ⭐ recommended
Bundle only the **default/device locale's** definitions (e.g. en ≈ 41 MB, or nothing
for the smallest app) and fetch every other bucket on demand from a CDN, cached in
the existing per-bucket `Map`. This is **exactly how the dictionaries already ship**,
so the precedent, the fallback shape, and the CDN host all exist.

- **App size:** as small as we choose (bundle en, or bundle nothing).
- **Per-lookup:** bundled locale instant; other languages ~15 KB gzipped per bucket,
  once, then cached. Imperceptible.
- **Offline:** the bundled locale is fully offline. Other languages need network on
  the *first* use of each bucket — and definitions already **degrade gracefully**
  (a failed lookup just shows no toast; gameplay/validity is unaffected since the
  dictionary is separate).
- **Same code path on iOS and Android** — no PAD, no native glue.
- **Change required:** add a CDN fallback to `DefinitionService.loadBucket` (today
  it's bundled-only) — ~10 lines mirroring `WordValidator`'s guarded fallback.

### D — iOS bundle-all + Android PAD
Most-offline on both, but two delivery mechanisms to build and maintain, the big iOS
app, and the Android PAD native glue. Highest cost for a marginal offline gain over B.

## Recommendation

**Option B**, bundling the default locale's definitions and CDN-fetching the rest.
It yields the smallest apps, one uniform cross-platform code path, reuses the
dictionary delivery we already trust, and sidesteps Android PAD entirely. The only
thing we give up vs. "bundle all" is offline definitions for *non-default* languages
*on first use* — acceptable, because definitions are a free overlay that already
no-ops gracefully offline, and core gameplay (dictionary validity) is unaffected.

This does revise the `platform-scope` "everything in-bundle / offline-first" stance —
worth a conscious confirmation, but the 346 MB reality (and Android's hard cap) is
the deciding factor.

## Implementation sketch (Option B)

1. **Pick a CDN host** (sub-decision below) and publish `public/definitions/` to it,
   preserving the `<locale>/<bucket>.json` layout. Add a `data:publish` script.
2. **`DefinitionService.loadBucket`:** on a bundled miss (non-OK / non-JSON
   content-type), retry against `<CDN_BASE>/definitions/<locale>/<bucket>.json`.
   Copy the content-type guard already in `WordValidator`.
3. **Build pipeline (Phase E):** generalize `strip-non-en-dicts` → also keep only the
   default locale's `definitions/` in the bundle (or strip all of it). Ship all
   dictionaries+definitions to the CDN; ship only the starter set in-app.
4. **Verify:** in `cap sync` output the bundled `definitions/` is the slim set; in a
   device/WebView build a non-bundled locale's word resolves via the CDN; airplane
   mode shows the bundled locale offline and degrades the rest gracefully.
5. **Android:** with B there's no PAD — standard `@capacitor/android` bring-up; the
   slim bundle is well under the 200 MB base cap.

## Open sub-decisions

1. **CDN host.** GitHub Pages (`samilamti.github.io/word-games`) is zero-new-infra and
   already serves the dictionaries, but committing 346 MB bloats that repo. A clean
   alternative is **Cloudflare R2** (S3-compatible, **zero egress fees**, no git
   bloat) — fits Sami's existing Cloudflare usage. *Lean: R2.*
2. **What to bundle in-app.** Default/device locale's defs (offline baseline, ~8–98 MB
   depending on locale) vs. bundle **nothing** (smallest app, definitions are
   online-only-first-use). *Lean: bundle en (the iOS default + most common).*
3. **Confirm the offline trade-off** vs. the old "100% offline" goal. *Lean: accept B.*
4. **CDN refresh.** Re-publish definitions when `npm run data:all` regenerates them;
   wire into a `data:publish` step.
