import { useState } from 'react';
import { JournalModal } from './JournalModal.tsx';
import { requireUnlock } from '../store/entitlementStore.ts';
import { useUI } from '../i18n/useUI.ts';

/**
 * Floating button that opens the word journal. Stacked just above the
 * leaderboard button (bottom-left). Tapping it while locked raises the paywall
 * — the journal is part of the paid retention layer.
 */
export function JournalButton() {
  const [open, setOpen] = useState(false);
  const ui = useUI();

  return (
    <>
      <button
        onClick={() => {
          if (requireUnlock('journal')) setOpen(true); // locked → paywall instead
        }}
        aria-label={ui.journalTitle}
        title={ui.journalTitle}
        style={{
          position: 'fixed',
          bottom: 'calc(76px + env(safe-area-inset-bottom))',
          left: 'calc(20px + env(safe-area-inset-left))',
          width: 44,
          height: 44,
          padding: 0,
          fontSize: 20,
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
        onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.85')}
      >
        📖
      </button>
      {open && <JournalModal onClose={() => setOpen(false)} />}
    </>
  );
}
