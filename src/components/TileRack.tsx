import { useCallback, useRef } from 'react';
import type { Tile } from '../types/index.ts';
import { useGameStore } from '../store/gameStore.ts';

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

// Pixels of pointer movement required before a tap turns into a drag.
const DRAG_THRESHOLD = 6;

// Locates a board cell under a screen-space point. The GameBoard tags each
// cell with data-cell-row / data-cell-col attributes (see GameBoard.tsx).
function findDropCell(x: number, y: number): { row: number; col: number } | null {
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const cell = (el as HTMLElement).closest<HTMLElement>('[data-cell-row][data-cell-col]');
  if (!cell) return null;
  const row = Number(cell.dataset.cellRow);
  const col = Number(cell.dataset.cellCol);
  if (Number.isNaN(row) || Number.isNaN(col)) return null;
  return { row, col };
}

interface RackTileProps {
  tile: Tile;
  onTap: (tile: Tile) => void;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: (tileId: string) => void;
}

function RackTile({ tile, onTap, selectable, selected, onToggleSelect }: RackTileProps) {
  const placePendingTile = useGameStore(s => s.placePendingTile);
  const elRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // Ignore right-click / non-primary mouse buttons. Touch and pen pointers
      // report button=0.
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      // In exchange mode a press toggles the tile's swap selection — no
      // drag-to-board and no tap-to-place.
      if (selectable) {
        e.preventDefault();
        onToggleSelect(tile.id);
        return;
      }

      // Prevent the browser from interpreting the touch as a pan/scroll/zoom
      // gesture mid-drag. Combined with touch-action: none on the element,
      // this gives us full control.
      e.preventDefault();

      const sourceEl = e.currentTarget;
      const pointerId = e.pointerId;
      const startX = e.clientX;
      const startY = e.clientY;
      let dragging = false;
      let ghost: HTMLDivElement | null = null;
      const sourceRect = sourceEl.getBoundingClientRect();

      sourceEl.style.transform = 'scale(1.05)';

      const positionGhost = (clientX: number, clientY: number) => {
        if (!ghost) return;
        // Center the ghost on the pointer. clientX/Y are viewport coords;
        // position:fixed + translate handles that natively.
        ghost.style.transform = `translate(${clientX - sourceRect.width / 2}px, ${clientY - sourceRect.height / 2}px) scale(1.2)`;
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!dragging && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
          // First time we've crossed the threshold — promote to drag.
          dragging = true;
          ghost = sourceEl.cloneNode(true) as HTMLDivElement;
          ghost.style.position = 'fixed';
          ghost.style.top = '0';
          ghost.style.left = '0';
          ghost.style.width = `${sourceRect.width}px`;
          ghost.style.height = `${sourceRect.height}px`;
          ghost.style.zIndex = '1000';
          ghost.style.pointerEvents = 'none';
          ghost.style.opacity = '0.95';
          ghost.style.transition = 'none';
          ghost.style.boxShadow = '0 8px 20px rgba(0,0,0,0.55)';
          document.body.appendChild(ghost);
          sourceEl.style.opacity = '0.3';
        }

        if (dragging) positionGhost(ev.clientX, ev.clientY);
      };

      const cleanup = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onCancel);
        sourceEl.style.transform = 'scale(1)';
        sourceEl.style.opacity = '1';
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cleanup();

        if (dragging && ghost) {
          // Hide ghost before elementFromPoint, otherwise it would be the
          // topmost element under the pointer.
          ghost.style.display = 'none';
          const target = findDropCell(ev.clientX, ev.clientY);
          ghost.remove();
          ghost = null;
          if (target) placePendingTile(tile, target.row, target.col);
        } else {
          onTap(tile);
        }
      };

      const onCancel = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        cleanup();
        if (ghost) {
          ghost.remove();
          ghost = null;
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onCancel);
    },
    [tile, onTap, placePendingTile, selectable, onToggleSelect],
  );

  const tier = getTierForPoints(tile.pointValue);

  return (
    <div
      ref={elRef}
      onPointerDown={handlePointerDown}
      style={{
        width: 'var(--rack-tile-size)',
        height: 'var(--rack-tile-size)',
        backgroundColor: TIER_COLORS[tier],
        border: selected ? '3px solid #29b6f6' : '2px solid #8d6e63',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: selectable ? 'pointer' : 'grab',
        position: 'relative',
        fontSize: 'calc(var(--rack-tile-size) * 0.46)',
        fontWeight: 'bold',
        color: '#1a1a2e',
        userSelect: 'none',
        boxShadow: selected ? '0 0 10px rgba(41,182,246,0.7)' : '0 2px 4px rgba(0,0,0,0.3)',
        transform: selected ? 'translateY(-6px)' : undefined,
        opacity: selectable && !selected ? 0.55 : 1,
        transition: 'transform 0.1s, opacity 0.1s',
        touchAction: 'none', // critical: lets us own touch gestures
      }}
    >
      {tile.isWild ? '?' : tile.letter}
      <span
        style={{
          position: 'absolute',
          bottom: 2,
          right: 4,
          fontSize: 'calc(var(--rack-tile-size) * 0.22)',
          color: '#666',
        }}
      >
        {tile.pointValue}
      </span>
    </div>
  );
}

export function TileRack() {
  const rack = useGameStore(s => s.rack);
  const phase = useGameStore(s => s.phase);
  const tapPlaceTile = useGameStore(s => s.tapPlaceTile);
  const exchangeMode = useGameStore(s => s.exchangeMode);
  const selectedForSwap = useGameStore(s => s.selectedForSwap);
  const toggleSwapSelection = useGameStore(s => s.toggleSwapSelection);

  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: '12px 16px',
        backgroundColor: '#2d2d44',
        borderRadius: 8,
        border: '2px solid #3a3a5c',
        justifyContent: 'center',
        minHeight: 'calc(var(--rack-tile-size) + 24px)',
        opacity: phase === 'playing' ? 1 : 0.6,
        flexWrap: 'wrap',
      }}
    >
      {rack.length === 0 ? (
        <div style={{ color: '#888', alignSelf: 'center', fontSize: 14 }}>
          No tiles in rack
        </div>
      ) : (
        rack.map(tile => (
          <RackTile
            key={tile.id}
            tile={tile}
            onTap={tapPlaceTile}
            selectable={exchangeMode}
            selected={selectedForSwap.includes(tile.id)}
            onToggleSelect={toggleSwapSelection}
          />
        ))
      )}
    </div>
  );
}
