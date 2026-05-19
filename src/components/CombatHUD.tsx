import { useGameStore } from '../store/gameStore.ts';

/**
 * Minimal status strip below the action bar. HP, enemy name, ATK/DEF,
 * turn counter, and phase indicator have all moved out:
 *   - HP bars are floating PixiJS elements above each character (see
 *     BattleOverlay's HpBar class).
 *   - Turn counter and "YOUR TURN" / "ENEMY TURN" tag were removed per
 *     UX feedback — they ate vertical space without adding signal.
 * What's left: transient message (combat narration) + per-word score
 * breakdown when applicable + tiles-remaining counter for strategy.
 */
export function CombatHUD() {
  const message = useGameStore(s => s.message);
  const lastScore = useGameStore(s => s.lastScore);
  const tileBag = useGameStore(s => s.tileBag);

  const hasBreakdown = lastScore && lastScore.words.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: 10,
        backgroundColor: '#1e1e36',
        borderRadius: 8,
        border: '1px solid #3a3a5c',
        minWidth: 240,
        maxWidth: 'min(380px, 92vw)',
      }}
    >
      {/* Transient message — combat narration, rejection reasons, etc. */}
      <div
        style={{
          padding: '6px 10px',
          backgroundColor: '#16162a',
          borderRadius: 4,
          fontSize: 13,
          color: '#e0e0e0',
          textAlign: 'center',
          minHeight: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {message}
      </div>

      {/* Last word's score breakdown — only renders when present */}
      {hasBreakdown && (
        <div style={{ fontSize: 11, color: '#aaa', padding: '0 4px' }}>
          {lastScore.words.map((w, i) => (
            <div key={i}>
              {w.text}: {w.finalScore} dmg
              {w.wordMultiplier > 1 ? ` (x${w.wordMultiplier})` : ''}
            </div>
          ))}
          {lastScore.mechanicBonus > 0 && (
            <div style={{ color: '#ffd54f' }}>Bonus: +{lastScore.mechanicBonus}</div>
          )}
          <div style={{ fontWeight: 'bold', color: '#ff9800', marginTop: 2 }}>
            Total: {lastScore.totalDamage} damage
          </div>
        </div>
      )}

      {/* Tile bag remaining — small footer */}
      <div style={{ fontSize: 11, color: '#666', textAlign: 'right' }}>
        {tileBag.remaining} tiles left
      </div>
    </div>
  );
}
