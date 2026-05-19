import { useState } from 'react';
import { LeaderboardModal } from './LeaderboardModal.tsx';

/**
 * Floating bottom-left button (mirror of the bottom-right FeedbackButton)
 * that opens the local high-score leaderboard. Always accessible — players
 * don't have to wait for victory to peek at their history.
 */
export function LeaderboardButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="View leaderboard"
        title="Leaderboard"
        style={{
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          left: 'calc(20px + env(safe-area-inset-left))',
          width: 44,
          height: 44,
          padding: 0,
          fontSize: 20,
          fontWeight: 'bold',
          backgroundColor: '#1e1e36',
          color: '#ffd54f',
          border: '1px solid #ffd54f',
          borderRadius: 22,
          cursor: 'pointer',
          zIndex: 50,
          opacity: 0.85,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '0.85')}
      >
        🏆
      </button>
      {open && <LeaderboardModal onClose={() => setOpen(false)} />}
    </>
  );
}
