# Android Bring-Up Plan — Lexica Knights

**Goal:** add Android as a second Capacitor target on the *existing* web codebase (no rewrite),
ship a one-time-unlock educational word RPG to Google Play alongside iOS.

**The #1 schedule risk:** Google's new-**personal**-account testing gate — a closed test with
**~20 opted-in testers for 14 *continuous* days** before production access opens. That's calendar
time you can't compress, so **start that clock as early as possible** (Phase 6) — before the
learning-system feature work, not after.

---

## Current state (verified 2026-05-31)

- Capacitor **8.3.1** app, **iOS only**. No `android/` dir, no `@capacitor/android` dep.
- Toolchain: ✅ JDK 17 (Temurin 17.0.18) · ✅ `/Applications/Android Studio.app` · ✅ SDK at
  `~/Library/Android/sdk` · ❌ `ANDROID_HOME` unset, `adb` not on PATH.
- Native plugins in use: `@capacitor/{app,haptics,status-bar,splash-screen}` (all cross-platform)
  + a custom **GameCenter** plugin (iOS-only; degrades gracefully on Android — see Phase 8).
- `scripts/strip-non-en-dicts.mjs` runs on `dist/` *before* `cap sync` → already platform-agnostic.
- `capacitor.config.ts`: `appId: com.samixavierlamti.lexiconquest`, `appName: Lexica Knights`,
  `webDir: dist`; SplashScreen already has `androidSplashResourceName: 'splash'`.

---

## Phase 0 — Local toolchain (you're ~80% there)

- [ ] Add to `~/.zshrc`:
  ```sh
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin"
  ```
  then `source ~/.zshrc` and verify `adb --version` + `sdkmanager --version`.
- [ ] In Android Studio → SDK Manager (or `sdkmanager`), ensure installed: **platform-tools**,
  **build-tools** (latest), **platforms;android-35** (or current Play target), **emulator**, a
  system image (e.g. `system-images;android-35;google_apis;arm64-v8a`).
- [ ] `sdkmanager --licenses` → accept all.
- [ ] Create an AVD (Pixel 7 / API 35). Also keep a **low-RAM physical device** handy for Phase 5
  (the German Set is large).
- [ ] Keep JDK on **17** — correct for Capacitor 8 / AGP 8. Don't bump to 21+ unless AGP forces it.

## Phase 1 — Add the Android platform

- [ ] `npm i @capacitor/android@^8.3.1`  *(match `@capacitor/core` 8.3.1)*
- [ ] `npm run build`  *(needs `dist/` present for `cap add`)*
- [ ] `npx cap add android`  → generates `android/`
- [ ] `npx cap sync android`
- [ ] `npx cap open android` → let Gradle sync in Android Studio
- [ ] Run on the emulator (Android Studio ▶, or `npx cap run android`)
- [ ] Sanity: app launches, board renders, a word can be played.
- [ ] `npx cap doctor` → no errors.
- [ ] Commit the `android/` scaffold. Capacitor's generated `android/.gitignore` already excludes
      `/build`, `.gradle`, `local.properties` — keep source, ignore build output.

## Phase 2 — npm scripts (mirror the iOS ones)

Add to `package.json` `scripts`:
```json
"android:build": "CAPACITOR=1 npm run build && node scripts/strip-non-en-dicts.mjs && npx cap sync android",
"android:open": "npx cap open android",
"android:run": "npm run android:build && npx cap run android",
"android:assets": "npm run assets:rasterize && npx capacitor-assets generate --android"
```
*(Reuse `strip-non-en-dicts.mjs` unchanged; just update its header comment to say "iOS/Android".)*

## Phase 3 — Config & Android-specific code

### `capacitor.config.ts` — add an `android` block
```ts
android: {
  backgroundColor: '#0d0d1a',
},
```
*(The iOS-only keys — `contentInset`, `scrollEnabled`, `limitsNavigationsToAppBoundDomains` — have
no Android equivalent; leave them in the `ios` block.)*

### Portrait lock (match iOS)
In `android/app/src/main/AndroidManifest.xml`, on the `MainActivity`:
`android:screenOrientation="portrait"`.

