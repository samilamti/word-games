import { useCallback, useMemo } from 'react';
import type { CSSProperties } from 'react';
import type { BoardCell } from '../types/index.ts';
import { BOARD_SIZE } from '../types/index.ts';
import { useGameStore } from '../store/gameStore.ts';
import { useSettingsStore } from '../store/settingsStore.ts';
import { useUI } from '../i18n/useUI.ts';
import type { UIStrings } from '../i18n/locales.ts';
import { PremiumMarker, PREMIUM_COLORS, premiumLabel } from './PremiumMarker.tsx';

const GAP = 2;

const TIER_COLORS: Record<string, string> = {
  common: '#f5e6c8',
  uncommon: '#c8e6c9',
  rare: '#bbdefb',
  legendary: '#e1bee7',
};

function getTierForPoints(points: number): string {
  if (points <= 1) return 'common';
  if (points <= 1.5) return 'uncommon';
  if (points <= 2.5) return 'rare';
  return 'legendary';
}

interface CellProps {
  cell: BoardCell;
  isPending: boolean;
  /** Stagger index for the tile-drop tumble (set only for freshly-placed
   *  enemy tiles when reduce-motion is off); undefined = no drop animation. */
  dropIndex?: number;
  onClick: (row: number, col: number) => void;
  /** Localized aria-label for the blank/wild tile marker. */
  blankTileLabel: string;
  /** Full string table, for the premium markers' accessible names. */
  ui: UIStrings;
}

function Cell({ cell, isPending, dropIndex, onClick, blankTileLabel, ui }: CellProps) {
  const handleClick = useCallback(() => {
    onClick(cell.row, cell.col);
  }, [cell.row, cell.col, onClick]);

  const isVoid = cell.premiumType === 'VOID';
  const hasTile = cell.tile !== null;
  // Tiles the NPC committed are flagged with ownerId 'enemy' (see enemyTurn).
  const isEnemy = hasTile && cell.tile!.ownerId === 'enemy';
  const isWild = hasTile && cell.tile!.isWild;

  let bgColor = '#2d2d44';
  if (isVoid) {
    bgColor = PREMIUM_COLORS.VOID;
  } else if (cell.premiumType && !hasTile) {
    bgColor = PREMIUM_COLORS[cell.premiumType];
  }

  const tileBg = hasTile
    ? isPending
      ? '#fff3e0'
      : isEnemy
        ? '#3f3a6e'
        : getTierForPoints(cell.tile!.pointValue) === 'common'
          ? '#f5e6c8'
          : TIER_COLORS[getTierForPoints(cell.tile!.pointValue)]
    : undefined;

  // Drop targets: empty, non-void cells. The TileRack uses elementFromPoint +
  // closest('[data-cell-row][data-cell-col]') to find the cell under the
  // pointer at drop time.
  const isDropTarget = !isVoid && !hasTile;

  const cellStyle: CSSProperties = {
    width: 'var(--tile-size)',
    height: 'var(--tile-size)',
    backgroundColor: hasTile ? tileBg : bgColor,
    border: isPending
      ? '2px solid #ff9800'
      : isEnemy
        ? '2px solid #7e6bd6'
        : '1px solid #3a3a5c',
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: isVoid ? 'not-allowed' : hasTile && isPending ? 'pointer' : 'default',
    position: 'relative',
    // Empty cells no longer carry text of their own — PremiumMarker owns its
    // own typography so the glyph stays legible down to a 20px tile.
    fontSize: hasTile ? 'calc(var(--tile-size) * 0.55)' : undefined,
    fontWeight: hasTile ? 'bold' : 'normal',
    color: hasTile ? (isEnemy ? '#ede9ff' : '#1a1a2e') : undefined,
    userSelect: 'none',
    boxSizing: 'border-box',
  };
  // Drive the staggered tumble via a CSS custom property (see index.css
  // .tile-drop-in). Cast because CSSProperties has no index signature for vars.
  if (dropIndex !== undefined) {
    (cellStyle as Record<string, string | number>)['--drop-index'] = dropIndex;
  }

  return (
    <div
      data-cell-row={isDropTarget ? cell.row : undefined}
      data-cell-col={isDropTarget ? cell.col : undefined}
      className={dropIndex !== undefined ? 'tile-drop-in' : undefined}
      style={cellStyle}
      onClick={isPending ? handleClick : undefined}
    >
      {hasTile ? (
        <>
          <span style={{ fontStyle: isWild ? 'italic' : 'normal' }}>{cell.tile!.letter}</span>
          {isWild && (
            <span
              aria-label={blankTileLabel}
              style={{
                position: 'absolute',
                top: 1,
                left: 3,
                fontSize: 'calc(var(--tile-size) * 0.3)',
                lineHeight: 1,
                color: isEnemy ? '#b9aef0' : '#7e6bd6',
              }}
            >
              •
            </span>
          )}
          <span
            style={{
              position: 'absolute',
              bottom: 1,
              right: 3,
              fontSize: 'calc(var(--tile-size) * 0.26)',
              color: isEnemy ? '#b9aef0' : '#666',
            }}
          >
            {cell.tile!.pointValue}
          </span>
        </>
      ) : !isVoid && cell.premiumType ? (
        <PremiumMarker type={cell.premiumType} label={premiumLabel(cell.premiumType, ui)} />
      ) : null}
    </div>
  );
}

