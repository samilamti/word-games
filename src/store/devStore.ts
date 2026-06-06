import { create } from 'zustand';

/**
 * Dev-only feature flags. The M2 retention layer (journal / review / vocab) is
 * built but NOT yet user-facing — it stays behind this flag until monetization
 * (M3) and the definitions-delivery/bundling decision (M4) land. Flip it from
 * the browser console on a dev device:
 *   __lexicaDev.enable()    // show M2 features
 *   __lexicaDev.disable()
 *   __lexicaDev.toggle()
 * Persisted to localStorage so it survives reloads.
 */
export interface DevState {
  m2Enabled: boolean;
  setM2Enabled: (v: boolean) => void;
}

const STORAGE_KEY = 'lexica_knights_dev';

function load(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export const useDevStore = create<DevState>((set) => ({
  m2Enabled: load(),
  setM2Enabled: (v: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
    } catch {
      /* ignore */
    }
    set({ m2Enabled: v });
  },
}));

if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__lexicaDev = {
    enable: () => useDevStore.getState().setM2Enabled(true),
    disable: () => useDevStore.getState().setM2Enabled(false),
    toggle: () => useDevStore.getState().setM2Enabled(!useDevStore.getState().m2Enabled),
  };
}
