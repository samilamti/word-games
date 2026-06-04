import { create } from 'zustand';
import { soundManager } from '../audio/SoundManager.ts';

/**
 * Accessibility / feel settings, persisted independently of game state so they
 * survive across runs and language switches. Lives in its own store (rather
 * than gameStore) because nothing here is reset by initGame, and non-React
 * consumers — SoundManager mute, the haptics layer, the tile-drop controller —
 * read it via useSettingsStore.getState() without a component subscription.
 */
export interface SettingsState {
  /** Disable the tile-drop tumble + screen shake (audio/haptics keep their
   *  own toggles). Defaults from prefers-reduced-motion on first run. */
  reduceMotion: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  setReduceMotion: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
}

const STORAGE_KEY = 'lexica_knights_settings';

interface StoredSettings {
  reduceMotion: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

function prefersReducedMotion(): boolean {
  try {
    return (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
    );
  } catch {
    return false;
  }
}

function loadSettings(): StoredSettings {
  const defaults: StoredSettings = {
    reduceMotion: prefersReducedMotion(),
    soundEnabled: true,
    hapticsEnabled: true,
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<StoredSettings>;
    return {
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean' ? parsed.reduceMotion : defaults.reduceMotion,
      soundEnabled:
        typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : defaults.soundEnabled,
      hapticsEnabled:
        typeof parsed.hapticsEnabled === 'boolean' ? parsed.hapticsEnabled : defaults.hapticsEnabled,
    };
  } catch {
    return defaults;
  }
}

function persist(s: SettingsState): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        reduceMotion: s.reduceMotion,
        soundEnabled: s.soundEnabled,
        hapticsEnabled: s.hapticsEnabled,
      }),
    );
  } catch {}
}

const initial = loadSettings();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  reduceMotion: initial.reduceMotion,
  soundEnabled: initial.soundEnabled,
  hapticsEnabled: initial.hapticsEnabled,
  setReduceMotion: (v: boolean) => {
    set({ reduceMotion: v });
    persist(get());
  },
  setSoundEnabled: (v: boolean) => {
    set({ soundEnabled: v });
    soundManager.setMuted(!v);
    persist(get());
  },
  setHapticsEnabled: (v: boolean) => {
    set({ hapticsEnabled: v });
    persist(get());
  },
}));

// Apply the persisted sound preference to the audio engine on load.
soundManager.setMuted(!initial.soundEnabled);
