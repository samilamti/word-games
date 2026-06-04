import { create } from 'zustand';
import type { BoardCell, Tile, CombatEvent, Direction } from '../types/index.ts';
import { BOARD_SIZE, RACK_SIZE } from '../types/index.ts';
import { ENEMY_CATALOG } from '../types/enemies.ts';
import type { EnemyType } from '../types/enemies.ts';
import { saveDispute } from '../beta/feedbackService.ts';
import { LOCALES, detectLocale, getStoredLocale, setStoredLocale } from '../i18n/locales.ts';
import type { LocaleCode } from '../i18n/locales.ts';

function genEventId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
import { createEmptyBoard, placeTile, removeTile, validatePlacement, resolveFormedWords } from '../engine/BoardState.ts';
import { TileBag } from '../engine/TileBag.ts';
import { getValidator } from '../engine/WordValidator.ts';
import { calculatePlacementDamage } from '../engine/ScoreCalculator.ts';
import type { ScoreBreakdown } from '../engine/ScoreCalculator.ts';
import { findBestNpcMove } from '../engine/NpcWordAI.ts';

export type GamePhase = 'loading' | 'playing' | 'enemy_turn' | 'victory' | 'defeat';

export interface EnemyState {
  type: EnemyType;
  name: string;
  maxHp: number;
  hp: number;
  attack: number;
  defense: number;
  spriteUrl: string;
  tagline: string;
  damageMultiplier: number;
  pickRank: number;
}

interface PendingTile {
  tile: Tile;
  row: number;
  col: number;
}

interface RejectionContext {
  word: string;
  formedWords: { text: string; cells: [number, number][]; direction: Direction }[];
  placedCells: [number, number][];
}

/** The outcome of an enemy turn, held back so the tile-drop juice can play
 *  before the attack lands. enemyTurn() commits the NPC's tiles to the board
 *  (triggering the DOM tumble) and stashes this; the drop controller in Game
 *  calls resolveEnemyAttack() once the tiles have settled, applying the damage
 *  and queueing the attack/hurt animations. */
interface PendingEnemyTurn {
  playerHp: number;
  phase: GamePhase;
  events: CombatEvent[];
}

export interface GameState {
  // Board
  grid: BoardCell[][];
  tileBag: TileBag;
  // NPC opponent's private draw pool + rack. The board is shared (both place
  // onto `grid`), but the bags are separate so neither side starves the other
  // and the HUD's "tiles left" stays an honest player resource.
  npcBag: TileBag;
  npcRack: Tile[];

  // Player
  rack: Tile[];
  playerHp: number;
  playerMaxHp: number;
  playerAttack: number;
  playerDefense: number;

  // Enemy
  enemy: EnemyState | null;
  enemyIndex: number;
  /** Timestamp of the most recent enemy-spawn event. Toast component watches
   *  this to fire the volatile "A wild X appears!" notice without baking the
   *  message into the long-lived `message` field (which would expand the HUD). */
  enemyAppearAt: number;

  // Leaderboard tracking (current run; reset on initGame, recorded on victory)
  runDamageTotal: number;
  runHighestHit: number;
  runLongestWord: string;

  // Game Center identity (set after GKLocalPlayer.authenticate succeeds in
  // the native build; remains null on web and when the user declines
  // Game Center sign-in)
  playerAlias: string | null;

  // Current language (drives tile distribution + dictionary + UI strings)
  locale: LocaleCode;

  // Turn state
  phase: GamePhase;
  turnNumber: number;
  pendingTiles: PendingTile[];
  lastScore: ScoreBreakdown | null;
  message: string;

  // Tile-exchange selection UI (player forgo/swap)
  exchangeMode: boolean;
  selectedForSwap: string[]; // tile ids marked to swap

  // Combat animation events
  combatEvents: CombatEvent[];

  // Tile-drop juice: the turn number whose freshly-placed enemy tiles should
  // tumble in (GameBoard animates tiles matching this). 0 = nothing to drop.
  lastEnemyDropTurn: number;
  // Deferred enemy-attack outcome, applied by resolveEnemyAttack after the
  // tiles land. Null when there's no pending attack.
  pendingEnemyTurn: PendingEnemyTurn | null;

  // Dictionary loaded
  dictionaryLoaded: boolean;

  // Beta: word dispute tracking
  lastRejection: RejectionContext | null;