### Hardware/gesture BACK button — **NEW UX you must add (no iOS analog)**
Default Capacitor walks WebView history and exits at the root → feels broken in a game. Add a
handler (in `initNative` or the App root) via `@capacitor/app`:
```ts
import { App } from '@capacitor/app';
App.addListener('backButton', ({ canGoBack }) => {
  // combat → open pause/confirm; menu → confirm-then App.exitApp(); never silently exit mid-run
});
```
**Decision to make:** the per-screen back semantics (combat vs. menu vs. modal).

### Status bar & insets
`StatusBar.setStyle` is already called. Optionally `StatusBar.setBackgroundColor({ color: '#0d0d1a' })`
(Android-only). Verify the board/Pixi canvas isn't clipped by the status bar or gesture nav bar;
add `env(safe-area-inset-*)` CSS if needed.

### Versioning — **Android differs from iOS**
`android/app/build.gradle` `defaultConfig` needs an integer **`versionCode`** (must *increase every
upload* or Play rejects it) + a string **`versionName`**.
**Decision to make:** the scheme — e.g. `versionName` = marketing version, `versionCode` = build
number. Bump `versionCode` on every Play upload.

### targetSdk
Capacitor 8 targets a recent API by default; confirm it meets Play's current minimum (Google raises
it yearly).

## Phase 4 — Assets (icons + splash)

- [ ] Confirm the `assets/` source dir has what `capacitor-assets` needs for Android: a 1024² icon,
      and ideally `icon-foreground.png` + `icon-background.png` (adaptive) + `splash.png`
      (+ optional `splash-dark.png`). *(Check `scripts/build-assets.mjs` output.)*
- [ ] `npm run android:assets`
- [ ] **Adaptive-icon safe zone:** foreground art must sit within the central ~66% — launchers mask
      the outer ~33% into circle/squircle. Not full-bleed like iOS. Verify the launcher icon isn't
      clipped.
- [ ] Cold-start splash shows `#0d0d1a` + the `splash` resource.

## Phase 5 — Smoke test on Android (verification, not building — code is shared)

Run on emulator **and** a mid/low real device:
- [ ] **Tile drag/drop**: pointer-event path + 6px threshold + `elementFromPoint(data-cell-*)`
      hit-testing. Android WebView (Chromium) supports pointer events — confirm no tap/drag
      misclassification and no 300ms tap delay.
- [ ] **PixiJS overlay**: renders, HP bars positioned/clamped, damage numbers, ResizeObserver
      responsive sizing across Android aspect ratios.
- [ ] **Dictionary**: bundled `en.txt` loads; switching locale fetches the others from the GitHub
      Pages CDN; the `content-type` HTML-200 guard still works on Android WebView `fetch`.
- [ ] **Memory**: load the heaviest locale (`de.txt` ~13.7 MB → large `Set`) on a low-RAM device;
      watch for OOM/jank. (Set was chosen over Trie for exactly this — confirm it holds on Android.)
- [ ] **Haptics**: `triggerHaptic()` vibrates. Confirm `VIBRATE` is in the merged manifest (the
      Haptics plugin should add it).
- [ ] **GameCenter**: `authenticate()` rejects (PluginNotImplemented), is caught → empty alias, no
      crash. (Add the local-name fallback from Phase 8 for a real name.)
- [ ] **Back button**, **portrait lock**, **splash/status-bar colors** all behave.

## Phase 6 — Google Play Console — **START THE 14-DAY CLOCK EARLY**

Do this as soon as a minimal build runs (after Phase 1–3 essentials), *before* the feature work.
- [ ] Register **Google Play Console** — $25 one-time (personal account).
- [ ] Create app: "Lexica Knights", package `com.samixavierlamti.lexiconquest`, type **Game**, free.
- [ ] **Signed AAB**: Android Studio → Build → *Generate Signed Bundle/APK* → create an **upload
      keystore**. Back up the keystore + passwords (macOS Keychain per your habit). **Enroll in Play
      App Signing** (Google holds the real key; you upload with the upload key — losing the upload
      key is recoverable, so always enroll).
- [ ] Upload AAB to **Internal testing** (instant, ≤100 testers, no review wait) → validate install
      + run from Play.
- [ ] Move to **Closed testing**, recruit **~20 opted-in testers**, and let it run **14 continuous
      days** → then you can request production access. ← **this is the long pole; start ASAP.**
