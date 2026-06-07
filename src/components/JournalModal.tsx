import { useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useJournalStore, listByLocale, listDue } from '../store/journalStore.ts';
import { ReviewModal } from './ReviewModal.tsx';
import { useUI } from '../i18n/useUI.ts';

interface Props {
  onClose: () => void;
}

function headword(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Word journal (Phase C / M2): the player's saved-word vocabulary for the
 * current language, with a per-language tally and an entry point into the
 * spaced-repetition review. Mirrors LeaderboardModal's chrome. Subscribes to
 * the journal `entries` map (a stable reference that only changes on mutation)
 * and derives lists via the pure helpers + useMemo.
 */
export function JournalModal({ onClose }: Props) {
  const locale = useGameStore((s) => s.locale);
  const entries = useJournalStore((s) => s.entries);
  const removeWord = useJournalStore((s) => s.remove);
  const clearJournal = useJournalStore((s) => s.clear);
  const ui = useUI();

  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState(false);

  const all = useMemo(() => listByLocale(entries, locale), [entries, locale]);
  const dueCount = useMemo(() => listDue(entries, locale, Date.now()).length, [entries, locale]);
  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? all.filter((e) => e.word.includes(q)) : all;
  }, [all, search]);

  // Per-language tally across everything saved (vocab tracking view).
  const tally = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of Object.values(entries)) m[e.locale] = (m[e.locale] ?? 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const handleClear = () => {
    if (confirm(ui.journalClearConfirm)) {
      clearJournal();
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 250,
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '24px 28px',
          backgroundColor: '#1e1e36',
          borderRadius: 14,
          border: '2px solid #3a3a5c',
          maxWidth: 'min(520px, 92vw)',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: '#ffd54f', fontSize: 22 }}>📖 {ui.journalTitle}</h3>
          <button onClick={onClose} style={closeBtn}>{ui.close}</button>
        </div>

        {/* Summary + review entry point */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
          <div style={{ color: '#aaa', fontSize: 13 }}>
            <strong style={{ color: '#e0e0e0' }}>{locale.toUpperCase()}</strong>: {all.length}{' '}
            {all.length === 1 ? ui.journalWord : ui.journalWords}
            {dueCount > 0 && <span style={{ color: '#ff9800' }}> · {dueCount} {ui.journalDue}</span>}
          </div>
          <button
            onClick={() => setReviewing(true)}
            disabled={dueCount === 0}
            style={{
              padding: '8px 16px',
              fontSize: 13,
              fontWeight: 'bold',
              backgroundColor: dueCount > 0 ? '#ff9800' : '#2d2d44',
              color: dueCount > 0 ? '#fff' : '#666',
              border: 'none',
              borderRadius: 8,
              cursor: dueCount > 0 ? 'pointer' : 'default',
            }}
          >
            🧠 {ui.review}{dueCount > 0 ? ` (${dueCount})` : ''}
          </button>
        </div>

        {all.length > 0 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={ui.journalSearch}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: 14,
              marginBottom: 12,
              backgroundColor: '#16162a',
              color: '#e0e0e0',
              border: '1px solid #3a3a5c',
              borderRadius: 8,
            }}
          />
        )}

        {/* List */}
        {all.length === 0 ? (
          <div style={{ padding: '32px 12px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
            {ui.journalEmpty}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.map((e) => (
              <div
                key={e.word}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '10px 12px',
                  backgroundColor: '#16162a',
                  border: '1px solid #2d2d44',
                  borderRadius: 8,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontWeight: 'bold', color: '#fff', fontSize: 15 }}>{headword(e.word)}</span>
                    {e.def.ipa && (
                      <span style={{ fontSize: 12, color: '#9fa8da', fontFamily: 'ui-monospace, monospace' }}>{e.def.ipa}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#bbb', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.def.senses[0]?.pos && (
                      <span style={{ color: '#ffd54f', fontStyle: 'italic', marginRight: 5 }}>{e.def.senses[0].pos}</span>
                    )}
                    {e.def.senses[0]?.gloss ?? '—'}
                  </div>
                </div>
                <button
                  onClick={() => removeWord(e.word, locale)}
                  aria-label={`${ui.remove} ${e.word}`}
                  title={ui.remove}
                  style={{
                    minHeight: 0, minWidth: 0,
                    padding: '2px 8px',
                    fontSize: 16,
                    color: '#888',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  ×
                </button>
              </div>
            ))}
            {list.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
                {ui.journalNoMatches}
              </div>
            )}
          </div>
        )}

        {/* Per-language tally + clear */}
        {tally.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, gap: 12, flexWrap: 'wrap' }}>
            <div style={{ color: '#777', fontSize: 12 }}>
              {tally.map(([loc, n]) => `${loc.toUpperCase()} ${n}`).join(' · ')}
            </div>
            <button onClick={handleClear} style={{ ...closeBtn, color: '#888', backgroundColor: 'transparent' }}>
              {ui.journalClearAll}
            </button>
          </div>
        )}
      </div>

      {reviewing && <ReviewModal onClose={() => setReviewing(false)} />}
    </div>
  );
}

const closeBtn: React.CSSProperties = {
  padding: '6px 14px',
  fontSize: 13,
  backgroundColor: '#333',
  color: '#ccc',
  border: '1px solid #555',
  borderRadius: 6,
  cursor: 'pointer',
};
