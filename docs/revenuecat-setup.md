# RevenueCat setup — going live with the one-time unlock

**Status:** the *code* is done and shipped (`src/billing/billing.ts`, commit `fdd605e`). This runbook is the **external setup** that flips it from local/dev mode to real purchases. None of it is code — it's store + dashboard config + two env keys.

## What the code already expects (the contract)

`src/billing/billing.ts` is the only place that talks to the store SDK. It assumes:

| Thing | Value the code uses | Where you configure it |
|---|---|---|
| Entitlement id | **`unlock`** (`ENTITLEMENT_ID`) | RevenueCat → Entitlements |
| Product to buy | `offerings.current.availablePackages[0]` | RevenueCat → Offerings (the **Current** offering's first package) |
| Price shown in paywall | that package's `product.priceString` | derives from the store price (SEK) |
| iOS key | `VITE_RC_IOS_KEY` (`appl_…`) | `.env.local` |
| Android key | `VITE_RC_ANDROID_KEY` (`goog_…`) | `.env.local` |

Until both keys are set on a native build, billing stays in local/dev mode (no real purchases) and the app runs normally. The entitlement gates campaign enemies 3–5 + the journal/review/vocab layer; definitions stay free.

**Order matters:** store products must exist *before* RevenueCat can read them, and Apple's Paid-Apps agreement must be active *before* iOS products return anything. Do the steps in order.

---

## Step A — App Store Connect (iOS in-app purchase)

App: **Lexica Knights** (`com.samixavierlamti.lexiconquest`, ASC app id `6765603467`). `IN_APP_PURCHASE` capability is already enabled on the App ID.

1. **Agreements, Tax, and Banking** (ASC → Business): sign the **Paid Applications** agreement and complete banking + tax. **This is the #1 gotcha** — without an active Paid Apps agreement, IAPs never load and RevenueCat's offering comes back empty (→ `purchase()` returns false with "no offering configured").
2. ASC → the app → **Monetization → In-App Purchases → +** → type **Non-Consumable**.
   - **Reference Name:** `Full Unlock` · **Product ID:** `full_unlock` (permanent once created — keep it lowercase so the same id works on Play).
   - **Price:** pick a price point; since the account is SEK, set/confirm the SEK price. Add a localized **display name + description** (English at least).
   - Add the required **review screenshot** of the paywall, and attach the IAP to the next app version (a first IAP sits in "Missing Metadata"/"Ready to Submit" until attached + reviewed with a build).
3. Create a **Sandbox tester** (ASC → Users and Access → Sandbox) for test purchases.
4. For RevenueCat receipt validation, generate an **In-App Purchase Key** (Users and Access → Integrations/Keys → In-App Purchase) — you'll upload the `.p8` to RevenueCat in Step C. (The app-specific shared secret also works; the IAP key is the modern path.)

> Automation note: IAP creation + the Paid-Apps agreement are web-UI/legal steps. The `app-store-connect-api` skill can script surrounding metadata, but create the product in the web UI — the API path for IAPs is fiddly and not worth it for one product.

## Step B — Google Play Console (Android in-app product)

Package `com.samixavierlamti.lexiconquest` (Android target scaffolded — see `docs/android-bringup-plan.md`). You need an app created in Play Console + a payments/merchant profile.

1. Play Console → the app → **Monetize → Products → In-app products → Create product**.
   - **Product ID:** `full_unlock` (match iOS) · **Name/description** · **Price** in SEK · set status **Active**.
2. Add **license testers** (Play Console → Setup → License testing) so test accounts can "buy" without being charged; distribute via **Internal testing**.
3. Create a **Google Cloud service account** with **Google Play Android Developer API** access and grant it in Play Console (View financial data / Manage orders). Download its **JSON key** — you'll upload it to RevenueCat in Step C so RC can validate Play purchases. (Optional but recommended: wire **Real-time developer notifications** via Pub/Sub.)

## Step C — RevenueCat dashboard

1. Create a **Project** (e.g. "Lexica Knights").
2. **Add app → Apple App Store**: bundle id `com.samixavierlamti.lexiconquest`; upload the **In-App Purchase Key `.p8`** (or shared secret) from Step A4.
3. **Add app → Google Play Store**: package `com.samixavierlamti.lexiconquest`; upload the **service account JSON** from Step B3.
4. **Entitlements → +** → identifier exactly **`unlock`** (must match `ENTITLEMENT_ID` in the code).
5. **Products** → import/add the store products: `full_unlock` (App Store) and `full_unlock` (Play Store). **Attach both to the `unlock` entitlement.**
6. **Offerings** → open the **default/Current** offering → add a **Package** (e.g. "Lifetime") → set its product to `full_unlock` on each store. The code buys this offering's **first** package, so make sure it's the one you want and the offering is marked **Current**.
7. **Project settings → API keys** → copy the **public SDK keys**: iOS `appl_…`, Android `goog_…`. (These are public/embeddable — safe in the app bundle. The secret keys / service-account JSON stay server-side in RC; never put those in the app.)

## Step D — wire the keys + rebuild

Put the public keys in **`.env.local`** (gitignored; template is in `.env.example`):

```sh
VITE_RC_IOS_KEY=appl_xxxxxxxxxxxxxxxx
VITE_RC_ANDROID_KEY=goog_xxxxxxxxxxxxxxxx
```

Then rebuild the native app so the keys are inlined at build time:

```sh
npm run ios:build        # → archive/upload via npm run ios:release
npm run android:build    # → Android Studio / cap run android
```

No code changes — `billing.configure()` activates RevenueCat automatically once a key is present on a native platform.

## Step E — verify (sandbox / testers)

On a **device or TestFlight/Internal-testing build** (not the web build — purchases are native-only):

- [ ] Paywall's buy button shows the **real SEK price** (`getPriceString()` resolved the offering). If it still shows the generic "One-time purchase" label, the offering/product isn't wired (re-check Step C6 + that products are "Approved"/active).
- [ ] **Buy** with a sandbox/license-tester account → paywall closes, campaign enemies 3–5 unlock, journal/save/review stop paywalling.
- [ ] Kill + relaunch → still unlocked (entitlement hydrated at launch; no paywall flash).
- [ ] **Restore purchase** on a fresh install / second device with the same store account → unlocks (Apple requires a working restore path — already wired).
- [ ] Locked state (a fresh tester) → only enemies 1–2 playable, journal/save → paywall; definitions still free in all 6 languages.

## Gotchas

- **Apple Paid-Apps agreement / banking not active** → empty offering → silent "purchase not completed." Most common failure; do Step A1 first.
- **Product id mismatch** between the store and what RC references → product won't load. Keep both `full_unlock`.
- **Entitlement id must be exactly `unlock`** — it's hard-coded as the gate (`ENTITLEMENT_ID`).
- **Capacitor 8 / SPM:** after the first `cap sync ios`, if the RevenueCat plugin's products don't surface in Xcode, that's the ecosystem-wide bug `ionic-team/capacitor#8325` — apply its workaround (not RC-specific). The plugin is otherwise a verified clean SPM drop-in.
- **Public vs secret keys:** only the `appl_…` / `goog_…` *public SDK* keys go in the app. The App Store IAP key, Play service-account JSON, and RC secret API keys live in the RC dashboard / server side — never commit them.
- **New products take time to propagate** in both stores (minutes–hours) before they load in sandbox.

## References

- Code seam: `src/billing/billing.ts` · entitlement gate: `src/store/entitlementStore.ts` (`requireUnlock`) · paywall: `src/components/Paywall.tsx`
- Compatibility verdict (why RevenueCat, Cap-8 drop-in): `docs/android-bringup-plan.md` Phase 7
- RevenueCat docs: https://www.revenuecat.com/docs (Capacitor install, Configuring Products, Offerings, Entitlements)
