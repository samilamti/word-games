import { useState } from 'react';
import { useGameStore } from '../store/gameStore.ts';
import { useUI } from '../i18n/useUI.ts';
import { PREMIUM_COLORS, PREMIUM_TEXT_COLORS, premiumLabel } from './PremiumMarker.tsx';

/** Names the multiplier under the tile the player just placed ("Word ×2").
 *
 *  The board's own markings are deliberately terse, so this is where the
 *  notation gets taught: right at the moment a player acts on it, and only when
 *  it actually matters. Derived entirely from `pendingTiles` — no store field,
 *  no timer. Timing lives in the CSS keyframe (see index.css `premiumHint`),
 *  which the tile-drop work established as the reliable pattern here. */
export function PremiumHintToast() {
  const pendingTiles = useGameStore(s => s.pendingTiles);
  const grid = useGameStore(s => s.grid);
  const ui = useUI();
  // Tracks the placement whose hint has already played out, so a recalled tile
  // or an unrelated re-render can't replay it.
  const [dismissed, setDismissed] = useState<string | null>(null);

  const last = pendingTiles[pendingTiles.length - 1];
  if (!last) return null;

  const cell = grid[last.row]?.[last.col];
  const premium = cell?.premiumType;
  // Spent squares no longer multiply anything, so announcing them would be a lie.
  if (!premium || premium === 'VOID' || cell.premiumUsed) return null;

  const key = `${last.row},${last.col}`;
  if (dismissed === key) return null;

  return (
    <div
      key={key}
      onAnimationEnd={() => setDismissed(key)}
      style={{
        position: 'absolute',
        top: 6,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 5,
        pointerEvents: 'none',
        padding: '4px 12px',
        borderRadius: 999,
        whiteSpace: 'nowrap',
        fontSize: 13,
        fontWeight: 700,
        // Reuse the marker's per-type ink so the pill inherits the same
        // contrast decisions as the square it is describing.
        color: PREMIUM_TEXT_COLORS[premium],
        backgroundColor: PREMIUM_COLORS[premium],
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5)',
        animation: 'premiumHint 1.6s ease-out forwards',
        opacity: 0,
      }}
    >
      {premiumLabel(premium, ui)}
    </div>
  );
}
