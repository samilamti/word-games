import { useState } from 'react';
import { useDevStore } from '../store/devStore.ts';
import { JournalModal } from './JournalModal.tsx';
import { requireUnlock } from '../store/entitlementStore.ts';

/**
 * Floating button that opens the word journal. Stacked just above the
 * leaderboard button (bottom-left). Only rendered while the M2 dev flag is on
 * (`__lexicaDev.enable()`), since the retention layer isn't user-facing until
 * monetization (M3) + delivery (M4) land.
 */
export function JournalButton() {
  const m2Enabled = useDevStore((s) => s.m2Enabled);
  const [open, setOpen] = useState(false);

  if (!m2Enabled) return null;

  return (
    <>
      <button
        onClick={() => {
          if (requireUnlock('journal')) setOpen(true); // locked → paywall instead
        }}
        aria-label="Open word journal"
        title="Word journal"
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
