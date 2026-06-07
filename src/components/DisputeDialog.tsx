import { useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useUI } from '../i18n/useUI.ts';

interface Props {
  onClose: () => void;
}

export function DisputeDialog({ onClose }: Props) {
  const lastRejection = useGameStore(s => s.lastRejection);
  const disputeWord = useGameStore(s => s.disputeWord);
  const ui = useUI();
  const [definition, setDefinition] = useState('');

  if (!lastRejection) return null;

  // The disputed word is rendered bold + quoted; the surrounding sentence is
  // localized with a {word} placeholder so word order stays correct per language.
  const [qBefore, qAfter] = ui.disputeQuestion.split('{word}');

  const handleSubmit = () => {
    disputeWord(definition.trim());
    onClose();
  };

  return (
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
        zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{
          padding: '32px 40px',
          backgroundColor: '#1e1e36',
          borderRadius: 12,
          border: '2px solid #ff9800',
          maxWidth: 420,
          width: '90%',
        }}
        onClick={e => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 8px', color: '#ffd54f', fontSize: 20 }}>
          {ui.disputeTitle}
        </h3>
        <p style={{ color: '#e0e0e0', margin: '0 0 16px', fontSize: 14 }}>
          {qBefore}
          <strong style={{ color: '#ff9800' }}>"{lastRejection.word}"</strong>
          {qAfter}
        </p>

        <label style={{ display: 'block', color: '#aaa', fontSize: 12, marginBottom: 6 }}>
          {ui.disputeMeaning}
        </label>
        <textarea
          value={definition}
          onChange={e => setDefinition(e.target.value)}
          placeholder={ui.disputePlaceholder}
          rows={3}
          style={{
            width: '100%',
            padding: 10,
            backgroundColor: '#16162a',
            color: '#e0e0e0',
            border: '1px solid #3a3a5c',
            borderRadius: 6,
            fontSize: 14,
            resize: 'vertical',
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 16, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              fontSize: 14,
              backgroundColor: '#333',
              color: '#ccc',
              border: '1px solid #555',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {ui.cancel}
          </button>
          <button
            onClick={handleSubmit}
            style={{
              padding: '8px 20px',
              fontSize: 14,
              fontWeight: 'bold',
              backgroundColor: '#ff9800',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {ui.disputeSubmit}
          </button>
        </div>

        <p style={{ color: '#888', fontSize: 11, margin: '12px 0 0', textAlign: 'center' }}>
          {ui.disputeFooter1}
          <br />
          {ui.disputeFooter2}
        </p>
      </div>
    </div>
  );
}
