import { useState } from 'react';
import { useSettingsStore } from '../store/settingsStore.ts';
import { useUI } from '../i18n/useUI.ts';

interface ToggleRowProps {
  label: string;
  on: boolean;
  onChange: (v: boolean) => void;
}

function ToggleRow({ label, on, onChange }: ToggleRowProps) {
  return (
    <button
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 16px',
        backgroundColor: '#16162a',
        color: '#e0e0e0',
        border: '2px solid #3a3a5c',
        borderRadius: 8,
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
      }}
    >
      <span style={{ fontSize: 15, fontWeight: 'bold' }}>{label}</span>
      <span
        aria-hidden
        style={{
          flexShrink: 0,
          width: 46,
          height: 26,
          borderRadius: 13,
          backgroundColor: on ? '#4caf50' : '#444',
          position: 'relative',
          transition: 'background-color 0.15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: '#fff',
            transform: on ? 'translateX(20px)' : 'translateX(0)',
            transition: 'transform 0.15s',
          }}
        />
      </span>
    </button>
  );
}

interface ModalProps {
  onClose: () => void;
}

function SettingsModal({ onClose }: ModalProps) {
  const ui = useUI();
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const soundEnabled = useSettingsStore(s => s.soundEnabled);
  const hapticsEnabled = useSettingsStore(s => s.hapticsEnabled);
  const setReduceMotion = useSettingsStore(s => s.setReduceMotion);
  const setSoundEnabled = useSettingsStore(s => s.setSoundEnabled);
  const setHapticsEnabled = useSettingsStore(s => s.setHapticsEnabled);

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
            ⚙️ {ui.settings}
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
          <ToggleRow label={ui.soundEffects} on={soundEnabled} onChange={setSoundEnabled} />
          <ToggleRow label={ui.haptics} on={hapticsEnabled} onChange={setHapticsEnabled} />
          <ToggleRow label={ui.reduceMotion} on={reduceMotion} onChange={setReduceMotion} />
        </div>
      </div>
    </div>
  );
}

/**
 * Floating top-left gear button (the other three corners host the language,
 * leaderboard, and feedback buttons). Opens accessibility / feel toggles:
 * sound, vibration, and reduce-motion (which disables the tile-drop tumble
 * and screen shake).
 */
export function SettingsButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Settings"
        title="Settings"
        style={{
          position: 'fixed',
          top: 'calc(20px + env(safe-area-inset-top))',
          left: 'calc(20px + env(safe-area-inset-left))',
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
        ⚙️
      </button>
      {open && <SettingsModal onClose={() => setOpen(false)} />}
    </>
  );
}
