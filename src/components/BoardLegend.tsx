import type { PremiumType } from '../types/index.ts';
import { useUI } from '../i18n/useUI.ts';
import { PremiumMarker, PREMIUM_COLORS, premiumLabel } from './PremiumMarker.tsx';

/** Reading order: letter multipliers, then word multipliers, then the specials.
 *  VOID is included because a blocked square is the one marking a player can't
 *  work out by experiment — tiles simply refuse to land there. */
const LEGEND_ORDER: PremiumType[] = [
  'DOUBLE_LETTER',
  'TRIPLE_LETTER',
  'GEM_FORGE',
  'DOUBLE_WORD',
  'TRIPLE_WORD',
  'CENTER',
  'VOID',
];

const SWATCH_PX = 30;

/** The key to the board's markings, rendered from the same component the board
 *  itself uses — so the legend can never drift out of sync with the squares. */
export function BoardLegend() {
  const ui = useUI();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {LEGEND_ORDER.map(type => (
        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: SWATCH_PX,
              height: SWATCH_PX,
              flexShrink: 0,
              borderRadius: 3,
              border: '1px solid #3a3a5c',
              backgroundColor: PREMIUM_COLORS[type],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <PremiumMarker type={type} label={premiumLabel(type, ui)} size={SWATCH_PX} />
          </span>
          <span style={{ fontSize: 14, color: '#e0e0e0' }}>{premiumLabel(type, ui)}</span>
        </div>
      ))}
    </div>
  );
}
