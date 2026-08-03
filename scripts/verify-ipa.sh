#!/bin/bash
#
# verify-ipa.sh — sanity-check a built .ipa BEFORE handing it to altool.
#
# Why this exists: a stale `dist/` produces a fully successful archive + export
# that ships the OLD web UI. Nothing in the xcodebuild output hints at it, and
# the first sign of trouble is a tester saying "this looks the same". This
# checks what is actually inside the bundle.
#
# Usage:
#   scripts/verify-ipa.sh [--ipa PATH] [--build N] \
#       [--expect TOKEN]... [--forbid TOKEN]...
#
#   --ipa PATH    .ipa to inspect        (default: build/export/App.ipa)
#   --build N     assert CFBundleVersion equals N (default: no assertion)
#   --expect TOK  substring that MUST appear in the bundled web assets
#   --forbid TOK  substring that must NOT appear (catches stale leftovers)
#
# Check BOTH directions: a new token can coexist with old ones if the build
# merged rather than replaced. Repeat the flags for multiple tokens.
#
# Example (Better Life build 4, 2026-07-26):
#   scripts/verify-ipa.sh --build 4 \
#     --expect surface-raised --expect factsheet \
#     --forbid today__menu --forbid 'bottom:calc(72px'
#
# Exit 0 = every assertion held. Non-zero = do NOT upload.
#
# Portable to any Capacitor app: only the default --ipa path and the web-asset
# subdir below are app-shaped, and both are overridable / auto-detected.

set -euo pipefail

# CocoaPods/Ruby and some Apple tooling crash without a UTF-8 locale.
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

IPA="build/export/App.ipa"
WANT_BUILD=""
# bash 3.2 (macOS default): a string accumulator avoids the empty-array +
# `set -u` footgun, where "${arr[@]}" on an empty array is an unbound-variable
# error even though the variable was assigned.
EXPECT=""
FORBID=""
NL=$'\n'

while [ $# -gt 0 ]; do
  case "$1" in
    --ipa)    IPA="$2"; shift 2 ;;
    --build)  WANT_BUILD="$2"; shift 2 ;;
    --expect) EXPECT="${EXPECT}${2}${NL}"; shift 2 ;;
    --forbid) FORBID="${FORBID}${2}${NL}"; shift 2 ;;
    -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "Unknown flag: $1 (try --help)" >&2; exit 2 ;;
  esac
done

[ -f "$IPA" ] || { echo "No such .ipa: $IPA" >&2; exit 1; }

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
unzip -q "$IPA" -d "$WORK"

APP="$(find "$WORK/Payload" -maxdepth 1 -name '*.app' -print -quit)"
[ -n "$APP" ] || { echo "No .app inside Payload/ — is this a valid .ipa?" >&2; exit 1; }

PLIST="$APP/Info.plist"
get() { plutil -extract "$1" raw "$PLIST" 2>/dev/null || echo "<unset>"; }

BUILD="$(get CFBundleVersion)"
echo "Bundle:  $(get CFBundleDisplayName)  ($(get CFBundleIdentifier))"
echo "Version: $(get CFBundleShortVersionString)  build $BUILD"

FAIL=0

if [ -n "$WANT_BUILD" ] && [ "$BUILD" != "$WANT_BUILD" ]; then
  echo "  ✗ CFBundleVersion is $BUILD, expected $WANT_BUILD — the bump did not land"
  FAIL=1
fi

# Capacitor puts the built web app under App.app/public; fall back to the whole
# bundle so this still works for a non-Capacitor or restructured target.
ASSETS="$APP/public"
[ -d "$ASSETS" ] || ASSETS="$APP"

scan() { # scan <token> ; prints the number of matching files
  # `grep` exits 1 on "no match", which under `set -o pipefail` propagates and
  # kills the script via `set -e` — so a zero count, which is a perfectly valid
  # answer here (and the whole point of --forbid), would abort the run instead
  # of being reported. The `|| true` is load-bearing.
  local n
  n=$( { grep -rl --binary-files=text -- "$1" "$ASSETS" 2>/dev/null || true; } \
         | wc -l | tr -d ' ' )
  printf '%s' "$n"
}

# Read the token lists via REDIRECTION, not a pipe: a `while` on the right of a
# pipe runs in a subshell, so FAIL assignments inside it are lost (and routing
# them back through a temp file then trips `set -e` on the `[ -f ]` test).
printf '%s' "$EXPECT" >"$WORK/expect.txt"
printf '%s' "$FORBID" >"$WORK/forbid.txt"

while IFS= read -r tok; do
  [ -n "$tok" ] || continue
  n="$(scan "$tok")"
  if [ "$n" -gt 0 ]; then
    echo "  ✓ expect '$tok' → $n file(s)"
  else
    echo "  ✗ expect '$tok' → MISSING (stale dist?)"
    FAIL=1
  fi
done <"$WORK/expect.txt"

while IFS= read -r tok; do
  [ -n "$tok" ] || continue
  n="$(scan "$tok")"
  if [ "$n" -eq 0 ]; then
    echo "  ✓ forbid '$tok' → absent"
  else
    echo "  ✗ forbid '$tok' → still present in $n file(s)"
    FAIL=1
  fi
done <"$WORK/forbid.txt"

if [ "$FAIL" -ne 0 ]; then
  echo
  echo "FAILED — do not upload this build."
  exit 1
fi

echo
echo "OK — safe to upload."
