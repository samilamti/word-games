#!/usr/bin/env python
"""
Lexica Knights — background music, generated locally with Stable Audio Open.

Produces candidate loops for the combat bed. Real instrument timbres are the
reason this is a generated file rather than the oscillator bed the sound effects
use: "mystical/epic" lives in orchestral colour, which additive synthesis in the
browser does not reach.

LICENCE — read before shipping anything this produces:
  Stable Audio Open 1.0 is released under the Stability AI Community License.
  Commercial use is permitted while the licensee's annual revenue is under
  $1M USD; past that it needs an enterprise licence. The model is also GATED on
  Hugging Face, so the licence must be accepted once on the model page and a
  token supplied (HF_TOKEN) before the weights will download. The training data
  is licensed audio (FreeSound / Free Music Archive), which is the reason this
  model rather than one of the unrestricted alternatives.

The download needs network, so the first run must be in the foreground.
Generation itself is offline and safe to background.

Run it with the art venv's interpreter, not a bare `python` — see require_venv.

Usage:
    PY=scripts/art/.venv-art/bin/python

    # once, with network + HF_TOKEN set:
    HF_TOKEN=hf_… $PY scripts/audio/gen_music.py --fetch

    $PY scripts/audio/gen_music.py --seeds 1,2,3           # candidates
    $PY scripts/audio/gen_music.py --prompt "…" --seeds 4  # a different brief
"""
import argparse
import os
import sys
import time

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
VENV_PY = os.path.join(REPO, "scripts", "art", ".venv-art", "bin", "python")


def require_venv():
    """Refuse to run under the wrong interpreter.

    The shebang is `/usr/bin/env python`, so invoking this file directly picks up
    whatever `python` happens to be first on PATH — on this machine, Anaconda.
    The failure that produces is a bare ModuleNotFoundError for a dependency the
    project does in fact have installed, which sends you looking in the wrong
    place entirely. Fail with the command that works instead.
    """
    if os.path.realpath(sys.prefix) == os.path.realpath(
        os.path.join(REPO, "scripts", "art", ".venv-art")
    ):
        return
    raise SystemExit(
        f"This needs the art venv, not {sys.executable}.\n"
        f"Re-run as:\n"
        f"  {os.path.relpath(VENV_PY, REPO)} {os.path.relpath(__file__, REPO)} "
        f"{' '.join(sys.argv[1:])}"
    )


OUT_DIR = os.path.join(REPO, "resources", "audio", "raw")
MODEL = "stabilityai/stable-audio-open-1.0"

# The brief. Slow and modal so it can loop for a long session without wearing
# out its welcome, and so nothing in it fights the game's own percussive sounds
# (tiles landing, impacts) for the same frequency band.
DEFAULT_PROMPT = (
    "epic mystical fantasy game music, slow cinematic orchestral loop, "
    "dark minor key, low string drone, soft choir pad, distant taiko drum, "
    "harp arpeggio, hushed and atmospheric, seamless loop, no vocals"
)

NEGATIVE = "harsh, distorted, noisy, applause, speech, spoken word, sudden silence"

# The model tops out near 47s. A shorter loop repeats audibly; a longer one costs
# bundle size for little gain, and this sits inside the model's trained range.
SECONDS = 40
STEPS = 150


def fetch():
    """Download the gated weights. Needs network and a token."""
    from huggingface_hub import snapshot_download

    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if not token:
        raise SystemExit(
            "HF_TOKEN is not set.\n"
            f"1. Accept the licence at https://huggingface.co/{MODEL}\n"
            "2. Create a read token at https://huggingface.co/settings/tokens\n"
            "3. Re-run with:\n"
            "     HF_TOKEN=hf_… scripts/art/.venv-art/bin/python "
            "scripts/audio/gen_music.py --fetch"
        )
    print(f"downloading {MODEL} (~5 GB) …", flush=True)
    path = snapshot_download(MODEL, token=token)
    print(f"  ✓ {path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fetch", action="store_true", help="download the gated weights")
    ap.add_argument("--seeds", default="1,2,3")
    ap.add_argument("--prompt", default=DEFAULT_PROMPT)
    ap.add_argument("--seconds", type=float, default=SECONDS)
    ap.add_argument("--steps", type=int, default=STEPS)
    args = ap.parse_args()

    require_venv()

    if args.fetch:
        fetch()
        return

    import torch
    import soundfile as sf
    from diffusers import StableAudioPipeline

    print(f"loading {MODEL} …", flush=True)
    try:
        pipe = StableAudioPipeline.from_pretrained(MODEL, torch_dtype=torch.float16)
    except OSError as err:
        raise SystemExit(
            f"could not load {MODEL}: {err}\n"
            "If this is an access error, the weights are gated — run --fetch first."
        )
    pipe = pipe.to("mps")

    os.makedirs(OUT_DIR, exist_ok=True)
    for seed in [int(s) for s in args.seeds.split(",") if s.strip()]:
        gen = torch.Generator("cpu").manual_seed(seed)
        t0 = time.time()
        audio = pipe(
            args.prompt,
            negative_prompt=NEGATIVE,
            num_inference_steps=args.steps,
            audio_end_in_s=args.seconds,
            num_waveforms_per_prompt=1,
            generator=gen,
        ).audios[0]

        # (channels, samples) float32 → (samples, channels) for soundfile.
        wave = audio.T.float().cpu().numpy()
        out = os.path.join(OUT_DIR, f"music-s{seed}.wav")
        sf.write(out, wave, pipe.vae.sampling_rate)
        print(f"  ✓ seed={seed}  {time.time() - t0:.0f}s  -> {out}", flush=True)

    print(
        "\nNext: pick a candidate, then loop + encode it:\n"
        "  scripts/audio/make_loop.sh resources/audio/raw/music-s1.wav",
        flush=True,
    )


if __name__ == "__main__":
    main()