export function GameBoard() {
  const grid = useGameStore(s => s.grid);
  const pendingTiles = useGameStore(s => s.pendingTiles);
  const removePendingTile = useGameStore(s => s.removePendingTile);
  const lastEnemyDropTurn = useGameStore(s => s.lastEnemyDropTurn);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const ui = useUI();

  const pendingSet = new Set(pendingTiles.map(p => `${p.row},${p.col}`));

  // Stagger index per "row,col" for the enemy tiles placed on the most recent
  // enemy turn, so they tumble in reading order (top-left first). Null when
  // reduce-motion is on or there's nothing fresh to drop — which leaves the
  // .tile-drop-in class off, so re-renders never re-trigger the animation.
  const dropIndices = useMemo(() => {
    if (reduceMotion || lastEnemyDropTurn <= 0) return null;
    const fresh = grid
      .flat()
      .filter(c => c.tile?.ownerId === 'enemy' && c.tile.turnPlaced === lastEnemyDropTurn);
    if (fresh.length === 0) return null;
    fresh.sort((a, b) => a.row - b.row || a.col - b.col);
    const m = new Map<string, number>();
    fresh.forEach((c, i) => m.set(`${c.row},${c.col}`, i));
    return m;
  }, [grid, lastEnemyDropTurn, reduceMotion]);

  // Single-tap on a pending board tile returns it to the rack.
  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (pendingSet.has(`${row},${col}`)) {
        removePendingTile(row, col);
      }
    },
    [pendingSet, removePendingTile],
  );

  return (
    <div
      style={{
        display: 'inline-grid',
        gridTemplateColumns: `repeat(${BOARD_SIZE}, var(--tile-size))`,
        gap: GAP,
        padding: GAP,
        backgroundColor: '#16162a',
        borderRadius: 6,
        border: '2px solid #3a3a5c',
        // Establishes the 3D space so dropping tiles' rotateX reads as depth.
        perspective: 700,
      }}
    >
      {grid.flat().map(cell => (
        <Cell
          key={`${cell.row}-${cell.col}`}
          cell={cell}
          isPending={pendingSet.has(`${cell.row},${cell.col}`)}
          dropIndex={dropIndices?.get(`${cell.row},${cell.col}`)}
          onClick={handleCellClick}
          blankTileLabel={ui.blankTile}
          ui={ui}
        />
      ))}
    </div>
  );
}
