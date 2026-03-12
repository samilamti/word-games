import { useCallback, useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { DisputeDialog } from './DisputeDialog.tsx';

export function ActionBar() {
  const phase = useGameStore(s => s.phase);
  const pendingTiles = useGameStore(s => s.pendingTiles);
  const submitWord = useGameStore(s => s.submitWord);
  const returnPendingToRack = useGameStore(s => s.returnPendingToRack);
  const setMessage = useGameStore(s => s.setMessage);
  const lastRejection = useGameStore(s => s.lastRejection);
  const [showDispute, setShowDispute] = useState(false);

  const handleSubmit = useCallback(() => {
    const result = submitWord();
    if (!result.success && result.error) {
      setMessage(result.error);
    }
  }, [submitWord, setMessage]);

  const handleRecall = useCallback(() => {
    returnPendingToRack();
    setMessage('Tiles returned to rack.');
  }, [returnPendingToRack, setMessage]);

  const isPlaying = phase === 'playing';
  const hasPending = pendingTiles.length > 0;
  const canDispute = isPlaying && lastRejection !== null;

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
          padding: '8px 0',
        }}
      >
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
          Submit Word
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
          Recall
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
            Dispute!
          </button>
        )}
      </div>

      {showDispute && <DisputeDialog onClose={() => setShowDispute(false)} />}
    </>
  );
}
