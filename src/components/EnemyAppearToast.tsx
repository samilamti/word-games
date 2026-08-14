import { useEffect } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { soundManager } from '../audio/SoundManager.ts';
import { portraitUrl } from '../types/enemies.ts';
import { useUI } from '../i18n/useUI.ts';

/**
 * Volatile center-screen notice that pops up whenever a new enemy spawns.
 * Fixed-position so it never expands or scrolls the layout — fades in,
 * holds, and fades out via pure CSS animation. The `key={enemyAppearAt}`
 * forces React to re-mount the div on each spawn so the animation
 * restarts cleanly. Replaces the layout-expanding "A wild X appears!
 * Spell words to attack!" text that used to live in the persistent
 * CombatHUD message slot.
 */
export function EnemyAppearToast() {
  const enemy = useGameStore(s => s.enemy);
  const enemyAppearAt = useGameStore(s => s.enemyAppearAt);
  const ui = useUI();

  // Sting on each spawn. Keyed on the same timestamp the animation restarts on,
  // so a replayed toast is scored too.
  useEffect(() => {
    if (!enemyAppearAt) return;
    soundManager.play('enemyAppear');
  }, [enemyAppearAt]);

  if (!enemy || !enemyAppearAt) return null;

  return (
    <div
      key={enemyAppearAt}
      style={{
        position: 'fixed',
        top: '38%',
        left: '50%',
        zIndex: 200,
        pointerEvents: 'none',
        textAlign: 'center',
        padding: '22px 36px',
        backgroundColor: 'rgba(20, 8, 40, 0.94)',
        border: '2px solid #ff9800',
        borderRadius: 14,
        boxShadow: '0 12px 50px rgba(255, 152, 0, 0.45), 0 4px 12px rgba(0,0,0,0.65)',
        maxWidth: 'min(380px, 88vw)',
        // Animation drives both translate (centering) and opacity.
        animation: 'enemyAppearToast 3s ease-out forwards',
        opacity: 0,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: '#ffd54f',
          letterSpacing: 4,
          marginBottom: 4,
          fontWeight: 'bold',
        }}
      >
        {ui.aWild}
      </div>
      <div
        style={{
          fontSize: 'clamp(24px, 6vw, 32px)',
          fontWeight: 'bold',
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0,0,0,0.6)',
          letterSpacing: 1,
        }}
      >
        {enemy.name}
      </div>
      <div
        style={{
          fontSize: 13,
          color: '#ffd54f',
          letterSpacing: 4,
          marginTop: 4,
          marginBottom: 12,
          fontWeight: 'bold',
        }}
      >
        {ui.appears}
      </div>
      {/* Portrait art. This is the one moment the player meets the enemy with
          nothing else competing for attention, so it is worth the detail the
          86px combat sprite cannot carry. Hides itself if the art is absent, so
          the toast degrades to the text-only version it has always been. */}
      <img
        src={portraitUrl(enemy.type)}
        alt=""
        onError={e => {
          e.currentTarget.style.display = 'none';
        }}
        style={{
          width: 132,
          height: 132,
          objectFit: 'cover',
          borderRadius: 12,
          border: '2px solid #ffd54f',
          marginBottom: 12,
          boxShadow: '0 6px 20px rgba(0,0,0,0.6)',
        }}
      />
      <div
        style={{
          fontSize: 13,
          color: '#cccccc',
          fontStyle: 'italic',
          lineHeight: 1.4,
        }}
      >
        {enemy.tagline}
      </div>
    </div>
  );
}
