import { useEffect, useRef } from 'react';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';
import { BOARD_SIZE } from '../types/index.ts';
import type { CombatEvent } from '../types/index.ts';
import { useGameStore } from '../store/gameStore.ts';
import { soundManager } from '../audio/SoundManager.ts';

// Board pixel dimensions (must match GameBoard.tsx)
const CELL_SIZE = 40;
const GAP = 2;
const BORDER = 2;
const BOARD_PX = BORDER + GAP + BOARD_SIZE * CELL_SIZE + (BOARD_SIZE - 1) * GAP + GAP + BORDER;

// ─── Easing ───

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

// ─── Character Drawing ───

function drawShadow(g: Graphics) {
  // Ground shadow oval to help character pop against dark backgrounds
  g.ellipse(0, 2, 28, 8);
  g.fill({ color: 0x000000, alpha: 0.35 });
}

function drawWizard(g: Graphics) {
  drawShadow(g);

  // Robe body (trapezoid) — bright blue
  g.poly([-18, 0, 18, 0, 12, -45, -12, -45]);
  g.fill(0x6688dd);

  // Robe trim
  g.rect(-18, -2, 36, 4);
  g.fill(0x88aaee);

  // Robe highlights
  g.poly([-6, -5, 6, -5, 4, -40, -4, -40]);
  g.fill({ color: 0xaabbff, alpha: 0.3 });

  // Head
  g.circle(0, -55, 13);
  g.fill(0xffd5b0);

  // Cheeks (blush)
  g.circle(-8, -52, 4);
  g.fill({ color: 0xff9999, alpha: 0.3 });
  g.circle(8, -52, 4);
  g.fill({ color: 0xff9999, alpha: 0.3 });

  // Hat brim
  g.ellipse(0, -48, 20, 5);
  g.fill(0x8855cc);

  // Hat cone — brighter purple
  g.poly([0, -82, -16, -48, 16, -48]);
  g.fill(0x8855cc);

  // Hat band
  g.rect(-14, -52, 28, 4);
  g.fill(0xffd700);

  // Hat tip ornament (diamond shape instead of star)
  g.poly([0, -78, -4, -72, 0, -66, 4, -72]);
  g.fill(0xffd700);

  // Eyes
  g.circle(-5, -56, 2.5);
  g.fill(0x222244);
  g.circle(5, -56, 2.5);
  g.fill(0x222244);

  // Eye glints
  g.circle(-4, -57, 1);
  g.fill(0xffffff);
  g.circle(6, -57, 1);
  g.fill(0xffffff);

  // Smile
  g.arc(0, -52, 5, 0.2, Math.PI - 0.2);
  g.stroke({ color: 0x664433, width: 1.5 });

  // Staff
  g.moveTo(18, -5);
  g.lineTo(20, -60);
  g.stroke({ color: 0xaa7744, width: 3 });

  // Staff orb
  g.circle(20, -63, 7);
  g.fill(0x00ccff);

  // Staff orb glow (lighter inner)
  g.circle(19, -64, 3.5);
  g.fill(0xaaeeff);
}

