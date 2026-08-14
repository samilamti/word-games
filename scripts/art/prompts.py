"""
Lexica Knights — character art prompts (SDXL).

STYLE is the shared anchor. It leads every prompt, because CLIP weights early
tokens most and because a single anchor is what stops six separately-generated
characters from looking like six different games.

The art brief is "painterly chibi": keep the big-headed proportions the Blender
models already have (they read at the ~86px the combat sprites are drawn at,
where realistic proportions turn to mush) but paint them with real light and
material. The app is rated 9+, so the cast stays characterful rather than grim.

Two prompt sets:
  PAINTOVER — short material/mood notes for img2img over the Blender renders.
              Composition comes from the init image, so these say how it should
              LOOK, never where anything is.
  PORTRAITS — full scenes for txt2img, used on the large surfaces (the arrival
              toast, the victory and defeat cards) where detail is actually
              visible.

Anatomy words that are also objects render as the object — a "red cap" becomes
headwear — so features are described plainly and the object senses go in the
negative. Text is negatived hard: enemy sprites are mirrored at runtime, so any
baked lettering would appear reversed.
"""

STYLE = (
    "painterly chibi fantasy character, hand-painted game art, big head small "
    "body, bold silhouette, warm rim light, rich colour, storybook, charming"
)

NEGATIVE = (
    "text, letters, words, watermark, signature, logo, "
    "border, frame, vignette, ornate border, "
    "photograph, photorealistic, realistic proportions, "
    "blurry, low detail, flat vector, clip art, "
    "deformed hands, extra fingers, extra limbs, "
    "gore, blood, horror, scary, grim, "
    "branch, twig, perch, leaves, background scenery, cluttered"
)

# Extra negative for the txt2img portraits: they must sit on a clean ground so
# the app can frame them, and SDXL will invent a scene if not told otherwise.
PORTRAIT_NEGATIVE = NEGATIVE + ", busy background, landscape, scenery, multiple characters"

# ── img2img paint-over (combat sprites) ──────────────────────────────────────
# Kept deliberately short: the Blender render already fixes pose, framing and
# silhouette, and a long prompt at strength 0.5 fights the init image.
PAINTOVER = {
    "goblin": (
        "a small mischievous green goblin scribe, ink-stained leathers, "
        "oversized quill, glinting eyes, painted"
    ),
    "orc": (
        "a stocky green orc brute, battered iron armour, red mohawk, tusks, "
        "heavy axe, painted"
    ),
    "troll": (
        "a hulking blue-grey cave troll, mossy hide, stone club, heavy brow, "
        "painted"
    ),
    "undead": (
        "a skeletal undead scholar in tattered grey robes, bone, faint green "
        "glow in the eye sockets, painted"
    ),
    "wraith": (
        "a hooded shadow wraith, drifting tattered black shroud, cold cyan "
        "glow beneath the hood, ghostly, painted"
    ),
    "hero": (
        "a young knight in polished silver and violet armour, gold trim, "
        "glowing rune-quill sword, brave, painted"
    ),
}

# ── txt2img portraits (arrival toast, victory/defeat cards) ──────────────────
# Mood first, then the figure, then the one or two details worth the tokens.
# Written from the enemy taglines in src/types/enemies.ts.
PORTRAITS = {
    "goblin": (
        "mischievous and scrappy, a small green goblin scribe grinning, "
        "clutching a huge poisoned quill dripping ink, ink-stained leather, "
        "dark background"
    ),
    "orc": (
        "brash and unimpressed, a tusked green orc warrior, battered iron "
        "pauldrons, red mohawk, resting a heavy axe on one shoulder, dark "
        "background"
    ),
    "troll": (
        "stubborn and immovable, a huge blue-grey cave troll, mossy hide, "
        "heavy stone club, small stubborn eyes under a heavy brow, dark "
        "background"
    ),
    "undead": (
        "eerie and whispering, a skeletal undead scholar in tattered grey "
        "robes, faint green light in the eye sockets, a ruined book, dark "
        "background"
    ),
    "wraith": (
        "sorrowful and menacing, a hooded shadow wraith of drifting black "
        "cloth, cold cyan light beneath an empty hood, no face, dark "
        "background"
    ),
    "hero": (
        "brave and resolute, a young knight scribe in polished silver and "
        "violet armour with gold trim, holding a glowing rune-etched "
        "quill-sword, dark background"
    ),
}

# Cheap first pass: one portrait and one paint-over subject, to lock the STYLE
# wording and the img2img strength before committing to the full batches.
PROBE = ["goblin", "hero"]


def token_count(pipe, prompt: str) -> int:
    """Length of `prompt` in CLIP tokens, minus the two sentinel tokens."""
    ids = pipe.tokenizer(prompt).input_ids
    return max(0, len(ids) - 2)


def assert_within_clip_budget(pipe, name: str, prompt: str) -> None:
    """CLIP silently truncates past 77 tokens, and it truncates from the TAIL —
    where the specific instructions live. A prompt over budget is a bug, not a
    warning, so fail loudly rather than render something subtly wrong."""
    n = token_count(pipe, prompt)
    if n > 75:
        raise SystemExit(
            f"prompt '{name}' is {n} CLIP tokens (limit 75 + 2 sentinels).\n"
            f"CLIP would drop the tail silently. Shorten it.\n  {prompt}"
        )
