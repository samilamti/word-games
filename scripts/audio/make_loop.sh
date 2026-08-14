#!/bin/bash
# Turn a generated candidate into the shipped seamless loop.
#
# A generated clip starts from silence and ends wherever the model stopped, so
# played on repeat it ticks audibly at the seam. This trims the dead air, then
# crossfades the tail back over the head so the join is continuous, and encodes
# to AAC — the one lossy format both WKWebView and Android decode natively.
#
# Usage: scripts/audio/make_loop.sh resources/audio/raw/music-s1.wav [crossfade-seconds]
set -euo pipefail

SRC="${1:?usage: make_loop.sh <candidate.wav> [crossfade-seconds]}"
XFADE="${2:-4}"
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$REPO/public/audio"
OUT="$OUT_DIR/music-main.m4a"

command -v ffmpeg >/dev/null || {
  echo "ffmpeg not found. Install it:  brew install ffmpeg" >&2
  exit 1
}
[ -f "$SRC" ] || { echo "no such file: $SRC" >&2; exit 1; }

mkdir -p "$OUT_DIR"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
echo "source: ${DUR}s, crossfade ${XFADE}s"

# Trim leading/trailing silence. The model fades in from nothing, and that fade
# is the loudest part of the seam if it survives.
ffmpeg -v error -y -i "$SRC" \
  -af "silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.1,areverse" \
  "$WORK/trimmed.wav"

TRIM_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$WORK/trimmed.wav")
BODY=$(echo "$TRIM_DUR - $XFADE" | bc)

# Split at the crossfade point, then acrossfade the tail over the head. The
# result is BODY seconds long and joins to itself cleanly.
ffmpeg -v error -y -i "$WORK/trimmed.wav" -t "$BODY" "$WORK/head.wav"
ffmpeg -v error -y -i "$WORK/trimmed.wav" -ss "$BODY" "$WORK/tail.wav"
ffmpeg -v error -y -i "$WORK/head.wav" -i "$WORK/tail.wav" \
  -filter_complex "[1][0]acrossfade=d=${XFADE}:c1=tri:c2=tri" \
  "$WORK/looped.wav"

# 128k AAC in an .m4a container: transparent enough for a background bed and
# roughly a megabyte a minute.
ffmpeg -v error -y -i "$WORK/looped.wav" -c:a aac -b:a 128k -movflags +faststart "$OUT"

FINAL_DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT")
SIZE=$(du -h "$OUT" | cut -f1)
echo "  ✓ ${FINAL_DUR%.*}s  $SIZE  -> $OUT"
echo
echo "Verify the seam by ear before shipping: play it twice back to back."
echo "  ffplay -loop 2 -autoexit '$OUT'"
