import { useCallback } from 'react';
import type { BoardCell, PremiumType } from '../types/index.ts';
import { BOARD_SIZE } from '../types/index.ts';
import { useGameStore } from '../store/gameStore.ts';

const GAP = 2;

const PREMIUM_COLORS: Record<PremiumType, string> = {
  DOUBLE_LETTER: '#a8d8ea',
  TRIPLE_LETTER: '#2196f3',
  DOUBLE_WORD: '#f48fb1',
  TRIPLE_WORD: '#e53935',
  GEM_FORGE: '#66bb6a',
  VOID: '#1a1a2e',
  CENTER: '#ffd54f',
};

const PREMIUM_LABELS: Record<PremiumType, string> = {
  DOUBLE_LETTER: 'DL',
  TRIPLE_LETTER: 'TL',
  DOUBLE_WORD: 'DW',
  TRIPLE_WORD: 'TW',
  GEM_FORGE: 'GF',
  VOID: '',
  CENTER: '★',
};

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
  onClick: (row: number, col: number) => void;
}

function Cell({ cell, isPending, onClick }: CellProps) {
  const handleClick = useCallback(() => {
    onClick(cell.row, cell.col);
  }, [cell.row, cell.col, onClick]);

  const isVoid = cell.premiumType === 'VOID';
  const hasTile = cell.tile !== null;
  // Tiles the NPC committed are flagged with ownerId 'enemy' (see enemyTurn).
  const isEnemy = hasTile && cell.tile!.ownerId === 'enemy';

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

  return (
    <div
      data-cell-row={isDropTarget ? cell.row : undefined}
      data-cell-col={isDropTarget ? cell.col : undefined}
      style={{
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
        fontSize: hasTile ? 'calc(var(--tile-size) * 0.55)' : 'calc(var(--tile-size) * 0.28)',
        fontWeight: hasTile ? 'bold' : 'normal',
        color: hasTile ? (isEnemy ? '#ede9ff' : '#1a1a2e') : '#8888aa',
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
      onClick={isPending ? handleClick : undefined}
    >
      {hasTile ? (
        <>
          {cell.tile!.letter}
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
        PREMIUM_LABELS[cell.premiumType]
      ) : null}
    </div>
  );
}

export function GameBoard() {
  const grid = useGameStore(s => s.grid);
  const pendingTiles = useGameStore(s => s.pendingTiles);
  const removePendingTile = useGameStore(s => s.removePendingTile);

  const pendingSet = new Set(pendingTiles.map(p => `${p.row},${p.col}`));

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
      }}
    >
      {grid.flat().map(cell => (
        <Cell
          key={`${cell.row}-${cell.col}`}
          cell={cell}
          isPending={pendingSet.has(`${cell.row},${cell.col}`)}
          onClick={handleCellClick}
        />
      ))}
    </div>
  );
}