function drawGoblin(g: Graphics) {
  drawShadow(g);

  // Body (squat) — brighter leather
  g.roundRect(-16, -38, 32, 38, 4);
  g.fill(0x7a5535);

  // Belt
  g.rect(-16, -20, 32, 5);
  g.fill(0x4a3218);

  // Belt buckle
  g.rect(-4, -20, 8, 5);
  g.fill(0xddbb55);

  // Head — brighter green
  g.circle(0, -48, 16);
  g.fill(0x5aaa5a);

  // Left ear
  g.poly([-16, -55, -12, -46, -22, -42]);
  g.fill(0x4a9a4a);

  // Right ear
  g.poly([16, -55, 12, -46, 22, -42]);
  g.fill(0x4a9a4a);

  // Eyes (angry slant)
  g.circle(-6, -50, 3);
  g.fill(0xff3333);
  g.circle(6, -50, 3);
  g.fill(0xff3333);

  // Pupils
  g.circle(-6, -50, 1.5);
  g.fill(0x220000);
  g.circle(6, -50, 1.5);
  g.fill(0x220000);

  // Eyebrow slants
  g.moveTo(-10, -55);
  g.lineTo(-3, -53);
  g.stroke({ color: 0x2d5a2d, width: 2 });
  g.moveTo(10, -55);
  g.lineTo(3, -53);
  g.stroke({ color: 0x2d5a2d, width: 2 });

  // Mouth (fangs)
  g.moveTo(-6, -40);
  g.lineTo(0, -38);
  g.lineTo(6, -40);
  g.stroke({ color: 0x333333, width: 1.5 });

  // Fangs
  g.poly([-3, -40, -1, -36, -5, -36]);
  g.fill(0xeeeeee);
  g.poly([3, -40, 5, -36, 1, -36]);
  g.fill(0xeeeeee);

  // Club
  g.moveTo(20, -8);
  g.lineTo(22, -42);
  g.stroke({ color: 0x6a4a2a, width: 4 });

  // Club head
  g.ellipse(22, -46, 9, 7);
  g.fill(0x5a3a1a);

  // Club spikes
  g.circle(16, -48, 2);
  g.fill(0x888888);
  g.circle(28, -44, 2);
  g.fill(0x888888);
}

// ─── Character Controller ───

type AnimState = 'idle' | 'attack' | 'hurt' | 'death' | 'dead';

class CharacterController {
  container: Container;
  baseX: number;
  baseY: number;
  isPlayer: boolean;
  private state: AnimState = 'idle';
  private stateTimer = 0;
  private idleTimer: number;
  private onComplete?: () => void;
  private hurtOverlay: Graphics;

  constructor(isPlayer: boolean, x: number, y: number) {
    this.isPlayer = isPlayer;
    this.baseX = x;
    this.baseY = y;
    this.idleTimer = Math.random() * Math.PI * 2; // randomize idle phase
    this.container = new Container();
    this.container.x = x;
    this.container.y = y;
    this.container.alpha = 0.85;

    // Draw character (slightly larger for visibility)
    const body = new Graphics();
    if (isPlayer) {
      drawWizard(body);
    } else {
      drawGoblin(body);
      this.container.scale.x = -1; // face left
    }
    body.scale.set(1.15);
    this.container.addChild(body);

    // Hurt flash overlay (red rectangle covering character bounds)
    this.hurtOverlay = new Graphics();
    this.hurtOverlay.rect(-25, -85, 50, 90);
    this.hurtOverlay.fill({ color: 0xff0000 });
    this.hurtOverlay.alpha = 0;
    this.container.addChild(this.hurtOverlay);
  }

