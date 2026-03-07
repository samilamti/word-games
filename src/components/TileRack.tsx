import { useCallback } from 'react';
import type { Tile } from '../types/index.ts';
import { useGameStore } from '../store/gameStore.ts';

const TILE_SIZE = 48;

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

interface RackTileProps {
  tile: Tile;
  onTap: (tile: Tile) => void;
}

function RackTile({ tile, onTap }: RackTileProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', tile.id);
      // Store tile reference for drop handler
      (window as unknown as { __dragTile?: Tile }).__dragTile = tile;
    },
    [tile],
  );

  const handleClick = useCallback(() => {
    onTap(tile);
  }, [tile, onTap]);

  const tier = getTierForPoints(tile.pointValue);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={handleClick}
      style={{
        width: TILE_SIZE,
        height: TILE_SIZE,
        backgroundColor: TIER_COLORS[tier],
        border: '2px solid #8d6e63',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab',
        position: 'relative',
        fontSize: 22,
        fontWeight: 'bold',
        color: '#1a1a2e',
        userSelect: 'none',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        transition: 'transform 0.1s',
      }}
      onMouseDown={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1.05)';
      }}
      onMouseUp={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'scale(1)';
      }}
    >
      {tile.isWild ? '?' : tile.letter}
      <span
        style={{
          position: 'absolute',
          bottom: 2,
          right: 4,
          fontSize: 10,
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
        minHeight: TILE_SIZE + 24,
        opacity: phase === 'playing' ? 1 : 0.6,
      }}
    >
      {rack.length === 0 ? (
        <div style={{ color: '#888', alignSelf: 'center', fontSize: 14 }}>
          No tiles in rack
        </div>
      ) : (
        rack.map(tile => <RackTile key={tile.id} tile={tile} onTap={tapPlaceTile} />)
      )}
    </div>
  );
}
