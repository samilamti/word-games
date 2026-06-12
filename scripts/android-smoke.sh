#!/bin/bash
# android-smoke.sh — build, boot, install, launch + smoke-check Lexica Knights on an Android AVD.
#
# Usage:
#   scripts/android-smoke.sh [--avd NAME] [--skip-build] [--keep-running]
#
#   --avd NAME       AVD to boot (default: Medium_Phone; list: emulator -list-avds)
#   --skip-build     reuse the existing debug APK (skip android:build + gradlew)
#   --keep-running   leave the emulator up afterwards (default: kill it)
#
# What it does: npm run android:build → gradlew assembleDebug (JBR 21 — Capacitor 8
# compiles at source release 21, JDK 17 fails) → boot AVD headless (swiftshader)
# → adb install + launch → screenshot to /tmp/lexica-android-smoke.png → scan
# logcat for fatals. Exit 0 = launched with no fatal; inspect the screenshot for
# render truth. WebGL "no texture bound to unit N" warnings are software-GPU
# noise — ignored on purpose. GameCenter "not implemented on android" is the
# documented graceful degradation — also ignored.
#
# Provenance: transcribed 2026-06-12 from the individually-proven steps of the
# first Android boot (2026-06-10); validated end-to-end with --skip-build.
set -euo pipefail
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"

SDK="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
JBR="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
ADB="$SDK/platform-tools/adb"
APP_ID="com.samixavierlamti.lexiconquest"
APK="android/app/build/outputs/apk/debug/app-debug.apk"
SHOT="/tmp/lexica-android-smoke.png"

AVD="Medium_Phone"
SKIP_BUILD=0
KEEP=0
while [ $# -gt 0 ]; do
  case "$1" in
    --avd) AVD="$2"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --keep-running) KEEP=1; shift ;;
    *) echo "unknown arg: $1 (see header)"; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.."
[ -x "$ADB" ] || { echo "✗ adb not found at $ADB — set ANDROID_HOME"; exit 1; }

if [ "$SKIP_BUILD" -eq 0 ]; then
  echo "── building web assets + syncing android…"
  npm run android:build
  echo "── gradlew assembleDebug (JBR 21)…"
  (cd android && ANDROID_HOME="$SDK" JAVA_HOME="$JBR" ./gradlew assembleDebug --no-daemon)
fi
[ -f "$APK" ] || { echo "✗ APK missing at $APK"; exit 1; }

BOOTED_BY_US=0
if ! "$ADB" get-state >/dev/null 2>&1; then
  echo "── booting AVD $AVD headless…"
  "$SDK/emulator/emulator" -avd "$AVD" -no-window -gpu swiftshader_indirect \
    -no-snapshot -no-audio -no-boot-anim >/dev/null 2>&1 &
  BOOTED_BY_US=1
  "$ADB" wait-for-device
  # sys.boot_completed flips to 1 when Android is actually usable
  for _ in $(seq 1 60); do
    [ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] && break
    sleep 2
  done
fi
[ "$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" = "1" ] \
  || { echo "✗ emulator did not finish booting"; exit 1; }

echo "── installing + launching…"
"$ADB" install -r "$APK" >/dev/null
"$ADB" logcat -c
"$ADB" shell am start -n "$APP_ID/.MainActivity" >/dev/null
sleep 12

"$ADB" exec-out screencap -p > "$SHOT"
echo "── screenshot: $SHOT ($(stat -f %z "$SHOT") bytes)"

# Fatals only — Capacitor/Console warns (GameCenter degradation) and WebGL
# texture-unit spam are expected on the software-GPU emulator.
FATALS=$("$ADB" logcat -d 2>/dev/null | grep -cE "FATAL EXCEPTION|AndroidRuntime.*Process.*$APP_ID" || true)

if [ "$KEEP" -eq 0 ] && [ "$BOOTED_BY_US" -eq 1 ]; then
  "$ADB" emu kill >/dev/null 2>&1 || true
  echo "── emulator stopped"
fi

if [ "$FATALS" -gt 0 ]; then
  echo "✗ SMOKE FAIL: $FATALS fatal logcat line(s) — rerun with --keep-running and inspect adb logcat"
  exit 1
fi
echo "✓ SMOKE PASS: launched on $AVD, no fatals — check $SHOT for render truth"
