# Tile-Drop 3D Juice Plan — Lexica Knights

> **Status — ✅ SHIPPED (2026-06-04).** Implemented and uploaded to TestFlight as **build 9**
> (marketing 1.0) for evaluation; pulled forward ahead of monetization at Sami's request.
> **Decisions taken:** dedicated `settingsStore`; reading-order tile stagger; a single impact
> (shake + thud + rumble) on landing, *not* per-tile (noted as a future upgrade); **delayed**
> sequencing (tiles land → *then* the attack resolves) via a `pendingEnemyTurn` deferral in the
> store + a controller hook in `Game.tsx` keyed on that object. **Browser-verified:** staggered
> tumble + 3D perspective, screen shake with **no** Pixi `ResizeObserver` disturbance, attack
> resolves after landing, reduce-motion disables tumble + shake (attack still resolves), and the
> sound/haptics/reduce-motion settings persist. **Pending:** on-device iOS haptic (being verified
> via this TestFlight build); the low-end **Android** jank check is deferred — Android is still
> greenfield (no build yet).

**Feature:** when the enemy (NPC) plays a word, its tiles **tumble down from the top of the
screen** onto the board and **land with a screen rumble + impact thud**. Free *core retention*
juice — **NOT** an IAP (see [CLAUDE.md](../CLAUDE.md) → Game design → Planned polish; the rationale
is "juice belongs in the free demo as conversion fuel"). Scheduled **after monetization**.

**Why it's cheap:** the whole stack is already in place — DOM board tiles (CSS-animatable),
`soundManager` (procedural Web Audio), `@capacitor/haptics`, and a combat-event pipeline. The only
net-new *system* is a settings store for the accessibility toggles, which this feature requires
anyway.

---

## Current state (verified 2026-06-02)

- **The board is DOM, not Pixi.** `GameBoard.tsx`'s `Cell` renders each tile as a `<div>` — so
  tiles are directly CSS-animatable. The Pixi `BattleOverlay` is a *separate overlay* for
  characters / HP bars / damage numbers; it does **not** render board tiles.
- **Enemy tiles are identifiable.** `enemyTurn` (`gameStore.ts:585`) stamps each NPC tile with
  `ownerId:'enemy'` + `turnPlaced:turnNumber`, commits them to the grid, and pushes `enemy_attack`
  + `player_hurt` combat events.
- **Sound.** `src/audio/SoundManager.ts` — `soundManager.play(name)`, procedural Web Audio.
  `playImpact` (a low 150→40 Hz thump + click) already exists and is a perfect base for a tile
  thud. **No mute flag today.**
- **Haptics.** `triggerHaptic()` (`native/init.ts:55`) = `ImpactStyle.Light`, native-only,
  fire-and-forget. Only caller is `ActionBar`.
- **Combat-event pipeline.** `BattleOverlay.tsx` subscribes to the store (`:663`), queues
  `combatEvents`, and `processEvent` (`:767`) plays a sound + character animation per event. A
  **character-container shake already exists** (`:240`: `sin(progress*π*8) * 6 * (1-progress)`) —
  but there is **no board/screen rumble**.
- **Settings: none exist.** No reduce-motion handling, no sound/haptics toggles, no settings store
  or UI. Net-new, and a prerequisite for shipping this accessibly + on low-end Android.

## Architecture decision

Do the tile-drop in the **DOM/CSS layer** (where the tiles already live), not in Pixi. Animating
the existing DOM tiles avoids duplicating every tile as a Pixi sprite + syncing it to the board,
reuses the project's "CSS keyframes beat React-state timing" lesson, and is GPU-cheap. Screen
rumble = a CSS shake on a wrapper. Sound/haptic via the existing managers. A small effect
controller sequences drop → impact (shake + thud + rumble).

**On "3D":** get the depth feel with **CSS 3D transforms** — `perspective` on the board container
+ `rotateX`/`rotateZ` on tiles during the fall so they *tumble* in and settle flat on impact. That
reads as 3D without a 3D engine. *Rejected:* a real 3D layer (Three.js / Pixi-3D) or Pixi-sprite
tiles — far more work and sync burden than a 2D word board warrants. Note as a possible future
upgrade only.

---

## Phase 1 — Settings store + accessibility toggles (prerequisite)

- [x] Add a settings slice (extend `gameStore`, or a small dedicated `settingsStore`):
      `reduceMotion`, `soundEnabled`, `hapticsEnabled` (all boolean).
- [x] Persist to localStorage under `lexica_knights_settings`; load on init (mirror the existing
      `lexica_knights_locale` pattern in `i18n/locales.ts`).
- [x] Default `reduceMotion` from `window.matchMedia('(prefers-reduced-motion: reduce)').matches`.
- [x] `SoundManager`: add `setMuted(bool)` + early-return in `play()`; bind to `soundEnabled`.
- [x] Gate `triggerHaptic` + the new rumble on `hapticsEnabled` (in addition to the native check).
- [x] Settings UI: a gear button + small modal (mirror `LanguagePicker` / `LeaderboardButton`),
      three toggles, labels via `useUI()` (add the strings to all 6 locales).

