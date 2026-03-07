import type { Tile } from '../types/index.ts';
import { LETTER_DISTRIBUTION, WILD_TILE_COUNT } from '../types/index.ts';

let nextTileId = 1;

function createTileId(): string {
  return `tile_${nextTileId++}`;
}

export function createTile(letter: string, pointValue: number, isWild = false): Tile {
  return {
    id: createTileId(),
    letter,
    pointValue,
    tileType: 'STANDARD',
    isWild,
    ownerId: '',
    turnPlaced: 0,
  };
}

export class TileBag {
  private tiles: Tile[] = [];

  constructor() {
    this.fill();
  }

  private fill(): void {
    for (const def of LETTER_DISTRIBUTION) {
      for (let i = 0; i < def.count; i++) {
        this.tiles.push(createTile(def.letter, def.points));
      }
    }
    for (let i = 0; i < WILD_TILE_COUNT; i++) {
      this.tiles.push(createTile('*', 0, true));
    }
    this.shuffle();
  }

  private shuffle(): void {
    for (let i = this.tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.tiles[i], this.tiles[j]] = [this.tiles[j], this.tiles[i]];
    }
  }

  draw(count: number): Tile[] {
    const drawn: Tile[] = [];
    for (let i = 0; i < count && this.tiles.length > 0; i++) {
      drawn.push(this.tiles.pop()!);
    }
    return drawn;
  }

  returnTiles(tiles: Tile[]): void {
    this.tiles.push(...tiles);
    this.shuffle();
  }

  get remaining(): number {
    return this.tiles.length;
  }

  get isEmpty(): boolean {
    return this.tiles.length === 0;
  }
}
