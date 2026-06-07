/**
 * Billing for the one-time "full unlock" (RevenueCat entitlement id `unlock`).
 *
 * Wired to @revenuecat/purchases-capacitor (verified drop-in on Capacitor 8 /
 * SPM — see docs/android-bringup-plan.md Phase 7). This module is the ONLY place
 * that talks to the store SDK; the app uses `billing` + entitlementStore.
 *
 * Activation is CONFIG-GATED so the app runs everywhere without credentials:
 *   - RevenueCat drives purchases only when running NATIVE *and* a per-platform
 *     public API key is set (VITE_RC_IOS_KEY / VITE_RC_ANDROID_KEY).
 *   - Otherwise (web, `npm run dev`, or a native build before keys exist) it
 *     falls back to a local localStorage flag. A real (non-dev) build NEVER
 *     grants a free unlock — purchase() only "succeeds" locally in dev mode.
 * The native SDK is dynamically imported so its code never enters the web bundle.
 *
 * REMAINING EXTERNAL STEPS to go live (none are code):
 *   1. Create a RevenueCat project; set VITE_RC_IOS_KEY / VITE_RC_ANDROID_KEY
 *      (the public `appl_…` / `goog_…` SDK keys) in .env.local.
 *   2. Create the non-consumable IAP in App Store Connect (IN_APP_PURCHASE cap
 *      already enabled) + a Play Console managed product. Price in SEK.
 *   3. In RevenueCat: add both store products to entitlement `unlock`, and put
 *      the product in the **current Offering** (purchase() buys its first
 *      package; getPriceString() reads its localized price).
 */
import { Capacitor } from '@capacitor/core';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';

const UNLOCK_KEY = 'lexica_knights_unlock';
const ENTITLEMENT_ID = 'unlock';

/** Per-platform RevenueCat PUBLIC SDK keys (RC dashboard → API keys). Empty
 *  until the account exists → billing stays in local/dev mode. */
const RC_KEYS: Record<string, string> = {
  ios: import.meta.env.VITE_RC_IOS_KEY ?? '',
  android: import.meta.env.VITE_RC_ANDROID_KEY ?? '',
};

let cachedUnlocked = readFlag();
let rcReady = false; // true once Purchases.configure() has succeeded

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

function platformKey(): string {
  return RC_KEYS[Capacitor.getPlatform()] ?? '';
}
/** Drive purchases through RevenueCat only on a native platform with a key set. */
function useRevenueCat(): boolean {
  return Capacitor.isNativePlatform() && platformKey().length > 0;
}
function isActive(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_ID] != null;
}

export const billing = {
  /**
   * One-time init at launch. Configures RevenueCat (native + key) and resolves
   * the current entitlement; on web/dev/pre-config resolves the local flag.
   * Returns the unlock state so the entitlement store can hydrate from it.
   */
  async configure(): Promise<boolean> {
    if (!useRevenueCat()) return cachedUnlocked;
    try {
      const { Purchases, LOG_LEVEL } = await import('@revenuecat/purchases-capacitor');
      await Purchases.setLogLevel({ level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR });
      await Purchases.configure({ apiKey: platformKey() });
      rcReady = true;
      const { customerInfo } = await Purchases.getCustomerInfo();
      cachedUnlocked = isActive(customerInfo);
      writeFlag(cachedUnlocked);
    } catch (e) {
      console.warn('[billing] RevenueCat configure failed; using local entitlement:', e);
    }
    return cachedUnlocked;
  },

  /** Current entitlement, read synchronously from the cache (kept fresh by
   *  configure/purchase/restore + persisted so a returning user never flashes
   *  the paywall before RevenueCat answers). */
  isUnlocked(): boolean {
    return cachedUnlocked;
  },

  /** Buy the unlock. Returns true on success, false on cancel / no offering /
   *  failure (the paywall shows "not completed"). Dev (npm run dev) simulates a
   *  success so the paywall flow is testable without RevenueCat; a real build
   *  without RevenueCat configured returns false. */
  async purchase(): Promise<boolean> {
    if (!rcReady) {
      if (import.meta.env.DEV) {
        cachedUnlocked = true;
        writeFlag(true);
        return true;
      }
      return false;
    }
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings = await Purchases.getOfferings();
      const pkg = offerings.current?.availablePackages?.[0];
      if (!pkg) {
        console.warn('[billing] no current RevenueCat offering / package configured');
        return false;
      }
      const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
      cachedUnlocked = isActive(customerInfo);
      writeFlag(cachedUnlocked);
      return cachedUnlocked;
    } catch (e) {
      console.warn('[billing] purchase failed or cancelled:', e);
      return false;
    }
  },

  /** Restore prior purchases (Apple requires a restore path). */
  async restore(): Promise<boolean> {
    if (!rcReady) return cachedUnlocked;
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const { customerInfo } = await Purchases.restorePurchases();
      cachedUnlocked = isActive(customerInfo);
      writeFlag(cachedUnlocked);
      return cachedUnlocked;
    } catch (e) {
      console.warn('[billing] restore failed:', e);
      return cachedUnlocked;
    }
  },

  /** Localized price of the unlock from the current offering, or null when not
   *  configured yet (the paywall then shows its generic price label). */
  async getPriceString(): Promise<string | null> {
    if (!rcReady) return null;
    try {
      const { Purchases } = await import('@revenuecat/purchases-capacitor');
      const offerings = await Purchases.getOfferings();
      return offerings.current?.availablePackages?.[0]?.product?.priceString ?? null;
    } catch {
      return null;
    }
  },

  /** Dev-only override used by the __lexicaUnlock console helper. */
  _devSet(v: boolean): void {
    cachedUnlocked = v;
    writeFlag(v);
  },
};
