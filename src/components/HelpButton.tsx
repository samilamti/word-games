import { useSettingsStore } from '../store/settingsStore.ts';
import { useUI } from '../i18n/useUI.ts';

/**
 * Floating button that reopens the intro guide. Stacked above the journal button
 * (bottom-left, 56px rhythm). Also the only always-available way back to the
 * power-square legend, which is why it earns a permanent slot rather than living
 * only inside Settings.
 */
export function HelpButton() {
  const openTutorial = useSettingsStore(s => s.openTutorial);
  const ui = useUI();

  return (
    <button
      onClick={openTutorial}
      aria-label={ui.howToPlay}
      title={ui.howToPlay}
      style={{
        position: 'fixed',
        bottom: 'calc(132px + env(safe-area-inset-bottom))',
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
      ?
    </button>
  );
}
