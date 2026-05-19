import { useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { loadDictionary } from '../engine/WordValidator.ts';
import { GameBoard } from './GameBoard.tsx';
import { TileRack } from './TileRack.tsx';
import { CombatHUD } from './CombatHUD.tsx';
import { ActionBar } from './ActionBar.tsx';
import { BattleOverlay } from '../combat/BattleOverlay.tsx';
import { FeedbackButton } from './FeedbackButton.tsx';
import { EnemyAppearToast } from './EnemyAppearToast.tsx';
import { ENEMY_CATALOG } from '../types/enemies.ts';

export function Game() {
  const phase = useGameStore(s => s.phase);
  const enemyIndex = useGameStore(s => s.enemyIndex);
  const initGame = useGameStore(s => s.initGame);
  const nextEnemy = useGameStore(s => s.nextEnemy);
  const enemyTurn = useGameStore(s => s.enemyTurn);
  const drawTiles = useGameStore(s => s.drawTiles);
  const setDictionaryLoaded = useGameStore(s => s.setDictionaryLoaded);

  // Load dictionary on mount
  useEffect(() => {
    loadDictionary().then(() => {
      setDictionaryLoaded(true);
      initGame(0);
    });
  }, []);

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

  const handleRestart = useCallback(() => {
    initGame(0);
  }, [initGame]);

  const handleNext = useCallback(() => {
    nextEnemy();
  }, [nextEnemy]);

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
        LEXICA KNIGHTS
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
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <GameBoard />
            <BattleOverlay />
          </div>
          <ActionBar />
          <TileRack />
        </div>

        {/* HUD */}
        <CombatHUD />
      </div>

      {/* Victory/Defeat overlay */}
      {(phase === 'victory' || phase === 'defeat') && (
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
            <h2
              style={{
                fontSize: 36,
                color: phase === 'victory' ? '#4caf50' : '#ef5350',
                margin: '0 0 16px',
              }}
            >
              {phase === 'victory'
                ? isFinalEnemy ? 'CAMPAIGN COMPLETE!' : 'VICTORY!'
                : 'DEFEATED'}
            </h2>
            <p style={{ color: '#aaa', margin: '0 0 24px' }}>
              {phase === 'victory'
                ? isFinalEnemy
                  ? 'You have vanquished every foe with your words.'
                  : 'The enemy has been vanquished. A new challenger approaches…'
                : 'Your words were not strong enough...'}
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
                  Next Enemy
                </button>
              )}
              <button
                onClick={handleRestart}
                style={{
                  padding: '12px 28px',
                  fontSize: 18,
                  fontWeight: 'bold',
                  backgroundColor: phase === 'victory' && !isFinalEnemy ? '#3a3a5c' : '#ff9800',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                {phase === 'victory' && !isFinalEnemy ? 'Restart' : 'Play Again'}
              </button>
            </div>
          </div>
        </div>
      )}

      <EnemyAppearToast />
      <FeedbackButton />
    </div>
  );
}
