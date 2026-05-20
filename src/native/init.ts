import { Capacitor, registerPlugin } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useGameStore } from '../store/gameStore.ts';

interface GameCenterResult {
  isAuthenticated: boolean;
  alias?: string;
  displayName?: string;
  playerID?: string;
  error?: string;
}

interface GameCenterPlugin {
  authenticate(): Promise<GameCenterResult>;
  getLocalPlayer(): Promise<GameCenterResult>;
}

// Custom Swift plugin registered in ios/App/App/GameCenterPlugin.swift.
// On the web build this resolves to a no-op proxy whose methods reject.
const GameCenter = registerPlugin<GameCenterPlugin>('GameCenter');

export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    await StatusBar.setStyle({ style: Style.Light });
  } catch {
    // Some devices may not support status bar styling
  }

  try {
    await SplashScreen.hide({ fadeOutDuration: 300 });
  } catch {
    // Splash plugin may already be hidden
  }

  // Fire-and-forget Game Center sign-in. If the user is already signed into
  // Game Center on the device, this resolves quickly with their alias.
  // Otherwise iOS shows a sign-in sheet; we wait for the user's choice and
  // either store the alias or silently leave it null (no name shown above
  // the wizard).
  GameCenter.authenticate()
    .then(result => {
      if (result.isAuthenticated && result.alias) {
        useGameStore.getState().setPlayerAlias(result.alias);
      }
    })
    .catch(err => {
      console.warn('[GameCenter] authenticate failed:', err);
    });
}

export function triggerHaptic(): void {
  if (!Capacitor.isNativePlatform()) return;
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
    // Fire-and-forget UX feedback
  });
}
