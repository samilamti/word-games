import { useState, useEffect } from 'react';
import { useEntitlementStore, type PaywallContext } from '../store/entitlementStore.ts';
import { billing } from '../billing/billing.ts';
import { soundManager } from '../audio/SoundManager.ts';
import { useUI } from '../i18n/useUI.ts';

/**
 * The one-time-unlock offer (Phase D / M3). Reads paywallOpen/context from
 * entitlementStore; raised by requireUnlock() at any gated site. Buy + Restore
 * both go through the billing layer (a stub today; Apple requires a working
 * Restore path before submission). Localized English-first per the plan.
 *
 * NOTE: price is a placeholder — the real label comes from the RevenueCat
 * offering once billing is wired (price in SEK to avoid double FX).
 */

export function Paywall() {
  const open = useEntitlementStore((s) => s.paywallOpen);
  const context = useEntitlementStore((s) => s.paywallContext);
  const setUnlocked = useEntitlementStore((s) => s.setUnlocked);
  const closePaywall = useEntitlementStore((s) => s.closePaywall);
  const ui = useUI();

  const [busy, setBusy] = useState<null | 'buy' | 'restore'>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [priceLabel, setPriceLabel] = useState<string | null>(null);

  useEffect(() => {
    if (open) billing.getPriceString().then(setPriceLabel);
  }, [open]);

  if (!open) return null;

  const features = [
    ui.paywallFeatureCampaign,
    ui.paywallFeatureJournal,
    ui.paywallFeatureReview,
    ui.paywallFeatureVocab,
  ];
  const headline: Record<PaywallContext, string> = {
    campaign: ui.paywallHeadlineCampaign,
    journal: ui.paywallHeadlineJournal,
  };

  const run = async (kind: 'buy' | 'restore') => {
    setBusy(kind);
    setMsg(null);
    try {
      const ok = kind === 'buy' ? await billing.purchase() : await billing.restore();
      if (ok) {
        soundManager.play('purchase');
        setUnlocked(true);
        closePaywall();
      } else {
        setMsg(kind === 'buy' ? ui.paywallErrorBuy : ui.paywallErrorRestore);
      }
    } catch {
      setMsg(ui.paywallErrorGeneric);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      onClick={() => busy || closePaywall()}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 270,
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          padding: '28px 28px 22px',
          backgroundColor: '#1e1e36',
          borderRadius: 16,
          border: '2px solid #ffd54f',
          boxShadow: '0 12px 60px rgba(255, 152, 0, 0.25)',
          maxWidth: 'min(420px, 92vw)',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
        }}
      >
        <h2
          style={{
            margin: '0 0 4px',
            fontSize: 24,
            textAlign: 'center',
            background: 'linear-gradient(135deg, #ffd54f, #ff9800)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {context ? headline[context] : ui.paywallHeadlineDefault}
        </h2>
        <p style={{ margin: '0 0 18px', textAlign: 'center', color: '#aaa', fontSize: 13 }}>
          {ui.paywallSubtitle}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {features.map((f) => (
            <div key={f} style={{ color: '#e0e0e0', fontSize: 15, lineHeight: 1.35 }}>
              {f}
            </div>
          ))}
        </div>

        {msg && (
          <div style={{ color: '#ef9a9a', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>{msg}</div>
        )}

        <button
          onClick={() => run('buy')}
          disabled={busy !== null}
          style={{
            width: '100%',
            padding: '14px 0',
            fontSize: 17,
            fontWeight: 'bold',
            backgroundColor: '#ff9800',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            cursor: busy ? 'default' : 'pointer',
            opacity: busy && busy !== 'buy' ? 0.6 : 1,
          }}
        >
          {busy === 'buy' ? ui.paywallBuying : `${ui.paywallBuy} — ${priceLabel ?? ui.paywallPriceFallback}`}
        </button>

        <button
          onClick={() => run('restore')}
          disabled={busy !== null}
          style={{
            width: '100%',
            padding: '10px 0',
            marginTop: 10,
            fontSize: 14,
            fontWeight: 'bold',
            backgroundColor: 'transparent',
            color: '#ffd54f',
            border: '1px solid #ffd54f',
            borderRadius: 10,
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {busy === 'restore' ? ui.paywallRestoring : ui.paywallRestore}
        </button>

        <button
          onClick={() => closePaywall()}
          disabled={busy !== null}
          style={{
            width: '100%',
            padding: '10px 0',
            marginTop: 6,
            fontSize: 13,
            backgroundColor: 'transparent',
            color: '#888',
            border: 'none',
            cursor: busy ? 'default' : 'pointer',
          }}
        >
          {ui.paywallLater}
        </button>

        <p style={{ margin: '14px 0 0', textAlign: 'center', color: '#6f6f8a', fontSize: 12 }}>
          {ui.paywallFooter}
        </p>
      </div>
    </div>
  );
}
