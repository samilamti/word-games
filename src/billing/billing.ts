/**
 * Billing abstraction for the one-time "full unlock" (entitlement id `unlock`).
 *
 * ⚠️ STUB IMPLEMENTATION. This currently persists the unlock to localStorage so
 * the paywall + gating can be built and tested end-to-end on web/dev WITHOUT a
 * RevenueCat account, sandbox purchase, or store-configured product. The real
 * implementation is deferred to when iOS work resumes (M3/M4) and credentials
 * exist — see the seam below.
 *
 * TO WIRE REAL BILLING (RevenueCat):
 *   1. Confirm @revenuecat/purchases-capacitor supports Capacitor 8 / SPM before
 *      installing (custom native glue follows the GameCenter plugin pattern if
 *      not — see CLAUDE.md).
 *   2. configure() → Purchases.configure({ apiKey }) with the platform key.
 *   3. isUnlocked() → read Purchases.getCustomerInfo(); entitlements.active['unlock'].
 *   4. purchase() → Purchases.purchaseStoreProduct(...) for the one non-consumable.
 *   5. restore() → Purchases.restorePurchases() (Apple requires a restore path).
 *   6. Create the non-consumable IAP in App Store Connect (likely web-UI only;
 *      IN_APP_PURCHASE capability is already enabled on the bundle id) + a Play
 *      Console managed product. Price in SEK to avoid double FX (machine memory).
 * Keep this module the ONLY place that knows about the store SDK; the app talks
 * to `billing` + entitlementStore.
 */

const UNLOCK_KEY = 'lexica_knights_unlock';

function readFlag(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

function writeFlag(v: boolean): void {
  try {
    localStorage.setItem(UNLOCK_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export const billing = {
  /** One-time init. No-op in the stub. */
  async configure(): Promise<void> {
    /* RevenueCat: Purchases.configure({ apiKey }) */
  },

  /** Current entitlement, read synchronously from the persisted flag. */
  isUnlocked(): boolean {
    return readFlag();
  },

  /** STUB: simulate a successful purchase. Real impl: Purchases.purchaseStoreProduct. */
  async purchase(): Promise<boolean> {
    writeFlag(true);
    return true;
  },

  /** STUB: reflect the persisted flag. Real impl: Purchases.restorePurchases. */
  async restore(): Promise<boolean> {
    return readFlag();
  },

  /** Dev-only override used by the __lexicaUnlock console helper. */
  _devSet(v: boolean): void {
    writeFlag(v);
  },
};
