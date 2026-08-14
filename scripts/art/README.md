# Character art pipeline

Generates the hero and enemy artwork locally with SDXL. Nothing here runs at
build time — it produces files that get committed under `public/`.

## Why it is shaped this way

Two surfaces want opposite things, so there are two paths.

**Combat sprites** are drawn at roughly 86 design px. Painterly detail is
invisible there; silhouette is everything. They are also load-bearing for
layout: `BattleOverlay` anchors sprites at 95% of frame height, which only works
because every character is shot with the same Blender camera. So sprites are
made by **img2img over the existing Blender renders** — the pose, framing and
anchor convention survive untouched, and only the surface changes. The alpha is
taken from the original render afterwards, which is also why no background
remover is needed.

**Portraits** appear at 130–150 px on the arrival toast and the victory/defeat
cards. There is no silhouette to preserve and detail is actually visible, so
those are plain txt2img.

## Setup

```bash
python3.13 -m venv scripts/art/.venv-art
scripts/art/.venv-art/bin/pip install torch diffusers transformers accelerate safetensors pillow
```

The SDXL weights come from the shared Hugging Face cache. If they are not there
yet, fetch them once **in the foreground** (background shells have no network):

```python
from huggingface_hub import snapshot_download
snapshot_download("stabilityai/stable-diffusion-xl-base-1.0",
                  allow_patterns=["**/*.json", "**/*.txt", "**/*.fp16.safetensors"])
```

`gen.py` loads from the snapshot *directory*, not the hub id — an fp16-only
cache no longer resolves by id offline.

SDXL 1.0 is CreativeML OpenRAIL++-M: commercial use is fine.

## Workflow

Generation is GPU-heavy. Run it through the shared lock so it cannot collide
with another local-AI job — two models will not fit on this machine at once, and
the loser is killed rather than queued:

```bash
~/Projects/McpGallore/scripts/with-gpu.sh -- scripts/art/.venv-art/bin/python scripts/art/gen.py --probe
```

1. **Probe** (~15 min). One portrait and one paint-over at three strengths.
   Look at the sheet, settle the STYLE wording and the strength, *then* commit to
   the batches. Iterating here costs minutes; iterating after a full batch costs
   an hour.
2. **Sprites.** `gen.py --mode paintover --all --strength 0.5`
3. **Portraits.** `gen.py --mode portrait --all`
4. **Review.** `node scripts/art/contact.mjs --mode sprite` (and `--mode portrait`).
   Sheets render sprites at their real 86 px against the app's background, with a
   2× blow-up beside them. Judge the small one — that is the one that ships.
5. **Record picks** in `picks.json`, then `node scripts/art/compose.mjs --all`.

New characters need a Blender model first, since the paint-over needs something
to paint over:

```bash
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python scripts/blender/render_enemies.py -- hero

# then confirm no part floats loose — this is a check, not an eyeball job
/Applications/Blender.app/Contents/MacOS/Blender --background \
  --python scripts/blender/check_attachment.py -- hero
```

## Traps worth knowing

- **CLIP silently truncates past 77 tokens, from the tail** — where the specific
  instructions are. `prompts.py` hard-fails instead; treat an over-budget prompt
  as a bug.
- **SDXL bakes a border in** whatever the negative prompt says. `compose.mjs`
  crops the outer 8% of portraits, which is what removes it.
- **Sprites are mirrored at runtime** (`BattleOverlay` flips the enemy), so any
  baked lettering appears reversed. Text is negatived hard for that reason.
- **Anatomy words that are also objects render as the object** — "red cap" gives
  a literal hat. Describe features plainly and negative the object senses.
- **Re-render review images to unique filenames.** Quick Look and inline image
  views serve a stale cached copy of an overwritten path, and you end up
  comparing two files that are pixel-identical on screen.
- **`grep -c` exits 1 on zero matches**, which silently kills the rest of an
  `&&` chain. Use `;` between verification steps.

## What is committed

Committed: these scripts, `prompts.py`, `picks.json`, and the finished assets in
`public/enemies/` and `public/art/portraits/`.

Ignored: `resources/art/raw/` and `resources/art/contact/` (regenerable, large),
and `.venv-art/`.

`resources/enemies/*.png` are the Blender masters. They are the alpha source for
every paint-over, so they are never overwritten by this pipeline.
