import { useEffect, useCallback, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useSettingsStore } from '../store/settingsStore.ts';
import { loadDictionary } from '../engine/WordValidator.ts';
import { GameBoard } from './GameBoard.tsx';
import { TileRack } from './TileRack.tsx';
import { CombatHUD } from './CombatHUD.tsx';
import { ActionBar } from './ActionBar.tsx';
import { BattleOverlay } from '../combat/BattleOverlay.tsx';
import { FeedbackButton } from './FeedbackButton.tsx';
import { LeaderboardButton } from './LeaderboardButton.tsx';
import { LanguagePicker } from './LanguagePicker.tsx';
import { SettingsButton } from './SettingsButton.tsx';
import { EnemyAppearToast } from './EnemyAppearToast.tsx';
import { DefinitionToast } from './DefinitionToast.tsx';
import { JournalButton } from './JournalButton.tsx';
import { HelpButton } from './HelpButton.tsx';
import { TutorialModal } from './TutorialModal.tsx';
import { PremiumHintToast } from './PremiumHintToast.tsx';
import { Paywall } from './Paywall.tsx';
import { requireUnlock } from '../store/entitlementStore.ts';
import { ENEMY_CATALOG, portraitUrl } from '../types/enemies.ts';
import { recordRun } from '../leaderboard/leaderboard.ts';
import { soundManager } from '../audio/SoundManager.ts';
import { triggerRumble } from '../native/init.ts';
import { useUI } from '../i18n/useUI.ts';

// Tile-drop timing — must mirror index.css .tile-drop-in (340ms duration +
// 45ms * stagger index). The impact (shake + thud + rumble) fires when the
// last tile lands; total stays well under the ~600ms feel budget for typical
// NPC word lengths.
const DROP_DURATION_MS = 340;
const DROP_STAGGER_MS = 45;
const REDUCED_MOTION_DROP_MS = 120;

// Free campaign length — enemies 0 and 1 are free; advancing to the 3rd needs
// the one-time unlock (M3).
const FREE_ENEMY_COUNT = 2;

// After the slowed final death animation finishes, hold this beat before the
// victory/defeat modal covers the board — a moment to savour the win/loss.
// A fallback timer reveals the modal anyway if the death signal never lands.
const SAVOUR_BEAT_MS = 800;
const REDUCED_SAVOUR_BEAT_MS = 150;
const MODAL_FALLBACK_MS = 3500;
const REDUCED_MODAL_FALLBACK_MS = 400;

// Screen-rumble keyframes for the board+characters wrapper, run via the Web
// Animations API on impact (decaying jitter — a DOM port of the Pixi hurt
// shake). Restarts cleanly each call without remounting the Pixi canvas.
const SHAKE_KEYFRAMES: Keyframe[] = [
  { transform: 'translate(0, 0) rotate(0deg)' },
  { transform: 'translate(-6px, 4px) rotate(-0.7deg)' },
  { transform: 'translate(5px, -3px) rotate(0.6deg)' },
  { transform: 'translate(-4px, 3px) rotate(-0.4deg)' },
  { transform: 'translate(3px, -2px) rotate(0.2deg)' },
  { transform: 'translate(0, 0) rotate(0deg)' },
];

