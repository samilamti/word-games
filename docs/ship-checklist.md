# Lexica Knights — Ship Checklist (resume here)

_Snapshot 2026-06-07. The single "start here next session" doc. Detail lives in the
plan docs referenced at the bottom; this is the prioritized action list._

## Where we are (done this session)
- **Definitions delivery — Option B** code done (`4064f0d`): `DefinitionService` bundled→CDN fallback + transient-retry; `strip-non-bundled-assets.mjs` (bundle en+pt). **CDN publish still pending.**
- **i18n** — new UI localized in 6 langs (`fa9cf94`) + the *existing*-UI follow-up (gameStore/modals + enemy content) **done & committed (`7a64229`)**. Whole project: `tsc -b` green, 27 tests pass.
- **Android** — platform scaffolded (`67ed4d8`); RevenueCat verified Cap-8 drop-in.
- **Billing code** wired (`fdd605e`), config-gated + dev-safe; runbook `docs/revenuecat-setup.md`.
- **iOS IAP + RevenueCat — configured headlessly via API:** `full_unlock` @ **79 kr** in ASC (`MISSING_METADATA`); RC project `projfddee869` fully built (app `app8833052c22` ← ASC key 6368K27LRK; entitlement `unlock` ← product `full_unlock` `one_time`; current offering `default` → package `lifetime`); `VITE_RC_IOS_KEY` wired in `.env.local`.

## ⚠️ Do first next session
1. **Rotate the RevenueCat `sk_` secret** — it was pasted in chat; config-only, not used at runtime, so rotating has zero runtime impact.

_(The earlier in-flight i18n pass landed as `7a64229`; `tsc -b` is green and 27 tests pass, so that risk is cleared.)_

## iOS → first sandbox purchase
2. ✅ **In-App Purchase Key — DONE 2026-06-08** (key `PY54MW53LV`). Generated in ASC (Users and Access → Integrations → In-App Purchase), `.p8` uploaded to RevenueCat → Apps → Lexica Knights; RC API confirms `app_store.subscription_key_configured: true` (RC labels the IAP key "subscription_key"). Mandatory for StoreKit 2 — without it RC silently drops transactions and the unlock never flips. Was distinct from the ASC *API* key (product import); both halves were web-UI-only.
3. ✅ **IAP `full_unlock` → READY_TO_SUBMIT — DONE 2026-06-08** (all via API). Two gaps were blocking, not one:
   - **Review screenshot** — captured from the live paywall (`scripts/capture-screenshot.mjs`: Chrome-CDP over WS, zero-dep, runs the new `__lexicaPaywall.open()` hook) → uploaded (`scripts/asc/upload-iap-screenshot.mjs`). **Must be an exact device size: 1242×2208 works; 828×1792 → `IMAGE_INCORRECT_DIMENSIONS` (FAILED asset).**
   - **Availability** — modern ASC requires it *separately from price*; `set-iap-price.mjs` set the SEK price but no territories, so it stuck at MISSING_METADATA. Created across all 175 territories (`scripts/asc/set-iap-availability.mjs`). Gotcha: that resource's product relationship is `inAppPurchase`, **not** `inAppPurchaseV2` (which the screenshot resource uses).
   - Verify anytime with `scripts/asc/inspect-iap.mjs` (state + localization + price + screenshot + availability).
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
