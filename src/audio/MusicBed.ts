/**
 * Background music.
 *
 * The bed itself is a pre-rendered loop (generated offline — see
 * scripts/audio/README.md) decoded into an AudioBuffer and played through a
 * looping source node. A file rather than oscillators because the brief was
 * "mystical/epic": real instrument timbres carry that in a way additive
 * synthesis does not, and one ~1 MB loop is cheap against a 60 MB bundle.
 *
 * Looping is done with an AudioBufferSourceNode instead of <audio loop>,
 * because the media element inserts an audible gap at the loop point on several
 * platforms, while the buffer source is sample-accurate.
 *
 * Combat intensity is layered on procedurally rather than crossfaded to a
 * second track: a taiko pulse rides on top of the same bed, so there is no key
 * or tempo mismatch to reconcile and no second file to ship.
 */

export type MusicIntensity = 0 | 1;

/** Where the generated loop is published. Relative (no leading slash) to match
 *  the enemy sprites — Capacitor serves the bundle from capacitor://localhost,
 *  where an absolute path resolves differently than on the web. */
export const MUSIC_LOOP_URL = 'audio/music-main.m4a';

/** Bed level. Music sits well under the effects: it is the floor of the mix, and
 *  a word game is played in long quiet stretches where a loud loop grates. */
export const MUSIC_LEVEL = 0.22;

/** How much the bed lifts when a fight turns dangerous. */
export const INTENSITY_GAIN_BOOST = 1.15;

export const FADE_IN_SECONDS = 2;
export const FADE_OUT_SECONDS = 0.8;

/** Seconds between taiko hits in the high-intensity layer. Slow enough to read
 *  as a heartbeat rather than a rhythm section fighting the loop's own tempo. */
export const PULSE_INTERVAL_SECONDS = 3.4;

interface BedHandle {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export class MusicBed {
  private ctx: AudioContext | null = null;
  private out: AudioNode | null = null;
  private buffer: AudioBuffer | null = null;
  private loading: Promise<AudioBuffer | null> | null = null;
  private handle: BedHandle | null = null;
  private intensity: MusicIntensity = 0;
  private pulseTimer: ReturnType<typeof setInterval> | null = null;
  private pulseGain: GainNode | null = null;

  get playing(): boolean {
    return this.handle !== null;
  }

  /** Fetch + decode once, memoised. Resolves to null when the loop is missing or
   *  undecodable, which simply means the game runs without music — never a
   *  thrown error on a code path the player is in the middle of. */
  private load(ctx: AudioContext): Promise<AudioBuffer | null> {
    if (this.buffer) return Promise.resolve(this.buffer);
    if (this.loading) return this.loading;

    this.loading = fetch(MUSIC_LOOP_URL)
      .then(res => {
        if (!res.ok) throw new Error(`music ${res.status}`);
        // The dev server answers a missing static file with the SPA shell at
        // status 200, so the status alone can't be trusted (same guard as
        // WordValidator.loadDictionary). Without this the failure surfaces as a
        // baffling decode error instead of "the file isn't there".
        const type = res.headers.get('content-type') ?? '';
        if (type.includes('text/html')) throw new Error(`music loop not found at ${MUSIC_LOOP_URL}`);
        return res.arrayBuffer();
      })
      .then(bytes => ctx.decodeAudioData(bytes))
      .then(buf => {
        this.buffer = buf;
        return buf;
      })
      .catch(err => {
        console.warn('[MusicBed] loop unavailable:', err);
        return null;
      });

    return this.loading;
  }

  /** Begin (or restart) the bed, fading in. Safe to call repeatedly. */
  start(ctx: AudioContext, out: AudioNode): void {
    this.ctx = ctx;
    this.out = out;
    if (this.handle) return;

    void this.load(ctx).then(buffer => {
      // The player may have switched music off again while we were decoding.
      if (!buffer || this.handle || this.ctx !== ctx || this.out !== out) return;

      const gain = ctx.createGain();
      gain.connect(out);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      source.connect(gain);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(this.levelForIntensity(), now + FADE_IN_SECONDS);
      source.start(now);

      this.handle = { source, gain };
      if (this.intensity === 1) this.startPulse();
    });
  }

  /** Fade out, then release the nodes. Never cuts abruptly. */
  stop(): void {
    this.stopPulse();
    const handle = this.handle;
    const ctx = this.ctx;
    this.handle = null;
    if (!handle || !ctx) return;

    const now = ctx.currentTime;
    handle.gain.gain.cancelScheduledValues(now);
    handle.gain.gain.setValueAtTime(handle.gain.gain.value, now);
    handle.gain.gain.linearRampToValueAtTime(0.0001, now + FADE_OUT_SECONDS);
    try {
      handle.source.stop(now + FADE_OUT_SECONDS + 0.05);
    } catch {
      // Already stopped — nothing to unwind.
    }
  }

  setIntensity(level: MusicIntensity): void {
    if (level === this.intensity) return;
    this.intensity = level;

    const ctx = this.ctx;
    if (this.handle && ctx) {
      // setTargetAtTime rather than a linear ramp: the lift should feel like the
      // music leaning in, not a fader being pushed.
      this.handle.gain.gain.setTargetAtTime(this.levelForIntensity(), ctx.currentTime, 0.6);
    }
    if (level === 1) this.startPulse();
    else this.stopPulse();
  }

  private levelForIntensity(): number {
    return this.intensity === 1 ? MUSIC_LEVEL * INTENSITY_GAIN_BOOST : MUSIC_LEVEL;
  }

  private startPulse(): void {
    const ctx = this.ctx;
    const out = this.out;
    if (!ctx || !out || this.pulseTimer) return;

    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(out);
    gain.gain.setTargetAtTime(0.5, ctx.currentTime, 0.8);
    this.pulseGain = gain;

    this.pulse();
    this.pulseTimer = setInterval(() => this.pulse(), PULSE_INTERVAL_SECONDS * 1000);
  }

  private stopPulse(): void {
    if (this.pulseTimer) {
      clearInterval(this.pulseTimer);
      this.pulseTimer = null;
    }
    const gain = this.pulseGain;
    const ctx = this.ctx;
    this.pulseGain = null;
    if (!gain || !ctx) return;
    gain.gain.cancelScheduledValues(ctx.currentTime);
    gain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
    // Disconnect after the fade rather than on the spot, or the tail clicks.
    setTimeout(() => {
      try {
        gain.disconnect();
      } catch {
        // Context already torn down.
      }
    }, 1200);
  }

  /** One taiko-ish boom: a fast downward sine sweep for the body, plus a
   *  low-passed noise burst for the skin of the drum. */
  private pulse(): void {
    const ctx = this.ctx;
    const dest = this.pulseGain;
    if (!ctx || !dest) return;

    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.35);
    oscGain.gain.setValueAtTime(0.0001, now);
    oscGain.gain.exponentialRampToValueAtTime(0.8, now + 0.01);
    oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.55);

    const noiseLen = Math.floor(ctx.sampleRate * 0.12);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 300;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.4, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(dest);
    noise.start(now);
  }
}