  play(anim: AnimState): Promise<void> {
    if (anim === 'idle') {
      this.state = 'idle';
      this.stateTimer = 0;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this.state = anim;
      this.stateTimer = 0;
      this.onComplete = resolve;
    });
  }

  reset() {
    this.state = 'idle';
    this.stateTimer = 0;
    this.container.alpha = 0.85;
    this.container.x = this.baseX;
    this.container.y = this.baseY;
    this.container.rotation = 0;
    this.hurtOverlay.alpha = 0;
  }

  update(dt: number) {
    this.idleTimer += dt * 0.06;
    this.stateTimer += dt;

    switch (this.state) {
      case 'idle': {
        this.container.y = this.baseY + Math.sin(this.idleTimer) * 3;
        this.container.rotation = 0;
        break;
      }
      case 'attack': {
        const duration = 25; // ~417ms at 60fps
        const progress = Math.min(1, this.stateTimer / duration);
        const dir = this.isPlayer ? 1 : -1;
        if (progress < 0.35) {
          // Lunge forward
          const p = progress / 0.35;
          this.container.x = this.baseX + dir * 55 * easeOutQuad(p);
          this.container.alpha = 0.85 + 0.15 * p;
        } else if (progress < 1) {
          // Return
          const p = (progress - 0.35) / 0.65;
          this.container.x = this.baseX + dir * 55 * (1 - easeOutQuad(p));
          this.container.alpha = 1 - 0.15 * easeOutQuad(p);
        } else {
          this.finish('idle');
        }
        break;
      }
      case 'hurt': {
        const duration = 20; // ~333ms
        const progress = Math.min(1, this.stateTimer / duration);
        if (progress < 1) {
          // Shake
          const shake = Math.sin(progress * Math.PI * 8) * 6 * (1 - progress);
          this.container.x = this.baseX + shake;
          // Red flash
          this.hurtOverlay.alpha = 0.35 * (1 - progress);
        } else {
          this.container.x = this.baseX;
          this.hurtOverlay.alpha = 0;
          this.finish('idle');
        }
        break;
      }
      case 'death': {
        const duration = 45; // ~750ms
        const progress = Math.min(1, this.stateTimer / duration);
        if (progress < 1) {
          const tiltDir = this.isPlayer ? -1 : 1;
          this.container.rotation = tiltDir * progress * 1.2;
          this.container.alpha = 0.85 * (1 - progress * progress);
          this.container.y = this.baseY + progress * 25;
        } else {
          this.container.alpha = 0;
          this.state = 'dead';
          this.onComplete?.();
          this.onComplete = undefined;
        }
        break;
      }
      case 'dead':
        // Stay invisible
        break;
    }
  }

  private finish(nextState: AnimState) {
    this.state = nextState;
    this.stateTimer = 0;
    this.container.x = this.baseX;
    this.container.alpha = 0.85;
    this.hurtOverlay.alpha = 0;
    this.container.rotation = 0;
    this.onComplete?.();
    this.onComplete = undefined;
  }
}

// ─── Floating Damage Numbers ───

interface FloatingNumber {
  text: Text;
  vy: number;
  life: number;
}

class DamageNumberManager {
  container: Container;
  private numbers: FloatingNumber[] = [];

  constructor() {
    this.container = new Container();
  }

  spawn(amount: number, x: number, y: number) {
    const isBig = amount >= 15;
    const style = new TextStyle({
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: isBig ? 30 : 22,
      fontWeight: 'bold',
      fill: isBig ? '#ff4444' : '#ffaa00',
      stroke: { color: '#000000', width: 4 },
    });
    const text = new Text({ text: `${amount}`, style });
    text.anchor.set(0.5, 0.5);
    text.x = x + (Math.random() - 0.5) * 16;
    text.y = y;
    this.container.addChild(text);
    this.numbers.push({ text, vy: -2.5, life: 55 });
  }

  update(dt: number) {
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      const n = this.numbers[i];
      n.text.y += n.vy * dt;
      n.vy *= 0.97;
      n.life -= dt;
      // Fade out in last 15 frames
      n.text.alpha = Math.min(1, n.life / 15);
      if (n.life <= 0) {
        this.container.removeChild(n.text);
        n.text.destroy();
        this.numbers.splice(i, 1);
      }
    }
  }

  clear() {
    for (const n of this.numbers) {
      this.container.removeChild(n.text);
      n.text.destroy();
    }
    this.numbers = [];
  }
}

// ─── Sound-Event Mapping ───

function playSoundForEvent(type: CombatEvent['type']) {
  switch (type) {
    case 'player_attack': soundManager.play('wordSubmit'); break;
    case 'enemy_attack': soundManager.play('attackImpact'); break;
    case 'player_hurt': soundManager.play('hurt'); break;
    case 'enemy_hurt': soundManager.play('attackImpact'); break;
    case 'enemy_death': soundManager.play('victory'); break;
    case 'player_death': soundManager.play('defeat'); break;
  }
}

// ─── React Component ───

