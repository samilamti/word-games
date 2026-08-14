#!/usr/bin/env python
"""
Lexica Knights — local SDXL character art (OpenRAIL++, commercial-safe).

Two modes, because the two surfaces want opposite things:

  --mode paintover   img2img over the existing Blender renders. The renders
                     already carry the pose, the framing and — critically — the
                     feet-at-95%-of-frame convention the combat overlay anchors
                     to, so painting over them buys surface quality without
                     disturbing a single layout constant. The alpha channel is
                     taken from the original render afterwards (compose.mjs),
                     which is also why no background remover is needed.

  --mode portrait    plain txt2img for the large surfaces (arrival toast,
                     victory/defeat cards), where painterly detail is actually
                     visible and there is no silhouette to preserve.

Deterministic per (name, seed). Generation needs no network, so it is safe to
run in the background; the model is loaded from the local snapshot directory
rather than by hub id, because a partial (fp16-only) cache no longer resolves
offline by id.

Usage:
    scripts/art/.venv-art/bin/python scripts/art/gen.py --probe
    scripts/art/.venv-art/bin/python scripts/art/gen.py --mode portrait goblin --seeds 7,11
    scripts/art/.venv-art/bin/python scripts/art/gen.py --mode paintover --all --strength 0.5
"""
import argparse
import glob
import os
import sys
import time

import torch
from PIL import Image
from diffusers import StableDiffusionXLPipeline, StableDiffusionXLImg2ImgPipeline

sys.path.insert(0, os.path.dirname(__file__))
from prompts import (  # noqa: E402
    STYLE, NEGATIVE, PORTRAIT_NEGATIVE, PAINTOVER, PORTRAITS, PROBE,
    assert_within_clip_budget,
)

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
BLENDER_DIR = os.path.join(REPO, "resources", "enemies")
RAW_SPRITES = os.path.join(REPO, "resources", "art", "raw", "sprites")
RAW_PORTRAITS = os.path.join(REPO, "resources", "art", "raw", "portraits")

SIZE = 1024
STEPS = 40
GUIDANCE = 7.0

# Behind the chibi models so any bleed past the re-applied alpha is invisible
# against the app's own near-black ground (#0d0d1a).
FLATTEN_BG = (16, 16, 24)


def snapshot_dir() -> str:
    """Resolve the local SDXL snapshot path.

    Loading by hub id fails offline against an fp16-only cache (the hub layer
    now refuses a snapshot missing files it never needed), so point diffusers at
    the directory and let it do plain filesystem loading.
    """
    home = os.environ.get("HF_HOME", os.path.expanduser("~/.cache/huggingface"))
    pattern = os.path.join(
        home, "hub", "models--stabilityai--stable-diffusion-xl-base-1.0",
        "snapshots", "*",
    )
    hits = sorted(glob.glob(pattern))
    if not hits:
        raise SystemExit(
            "SDXL snapshot not found. Fetch it once with network access:\n"
            "  python -c \"from huggingface_hub import snapshot_download as d; \"\n"
            "    \"d('stabilityai/stable-diffusion-xl-base-1.0', \"\n"
            "    \"allow_patterns=['**/*.json','**/*.txt','**/*.fp16.safetensors'])\""
        )
    return hits[-1]


def load(mode: str):
    path = snapshot_dir()
    cls = StableDiffusionXLPipeline if mode == "portrait" else StableDiffusionXLImg2ImgPipeline
    print(f"loading SDXL ({mode}) from {path} …", flush=True)
    pipe = cls.from_pretrained(
        path, torch_dtype=torch.float16, variant="fp16", use_safetensors=True,
    ).to("mps")
    pipe.set_progress_bar_config(disable=True)
    return pipe


def init_image(name: str) -> Image.Image:
    """The Blender render, flattened onto the app's ground colour.

    img2img has no notion of alpha; handing it a transparent PNG yields black
    fringing along every edge. Flattening first keeps the edges clean, and the
    original alpha is re-applied downstream.
    """
    src = os.path.join(BLENDER_DIR, f"{name}.png")
    if not os.path.exists(src):
        raise SystemExit(
            f"no Blender render at {src}.\n"
            f"Render it first:\n"
            f"  /Applications/Blender.app/Contents/MacOS/Blender --background \\\n"
            f"    --python scripts/blender/render_enemies.py -- {name}"
        )
    rgba = Image.open(src).convert("RGBA")
    flat = Image.new("RGB", rgba.size, FLATTEN_BG)
    flat.paste(rgba, mask=rgba.split()[3])
    return flat.resize((SIZE, SIZE), Image.LANCZOS)


def generate(pipe, mode: str, name: str, seed: int, strength: float) -> str:
    if mode == "portrait":
        prompt = f"{STYLE}, {PORTRAITS[name]}"
        negative = PORTRAIT_NEGATIVE
        out_dir, tag = RAW_PORTRAITS, f"{name}-s{seed}"
    else:
        prompt = f"{STYLE}, {PAINTOVER[name]}"
        negative = NEGATIVE
        out_dir, tag = RAW_SPRITES, f"{name}-s{seed}-d{strength}"

    assert_within_clip_budget(pipe, name, prompt)

    gen = torch.Generator("cpu").manual_seed(seed)
    t0 = time.time()
    if mode == "portrait":
        image = pipe(
            prompt=prompt, negative_prompt=negative,
            width=SIZE, height=SIZE, num_inference_steps=STEPS,
            guidance_scale=GUIDANCE, generator=gen,
        ).images[0]
    else:
        image = pipe(
            prompt=prompt, negative_prompt=negative,
            image=init_image(name), strength=strength,
            num_inference_steps=STEPS, guidance_scale=GUIDANCE, generator=gen,
        ).images[0]

    os.makedirs(out_dir, exist_ok=True)
    out = os.path.join(out_dir, f"{tag}.png")
    image.save(out)
    print(f"  ✓ {tag}  {time.time() - t0:.0f}s  -> {out}", flush=True)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("names", nargs="*", help="character names (goblin orc troll undead wraith hero)")
    ap.add_argument("--mode", choices=["portrait", "paintover"], default="portrait")
    ap.add_argument("--all", action="store_true", help="every character in the prompt set")
    ap.add_argument("--probe", action="store_true",
                    help="cheap first pass: locks STYLE wording and img2img strength")
    ap.add_argument("--seeds", default="7,11,23")
    ap.add_argument("--strength", type=float, default=0.5,
                    help="img2img denoise. Lower keeps more of the Blender render")
    args = ap.parse_args()

    if args.probe:
        # One subject through both paths, and the paint-over at three strengths,
        # so the sheet answers "which style" and "how much paint" in one run.
        pipe_p = load("portrait")
        for name in PROBE:
            generate(pipe_p, "portrait", name, 7, args.strength)
        del pipe_p
        pipe_i = load("paintover")
        for strength in (0.4, 0.5, 0.6):
            generate(pipe_i, "paintover", "goblin", 7, strength)
        return

    table = PORTRAITS if args.mode == "portrait" else PAINTOVER
    names = list(table) if args.all else args.names
    if not names:
        raise SystemExit("name one or more characters, or pass --all / --probe")
    unknown = [n for n in names if n not in table]
    if unknown:
        raise SystemExit(f"unknown: {', '.join(unknown)}. Known: {', '.join(table)}")

    seeds = [int(s) for s in args.seeds.split(",") if s.strip()]
    pipe = load(args.mode)
    for name in names:
        for seed in seeds:
            generate(pipe, args.mode, name, seed, args.strength)


if __name__ == "__main__":
    main()
