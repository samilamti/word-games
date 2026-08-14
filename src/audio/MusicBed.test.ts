import { describe, it, expect } from 'vitest';
import {
  MUSIC_LOOP_URL,
  MUSIC_LEVEL,
  INTENSITY_GAIN_BOOST,
  FADE_IN_SECONDS,
  FADE_OUT_SECONDS,
  PULSE_INTERVAL_SECONDS,
} from './MusicBed.ts';

// Configuration-only checks: the audio graph itself needs a real AudioContext,
// which node has no business providing. What these guard is the class of
// mistake that ships silently — a level nudged past clipping, a path that
// stops resolving under Capacitor, a fade longer than the thing it fades.
describe('music bed configuration', () => {
  it('keeps the loop path relative so it resolves under capacitor://', () => {
    expect(MUSIC_LOOP_URL.startsWith('/')).toBe(false);
    expect(MUSIC_LOOP_URL).toMatch(/\.(m4a|mp3|aac)$/);
  });

  it('sits below the effects in the mix and cannot clip when intensity lifts', () => {
    expect(MUSIC_LEVEL).toBeGreaterThan(0);
    expect(MUSIC_LEVEL).toBeLessThan(0.5);
    expect(MUSIC_LEVEL * INTENSITY_GAIN_BOOST).toBeLessThan(1);
  });

  it('lifts audibly but not jarringly at high intensity', () => {
    expect(INTENSITY_GAIN_BOOST).toBeGreaterThan(1);
    expect(INTENSITY_GAIN_BOOST).toBeLessThan(1.5);
  });

  it('fades in gently and out quickly', () => {
    expect(FADE_IN_SECONDS).toBeGreaterThan(FADE_OUT_SECONDS);
    expect(FADE_OUT_SECONDS).toBeGreaterThan(0);
  });

  it('pulses slowly enough to read as a heartbeat, not a rhythm', () => {
    expect(PULSE_INTERVAL_SECONDS).toBeGreaterThan(2);
    expect(PULSE_INTERVAL_SECONDS).toBeLessThan(8);
  });
});
