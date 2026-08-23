# Music pipeline

Generates the background music loop with Stable Audio Open, locally.

Sound *effects* are not made here — they are synthesised at runtime in
`src/audio/SoundManager.ts`, which costs no bundle weight and stays consistent.
Music is the exception: "mystical/epic" lives in orchestral colour that oscillators
in a browser do not reach, and one ~1 MB loop is cheap against a 60 MB bundle.

## Licence — read before shipping

Stable Audio Open 1.0 is under the **Stability AI Community License**: commercial
use is permitted while annual revenue is under $1M USD. It was trained on
licensed audio (FreeSound, Free Music Archive), which is why it is the model
used here rather than a less encumbered one.

The weights are **gated**. Someone with the account must accept the licence on
the model page once before anything can download:

1. Accept at <https://huggingface.co/stabilityai/stable-audio-open-1.0>
2. Create a read token at <https://huggingface.co/settings/tokens>
3. `HF_TOKEN=hf_… scripts/art/.venv-art/bin/python scripts/audio/gen_music.py --fetch`

The download needs network, so it must run in the foreground.

## Setup

Reuses the art venv, plus two packages:

```bash
scripts/art/.venv-art/bin/pip install soundfile torchsde
```

## Workflow

```bash
# 1. Candidates (GPU; ~2-4 min each). Generate several — prompt luck varies.
~/Projects/McpGallore/scripts/with-gpu.sh -- \
  scripts/art/.venv-art/bin/python scripts/audio/gen_music.py --seeds 1,2,3,4,5,6

# 2. Listen to resources/audio/raw/*.wav and pick one.

# 3. Trim, loop and encode it.
scripts/audio/make_loop.sh resources/audio/raw/music-s3.wav

# 4. Check it before shipping — by measurement, then by ear.
scripts/audio/verify-loop.sh
ffplay -loop 2 -autoexit public/audio/music-main.m4a
```

`make_loop.sh` writes `public/audio/music-main.m4a`, which is the exact path
`MUSIC_LOOP_URL` in `src/audio/MusicBed.ts` expects.

## Notes

- **AAC in .m4a**, not ogg. Ogg does not decode in WKWebView, and the loop has to
  work on iOS.
- **Looping is done with an AudioBufferSourceNode**, not `<audio loop>`: the media
  element inserts an audible gap at the loop point on several platforms.
- **`verify-loop.sh` answers "does it loop?" without listening.** The obvious
  test — comparing the level of the first and last fraction of a second — is
  wrong: in a crossfaded loop those are adjacent slices of the source and differ
  for musical reasons. What matters is waveform continuity across the join, so it
  concatenates the loop with itself and compares the jump there against nearby
  peaks. Thresholds are calibrated on real good/bad files, and the check is
  tested against a hard cut and against silence.
- **The seam is the whole job.** A generated clip fades in from silence and stops
  wherever the model stopped; on repeat that ticks. `make_loop.sh` strips the
  silence and crossfades the tail back over the head.
- **A missing loop is not an error.** `MusicBed` logs one warning and the game
  runs silent, so the app is shippable before this pipeline has ever been run.
- **Combat intensity is procedural**, layered on top of the loop by `MusicBed`
  (a taiko pulse when either fighter drops below 30% health). That avoids a
  second generated track that would have to match key and tempo.
- Judge candidates **under the game**, not on their own — a loop that is
  beautiful in isolation can still fight the tile and impact sounds.
