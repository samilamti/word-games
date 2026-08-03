import { create } from 'zustand';
import { Capacitor } from '@capacitor/core';
import { billing } from '../billing/billing.ts';

/**
 * One-time "full unlock" entitlement + paywall trigger state (Phase D / M3).
 *
 * `isUnlocked` is hydrated from the billing layer (a localStorage stub today;
 * RevenueCat customerInfo later). The paywall open/context lives here so any
 * gating site — gameStore-driven campaign progression, the journal/save UI —
 * can raise the paywall, and a single mounted <Paywall> reads the flag.
 *
 * Definitions stay FREE; the unlock buys campaign 3–5 + the retention layer.
 */

export type PaywallContext = 'campaign' | 'journal';

interface EntitlementState {
  isUnlocked: boolean;
  paywallOpen: boolean;
  paywallContext: PaywallContext | null;
  setUnlocked: (v: boolean) => void;
  /** Configure billing + load the real entitlement at launch (RevenueCat on native). */
  hydrate: () => Promise<void>;
  openPaywall: (context: PaywallContext) => void;
  closePaywall: () => void;
}

export const useEntitlementStore = create<EntitlementState>((set) => ({
  isUnlocked: billing.isUnlocked(),
  paywallOpen: false,
  paywallContext: null,
  setUnlocked: (v) => set({ isUnlocked: v }),
  hydrate: async () => {
    set({ isUnlocked: await billing.configure() });
  },
  openPaywall: (context) => set({ paywallOpen: true, paywallContext: context }),
  closePaywall: () => set({ paywallOpen: false }),
}));

/**
 * Gate a paid feature. Returns true if it may proceed, otherwise opens the
 * paywall and returns false.
 *
 * The PRODUCTION WEB build is never gated: web has no store, and the decision
 * (see the platform-scope note) was to build no accounts/license backend for
 * it — so a web paywall could never be satisfied by any user. The dev server
 * IS gated so the paywall stays testable locally (`__lexicaUnlock` toggles the
 * entitlement, and billing.purchase() simulates success under `npm run dev`).
 */
export function requireUnlock(context: PaywallContext): boolean {
  if (!Capacitor.isNativePlatform() && !import.meta.env.DEV) return true;
  const s = useEntitlementStore.getState();
  if (s.isUnlocked) return true;
  s.openPaywall(context);
  return false;
}

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__lexicaUnlock = {
    enable: () => {
      billing._devSet(true);
      useEntitlementStore.getState().setUnlocked(true);
    },
    disable: () => {
      billing._devSet(false);
      useEntitlementStore.getState().setUnlocked(false);
    },
    toggle: () => {
      const v = !useEntitlementStore.getState().isUnlocked;
      billing._devSet(v);
      useEntitlementStore.getState().setUnlocked(v);
    },
  };
  // QA helper: raise the paywall on demand (review screenshots, localized-copy checks).
  (window as unknown as Record<string, unknown>).__lexicaPaywall = {
    open: (context: PaywallContext = 'campaign') => useEntitlementStore.getState().openPaywall(context),
    close: () => useEntitlementStore.getState().closePaywall(),
  };
}