  // Actions
  initGame: (enemyIndex?: number) => void;
  nextEnemy: () => void;
  setDictionaryLoaded: (loaded: boolean) => void;
  setPlayerAlias: (alias: string | null) => void;
  setLocale: (locale: LocaleCode) => void;
  placePendingTile: (tile: Tile, row: number, col: number) => boolean;
  tapPlaceTile: (tile: Tile) => boolean;
  removePendingTile: (row: number, col: number) => void;
  returnPendingToRack: () => void;
  submitWord: () => { success: boolean; damage: number; error?: string };
  disputeWord: (definition: string) => { success: boolean; damage: number };
  swapTiles: (tilesToSwap: Tile[]) => void;
  toggleExchangeMode: () => void;
  toggleSwapSelection: (tileId: string) => void;
  clearSwapSelection: () => void;
  enemyTurn: () => void;
  resolveEnemyAttack: () => void;
  drawTiles: () => void;
  setMessage: (msg: string) => void;
  consumeCombatEvent: (id: string) => void;
}

const initialLocale: LocaleCode = getStoredLocale() ?? detectLocale();

export const useGameStore = create<GameState>((set, get) => ({
  grid: createEmptyBoard(),
  tileBag: new TileBag(LOCALES[initialLocale]),
  npcBag: new TileBag(LOCALES[initialLocale]),
  npcRack: [],
  rack: [],
  playerHp: 100,
  playerMaxHp: 100,
  playerAttack: 0,
  playerDefense: 0,
  enemy: null,
  enemyIndex: 0,
  enemyAppearAt: 0,
  runDamageTotal: 0,
  runHighestHit: 0,
  runLongestWord: '',
  playerAlias: null,
  locale: initialLocale,
  phase: 'loading',
  turnNumber: 1,
  pendingTiles: [],
  exchangeMode: false,
  selectedForSwap: [],
  lastScore: null,
  combatEvents: [],
  lastEnemyDropTurn: 0,
  pendingEnemyTurn: null,
  message: 'Loading dictionary...',
  dictionaryLoaded: false,
  lastRejection: null,

  initGame: (enemyIndex = 0) => {
    const idx = Math.max(0, Math.min(ENEMY_CATALOG.length - 1, enemyIndex));
    const def = ENEMY_CATALOG[idx];
    const enemy: EnemyState = {
      type: def.type,
      name: def.name,
      maxHp: def.maxHp,
      hp: def.maxHp,
      attack: def.attack,
      defense: def.defense,
      spriteUrl: def.spriteUrl,
      tagline: def.tagline,
      damageMultiplier: def.damageMultiplier,
      pickRank: def.pickRank,
    };
    const tileBag = new TileBag(LOCALES[get().locale]);
    const rack = tileBag.draw(RACK_SIZE);
    const npcBag = new TileBag(LOCALES[get().locale]);
    const npcRack = npcBag.draw(RACK_SIZE);
    set({
      grid: createEmptyBoard(),
      tileBag,
      npcBag,
      npcRack,
      rack,
      playerHp: 100,
      playerMaxHp: 100,
      playerAttack: 0,
      playerDefense: 0,
      enemy,
      enemyIndex: idx,
      enemyAppearAt: Date.now(),
      phase: 'playing',
      turnNumber: 1,
      pendingTiles: [],
      exchangeMode: false,
      selectedForSwap: [],
      lastScore: null,
      combatEvents: [],
      lastEnemyDropTurn: 0,
      pendingEnemyTurn: null,
      lastRejection: null,
      runDamageTotal: 0,
      runHighestHit: 0,
      runLongestWord: '',
      message: 'Your turn — spell a word!',
    });
  },

  nextEnemy: () => {
    const current = get().enemyIndex;
    const next = current + 1;
    if (next >= ENEMY_CATALOG.length) {
      // Already at last enemy. Loop back to start.
      get().initGame(0);
    } else {
      get().initGame(next);
    }
  },

  setDictionaryLoaded: (loaded: boolean) => set({ dictionaryLoaded: loaded }),

  setPlayerAlias: (alias: string | null) => set({ playerAlias: alias }),

  setLocale: (locale: LocaleCode) => {
    if (locale === get().locale) return;
    setStoredLocale(locale);
    set({ locale });
    // Restart the campaign in the new language: reseed the tile bag with
    // that locale's distribution and reload the dictionary. The Game
    // component effect on `locale` triggers the dictionary fetch.
    get().initGame(0);
  },

  placePendingTile: (tile: Tile, row: number, col: number) => {
    const { grid, pendingTiles, rack, phase } = get();
    if (phase !== 'playing') return false;

    const cell = grid[row]?.[col];
    if (!cell || cell.tile || cell.premiumType === 'VOID') return false;

    // Check tile is in rack and not already pending
    const inRack = rack.some(t => t.id === tile.id);
    const alreadyPending = pendingTiles.some(p => p.tile.id === tile.id);
    if (!inRack || alreadyPending) return false;

    // Place on grid
    placeTile(grid, row, col, tile);

    set({
      grid: [...grid.map(r => [...r])], // shallow copy for reactivity
      pendingTiles: [...pendingTiles, { tile, row, col }],
      rack: rack.filter(t => t.id !== tile.id),
      lastRejection: null,
    });
    return true;
  },

  tapPlaceTile: (tile: Tile) => {
    const { grid, pendingTiles, phase } = get();
    if (phase !== 'playing') return false;

    const center = Math.floor(BOARD_SIZE / 2);
    let targetRow: number;
    let targetCol: number;

    if (pendingTiles.length === 0) {
      // No pending tiles yet — find a good starting position
      // If board is empty (no non-pending tiles), start at center
      let boardHasTiles = false;
      for (let r = 0; r < BOARD_SIZE && !boardHasTiles; r++) {
        for (let c = 0; c < BOARD_SIZE && !boardHasTiles; c++) {
          if (grid[r][c].tile) boardHasTiles = true;
        }
      }

      if (!boardHasTiles) {
        // Empty board: place at center
        targetRow = center;
        targetCol = center;
      } else {
        // Board has existing words: find first empty cell adjacent to any existing tile
        // scanning horizontally from center outward
        let found = false;
        // Try cells to the right of existing tiles first (most natural for horizontal play)
        for (let r = 0; r < BOARD_SIZE && !found; r++) {
          for (let c = 0; c < BOARD_SIZE && !found; c++) {
            if (grid[r][c].tile) {
              // Check right neighbor
              if (c + 1 < BOARD_SIZE && !grid[r][c + 1].tile && grid[r][c + 1].premiumType !== 'VOID') {
                targetRow = r;
                targetCol = c + 1;
                found = true;
              }
            }
          }
        }
        if (!found) {
          // Fallback: find any empty cell adjacent to existing tiles
          for (let r = 0; r < BOARD_SIZE && !found; r++) {
            for (let c = 0; c < BOARD_SIZE && !found; c++) {
              if (!grid[r][c].tile && grid[r][c].premiumType !== 'VOID') {
                const adj = [[0,1],[0,-1],[1,0],[-1,0]];
                for (const [dr, dc] of adj) {
                  const nr = r + dr, nc = c + dc;
                  if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && grid[nr][nc].tile) {
                    targetRow = r;
                    targetCol = c;
                    found = true;
                    break;
                  }
                }
              }
            }
          }
        }
        if (!found) return false;
      }
    } else {
      // Has pending tiles — place to the right of the last pending tile
      const last = pendingTiles[pendingTiles.length - 1];

      // Determine direction from pending tiles
      let dr = 0, dc = 1; // default: horizontal (rightward)
      if (pendingTiles.length >= 2) {
        const prev = pendingTiles[pendingTiles.length - 2];
        dr = Math.sign(last.row - prev.row);
        dc = Math.sign(last.col - prev.col);
      }

      // Walk in that direction until we find an empty cell
      let r = last.row + dr;
      let c = last.col + dc;
      let found = false;
      while (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE) {
        const cell = grid[r][c];
        if (cell.premiumType === 'VOID') break;
        if (!cell.tile) {
          targetRow = r;
          targetCol = c;
          found = true;
          break;
        }
        // Skip over existing tiles (they might be in the middle of the word)
        r += dr;
        c += dc;
      }

      if (!found) return false;
    }

    return get().placePendingTile(tile, targetRow!, targetCol!);
  },

  removePendingTile: (row: number, col: number) => {
    const { grid, pendingTiles, rack } = get();
    const pending = pendingTiles.find(p => p.row === row && p.col === col);
    if (!pending) return;

    removeTile(grid, row, col);

    set({
      grid: [...grid.map(r => [...r])],
      pendingTiles: pendingTiles.filter(p => p !== pending),
      rack: [...rack, pending.tile],
    });
  },

  returnPendingToRack: () => {
    const { grid, pendingTiles, rack } = get();
    for (const p of pendingTiles) {
      removeTile(grid, p.row, p.col);
    }
    set({
      grid: [...grid.map(r => [...r])],
      pendingTiles: [],
      rack: [...rack, ...pendingTiles.map(p => p.tile)],
      lastRejection: null,
    });
  },

  submitWord: () => {
    const { grid, pendingTiles, enemy, turnNumber, playerAttack } = get();
    if (pendingTiles.length === 0) {
      return { success: false, damage: 0, error: 'Place some tiles first!' };
    }

    const placedCells: [number, number][] = pendingTiles.map(p => [p.row, p.col]);
    // Check: is the board "empty" except for pending tiles?
    let tileCountExcludingPending = 0;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (grid[r][c].tile && !pendingTiles.some(p => p.row === r && p.col === c)) {
          tileCountExcludingPending++;
        }
      }
    }
    const isFirst = tileCountExcludingPending === 0;

    const validation = validatePlacement(grid, placedCells, isFirst);
    if (!validation.valid) {
      return { success: false, damage: 0, error: validation.error };
    }

    // Dictionary check. Blank/wild tiles carry a literal '*' on the board, so
    // we resolve them to concrete letters here — choosing an assignment under
    // which every formed word (main + crosswords) is valid and writing the
    // chosen letter onto the tile so the board shows it. Mirrors the NPC.
    const validator = getValidator();
    const alphabet = LOCALES[get().locale].letters.map(l => l.letter);
    const { formedWords, failedWord } = resolveFormedWords(
      grid,
      placedCells,
      w => validator.isWord(w),
      alphabet,
    );
    if (failedWord !== null) {
      set({
        lastRejection: { word: failedWord, formedWords, placedCells },
      });
      return { success: false, damage: 0, error: `"${failedWord}" is not a valid word` };
    }

    // Score calculation
    const score = calculatePlacementDamage(grid, formedWords, placedCells);

    // Apply attack bonus
    const attackBonus = 1 + playerAttack / 100;
    const totalDamage = Math.round(score.totalDamage * attackBonus);

    // Mark premium squares as used
    for (const [r, c] of placedCells) {
      grid[r][c].premiumUsed = true;
    }

    // Apply damage to enemy
    let newEnemyHp = enemy?.hp ?? 0;
    if (enemy) {
      newEnemyHp = Math.max(0, enemy.hp - totalDamage);
    }

    const wordTexts = formedWords.map(w => w.text).join(', ');
    // Track best/longest word this run for the leaderboard.
    const longestThisTurn = formedWords.reduce(
      (best, w) => (w.text.length > best.length ? w.text : best),
      get().runLongestWord,
    );

    // Build combat animation events
    const newEvents: CombatEvent[] = [
      { id: genEventId(), type: 'player_attack', timestamp: Date.now() },
      { id: genEventId(), type: 'enemy_hurt', damage: totalDamage, timestamp: Date.now() },
    ];
    if (newEnemyHp <= 0) {
      newEvents.push({ id: genEventId(), type: 'enemy_death', timestamp: Date.now() });
    }

    set({
      grid: [...grid.map(r => [...r])],
      pendingTiles: [],
      lastScore: { ...score, totalDamage },
      lastRejection: null,
      turnNumber: turnNumber + 1,
      enemy: enemy ? { ...enemy, hp: newEnemyHp } : null,
      message: `${wordTexts}! ${totalDamage} damage!`,
      phase: newEnemyHp <= 0 ? 'victory' : 'enemy_turn',
      combatEvents: [...get().combatEvents, ...newEvents],
      runDamageTotal: get().runDamageTotal + totalDamage,
      runHighestHit: Math.max(get().runHighestHit, totalDamage),
      runLongestWord: longestThisTurn,
    });

    // Draw tiles after a short delay (handled by component)
    return { success: true, damage: totalDamage };
  },

  disputeWord: (definition: string) => {
    const { lastRejection, grid, enemy, turnNumber, playerAttack } = get();
    if (!lastRejection || !enemy) return { success: false, damage: 0 };

    const { formedWords, placedCells, word } = lastRejection;

    // Save dispute to storage AND add to the per-locale accepted-words list
    // so the same word counts as valid in all future games (the email-via-
    // Web3Forms continues to notify the developer for curation/inclusion
    // in the next bundled dictionary refresh).
    saveDispute({
      id: Math.random().toString(36).slice(2) + Date.now().toString(36),
      word,
      definition,
      timestamp: Date.now(),
      turnNumber,
    });
    getValidator().acceptWord(word);
    // Also accept every other word in the placement, since they were all
    // implicitly accepted by the dispute resolution.
    for (const fw of formedWords) {
      getValidator().acceptWord(fw.text);
    }

    // Calculate damage as if the word was valid
    const score = calculatePlacementDamage(grid, formedWords, placedCells);
    const attackBonus = 1 + playerAttack / 100;
    const totalDamage = Math.round(score.totalDamage * attackBonus);

    // Mark premium squares as used
    for (const [r, c] of placedCells) {
      grid[r][c].premiumUsed = true;
    }

    // Apply damage to enemy
    const newEnemyHp = Math.max(0, enemy.hp - totalDamage);
    const wordTexts = formedWords.map(w => w.text).join(', ');
    const longestThisTurn = formedWords.reduce(
      (best, w) => (w.text.length > best.length ? w.text : best),
      get().runLongestWord,
    );

    // Build combat animation events
    const newEvents: CombatEvent[] = [
      { id: genEventId(), type: 'player_attack', timestamp: Date.now() },
      { id: genEventId(), type: 'enemy_hurt', damage: totalDamage, timestamp: Date.now() },
    ];
    if (newEnemyHp <= 0) {
      newEvents.push({ id: genEventId(), type: 'enemy_death', timestamp: Date.now() });
    }

    set({
      grid: [...grid.map(r => [...r])],
      pendingTiles: [],
      lastScore: { ...score, totalDamage },
      lastRejection: null,
      turnNumber: turnNumber + 1,
      enemy: { ...enemy, hp: newEnemyHp },
      message: `${wordTexts}! ${totalDamage} damage! (disputed)`,
      phase: newEnemyHp <= 0 ? 'victory' : 'enemy_turn',
      combatEvents: [...get().combatEvents, ...newEvents],
      runDamageTotal: get().runDamageTotal + totalDamage,
      runHighestHit: Math.max(get().runHighestHit, totalDamage),
      runLongestWord: longestThisTurn,
      rack: get().rack, // pending tiles already on board, rack already updated
    });

    return { success: true, damage: totalDamage };
  },

  swapTiles: (tilesToSwap: Tile[]) => {
    if (get().phase !== 'playing') return;
    // Recall any pending tiles first so a swap/pass can never strand tiles on
    // the board.
    if (get().pendingTiles.length > 0) get().returnPendingToRack();
    const { rack, tileBag, turnNumber, locale } = get();
    const remaining = rack.filter(t => !tilesToSwap.some(s => s.id === t.id));
    tileBag.returnTiles(tilesToSwap);
    const newTiles = tileBag.draw(tilesToSwap.length);
    const ui = LOCALES[locale].ui;
    const message =
      tilesToSwap.length === 0
        ? ui.passedTurn
        : ui.tilesSwapped.replace('{n}', String(tilesToSwap.length));
    set({
      rack: [...remaining, ...newTiles],
      turnNumber: turnNumber + 1,
      message,
      phase: 'enemy_turn',
      exchangeMode: false,
      selectedForSwap: [],
    });
  },

  toggleExchangeMode: () => {
    const entering = !get().exchangeMode;
    // Entering exchange mode recalls pending tiles so tile-selection can't
    // conflict with in-progress placement.
    if (entering && get().pendingTiles.length > 0) get().returnPendingToRack();
    set({ exchangeMode: entering, selectedForSwap: entering ? get().selectedForSwap : [] });
  },

  toggleSwapSelection: (tileId: string) => {
    const sel = get().selectedForSwap;
    set({
      selectedForSwap: sel.includes(tileId)
        ? sel.filter(id => id !== tileId)
        : [...sel, tileId],
    });
  },

  clearSwapSelection: () => set({ exchangeMode: false, selectedForSwap: [] }),

  enemyTurn: () => {
    // StrictMode / double-timer safety: only act when it's genuinely the
    // enemy's turn AND we haven't already committed this turn's move (the
    // outcome sits in pendingEnemyTurn until the tiles finish dropping), so a
    // stray second invocation can't double-commit a word.
    if (get().phase !== 'enemy_turn' || get().pendingEnemyTurn) return;
    const { enemy, playerHp, playerDefense, grid, npcRack, npcBag, turnNumber, locale } = get();
    if (!enemy || enemy.hp <= 0) return;

    const ui = LOCALES[locale].ui;
    const alphabet = LOCALES[locale].letters.map(l => l.letter);
    const move = findBestNpcMove(grid, npcRack, {
      pickRank: enemy.pickRank,
      timeBudgetMs: 120,
      alphabet,
    });

    if (move) {
      // Commit the NPC's tiles to the shared board.
      for (const p of move.placedTiles) {
        p.tile.ownerId = 'enemy';
        p.tile.turnPlaced = turnNumber;
        placeTile(grid, p.row, p.col, p.tile);
      }
      // Consume premium squares the NPC's word landed on (mirrors submitWord).
      for (const p of move.placedTiles) {
        grid[p.row][p.col].premiumUsed = true;
      }

      // NPC words are worth more than the player's: scale by the per-enemy
      // difficulty multiplier, then apply player defense as a flat mitigation.
      const raw = Math.round(move.score.totalDamage * enemy.damageMultiplier);
      const damage = Math.max(1, raw - playerDefense);
      const newHp = Math.max(0, playerHp - damage);

      // Remove the used tiles from the NPC rack and refill from its own bag.
      const usedIds = new Set(move.placedTiles.map(p => p.rackTileId));
      const keptRack = npcRack.filter(t => !usedIds.has(t.id));
      const drawn = npcBag.draw(RACK_SIZE - keptRack.length);
      const newNpcRack = [...keptRack, ...drawn];

      const newEvents: CombatEvent[] = [
        { id: genEventId(), type: 'enemy_attack', timestamp: Date.now() },
        { id: genEventId(), type: 'player_hurt', damage, timestamp: Date.now() },
      ];
      if (newHp <= 0) {
        newEvents.push({ id: genEventId(), type: 'player_death', timestamp: Date.now() });
      }

      // Commit the tiles + message now (so they tumble in and the "X plays
      // WORD" banner shows during the fall), but hold the damage, phase flip,
      // and attack/hurt animations in pendingEnemyTurn. The drop controller in
      // Game calls resolveEnemyAttack() once the tiles land. Phase stays
      // 'enemy_turn' meanwhile, which keeps player input locked.
      set({
        grid: [...grid.map(r => [...r])],
        npcRack: newNpcRack,
        message: ui.enemyPlays
          .replace('{name}', enemy.name)
          .replace('{word}', move.mainWord)
          .replace('{n}', String(damage)),
        lastEnemyDropTurn: turnNumber,
        pendingEnemyTurn: {
          playerHp: newHp,
          phase: newHp <= 0 ? 'defeat' : 'playing',
          events: newEvents,
        },
      });
      return;
    }

    // No legal word — forgo the turn: reshuffle the whole rack, deal no damage.
    // No tiles dropped, so no pendingEnemyTurn — go straight back to the player.
    npcBag.returnTiles(npcRack);
    const refreshed = npcBag.draw(RACK_SIZE);
    set({
      npcRack: refreshed,
      phase: 'playing',
      message: ui.enemyForfeits.replace('{name}', enemy.name),
    });
  },

  // Apply the deferred enemy-attack outcome once the dropped tiles have landed.
  // Idempotent: the null-guard makes a duplicate call (StrictMode/double-fire)
  // a no-op, so the damage and animations only ever apply once.
  resolveEnemyAttack: () => {
    const pending = get().pendingEnemyTurn;
    if (!pending) return;
    set({
      playerHp: pending.playerHp,
      phase: pending.phase,
      combatEvents: [...get().combatEvents, ...pending.events],
      pendingEnemyTurn: null,
    });
  },

  drawTiles: () => {
    const { rack, tileBag } = get();
    const need = RACK_SIZE - rack.length;
    if (need > 0) {
      const drawn = tileBag.draw(need);
      set({ rack: [...rack, ...drawn] });
    }
  },

  setMessage: (msg: string) => set({ message: msg }),

  consumeCombatEvent: (id: string) => set(state => ({
    combatEvents: state.combatEvents.filter(e => e.id !== id),
  })),
}));

// Expose store for debugging
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__store = useGameStore;
}