## Phase 2 — Tile-drop animation (the 3D tumble)

- [x] In `GameBoard`'s `Cell`, when a tile is freshly enemy-placed
      (`tile.ownerId==='enemy' && tile.turnPlaced===<current turn>`), add a `drop-in` class.
- [x] CSS keyframes: from `translateY(-120%)` + `rotateX(-80deg)` + slight `scale`/overshoot →
      settle to flat; `~320ms cubic-bezier(.34,1.56,.64,1)` (back-ease for the bounce), with a
      **stagger** via `animation-delay: calc(var(--drop-index) * 60ms)`.
- [x] Add `perspective: 600px` on the board container so the `rotateX` reads as depth.
- [x] **Animate once, not per render** — track a `justDropped` set / the drop turn number so React
      re-renders don't re-trigger the animation.
- [x] **Reduced-motion:** skip the keyframes entirely — tiles appear instantly or with an 80 ms
      fade.
- [x] Decision: stagger order (left→right / center-out / simultaneous).

## Phase 3 — Screen rumble (the shake)

- [x] CSS shake keyframe — `transform` jitter (~6–10 px + tiny rotate), 180–240 ms, decaying
      (port the Pixi formula at `BattleOverlay.tsx:240`).
- [x] Apply to a **wrapper** around the board (ideally wrapping the Pixi canvas too, so board +
      characters shake together).
- [x] Fire on **impact** (end of the drop), once per enemy turn.
- [x] **Reduced-motion:** no shake.

## Phase 4 — Impact thud + rumble (audio + haptics)

- [x] Add a `tileImpact` sound to `SoundManager` (or reuse `attackImpact`): short, low, with a
      slightly randomized pitch so staggered lands don't sound identical.
- [x] Add `triggerRumble()` to `native/init.ts`: `ImpactStyle.Heavy` (or `Haptics.vibrate({…})`),
      gated on `hapticsEnabled` + native.
- [x] Fire thud + rumble synced to the impact frame. Decision: one impact at the end vs. a small
      thud per tile as each lands (richer but busier).

## Phase 5 — Sequencing with the combat pipeline

- [x] Coordinate ordering so the tiles **land before** the enemy's `enemy_attack` / `player_hurt`
      character animations read as the attack. Either:
  - keep parallel (tiles drop while the existing `enemy_attack` plays), or
  - delay pushing `enemy_attack` / `player_hurt` until the drop completes (short await in the
    controller before those events enter the BattleOverlay queue).
- [x] Cap total added latency at **≤ ~600 ms** so turns stay snappy.
- [x] Decision: controller location — a hook in `GameBoard`/`Game` reacting to `turnPlaced`
      changes (recommended for v1), vs. a new `enemy_tiles_drop` `CombatEvent` consumed alongside
      the others (use this if you later want Pixi to own the effect).

## Phase 6 — Test & verify

- [x] Trigger an enemy turn (or inject via `window.__store`, as in the blank-tile verification) →
      tiles tumble staggered, shake on impact, thud plays, haptic on device.
- [x] Toggle each setting off → each effect disables independently; `prefers-reduced-motion`
      defaults motion off.
- [~] **Low-end Android:** no jank during drop+shake (ties to the Android plan's Pixi/low-RAM
      check). The Pixi `ResizeObserver` concern is **verified clear in the browser** (the wrapper
      transform does not fire a resize); the on-device Android jank check is **deferred** —
      Android is still greenfield (no build yet).
- [~] iOS: haptic fires (native-only; no-ops on web). **Pending** on-device verification via
      TestFlight build 9.

## Optional / later

- Symmetric player-side juice: a lighter "lock-in" pulse on submit (NOT a sky-drop — the player
  *drags* their tiles, so a fall would feel wrong).
- Pixi upgrade: a dust/impact particle burst at each landing cell, squash-stretch on land.

## Gotchas

- **Don't paywall it** — free retention juice by decision (monetization-direction memory).
- **Settings is the true prerequisite** — without the toggles you can't ship this accessibly or
  for low-end Android.
- **Wrapper transform vs. Pixi `ResizeObserver`** — a CSS transform shouldn't trigger a resize,
  but verify; if it does, shake only the DOM board, not the canvas.
- **AudioContext autoplay** — `getCtx()` resumes on demand; the first sound needs a prior user
  gesture (already satisfied in-game).
- **Animate once** — apply the drop class only for the freshly-dropped turn, or the board's
  frequent re-renders will re-animate tiles.
- **Haptics native-only** — `triggerRumble` no-ops on web; fine.

## Decisions to pre-make

1. Stagger order + per-tile thud vs. one impact.
2. Parallel vs. delayed sequencing with the enemy attack animation.
3. Controller location (GameBoard/Game hook vs. new `enemy_tiles_drop` CombatEvent).
4. Settings home (extend `gameStore` vs. a separate `settingsStore`).
