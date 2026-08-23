#!/bin/bash
# Check that a music loop is actually loopable, without listening to it.
#
# Two things can be wrong with a generated bed, and neither shows up in the file
# size or the exit code of whatever produced it:
#
#   1. It isn't music. A failed generation can be silence, a DC offset, or a
#      single flat drone, and all three produce a plausible-looking file.
#   2. It clicks at the loop point.
#
# The click test is the one worth explaining, because the obvious version of it
# is wrong. Comparing the level of the first and last fraction of a second looks
# like a seam test but isn't: in a crossfaded loop those two windows are
# ADJACENT slices of the source, so they differ for ordinary musical reasons and
# a 3 dB difference means nothing. What matters is whether the WAVEFORM is
# continuous across the join. So we concatenate the loop with itself and compare
# the largest sample-to-sample jump at the join against the largest jumps
# elsewhere in the file — a click stands out; a smooth join disappears into the
# music. The threshold is calibrated against real good and bad files, not
# guessed — see CLICK_RATIO in the python block.
#
# Honest limitation: this catches a genuine waveform discontinuity. It does not
# judge whether a join is musically awkward, and sustained ambient material can
# be hard-cut without producing much of a step at all.
#
# Usage: scripts/audio/verify-loop.sh [file]   (default: public/audio/music-main.m4a)
set -euo pipefail
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

F="${1:-public/audio/music-main.m4a}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
PY="$REPO/scripts/art/.venv-art/bin/python"

[ -f "$F" ] || { echo "no such file: $F" >&2; exit 1; }
command -v ffmpeg >/dev/null || { echo "ffmpeg not found: brew install ffmpeg" >&2; exit 1; }
[ -x "$PY" ] || { echo "art venv missing at $PY (see scripts/art/README.md)" >&2; exit 1; }

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F")
SIZE=$(du -h "$F" | cut -f1)
echo "file      $F"
echo "duration  ${DUR%.*}s   size $SIZE"

# Levels. A bed should sit well under 0 dBFS; a lossy encoder overshoots its
# input, so a source touching full scale clips on decode.
VOL=$(ffmpeg -hide_banner -i "$F" -af volumedetect -f null - 2>&1)
MEAN=$(echo "$VOL" | grep -o 'mean_volume: [-0-9.]*' | awk '{print $2}')
MAX=$(echo "$VOL" | grep -o 'max_volume: [-0-9.]*' | awk '{print $2}')
echo "mean      ${MEAN} dB"
echo "peak      ${MAX} dB"
awk -v m="$MAX" 'BEGIN { if (m > -0.5) print "  ! peak is at full scale — expect clipping after encode" }'

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

ffmpeg -v error -y -i "$F" -ac 2 -ar 44100 "$WORK/one.wav"
printf "file '%s'\nfile '%s'\n" "$WORK/one.wav" "$WORK/one.wav" > "$WORK/list.txt"
ffmpeg -v error -y -f concat -safe 0 -i "$WORK/list.txt" "$WORK/two.wav"

"$PY" - "$WORK/one.wav" "$WORK/two.wav" <<'PY'
import sys
import numpy as np
import soundfile as sf

# Calibrated, not guessed. Measured on this project's own files, as the ratio of
# the join's sample-to-sample jump to the loudest jumps in the second either
# side of it:
#
#   shipped crossfaded loop   0.09
#   hard cut, AAC encoded     0.34
#   hard cut, raw WAV         2.07
#
# 0.25 leaves roughly 3x margin both ways. The encoded cut measures lower than
# the raw one because AAC's lapped transform smears a discontinuity across the
# window — so a click is HARDER to see after encoding, and it is worth running
# this on the intermediate WAV too when a join is in doubt.
CLICK_RATIO = 0.25

one, sr = sf.read(sys.argv[1])
two, _ = sf.read(sys.argv[2])
mono = two.mean(axis=1) if two.ndim > 1 else two
diff = np.abs(np.diff(mono))
join = len(one)

# A click is a step change, so look at the sample-to-sample delta in a small
# window around the join and compare it to the loudest deltas the music itself
# produces. Percentile rather than max: one snare hit shouldn't set the bar.
at_join = diff[join - 50:join + 50].max()
# Baseline is LOCAL. A global percentile is set by the loudest transient
# anywhere in the track, which is far too permissive — the first version of this
# check used one and waved a hard cut straight through.
local = np.concatenate([diff[join - sr:join - 100], diff[join + 100:join + sr]])
baseline = float(np.percentile(local, 99.9))
ratio = at_join / baseline if baseline > 0 else float("inf")

# Is it music at all? A flat RMS trace is silence or an unchanging drone.
sec = sr
rms = [float(np.sqrt((mono[i:i + sec] ** 2).mean()))
       for i in range(0, len(one) - sec, sec)]
db = [20 * np.log10(max(r, 1e-9)) for r in rms]
spread = max(db) - min(db)

print(f"join jump {at_join:.5f}")
print(f"ratio     {ratio:.2f}   (vs nearby peaks; click if over {CLICK_RATIO})")
print(f"RMS range {spread:.1f} dB over {len(db)} one-second windows")

ok = True
if ratio > CLICK_RATIO:
    print("  ! CLICK at the loop point — raise the crossfade in make_loop.sh")
    ok = False
if spread < 0.5:
    print("  ! nearly flat — this may be silence or a single held tone")
    ok = False
if max(db) < -50:
    print("  ! effectively silent")
    ok = False
print("OK — loops cleanly" if ok else "NOT OK")
sys.exit(0 if ok else 1)
PY
