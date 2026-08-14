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
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  /** Whether the intro guide has been shown. Set the first time the player
   *  leaves it by any route — finishing, skipping, or dismissing — so it never
   *  reappears uninvited. Persisted; replaying is an explicit choice from
   *  Settings or the help button. */
  tutorialSeen: boolean;
  /** Whether the guide is on screen right now. Deliberately NOT persisted: a
   *  reload mid-tutorial should return to the game, not reopen the modal. */
  tutorialOpen: boolean;
  setReduceMotion: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setMusicEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  openTutorial: () => void;
  closeTutorial: () => void;
}

const STORAGE_KEY = 'lexica_knights_settings';

interface StoredSettings {
  reduceMotion: boolean;
  soundEnabled: boolean;
  musicEnabled: boolean;
  hapticsEnabled: boolean;
  tutorialSeen: boolean;
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
    musicEnabled: true,
    hapticsEnabled: true,
    tutorialSeen: false,
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
      musicEnabled:
        typeof parsed.musicEnabled === 'boolean' ? parsed.musicEnabled : defaults.musicEnabled,
      hapticsEnabled:
        typeof parsed.hapticsEnabled === 'boolean' ? parsed.hapticsEnabled : defaults.hapticsEnabled,
      tutorialSeen:
        typeof parsed.tutorialSeen === 'boolean' ? parsed.tutorialSeen : defaults.tutorialSeen,
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
        musicEnabled: s.musicEnabled,
        hapticsEnabled: s.hapticsEnabled,
        tutorialSeen: s.tutorialSeen,
      }),
    );
  } catch {}
}

const initial = loadSettings();

export const useSettingsStore = create<SettingsState>((set, get) => ({
  reduceMotion: initial.reduceMotion,
  soundEnabled: initial.soundEnabled,
  musicEnabled: initial.musicEnabled,
  hapticsEnabled: initial.hapticsEnabled,
  tutorialSeen: initial.tutorialSeen,
  tutorialOpen: false,
  setReduceMotion: (v: boolean) => {
    set({ reduceMotion: v });
    persist(get());
  },
  setSoundEnabled: (v: boolean) => {
    set({ soundEnabled: v });
    soundManager.setMuted(!v);
    persist(get());
  },
  setMusicEnabled: (v: boolean) => {
    set({ musicEnabled: v });
    // The toggle is itself a user gesture, so this doubles as a valid moment to
    // unlock audio and start the bed.
    soundManager.setMusicEnabled(v);
    persist(get());
  },
  setHapticsEnabled: (v: boolean) => {
    set({ hapticsEnabled: v });
    persist(get());
  },
  openTutorial: () => set({ tutorialOpen: true }),
  closeTutorial: () => {
    set({ tutorialOpen: false, tutorialSeen: true });
    persist(get());
  },
}));

// Apply the persisted sound preferences to the audio engine on load. Music is
// only flagged here, never started: the AudioContext must wait for a gesture.
soundManager.setMuted(!initial.soundEnabled);
soundManager.setMusicPreference(initial.musicEnabled);
