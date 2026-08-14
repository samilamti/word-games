import type { CSSProperties } from 'react';
import type { PremiumType } from '../types/index.ts';
import type { UIStrings } from '../i18n/locales.ts';

/** Cell background per premium type. Cool hues mark letter multipliers and warm
 *  hues mark word multipliers — the Scrabble convention, kept so lapsed players
 *  read the board at a glance. */
export const PREMIUM_COLORS: Record<PremiumType, string> = {
  DOUBLE_LETTER: '#a8d8ea',
  TRIPLE_LETTER: '#2196f3',
  DOUBLE_WORD: '#f48fb1',
  TRIPLE_WORD: '#e53935',
  GEM_FORGE: '#66bb6a',
  VOID: '#1a1a2e',
  CENTER: '#ffd54f',
};

/** Glyph color per type. Each is picked for contrast against its own background:
 *  dark ink on the light fills, white on the saturated ones. The old shared grey
 *  (#8888aa) failed against nearly all of them. */
export const PREMIUM_TEXT_COLORS: Record<PremiumType, string> = {
  DOUBLE_LETTER: '#14324a',
  TRIPLE_LETTER: '#ffffff',
  DOUBLE_WORD: '#6a0f2f',
  TRIPLE_WORD: '#ffffff',
  GEM_FORGE: '#0e3312',
  VOID: 'transparent',
  CENTER: '#1a1a2e',
};

/** The mark drawn on an empty premium cell. Beta players could not decode the
 *  old letter codes (DL/TL/DW/TW), so magnitude is now shown as a plain "×N"
 *  that needs no translation, and scope is carried by three redundant cues:
 *  the colour family, the underline bar on word multipliers, and the hint toast
 *  that fires when a tile lands here. */
const PREMIUM_GLYPHS: Record<PremiumType, string> = {
  DOUBLE_LETTER: '×2',
  TRIPLE_LETTER: '×3',
  DOUBLE_WORD: '×2',
  TRIPLE_WORD: '×3',
  // Scores exactly like a double-letter square today; the green fill and the
  // legend carry the flavour rather than an opaque "GF".
  GEM_FORGE: '×2',
  VOID: '',
  // The star reads as "start here" in every language; its word-doubling is
  // taught in the legend and the hint toast instead of crowding the cell.
  CENTER: '★',
};

/** Word multipliers apply to everything you spell, so they get heavier type and
 *  an underline bar; letter multipliers get the plain number. */
const WORD_SCOPE: Record<PremiumType, boolean> = {
  DOUBLE_LETTER: false,
  TRIPLE_LETTER: false,
  DOUBLE_WORD: true,
  TRIPLE_WORD: true,
  GEM_FORGE: false,
  VOID: false,
  // CENTER doubles the word too, but it is drawn as a star, and stacking a bar
  // under a star just reads as noise.
  CENTER: false,
};

/** i18n key per type, so the aria-label, the legend row and the hint toast all
 *  share one translation. */
const PREMIUM_LABEL_KEYS: Record<PremiumType, keyof UIStrings> = {
  DOUBLE_LETTER: 'premiumDoubleLetter',
  TRIPLE_LETTER: 'premiumTripleLetter',
  DOUBLE_WORD: 'premiumDoubleWord',
  TRIPLE_WORD: 'premiumTripleWord',
  GEM_FORGE: 'premiumGemForge',
  CENTER: 'premiumCenter',
  VOID: 'premiumVoid',
};

export function premiumLabel(type: PremiumType, ui: UIStrings): string {
  return ui[PREMIUM_LABEL_KEYS[type]];
}

interface PremiumMarkerProps {
  type: PremiumType;
  /** Localized description, used as the accessible name. */
  label: string;
  /** Override the cell-relative sizing — the legend renders markers at a fixed
   *  pixel size, away from the board's --tile-size. */
  size?: number;
}

export function PremiumMarker({ type, label, size }: PremiumMarkerProps) {
  const glyph = PREMIUM_GLYPHS[type];
  if (!glyph) return null;

  const isWordScope = WORD_SCOPE[type];
  const color = PREMIUM_TEXT_COLORS[type];
  // Word multipliers sit a touch larger than letter ones; the star larger still.
  const scale = type === 'CENTER' ? 0.5 : isWordScope ? 0.46 : 0.4;
  const unit = size !== undefined ? `${size}px` : 'var(--tile-size)';
  const fontSize = `calc(${unit} * ${scale})`;

  const wrap: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    // The cell owns the click target; the mark must never eat a tile drop.
    pointerEvents: 'none',
  };

  return (
    <span style={wrap} role="img" aria-label={label}>
      <span
        style={{
          fontSize,
          fontWeight: isWordScope ? 900 : 800,
          color,
          letterSpacing: '-0.02em',
        }}
      >
        {glyph}
      </span>
      {isWordScope && (
        <span
          aria-hidden="true"
          style={{
            width: '60%',
            height: `max(2px, calc(${unit} * 0.08))`,
            marginTop: `calc(${unit} * 0.05)`,
            borderRadius: 1,
            backgroundColor: color,
          }}
        />
      )}
    </span>
  );
}