export function BattleOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const playerRef = useRef<CharacterController | null>(null);
  const enemyRef = useRef<CharacterController | null>(null);
  const dmgRef = useRef<DamageNumberManager | null>(null);
  const processingRef = useRef(false);
  const queueRef = useRef<CombatEvent[]>([]);

  // Initialize PixiJS application
  useEffect(() => {
    let destroyed = false;
    const app = new Application();

    app.init({
      width: BOARD_PX,
      height: BOARD_PX,
      backgroundAlpha: 0,
      antialias: true,
    }).then(() => {
      if (destroyed) { app.destroy(true); return; }
      appRef.current = app;
      containerRef.current?.appendChild(app.canvas);

      // Position characters at bottom-left and bottom-right of board
      const player = new CharacterController(true, 75, BOARD_PX - 35);
      const enemy = new CharacterController(false, BOARD_PX - 75, BOARD_PX - 35);
      app.stage.addChild(player.container);
      app.stage.addChild(enemy.container);
      playerRef.current = player;
      enemyRef.current = enemy;

      // Damage number layer (on top of characters)
      const dmg = new DamageNumberManager();
      app.stage.addChild(dmg.container);
      dmgRef.current = dmg;

      // Per-frame update
      app.ticker.add((ticker) => {
        player.update(ticker.deltaTime);
        enemy.update(ticker.deltaTime);
        dmg.update(ticker.deltaTime);
      });
    });

    return () => {
      destroyed = true;
      appRef.current?.destroy(true);
      appRef.current = null;
    };
  }, []);

  // Subscribe to game store for combat events, tile clicks, and game restarts
  useEffect(() => {
    let prevPendingCount = useGameStore.getState().pendingTiles.length;

    const unsub = useGameStore.subscribe((state, prev) => {
      // Tile placement sound
      if (state.pendingTiles.length > prevPendingCount) {
        soundManager.play('tileClick');
      }
      prevPendingCount = state.pendingTiles.length;

      // Game restart — reset characters
      if (
        state.phase === 'playing' &&
        (prev.phase === 'victory' || prev.phase === 'defeat' || prev.phase === 'loading')
      ) {
        playerRef.current?.reset();
        enemyRef.current?.reset();
        dmgRef.current?.clear();
        queueRef.current = [];
        processingRef.current = false;
      }

      // Queue new combat events
      if (state.combatEvents !== prev.combatEvents && state.combatEvents.length > 0) {
        for (const event of state.combatEvents) {
          if (!queueRef.current.some(e => e.id === event.id)) {
            queueRef.current.push(event);
          }
        }
        processQueue();
      }
    });

    return unsub;
  }, []);

  async function processQueue() {
    if (processingRef.current) return;
    processingRef.current = true;

    while (queueRef.current.length > 0) {
      const event = queueRef.current[0];
      await processEvent(event);
      queueRef.current.shift();
      useGameStore.getState().consumeCombatEvent(event.id);
    }

    processingRef.current = false;
  }

  async function processEvent(event: CombatEvent) {
    const player = playerRef.current;
    const enemy = enemyRef.current;
    const dmg = dmgRef.current;
    if (!player || !enemy) return;

    // Play sound
    playSoundForEvent(event.type);

    switch (event.type) {
      case 'player_attack':
        await player.play('attack');
        break;
      case 'enemy_hurt':
        await enemy.play('hurt');
        if (dmg && event.damage) {
          dmg.spawn(event.damage, BOARD_PX - 75, BOARD_PX - 110);
        }
        break;
      case 'enemy_attack':
        await enemy.play('attack');
        break;
      case 'player_hurt':
        await player.play('hurt');
        if (dmg && event.damage) {
          dmg.spawn(event.damage, 75, BOARD_PX - 110);
        }
        break;
      case 'enemy_death':
        await enemy.play('death');
        break;
      case 'player_death':
        await player.play('death');
        break;
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: BOARD_PX,
        height: BOARD_PX,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}
