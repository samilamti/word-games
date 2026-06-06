import { useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useJournalStore, listDue, type Grade, type JournalEntry } from '../store/journalStore.ts';

interface Props {
  onClose: () => void;
}

const GRADES: { grade: Grade; label: string; color: string }[] = [
  { grade: 'again', label: 'Again', color: '#ef5350' },
  { grade: 'good', label: 'Good', color: '#4caf50' },
  { grade: 'easy', label: 'Easy', color: '#42a5f5' },
];

function headword(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

/**
 * Spaced-repetition flashcard quiz over the words due for review in the current
 * locale. The due queue is snapshotted at open (grading mutates due-ness, so a
 * live list would shift under the user). Front = the word; reveal shows the
 * saved definition; grading (Again/Good/Easy) updates the Leitner schedule and
 * advances to the next card.
 */
export function ReviewModal({ onClose }: Props) {
  const locale = useGameStore((s) => s.locale);
  const gradeWord = useJournalStore((s) => s.grade);

  const [queue] = useState<JournalEntry[]>(() =>
    listDue(useJournalStore.getState().entries, locale, Date.now()),
  );
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const current = queue[index];
  const done = index >= queue.length;

  const handleGrade = (g: Grade) => {
    if (!current) return;
    gradeWord(current.word, locale, g);
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  return (
    <Shell onClose={onClose}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: '#ffd54f', fontSize: 20 }}>🧠 Review</h3>
        <button onClick={onClose} style={closeBtn}>Close</button>
      </div>

      {queue.length === 0 || done ? (
        <div style={{ padding: '28px 8px', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{queue.length === 0 ? '✅' : '🎉'}</div>
          <div style={{ color: '#e0e0e0', fontSize: 16 }}>
            {queue.length === 0
              ? 'No words are due for review right now.'
              : `Reviewed ${queue.length} ${queue.length === 1 ? 'word' : 'words'}!`}
          </div>
          <button onClick={onClose} style={{ ...primaryBtn, marginTop: 20 }}>Done</button>
        </div>
      ) : (
        <>
          <div style={{ textAlign: 'center', color: '#777', fontSize: 12, marginBottom: 8 }}>
            {index + 1} / {queue.length}
          </div>
          <div
            style={{
              backgroundColor: '#16162a',
              border: '1px solid #3a3a5c',
              borderRadius: 12,
              padding: '20px 18px',
              minHeight: 140,
            }}
          >
            <div style={{ fontSize: 26, fontWeight: 'bold', color: '#fff', textAlign: 'center' }}>
              {headword(current.word)}
            </div>

            {revealed ? (
              <div style={{ marginTop: 14 }}>
                {current.def.ipa && (
                  <div style={{ textAlign: 'center', color: '#9fa8da', fontSize: 13, marginBottom: 8, fontFamily: 'ui-monospace, monospace' }}>
                    {current.def.ipa}
                  </div>
                )}
                {current.def.senses.slice(0, 3).map((s, i) => (
                  <div key={i} style={{ fontSize: 14, lineHeight: 1.4, color: '#e8e8e8', marginTop: i === 0 ? 0 : 5 }}>
                    {s.pos && <span style={{ color: '#ffd54f', fontStyle: 'italic', marginRight: 6 }}>{s.pos}</span>}
                    {s.gloss}
                  </div>
                ))}
                {current.def.example && (
                  <div style={{ fontSize: 13, color: '#9e9e9e', fontStyle: 'italic', marginTop: 8, borderLeft: '2px solid rgba(255,213,79,0.4)', paddingLeft: 8 }}>
                    {current.def.example}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <button onClick={() => setRevealed(true)} style={primaryBtn}>Show answer</button>
              </div>
            )}
          </div>

          {revealed && (
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              {GRADES.map((g) => (
                <button
                  key={g.grade}
                  onClick={() => handleGrade(g.grade)}
                  style={{
                    flex: 1,
                    padding: '12px 0',
                    fontSize: 15,
                    fontWeight: 'bold',
                    color: '#fff',
                    backgroundColor: g.color,
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

// ─── shared modal chrome ──────────────────────────────────────────────────────

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
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
        zIndex: 260,
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
          maxWidth: 'min(460px, 92vw)',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        {children}
      </div>
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

const primaryBtn: React.CSSProperties = {
  padding: '10px 22px',
  fontSize: 15,
  fontWeight: 'bold',
  backgroundColor: '#ff9800',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
};
