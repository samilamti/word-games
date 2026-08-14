// Game audio. Effects are synthesised procedurally (no files, no licensing, no
// bundle weight); the music bed is a pre-rendered loop, which MusicBed owns.
//
// Everything runs through two gain buses so effects and music can be muted
// independently and the mix stays balanced as sounds are added.

import { MusicBed, type MusicIntensity } from './MusicBed.ts';

export type SoundName =
  | 'tileClick'
  | 'wordSubmit'
  | 'attackImpact'
  | 'tileImpact'
  | 'hurt'
  | 'victory'
  | 'defeat'
  | 'wordRejected'
  | 'exchange'
  | 'enemyAppear'
  | 'purchase';

class SoundManagerImpl {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private muted = false;
  private musicEnabled = true;
  private music = new MusicBed();
  private visibilityBound = false;

  /** Toggle all effect output. Bound to the `soundEnabled` setting. */
  setMuted(muted: boolean) {
    this.muted = muted;
  }

  /** Record the stored music preference without touching the AudioContext.
   *  Called at module load, where creating a context would be both premature
   *  (browsers require a gesture) and wasteful if the player never enables
   *  sound at all. */
  setMusicPreference(enabled: boolean) {
    this.musicEnabled = enabled;
  }

  /** Toggle music from a user action: starts or stops the bed immediately. */
  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    try {
      if (enabled) {
        const ctx = this.getCtx();
        if (this.musicBus) this.music.start(ctx, this.musicBus);
      } else {
        this.music.stop();
      }
    } catch {
      // Audio failures are non-critical.
    }
  }

  /** Hook for the first genuine user gesture. Combat sounds are fired from
   *  timeout chains, which do not count as gestures, so without this the very
   *  first sounds of a session can land in a suspended context and be lost. */
  unlockFromGesture() {
    try {
      const ctx = this.getCtx();
      if (this.musicEnabled && this.musicBus) this.music.start(ctx, this.musicBus);
    } catch {
      // Audio failures are non-critical.
    }
  }

  setMusicIntensity(level: MusicIntensity) {
    this.music.setIntensity(level);
  }

  /** Dev introspection — what the engine thinks is happening right now. */
  debugState() {
    return {
      ctxState: this.ctx?.state ?? 'none',
      muted: this.muted,
      musicEnabled: this.musicEnabled,
      musicPlaying: this.music.playing,
    };
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      // Older WebKit only exposes the prefixed constructor.
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) throw new Error('Web Audio unavailable');
      this.ctx = new Ctor();

      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 1;
      this.sfxBus.connect(this.ctx.destination);

      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 1;
      this.musicBus.connect(this.ctx.destination);

      this.bindVisibility();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  /** iOS suspends the context when the app backgrounds (a call, a switch away);
   *  without this the game returns silent. */
  private bindVisibility() {
    if (this.visibilityBound || typeof document === 'undefined') return;
    this.visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.ctx?.state === 'suspended') {
        this.ctx.resume();
      }
    });
  }

  /** Destination for every effect. Falls back to the raw destination if the bus
   *  is somehow missing, so a sound never silently disappears. */
  private dest(ctx: AudioContext): AudioNode {
    return this.sfxBus ?? ctx.destination;
  }

  play(sound: SoundName) {
    if (this.muted) return;
    try {
      const ctx = this.getCtx();
      switch (sound) {
        case 'tileClick': this.playClick(ctx); break;
        case 'wordSubmit': this.playSweepUp(ctx); break;
        case 'attackImpact': this.playImpact(ctx); break;
        case 'tileImpact': this.playTileImpact(ctx); break;
        case 'hurt': this.playHurt(ctx); break;
        case 'victory': this.playVictory(ctx); break;
        case 'defeat': this.playDefeat(ctx); break;
        case 'wordRejected': this.playRejected(ctx); break;
        case 'exchange': this.playExchange(ctx); break;
        case 'enemyAppear': this.playEnemyAppear(ctx); break;
        case 'purchase': this.playPurchase(ctx); break;
      }
    } catch {
      // Audio failures are non-critical
    }
  }

  private playTone(
    ctx: AudioContext,
    freq: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.15,
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.dest(ctx));
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  // Short high-pitched tick
  private playClick(ctx: AudioContext) {
    this.playTone(ctx, 900, 0.04, 'sine', 0.1);
  }

  // Rising frequency sweep
  private playSweepUp(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.dest(ctx));
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }

  // Low thump
  private playImpact(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.dest(ctx));
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);

    // Add a click layer
    this.playTone(ctx, 400, 0.05, 'square', 0.08);
  }

  // Heavy low thud for an enemy tile slamming onto the board. Beefier and
  // lower than playImpact, with a slightly randomized pitch so successive
  // landings across turns don't sound identical.
  private playTileImpact(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.dest(ctx));
    osc.type = 'sine';
    const start = 170 + (Math.random() - 0.5) * 40; // ~150–190 Hz
    osc.frequency.setValueAtTime(start, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(38, ctx.currentTime + 0.16);
    gain.gain.setValueAtTime(0.34, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.22);

    // Woody click transient for the "tap" of the tile contacting the board.
    this.playTone(ctx, 240, 0.05, 'triangle', 0.12);
  }

  // Descending sweep
  private playHurt(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.dest(ctx));
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.25);
  }

  // Major chord arpeggio (C-E-G-C), harmonised a third above and landing on a
  // held chord with a timpani thump — a win should sound like an event, not a
  // notification.
  private playVictory(ctx: AudioContext) {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const delay = i * 0.1;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.dest(ctx));
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.4);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.4);

      // Harmony voice, a major third above and a hair late, for body.
      const harm = ctx.createOscillator();
      const harmGain = ctx.createGain();
      harm.connect(harmGain);
      harmGain.connect(this.dest(ctx));
      harm.type = 'triangle';
      harm.frequency.value = freq * 1.26; // ~major third
      harmGain.gain.setValueAtTime(0, ctx.currentTime + delay + 0.03);
      harmGain.gain.linearRampToValueAtTime(0.09, ctx.currentTime + delay + 0.05);
      harmGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.38);
      harm.start(ctx.currentTime + delay + 0.03);
      harm.stop(ctx.currentTime + delay + 0.38);
    });

    // Held final chord under the last arpeggio note.
    const chordAt = ctx.currentTime + 0.3;
    for (const freq of [523, 659, 784]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.dest(ctx));
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, chordAt);
      gain.gain.linearRampToValueAtTime(0.07, chordAt + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, chordAt + 0.9);
      osc.start(chordAt);
      osc.stop(chordAt + 0.9);
    }

    // Timpani thump to seat the chord.
    const thump = ctx.createOscillator();
    const thumpGain = ctx.createGain();
    thump.connect(thumpGain);
    thumpGain.connect(this.dest(ctx));
    thump.type = 'sine';
    thump.frequency.setValueAtTime(65, chordAt);
    thump.frequency.exponentialRampToValueAtTime(40, chordAt + 0.3);
    thumpGain.gain.setValueAtTime(0.3, chordAt);
    thumpGain.gain.exponentialRampToValueAtTime(0.001, chordAt + 0.45);
    thump.start(chordAt);
    thump.stop(chordAt + 0.45);
  }

  // Two low blips — a "nope" that reads as feedback, not as an error klaxon.
  // The word may well be real (the dispute flow exists precisely for that), so
  // this should not sound like a scolding.
  private playRejected(ctx: AudioContext) {
    for (const delay of [0, 0.09]) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 600;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.dest(ctx));
      osc.type = 'square';
      osc.frequency.value = 110;
      const at = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.12, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.07);
      osc.start(at);
      osc.stop(at + 0.07);
    }
  }

  // Airy sweep for tiles going back in the bag.
  private playExchange(ctx: AudioContext) {
    const len = Math.floor(ctx.sampleRate * 0.25);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(400, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1400, ctx.currentTime + 0.25);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.dest(ctx));
    src.start(ctx.currentTime);
  }

  // Minor-second sting plus a sub thump: the dissonance is the whole point, it
  // is what makes an arrival feel like a threat.
  private playEnemyAppear(ctx: AudioContext) {
    for (const freq of [146.83, 155.56]) { // D3 + Eb3
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.dest(ctx));
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.1);
    }

    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.connect(subGain);
    subGain.connect(this.dest(ctx));
    sub.type = 'sine';
    sub.frequency.setValueAtTime(45, ctx.currentTime);
    subGain.gain.setValueAtTime(0.25, ctx.currentTime);
    subGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    sub.start(ctx.currentTime);
    sub.stop(ctx.currentTime + 0.6);
  }

  // Warm rising pair to confirm a purchase.
  private playPurchase(ctx: AudioContext) {
    [523.25, 659.26].forEach((freq, i) => {
      const delay = i * 0.045;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.dest(ctx));
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const at = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.16, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.5);
      osc.start(at);
      osc.stop(at + 0.5);
    });
  }

  // Minor descending
  private playDefeat(ctx: AudioContext) {
    const notes = [440, 370, 311, 261]; // A4, F#4, Eb4, C4
    notes.forEach((freq, i) => {
      const delay = i * 0.15;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(this.dest(ctx));
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, ctx.currentTime + delay);
      gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + delay + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.35);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.35);
    });
  }
}

export const soundManager = new SoundManagerImpl();
