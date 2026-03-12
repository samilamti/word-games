import { useEffect, useCallback } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { loadDictionary } from '../engine/WordValidator.ts';
import { GameBoard } from './GameBoard.tsx';
import { TileRack } from './TileRack.tsx';
import { CombatHUD } from './CombatHUD.tsx';
import { ActionBar } from './ActionBar.tsx';
import { BattleOverlay } from '../combat/BattleOverlay.tsx';
import { FeedbackButton } from './FeedbackButton.tsx';
import type { EnemyState } from '../store/gameStore.ts';

// Chapter 1, Fight 1: Simple enemy for MVP
const TUTORIAL_ENEMY: EnemyState = {
  name: 'Ink Goblin',
  maxHp: 80,
  hp: 80,
  attack: 8,
  defense: 0,
};

export function Game() {
  const phase = useGameStore(s => s.phase);
  const initGame = useGameStore(s => s.initGame);
  const enemyTurn = useGameStore(s => s.enemyTurn);
  const drawTiles = useGameStore(s => s.drawTiles);
  const setDictionaryLoaded = useGameStore(s => s.setDictionaryLoaded);
  // Load dictionary on mount
  useEffect(() => {
    loadDictionary().then(() => {
      setDictionaryLoaded(true);
      initGame(TUTORIAL_ENEMY);
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
    initGame(TUTORIAL_ENEMY);
  }, [initGame]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: 20,
        minHeight: '100vh',
        backgroundColor: '#0d0d1a',
        color: '#e0e0e0',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          margin: 0,
          fontSize: 28,
          background: 'linear-gradient(135deg, #ffd54f, #ff9800)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: 2,
        }}
      >
        LEXICON QUEST
      </h1>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
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
              {phase === 'victory' ? 'VICTORY!' : 'DEFEATED'}
            </h2>
            <p style={{ color: '#aaa', margin: '0 0 24px' }}>
              {phase === 'victory'
                ? 'The enemy has been vanquished by your words!'
                : 'Your words were not strong enough...'}
            </p>
            <button
              onClick={handleRestart}
              style={{
                padding: '12px 32px',
                fontSize: 18,
                fontWeight: 'bold',
                backgroundColor: '#ff9800',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      <FeedbackButton />
    </div>
  );
}
