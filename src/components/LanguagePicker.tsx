import { useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { LOCALE_LIST } from '../i18n/locales.ts';
import { useUI } from '../i18n/useUI.ts';

interface ModalProps {
  onClose: () => void;
}

function LanguageModal({ onClose }: ModalProps) {
  const ui = useUI();
  const currentLocale = useGameStore(s => s.locale);
  const setLocale = useGameStore(s => s.setLocale);

  return (
    <div
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
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          padding: '20px 24px',
          backgroundColor: '#1e1e36',
          borderRadius: 14,
          border: '2px solid #3a3a5c',
          maxWidth: 'min(420px, 92vw)',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ margin: 0, color: '#ffd54f', fontSize: 20 }}>
            🌐 {ui.language}
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              backgroundColor: '#333',
              color: '#ccc',
              border: '1px solid #555',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {LOCALE_LIST.map(loc => {
            const isActive = loc.code === currentLocale;
            const tileCount = loc.letters.reduce((sum, l) => sum + l.count, 0) + loc.wildCount;
            return (
              <button
                key={loc.code}
                onClick={() => {
                  setLocale(loc.code);
                  onClose();
                }}
                style={{
                  padding: '12px 16px',
                  backgroundColor: isActive ? '#ff9800' : '#16162a',
                  color: isActive ? '#fff' : '#e0e0e0',
                  border: `2px solid ${isActive ? '#ffd54f' : '#3a3a5c'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: 28 }}>{loc.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 'bold' }}>{loc.nativeName}</div>
                  <div style={{ fontSize: 11, color: isActive ? '#fff8d0' : '#888' }}>
                    {loc.name} · {tileCount} tiles
                  </div>
                </div>
                {isActive && <span style={{ fontSize: 16 }}>✓</span>}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 16, fontSize: 11, color: '#666', textAlign: 'center', lineHeight: 1.4 }}>
          Switching languages starts a fresh game with that language's tile distribution and dictionary.
        </div>
      </div>
    </div>
  );
}

export function LanguagePicker() {
  const [open, setOpen] = useState(false);
  const currentLocale = useGameStore(s => s.locale);
  const flag = currentLocale ? (LOCALE_LIST.find(l => l.code === currentLocale)?.flag ?? '🌐') : '🌐';

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Change language"
        title="Language"
        style={{
          position: 'fixed',
          top: 'calc(20px + env(safe-area-inset-top))',
          right: 'calc(20px + env(safe-area-inset-right))',
          width: 44,
          height: 44,
          padding: 0,
          fontSize: 22,
          backgroundColor: '#1e1e36',
          color: '#fff',
          border: '1px solid #3a3a5c',
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
        {flag}
      </button>
      {open && <LanguageModal onClose={() => setOpen(false)} />}
    </>
  );
}