- [ ] **Data Safety form**: declare the Web3Forms feedback transmission (email + feedback text);
      declare no ads, no tracking. (Mirror the App Store privacy declaration.)
- [ ] **Content rating (IARC)**: same answers as Apple (infrequent/mild fantasy violence, nothing
      else) → expect PEGI 7 / ESRB E.
- [ ] **Target audience**: set age bands; do *not* opt into "designed for families/children" (keeps
      you out of stricter kids policies — matches the 9+ stance).
- [ ] **US export compliance**: one-time checkbox (no per-build encryption prompt like iOS).
- [ ] **Store listing**: reuse App Store copy within Play limits — title ≤30, short desc ≤80, full
      ≤4000 chars. Keep the **trademark-keyword caution** (no "scrabble"/"boggle"). Phone screenshots
      (min 2) — generate from an Android emulator.

## Phase 7 — Billing via RevenueCat (with the monetization workstream)

Not bring-up-blocking, but Android is one of the two stores the unlock spans.
- [ ] `npm i @revenuecat/purchases-capacitor`
- [ ] Create the **one-time / non-consumable** product in **both** stores: App Store Connect
      (non-consumable) + Play Console (in-app product, one-time).
- [ ] RevenueCat: entitlement `scholar`, attach both store products, per-platform SDK keys.
- [ ] Gate the learning system + full campaign behind the `scholar` entitlement. Restore +
      cross-platform entitlement handled by RC.

## Phase 8 — Game Center → Play Games Services (deferred / optional)

Only when you want a real Android player identity. JS contract is fixed:
`authenticate()` / `getLocalPlayer()` → `{ isAuthenticated, alias?, displayName?, playerID? }`.
- [ ] **Interim (recommended for v1):** a tiny **local name entry** (first-run text field → stored in
      localStorage → `setPlayerAlias`). Cross-platform, zero services, gives Android players a name
      above their character.
- [ ] **Full PGS port (later):** Kotlin Capacitor plugin (`jsName: "GameCenter"`) implementing the
      same two methods via **Play Games Services v2** — `GamesSignInClient.isAuthenticated()/signIn()`,
      `PlayersClient` → `displayName`. Mirror the iOS plugin's "resolve once on terminal state"
      discipline (PGS callbacks can fire more than once).
- [ ] Play Console: set up Play Games Services, OAuth2 client, link the app, add the
      `com.google.android.gms.games.APP_ID` meta-data + games-ids resource; Gradle dep
      `com.google.android.gms:play-services-games-v2`.

---

## Suggested execution order (critical path bolded)

1. Phase 0 → 1 — env + add platform + run in emulator. *(hours)*
2. Phase 3 essentials — portrait lock + back-button handler. *(small)*
3. **Phase 6 — minimal signed AAB → internal → closed testing → start the 14-day clock.**
4. While the clock runs: definitions-coverage audit + learning system + RevenueCat unlock (Phase 7)
   on the shared codebase; polish Phase 4–5.
5. Phase 8 PGS whenever convenient — not blocking.
6. Gate clears + listing/ratings done → promote to production.

## Android gotchas (you're Apple-only so far — these bite)

- **Back button** must be handled or the app feels broken.
- **`versionCode`** is a separate increasing integer from `versionName` — bump every upload.
- **Adaptive-icon safe zone** (~66% center) — foreground gets masked; not full-bleed like iOS.
- **Play App Signing** — enroll; back up the upload keystore + passwords.
- **Closed-testing gate** (~20 testers / 14 days) — calendar time, your #1 schedule risk.
- **targetSdk** churn — Play raises the minimum yearly.
- **AAB** for Play (APK still fine for sideload/emulator).
- **Low-RAM devices** — validate the big German `Set`.
- **JDK pinning** — stay on 17 for Capacitor 8 / AGP 8; a system JDK bump can break Gradle.

## Decisions to pre-make (so execution is uninterrupted)

1. Back-button semantics per screen (combat / menu / modal).
2. `versionCode` / `versionName` scheme.
3. Player name on Android: local name entry now vs. full PGS later (Phase 8).
4. RevenueCat vs. native billing-twice (this plan assumes RevenueCat).
