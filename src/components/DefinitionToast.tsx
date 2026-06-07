import { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useDevStore } from '../store/devStore.ts';
import { useJournalStore } from '../store/journalStore.ts';
import { definitionService, type DefEntry } from '../definitions/DefinitionService.ts';
import { requireUnlock } from '../store/entitlementStore.ts';
import { useUI } from '../i18n/useUI.ts';

/**
 * Ephemeral "what did I just spell?" definition card — the free "taste" hook of
 * the definitions feature (M1). Fires on every successful play, watching
 * gameStore.lastDefinedWord/lastDefinedAt (the turn's longest formed word).
 *
 * Async lookup result lives in component state; timing is pure CSS (the
 * `definitionToast` keyframe in index.css). The card renders only once an entry
 * has resolved for the CURRENT trigger, so a stale word never flashes and a word
 * with no definition shows nothing. onAnimationEnd unmounts the card after the
 * fade-out so the (now-invisible) Save button can't intercept taps.
 *
 * The "★ Save" affordance (Phase C / M2) is gated behind the dev flag for now;
 * the entitlement/paywall gate comes in Phase D. The whole card is
 * pointerEvents:none EXCEPT the Save button, so it never blocks the board.
 */

/** Lowercase then capitalize first letter — headword styling for the uppercase
 *  board word. */
function headword(word: string): string {
  const w = word.toLowerCase();
  return w.charAt(0).toUpperCase() + w.slice(1);
}

const ACCENT = '#ffd54f';

export function DefinitionToast() {
  const word = useGameStore((s) => s.lastDefinedWord);
  const at = useGameStore((s) => s.lastDefinedAt);
  const locale = useGameStore((s) => s.locale);
  const m2Enabled = useDevStore((s) => s.m2Enabled);
  const saveToJournal = useJournalStore((s) => s.save);
  const ui = useUI();

  const [entry, setEntry] = useState<DefEntry | null>(null);
  const [resolvedAt, setResolvedAt] = useState(0);
  const [savedTrigger, setSavedTrigger] = useState(0);

  useEffect(() => {
    if (!at || !word) return;
    let cancelled = false;
    setEntry(null); // drop the previous word's card the instant a new word lands
    definitionService.lookup(locale, word).then((e) => {
      if (cancelled || !e) return;
      setEntry(e);
      setResolvedAt(at);
    });
    return () => {
      cancelled = true;
    };
  }, [at, word, locale]);

  if (!entry || resolvedAt !== at) return null;

  // For an inflected form, save (and later review) the base lemma rather than
  // every inflection — keeps the journal a clean vocabulary list.
  const saveWord = entry.formOf?.lemma ?? word;
  const saveDef: DefEntry = entry.formOf ? { ...entry, formOf: undefined } : entry;
  const saved = savedTrigger === at;

  const senses = entry.senses.slice(0, 2);

  return (
    <div
      key={at}
      onAnimationEnd={() => setEntry(null)}
      style={{
        position: 'fixed',
        top: 'calc(var(--safe-top) + 10px)',
        left: '50%',
        zIndex: 150,
        pointerEvents: 'none',
        maxWidth: 'min(440px, 92vw)',
        padding: '12px 18px',
        backgroundColor: 'rgba(14, 10, 30, 0.96)',
        border: '1px solid rgba(255, 213, 79, 0.55)',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.55)',
        animation: 'definitionToast 4.5s ease-out forwards',
        opacity: 0,
        transform: 'translate(-50%, 0)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 20, fontWeight: 'bold', color: '#fff', letterSpacing: 0.5 }}>
          {headword(word)}
        </span>
        {entry.ipa && (
          <span
            style={{ fontSize: 13, color: '#9fa8da', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
          >
            {entry.ipa}
          </span>
        )}
        {entry.glossLang === 'en' && (
          <span
            title={ui.defInEnglish}
            style={{
              fontSize: 10,
              fontWeight: 'bold',
              color: '#0d0d1a',
              backgroundColor: '#9fa8da',
              borderRadius: 4,
              padding: '1px 5px',
              letterSpacing: 0.5,
            }}
          >
            EN
          </span>
        )}
        {m2Enabled && (
          <button
            onClick={() => {
              if (!requireUnlock('journal')) return; // locked → paywall
              saveToJournal(saveWord, locale, saveDef);
              setSavedTrigger(at);
            }}
            disabled={saved}
            title={saved ? ui.savedToJournal : ui.saveToJournal}
            style={{
              pointerEvents: 'auto',
              marginLeft: 'auto',
              minHeight: 0,
              minWidth: 0,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              color: saved ? '#0d0d1a' : ACCENT,
              backgroundColor: saved ? ACCENT : 'transparent',
              border: `1px solid ${ACCENT}`,
              borderRadius: 6,
              cursor: saved ? 'default' : 'pointer',
            }}
          >
            {saved ? `★ ${ui.saved}` : `★ ${ui.save}`}
          </button>
        )}
      </div>

      {entry.formOf && (
        <div style={{ fontSize: 12, color: '#bdbdbd', fontStyle: 'italic', marginTop: 2 }}>
          {entry.formOf.tags ? `${entry.formOf.tags} ${ui.defOf} ` : `${ui.defFormOf} `}
          <span style={{ color: ACCENT, fontStyle: 'normal' }}>{entry.formOf.lemma}</span>
        </div>
      )}

      {senses.map((s, i) => (
        <div
          key={i}
          style={{ fontSize: 14, lineHeight: 1.4, color: '#e8e8e8', marginTop: i === 0 ? 8 : 5 }}
        >
          {s.pos && <span style={{ color: ACCENT, fontStyle: 'italic', marginRight: 6 }}>{s.pos}</span>}
          {s.gloss}
        </div>
      ))}

      {entry.example && (
        <div
          style={{
            fontSize: 13,
            color: '#9e9e9e',
            fontStyle: 'italic',
            marginTop: 8,
            borderLeft: '2px solid rgba(255, 213, 79, 0.4)',
            paddingLeft: 8,
          }}
        >
          {entry.example}
        </div>
      )}
    </div>
  );
}
