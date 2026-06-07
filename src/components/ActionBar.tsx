import { useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { DisputeDialog } from './DisputeDialog.tsx';
import { triggerHaptic } from '../native/init.ts';
import { useUI } from '../i18n/useUI.ts';

export function ActionBar() {
  const phase = useGameStore(s => s.phase);
  const pendingTiles = useGameStore(s => s.pendingTiles);
  const submitWord = useGameStore(s => s.submitWord);
  const returnPendingToRack = useGameStore(s => s.returnPendingToRack);
  const setMessage = useGameStore(s => s.setMessage);
  const lastRejection = useGameStore(s => s.lastRejection);
  const rack = useGameStore(s => s.rack);
  const exchangeMode = useGameStore(s => s.exchangeMode);
  const selectedForSwap = useGameStore(s => s.selectedForSwap);
  const swapTiles = useGameStore(s => s.swapTiles);
  const toggleExchangeMode = useGameStore(s => s.toggleExchangeMode);
  const clearSwapSelection = useGameStore(s => s.clearSwapSelection);
  const ui = useUI();
  const [showDispute, setShowDispute] = useState(false);

  const handleSubmit = useCallback(() => {
    triggerHaptic();
    const result = submitWord();
    if (!result.success && result.error) {
      setMessage(result.error);
    }
  }, [submitWord, setMessage]);

  const handleRecall = useCallback(() => {
    returnPendingToRack();
    setMessage(ui.tilesReturned);
  }, [returnPendingToRack, setMessage, ui]);

  const handleConfirmExchange = useCallback(() => {
    triggerHaptic();
    const tiles = rack.filter(t => selectedForSwap.includes(t.id));
    swapTiles(tiles);
    clearSwapSelection();
  }, [rack, selectedForSwap, swapTiles, clearSwapSelection]);

  const handlePass = useCallback(() => {
    triggerHaptic();
    swapTiles([]);
    clearSwapSelection();
  }, [swapTiles, clearSwapSelection]);

  const isPlaying = phase === 'playing';
  const hasPending = pendingTiles.length > 0;
  // A rejection still showing a blank ('*') can't be a real word — don't offer
  // to dispute it (it would never resolve to a dictionary entry anyway).
  const canDispute = isPlaying && lastRejection !== null && !lastRejection.word.includes('*');

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          padding: '8px 0',
          flexWrap: 'wrap',
        }}
      >
        {!exchangeMode ? (
          <>
            <button
              onClick={handleSubmit}
              disabled={!isPlaying || !hasPending}
              style={{
                padding: '10px 24px',
                fontSize: 16,
                fontWeight: 'bold',
                backgroundColor: isPlaying && hasPending ? '#4caf50' : '#555',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: isPlaying && hasPending ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s',
              }}
            >
              {ui.submitWord}
            </button>

            <button
              onClick={handleRecall}
              disabled={!isPlaying || !hasPending}
              style={{
                padding: '10px 24px',
                fontSize: 16,
                backgroundColor: isPlaying && hasPending ? '#ff9800' : '#555',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: isPlaying && hasPending ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s',
              }}
            >
              {ui.recall}
            </button>

            <button
              onClick={toggleExchangeMode}
              disabled={!isPlaying}
              style={{
                padding: '10px 24px',
                fontSize: 16,
                backgroundColor: isPlaying ? '#5c6bc0' : '#555',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: isPlaying ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s',
              }}
            >
              {ui.exchange}
            </button>

            {canDispute && (
              <button
                onClick={() => setShowDispute(true)}
                style={{
                  padding: '10px 24px',
                  fontSize: 16,
                  fontWeight: 'bold',
                  backgroundColor: '#e65100',
                  color: '#fff',
                  border: '2px solid #ff9800',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                  animation: 'pulse-border 1.5s ease-in-out infinite',
                }}
              >
                {ui.dispute}
              </button>
            )}
          </>
        ) : (
          <>
            <button
              onClick={handleConfirmExchange}
              disabled={selectedForSwap.length === 0}
              style={{
                padding: '10px 24px',
                fontSize: 16,
                fontWeight: 'bold',
                backgroundColor: selectedForSwap.length > 0 ? '#4caf50' : '#555',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: selectedForSwap.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s',
              }}
            >
              {ui.confirmExchange.replace('{n}', String(selectedForSwap.length))}
            </button>

            <button
              onClick={handlePass}
              style={{
                padding: '10px 24px',
                fontSize: 16,
                backgroundColor: '#ff9800',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {ui.pass}
            </button>

            <button
              onClick={toggleExchangeMode}
              style={{
                padding: '10px 24px',
                fontSize: 16,
                backgroundColor: '#555',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                transition: 'background-color 0.2s',
              }}
            >
              {ui.cancel}
            </button>
          </>
        )}
      </div>

      {showDispute && <DisputeDialog onClose={() => setShowDispute(false)} />}
    </>
  );
}
