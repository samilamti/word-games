import { useCallback } from 'react';
import type { BoardCell, PremiumType, Tile } from '../types/index.ts';
import { BOARD_SIZE } from '../types/index.ts';
import { useGameStore } from '../store/gameStore.ts';

const CELL_SIZE = 40;
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
  CENTER: '\u2605',
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
  onDrop: (row: number, col: number) => void;
  onClick: (row: number, col: number) => void;
}

function Cell({ cell, isPending, onDrop, onClick }: CellProps) {
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onDrop(cell.row, cell.col);
    },
    [cell.row, cell.col, onDrop],
  );

  const handleClick = useCallback(() => {
    onClick(cell.row, cell.col);
  }, [cell.row, cell.col, onClick]);

  const isVoid = cell.premiumType === 'VOID';
  const hasTile = cell.tile !== null;

  let bgColor = '#2d2d44';
  if (isVoid) {
    bgColor = PREMIUM_COLORS.VOID;
  } else if (cell.premiumType && !hasTile) {
    bgColor = PREMIUM_COLORS[cell.premiumType];
  }

  const tileBg = hasTile
    ? isPending
      ? '#fff3e0'
      : getTierForPoints(cell.tile!.pointValue) === 'common'
        ? '#f5e6c8'
        : TIER_COLORS[getTierForPoints(cell.tile!.pointValue)]
    : undefined;

  return (
    <div
      style={{
        width: CELL_SIZE,
        height: CELL_SIZE,
        backgroundColor: hasTile ? tileBg : bgColor,
        border: isPending ? '2px solid #ff9800' : '1px solid #3a3a5c',
        borderRadius: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: isVoid ? 'not-allowed' : hasTile && isPending ? 'pointer' : 'default',
        position: 'relative',
        fontSize: hasTile ? 16 : 9,
        fontWeight: hasTile ? 'bold' : 'normal',
        color: hasTile ? '#1a1a2e' : '#8888aa',
        userSelect: 'none',
        boxSizing: 'border-box',
      }}
      onDragOver={!isVoid && !hasTile ? handleDragOver : undefined}
      onDrop={!isVoid && !hasTile ? handleDrop : undefined}
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
              fontSize: 8,
              color: '#666',
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
  const placePendingTile = useGameStore(s => s.placePendingTile);
  const removePendingTile = useGameStore(s => s.removePendingTile);
  const phase = useGameStore(s => s.phase);

  const pendingSet = new Set(pendingTiles.map(p => `${p.row},${p.col}`));

  const handleDrop = useCallback(
    (row: number, col: number) => {
      if (phase !== 'playing') return;
      // Get the dragged tile data
      const dragData = (window as unknown as { __dragTile?: Tile }).__dragTile;
      if (dragData) {
        placePendingTile(dragData, row, col);
        (window as unknown as { __dragTile?: Tile }).__dragTile = undefined;
      }
    },
    [placePendingTile, phase],
  );

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
        gridTemplateColumns: `repeat(${BOARD_SIZE}, ${CELL_SIZE}px)`,
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
          onDrop={handleDrop}
          onClick={handleCellClick}
        />
      ))}
    </div>
  );
}