export function Game() {
  const phase = useGameStore(s => s.phase);
  const enemyIndex = useGameStore(s => s.enemyIndex);
  const locale = useGameStore(s => s.locale);
  const initGame = useGameStore(s => s.initGame);
  const nextEnemy = useGameStore(s => s.nextEnemy);
  const enemyTurn = useGameStore(s => s.enemyTurn);
  const resolveEnemyAttack = useGameStore(s => s.resolveEnemyAttack);
  const pendingEnemyTurn = useGameStore(s => s.pendingEnemyTurn);
  const drawTiles = useGameStore(s => s.drawTiles);
  const setDictionaryLoaded = useGameStore(s => s.setDictionaryLoaded);
  const finaleAnimationDone = useGameStore(s => s.finaleAnimationDone);
  const replayEnemySpawnToast = useGameStore(s => s.replayEnemySpawnToast);
  // Fractions rather than raw HP: selecting on the ratio means the music effect
  // re-runs only when the danger threshold could actually have moved.
  const enemyType = useGameStore(s => s.enemy?.type);
  const enemyHpPct = useGameStore(s => (s.enemy ? s.enemy.hp / s.enemy.maxHp : 1));
  const playerHpPct = useGameStore(s => s.playerHp / s.playerMaxHp);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const tutorialSeen = useSettingsStore(s => s.tutorialSeen);
  const tutorialOpen = useSettingsStore(s => s.tutorialOpen);
  const openTutorial = useSettingsStore(s => s.openTutorial);
  // True only for the guide that opened itself on a first run, so the spawn
  // toast is replayed for newcomers but not every time someone reopens the help.
  const autoTutorialRef = useRef(false);
  const recordedRunRef = useRef<number>(0); // dedupe recordRun across re-renders
  const boardWrapperRef = useRef<HTMLDivElement>(null); // shake target (board + Pixi)
  // Gates the victory/defeat modal: held back until the slowed final death
  // animation has played (plus a savour beat) so it doesn't cover the kill.
  const [modalRevealed, setModalRevealed] = useState(false);
  const ui = useUI();

  // Load dictionary on mount AND whenever the locale changes. WordValidator
  // returns the existing instance fast when the locale is unchanged, so
  // calls during enemy progression don't re-fetch unnecessarily.
  useEffect(() => {
    setDictionaryLoaded(false);
    loadDictionary(locale).then(() => {
      setDictionaryLoaded(true);
      // Only init on the very first load. Subsequent locale switches handle
      // their own re-init via setLocale -> initGame.
      if (enemyIndex === 0 && phase === 'loading') initGame(0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // First run: open the intro guide straight away, during the loading phase.
  // It covers the dictionary fetch, so newcomers read the rules in time that was
  // dead anyway, and the board is ready the moment they dismiss it.
  useEffect(() => {
    if (tutorialSeen) return;
    autoTutorialRef.current = true;
    openTutorial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The spawn toast is a short CSS animation that would expire unseen behind the
  // guide, so replay it once the first-run guide closes.
  useEffect(() => {
    if (tutorialOpen || !autoTutorialRef.current) return;
    autoTutorialRef.current = false;
    replayEnemySpawnToast();
  }, [tutorialOpen, replayEnemySpawnToast]);

  // Unlock audio on the first real user gesture anywhere. Combat sounds fire
  // from timeout chains, which browsers do not accept as gestures, so the
  // unlock has to be hung off a genuine interaction rather than the first play().
  useEffect(() => {
    const unlock = () => soundManager.unlockFromGesture();
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => document.removeEventListener('pointerdown', unlock);
  }, []);

  // Lift the music when either fighter is nearly down, so the last stretch of a
  // close fight sounds different from its opening.
  useEffect(() => {
    const danger = enemyHpPct < 0.3 || playerHpPct < 0.3;
    soundManager.setMusicIntensity(danger ? 1 : 0);
  }, [enemyHpPct, playerHpPct]);

  // Record the run to the leaderboard when the player wins. We dedupe by
  // enemyAppearAt timestamp so a single victory only emits one entry even
  // if the phase effect re-runs during StrictMode dev double-mount.
  useEffect(() => {
    if (phase !== 'victory') return;
    const s = useGameStore.getState();
    if (!s.enemy) return;
    if (recordedRunRef.current === s.enemyAppearAt) return;
    recordedRunRef.current = s.enemyAppearAt;
    recordRun({
      timestamp: Date.now(),
      enemyType: s.enemy.type,
      enemyName: s.enemy.name,
      enemyIndex: s.enemyIndex,
      totalDamage: s.runDamageTotal,
      turns: s.turnNumber,
      longestWord: s.runLongestWord,
      highestSingleHit: s.runHighestHit,
    });
  }, [phase]);

  // Reveal the victory/defeat modal only after the slowed final move has played
  // out. We wait for BattleOverlay to flag the death animation done, then hold a
  // short savour beat. A fallback timer reveals the modal regardless, so the
  // player is never stuck behind a missed signal. Reset when a new fight begins.
  useEffect(() => {
    if (phase !== 'victory' && phase !== 'defeat') {
      setModalRevealed(false);
      return;
    }
    const beat = reduceMotion ? REDUCED_SAVOUR_BEAT_MS : SAVOUR_BEAT_MS;
    const fallbackMs = reduceMotion ? REDUCED_MODAL_FALLBACK_MS : MODAL_FALLBACK_MS;
    let beatTimer: ReturnType<typeof setTimeout> | undefined;
    // Fallback: reveal even if the death-done signal never arrives.
    const fallbackTimer = setTimeout(() => setModalRevealed(true), fallbackMs);
    if (finaleAnimationDone) {
      beatTimer = setTimeout(() => setModalRevealed(true), beat);
    }
    return () => {
      clearTimeout(fallbackTimer);
      if (beatTimer) clearTimeout(beatTimer);
    };
  }, [phase, finaleAnimationDone, reduceMotion]);

  // Snap scroll back to the top whenever a new enemy spawns. After the
  // victory overlay closes the page can be left scrolled down (lastScore
  // breakdown made the HUD taller, the score is then cleared, and the
  // browser's scroll position lingers below the board). Force the board
  // back into view so the "A wild X appears!" toast lands centered in
  // what the player is looking at.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [enemyIndex]);

  // Handle enemy turn with delay
  useEffect(() => {
    if (phase === 'enemy_turn') {
      const timer = setTimeout(() => {
        enemyTurn();
        drawTiles();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [phase, enemyTurn, drawTiles]);

  // Tile-drop juice controller. enemyTurn() commits the NPC's tiles and stashes
  // the attack outcome in pendingEnemyTurn (a fresh object per turn — the
  // reliable trigger here); the tiles tumble in via CSS, and once they've
  // landed we fire the impact — screen shake + thud + device rumble — then
  // apply the held-back damage via resolveEnemyAttack(). Sound/haptics self-gate
  // on their own settings; only the visual shake (and the tumble itself, in
  // GameBoard) honor reduce-motion.
  useEffect(() => {
    if (!pendingEnemyTurn) return;
    const { grid, lastEnemyDropTurn } = useGameStore.getState();
    const { reduceMotion } = useSettingsStore.getState();

    // Count the freshly-dropped enemy tiles to size the drop duration (mirrors
    // the per-tile stagger in GameBoard / index.css).
    let dropCount = 0;
    for (const row of grid) {
      for (const cell of row) {
        if (cell.tile?.ownerId === 'enemy' && cell.tile.turnPlaced === lastEnemyDropTurn) {
          dropCount++;
        }
      }
    }

    const dropMs = reduceMotion
      ? REDUCED_MOTION_DROP_MS
      : DROP_DURATION_MS + Math.max(0, dropCount - 1) * DROP_STAGGER_MS;

    const timer = setTimeout(() => {
      // A duplicate fire (StrictMode/double-mount) sees the cleared pending and
      // bails, so the impact + resolution only happen once.
      if (!useGameStore.getState().pendingEnemyTurn) return;
      if (!reduceMotion) {
        boardWrapperRef.current?.animate(SHAKE_KEYFRAMES, { duration: 220, easing: 'ease-out' });
      }
      soundManager.play('tileImpact');
      triggerRumble();
      resolveEnemyAttack();
    }, dropMs);

    return () => clearTimeout(timer);
  }, [pendingEnemyTurn, resolveEnemyAttack]);

  const handleRestart = useCallback(() => {
    initGame(0);
  }, [initGame]);

  // Losing used to throw the player back to the first enemy, which turns one bad
  // fight into a re-run of every fight before it. Retrying the current enemy
  // records nothing (recordRun only fires on victory) and never advances
  // enemyIndex, so the paywall and leaderboard are untouched.
  const handleRetryFight = useCallback(() => {
    initGame(enemyIndex);
  }, [initGame, enemyIndex]);

  const handleNext = useCallback(() => {
    // Advancing past the free campaign (to enemy index >= FREE_ENEMY_COUNT)
    // requires the unlock; requireUnlock opens the paywall and returns false.
    if (enemyIndex + 1 >= FREE_ENEMY_COUNT && !requireUnlock('campaign')) return;
    nextEnemy();
  }, [nextEnemy, enemyIndex]);

  const isFinalEnemy = enemyIndex >= ENEMY_CATALOG.length - 1;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 'clamp(8px, 2vw, 20px)',
        minHeight: '100vh',
        backgroundColor: '#0d0d1a',
        color: '#e0e0e0',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 'clamp(20px, 5vw, 28px)',
          background: 'linear-gradient(135deg, #ffd54f, #ff9800)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: 2,
        }}
      >
        {ui.appTitle}
      </h1>

      <div
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'flex-start',
          justifyContent: 'center',
          flexWrap: 'wrap',
          width: '100%',
        }}
      >
        {/* Board area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div ref={boardWrapperRef} style={{ position: 'relative', display: 'inline-block' }}>
            <GameBoard />
            <BattleOverlay />
            <PremiumHintToast />
          </div>
          <ActionBar />
          <TileRack />
        </div>

        {/* HUD */}
        <CombatHUD />
      </div>

      {/* Victory/Defeat overlay */}
      {(phase === 'victory' || phase === 'defeat') && modalRevealed && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
          }}
        >
          <div
            style={{
              padding: '40px 60px',
              backgroundColor: '#1e1e36',
              borderRadius: 12,
              border: `2px solid ${phase === 'victory' ? '#4caf50' : '#ef5350'}`,
              textAlign: 'center',
            }}
          >
            {/* Victory shows the hero, defeat shows who beat you — the card is
                the one place a fight gets a face. Hides itself if the portrait
                is missing, leaving the original text-only card. */}
            <img
              src={portraitUrl(phase === 'victory' ? 'hero' : (enemyType ?? 'goblin'))}
              alt=""
              onError={e => {
                e.currentTarget.style.display = 'none';
              }}
              style={{
                width: 150,
                height: 150,
                objectFit: 'cover',
                borderRadius: 14,
                border: `2px solid ${phase === 'victory' ? '#ffd54f' : '#ef5350'}`,
                marginBottom: 18,
                boxShadow:
                  phase === 'victory'
                    ? '0 0 28px rgba(255, 213, 79, 0.4)'
                    : '0 0 28px rgba(239, 83, 80, 0.35)',
              }}
            />
            <h2
              style={{
                fontSize: 36,
                color: phase === 'victory' ? '#4caf50' : '#ef5350',
                margin: '0 0 16px',
              }}
            >
              {phase === 'victory'
                ? isFinalEnemy ? ui.campaignComplete : ui.victory
                : ui.defeated}
            </h2>
            <p style={{ color: '#aaa', margin: '0 0 24px' }}>
              {phase === 'victory'
                ? isFinalEnemy
                  ? ui.victoryFinalBody
                  : ui.victoryBody
                : ui.defeatedBody}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              {phase === 'victory' && !isFinalEnemy && (
                <button
                  onClick={handleNext}
                  style={{
                    padding: '12px 28px',
                    fontSize: 18,
                    fontWeight: 'bold',
                    backgroundColor: '#4caf50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  {ui.nextEnemy}
                </button>
              )}
              {phase === 'defeat' && (
                <button
                  onClick={handleRetryFight}
                  style={{
                    padding: '12px 28px',
                    fontSize: 18,
                    fontWeight: 'bold',
                    backgroundColor: '#ff9800',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  {ui.retryFight}
                </button>
              )}
              <button
                onClick={handleRestart}
                style={{
                  padding: '12px 28px',
                  fontSize: 18,
                  fontWeight: 'bold',
                  backgroundColor:
                    phase === 'defeat' || (phase === 'victory' && !isFinalEnemy)
                      ? '#3a3a5c'
                      : '#ff9800',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                {phase === 'victory' && !isFinalEnemy ? ui.restart : ui.playAgain}
              </button>
            </div>
          </div>
        </div>
      )}

      <EnemyAppearToast />
      <DefinitionToast />
      <FeedbackButton />
      <LeaderboardButton />
      <JournalButton />
      <HelpButton />
      <LanguagePicker />
      <SettingsButton />
      <Paywall />
      <TutorialModal />
    </div>
  );
}
