import { useGameStore } from '../store/gameStore.ts';

function HpBar({ current, max, color, label }: { current: number; max: number; color: string; label: string }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));
  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 13, color: '#ccc' }}>
        <span>{label}</span>
        <span>{current}/{max}</span>
      </div>
      <div
        style={{
          width: '100%',
          height: 20,
          backgroundColor: '#1a1a2e',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid #3a3a5c',
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: 10,
            transition: 'width 0.5s ease',
          }}
        />
      </div>
    </div>
  );
}

export function CombatHUD() {
  const playerHp = useGameStore(s => s.playerHp);
  const playerMaxHp = useGameStore(s => s.playerMaxHp);
  const enemy = useGameStore(s => s.enemy);
  const message = useGameStore(s => s.message);
  const lastScore = useGameStore(s => s.lastScore);
  const turnNumber = useGameStore(s => s.turnNumber);
  const tileBag = useGameStore(s => s.tileBag);
  const phase = useGameStore(s => s.phase);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: 16,
        backgroundColor: '#1e1e36',
        borderRadius: 8,
        border: '1px solid #3a3a5c',
        minWidth: 240,
      }}
    >
      {/* Player HP */}
      <HpBar current={playerHp} max={playerMaxHp} color="#4caf50" label="Player HP" />

      {/* Enemy HP */}
      {enemy && (
        <>
          <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 'bold', color: '#ef5350' }}>
            {enemy.name}
          </div>
          <HpBar current={enemy.hp} max={enemy.maxHp} color="#ef5350" label="Enemy HP" />
          <div style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>
            ATK: {enemy.attack} | DEF: {enemy.defense}
          </div>
        </>
      )}

      {/* Turn info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#888' }}>
        <span>Turn {turnNumber}</span>
        <span>{tileBag.remaining} tiles left</span>
      </div>

      {/* Phase indicator */}
      <div style={{
        textAlign: 'center',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 'bold',
        backgroundColor: phase === 'playing' ? '#1b5e20' : phase === 'enemy_turn' ? '#b71c1c' : '#1a237e',
        color: '#fff',
      }}>
        {phase === 'playing' ? 'YOUR TURN' :
         phase === 'enemy_turn' ? 'ENEMY TURN' :
         phase === 'victory' ? 'VICTORY!' :
         phase === 'defeat' ? 'DEFEATED' :
         'LOADING'}
      </div>

      {/* Message */}
      <div
        style={{
          padding: 8,
          backgroundColor: '#16162a',
          borderRadius: 4,
          fontSize: 13,
          color: '#e0e0e0',
          textAlign: 'center',
          minHeight: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {message}
      </div>

      {/* Last score breakdown */}
      {lastScore && lastScore.words.length > 0 && (
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
          <div style={{ fontWeight: 'bold', color: '#ff9800', marginTop: 4 }}>
            Total: {lastScore.totalDamage} damage
          </div>
        </div>
      )}
    </div>
  );
}
