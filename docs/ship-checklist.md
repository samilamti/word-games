# Lexica Knights — Ship Checklist (resume here)

_Snapshot 2026-06-07. The single "start here next session" doc. Detail lives in the
plan docs referenced at the bottom; this is the prioritized action list._

## Where we are (done this session)
- **Definitions delivery — Option B** code done (`4064f0d`): `DefinitionService` bundled→CDN fallback + transient-retry; `strip-non-bundled-assets.mjs` (bundle en+pt). **CDN publish still pending.**
- **i18n** — new UI (definitions/journal/review/paywall) localized in 6 langs (`fa9cf94`); ActionBar fixed. A follow-up pass for the *existing* UI (gameStore/modals) was **in progress in the working tree** — see ⚠️.
- **Android** — platform scaffolded (`67ed4d8`); RevenueCat verified Cap-8 drop-in.
- **Billing code** wired (`fdd605e`), config-gated + dev-safe; runbook `docs/revenuecat-setup.md`.
- **iOS IAP + RevenueCat — configured headlessly via API:** `full_unlock` @ **79 kr** in ASC (`MISSING_METADATA`); RC project `projfddee869` fully built (app `app8833052c22` ← ASC key 6368K27LRK; entitlement `unlock` ← product `full_unlock` `one_time`; current offering `default` → package `lifetime`); `VITE_RC_IOS_KEY` wired in `.env.local`.

## ⚠️ Do first next session
1. **Finish + commit the parallel i18n work.** The working tree has uncommitted edits (`locales.ts`, `gameStore.ts`, `BoardState.ts`, `EnemyAppearToast.tsx`, `scripts/i18n-audit.mjs`). Whole-project `npx tsc -b` was **failing** — some locales were missing the ~45 newly-added keys. → complete the translations, `tsc -b` green, run `node scripts/i18n-audit.mjs src`, commit. (Use the `app-i18n` skill.)
2. **Rotate the RevenueCat `sk_` secret** — it was pasted in chat; it's config-only, not used at runtime, so rotating has zero runtime impact.

## iOS → first sandbox purchase
3. **IAP review screenshot** → clears `MISSING_METADATA` (Apple won't return the product to StoreKit, even in sandbox, until "Ready to Submit"). Can be uploaded via the ASC asset API, or dragged in.
4. `npm run ios:release` (build inlines `VITE_RC_IOS_KEY`) → TestFlight.
5. **Sandbox purchase test** on-device (sandbox Apple ID): buy → unlock → restore; confirm campaign 3–5 + journal/review gate flip.

## Definitions CDN (finish Phase E)
6. Confirm CDN host (**R2** lean) → publish the 346 MB `public/definitions/` → add a `data:publish` step → set `VITE_DEFS_CDN_BASE`.

## Android (the long pole — start the clock EARLY)
7. Phase 0: `ANDROID_HOME`/PATH + an AVD. Phase 5: on-device smoke test (tile drag, Pixi overlay, memory on the big `de` set).
8. **Play Console**: create app, IARC rating, Data Safety, signed AAB → Internal → **Closed test (~20 testers, 14 *continuous* days)** — this calendar gate is the #1 schedule risk; start ASAP.
9. Play `full_unlock` managed product + add the Play app to RevenueCat (**reuse `scripts/revenuecat/configure.mjs`**) + wire `VITE_RC_ANDROID_KEY`.
10. Decisions to pre-make: back-button per-screen semantics, `versionCode`/`versionName` scheme, Android player-name (local entry vs PGS).

## References
- Plans: `docs/app-integration-plan.md`, `docs/android-bringup-plan.md`, `docs/definitions-delivery-decision.md`, `docs/revenuecat-setup.md`
- Automation (this repo): `scripts/asc/{create-iap,set-iap-price}.mjs`, `scripts/revenuecat/configure.mjs`, `scripts/strip-non-bundled-assets.mjs`, `scripts/i18n-audit.mjs`
- Skills: `app-i18n`, `revenuecat-setup`, `app-store-connect-api`
