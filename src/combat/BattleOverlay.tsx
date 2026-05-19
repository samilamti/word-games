import { useEffect, useRef } from 'react';
import { Application, Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { CombatEvent } from '../types/index.ts';
import { useGameStore } from '../store/gameStore.ts';
import { soundManager } from '../audio/SoundManager.ts';
import { ENEMY_CATALOG } from '../types/enemies.ts';

// Reference canvas size at which character positions and sprite scales were
// designed. Real canvas size now tracks the rendered GameBoard (responsive
// via --tile-size CSS clamp) and we scale character containers + reposition
// their base coords on every resize.
const REFERENCE_SIZE = 544;

// Character positions in REFERENCE_SIZE coordinates (will be scaled).
const PLAYER_BASE_X = 55;
const ENEMY_BASE_X = REFERENCE_SIZE - 55;
const CHAR_BASE_Y_OFFSET = 25; // pixels above the bottom edge

// Wizard alpha targets — used to fade the hero out during tile placement so
// it doesn't obscure the bottom-left tiles, and bring it back into combat.
const WIZARD_ALPHA_PLAYING = 0.22;
const WIZARD_ALPHA_COMBAT = 0.9;
const GOBLIN_ALPHA = 0.9;

// ─── Easing ───

function easeOutQuad(t: number): number {
  return t * (2 - t);
}

// ─── Character Drawing ───

function drawShadow(g: Graphics) {
  g.ellipse(0, 2, 28, 8);
  g.fill({ color: 0x000000, alpha: 0.35 });
}

function drawWizard(g: Graphics) {
  drawShadow(g);
  g.poly([-18, 0, 18, 0, 12, -45, -12, -45]);
  g.fill(0x6688dd);
  g.rect(-18, -2, 36, 4);
  g.fill(0x88aaee);
  g.poly([-6, -5, 6, -5, 4, -40, -4, -40]);
  g.fill({ color: 0xaabbff, alpha: 0.3 });
  g.circle(0, -55, 13);
  g.fill(0xffd5b0);
  g.circle(-8, -52, 4);
  g.fill({ color: 0xff9999, alpha: 0.3 });
  g.circle(8, -52, 4);
  g.fill({ color: 0xff9999, alpha: 0.3 });
  g.ellipse(0, -48, 20, 5);
  g.fill(0x8855cc);
  g.poly([0, -82, -16, -48, 16, -48]);
  g.fill(0x8855cc);
  g.rect(-14, -52, 28, 4);
  g.fill(0xffd700);
  g.poly([0, -78, -4, -72, 0, -66, 4, -72]);
  g.fill(0xffd700);
  g.circle(-5, -56, 2.5);
  g.fill(0x222244);
  g.circle(5, -56, 2.5);
  g.fill(0x222244);
  g.circle(-4, -57, 1);
  g.fill(0xffffff);
  g.circle(6, -57, 1);
  g.fill(0xffffff);
  g.arc(0, -52, 5, 0.2, Math.PI - 0.2);
  g.stroke({ color: 0x664433, width: 1.5 });
  g.moveTo(18, -5);
  g.lineTo(20, -60);
  g.stroke({ color: 0xaa7744, width: 3 });
  g.circle(20, -63, 7);
  g.fill(0x00ccff);
  g.circle(19, -64, 3.5);
  g.fill(0xaaeeff);
}

// Fallback vector goblin — only used if the sprite texture fails to load.
function drawGoblinFallback(g: Graphics) {
  drawShadow(g);
  g.roundRect(-16, -38, 32, 38, 4);
  g.fill(0x7a5535);
  g.rect(-16, -20, 32, 5);
  g.fill(0x4a3218);
  g.rect(-4, -20, 8, 5);
  g.fill(0xddbb55);
  g.circle(0, -48, 16);
  g.fill(0x5aaa5a);
  g.poly([-16, -55, -12, -46, -22, -42]);
  g.fill(0x4a9a4a);
  g.poly([16, -55, 12, -46, 22, -42]);
  g.fill(0x4a9a4a);
  g.circle(-6, -50, 3);
  g.fill(0xff3333);
  g.circle(6, -50, 3);
  g.fill(0xff3333);
  g.circle(-6, -50, 1.5);
  g.fill(0x220000);
  g.circle(6, -50, 1.5);
  g.fill(0x220000);
  g.moveTo(-10, -55);
  g.lineTo(-3, -53);
  g.stroke({ color: 0x2d5a2d, width: 2 });
  g.moveTo(10, -55);
  g.lineTo(3, -53);
  g.stroke({ color: 0x2d5a2d, width: 2 });
  g.moveTo(-6, -40);
  g.lineTo(0, -38);
  g.lineTo(6, -40);
  g.stroke({ color: 0x333333, width: 1.5 });
  g.poly([-3, -40, -1, -36, -5, -36]);
  g.fill(0xeeeeee);
  g.poly([3, -40, 5, -36, 1, -36]);
  g.fill(0xeeeeee);
  g.moveTo(20, -8);
  g.lineTo(22, -42);
  g.stroke({ color: 0x6a4a2a, width: 4 });
  g.ellipse(22, -46, 9, 7);
  g.fill(0x5a3a1a);
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
  /** Target alpha while idle. Tweened toward by update() for smooth fades. */
  idleAlpha: number;
  private state: AnimState = 'idle';
  private stateTimer = 0;
  private idleTimer: number;
  private onComplete?: () => void;
  private hurtOverlay: Graphics;
  private body: Container;

  constructor(isPlayer: boolean, idleAlpha: number, body: Container) {
    this.isPlayer = isPlayer;
    this.idleAlpha = idleAlpha;
    this.baseX = 0;
    this.baseY = 0;
    this.idleTimer = Math.random() * Math.PI * 2;
    this.container = new Container();
    this.container.alpha = idleAlpha;

    this.body = body;
    this.container.addChild(body);

    this.hurtOverlay = new Graphics();
    this.hurtOverlay.rect(-25, -85, 50, 90);
    this.hurtOverlay.fill({ color: 0xff0000 });
    this.hurtOverlay.alpha = 0;
    this.container.addChild(this.hurtOverlay);
  }

  /** Swap out the visible body (e.g. when a new enemy spawns). Animation
   *  state resets to idle. */
  swapBody(newBody: Container) {
    this.container.removeChild(this.body);
    this.body.destroy({ children: true });
    this.body = newBody;
    // Insert below the hurt overlay so red flashes still cover the new sprite.
    this.container.addChildAt(newBody, 0);
    this.state = 'idle';
    this.stateTimer = 0;
    this.container.rotation = 0;
    this.hurtOverlay.alpha = 0;
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
    this.container.alpha = this.idleAlpha;
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
        // Smooth tween toward idleAlpha when it changes externally
        const diff = this.idleAlpha - this.container.alpha;
        if (Math.abs(diff) > 0.005) {
          this.container.alpha += diff * 0.08;
        } else {
          this.container.alpha = this.idleAlpha;
        }
        break;
      }
      case 'attack': {
        const duration = 25;
        const progress = Math.min(1, this.stateTimer / duration);
        const dir = this.isPlayer ? 1 : -1;
        if (progress < 0.35) {
          const p = progress / 0.35;
          this.container.x = this.baseX + dir * 55 * easeOutQuad(p);
          this.container.alpha = 0.85 + 0.15 * p;
        } else if (progress < 1) {
          const p = (progress - 0.35) / 0.65;
          this.container.x = this.baseX + dir * 55 * (1 - easeOutQuad(p));
          this.container.alpha = 1 - 0.15 * easeOutQuad(p);
        } else {
          this.finish('idle');
        }
        break;
      }
      case 'hurt': {
        const duration = 20;
        const progress = Math.min(1, this.stateTimer / duration);
        if (progress < 1) {
          const shake = Math.sin(progress * Math.PI * 8) * 6 * (1 - progress);
          this.container.x = this.baseX + shake;
          this.hurtOverlay.alpha = 0.35 * (1 - progress);
        } else {
          this.container.x = this.baseX;
          this.hurtOverlay.alpha = 0;
          this.finish('idle');
        }
        break;
      }
      case 'death': {
        const duration = 45;
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
        break;
    }
  }

  private finish(nextState: AnimState) {
    this.state = nextState;
    this.stateTimer = 0;
    this.container.x = this.baseX;
    // Leave alpha at the combat-end value; update()'s idle tween will fade
    // it smoothly toward idleAlpha.
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

// ─── Body builders (player Graphics, enemy Sprite) ───

function buildPlayerBody(): Container {
  const g = new Graphics();
  drawWizard(g);
  g.scale.set(1.15);
  return g;
}

/** Wrap a Blender-rendered enemy PNG as a Sprite with anchor pinned to the
 *  feet so it lines up with the container's origin (same convention as the
 *  Graphics-based bodies, which draw the shadow at y≈0). */
function buildEnemySpriteBody(texture: Texture): Container {
  const sprite = new Sprite(texture);
  sprite.anchor.set(0.5, 0.95);
  // The rendered character occupies roughly 80% of the 1024px tall PNG; the
  // remaining margin is transparent space. Scale to make the visible figure
  // roughly the same height as the original Graphics goblin (~85 design px).
  sprite.scale.set(0.105);
  return sprite;
}

function buildEnemyFallbackBody(): Container {
  const g = new Graphics();
  drawGoblinFallback(g);
  g.scale.set(1.15);
  return g;
}

// ─── React Component ───

export function BattleOverlay() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const playerRef = useRef<CharacterController | null>(null);
  const enemyRef = useRef<CharacterController | null>(null);
  const dmgRef = useRef<DamageNumberManager | null>(null);
  const scaleRef = useRef(1);
  const processingRef = useRef(false);
  const queueRef = useRef<CombatEvent[]>([]);

  // Initialize PixiJS application + resize observer + enemy sprite preload
  useEffect(() => {
    let destroyed = false;
    let resizeObs: ResizeObserver | null = null;
    const app = new Application();

    (async () => {
      // Preload all enemy textures so swapping mid-game is instant. If the
      // load fails (e.g. file missing during dev), we fall back to the
      // vector goblin in buildEnemyFallbackBody.
      try {
        await Assets.load(ENEMY_CATALOG.map(e => e.spriteUrl));
      } catch (err) {
        console.warn('[BattleOverlay] enemy texture preload failed:', err);
      }
      if (destroyed) return;

      await app.init({
        width: REFERENCE_SIZE,
        height: REFERENCE_SIZE,
        backgroundAlpha: 0,
        antialias: true,
      });
      if (destroyed) { app.destroy(true); return; }
      appRef.current = app;
      containerRef.current?.appendChild(app.canvas);
      // Make canvas fill its container; renderer.resize() drives the bitmap size.
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';

      const state = useGameStore.getState();
      const initialPhase = state.phase;
      const player = new CharacterController(
        true,
        initialPhase === 'playing' ? WIZARD_ALPHA_PLAYING : WIZARD_ALPHA_COMBAT,
        buildPlayerBody(),
      );

      // Pick the right sprite for the current enemy (or fallback to vectors).
      const enemyBody = (() => {
        const enemyDef = state.enemy;
        if (!enemyDef) return buildEnemyFallbackBody();
        try {
          const tex = Texture.from(enemyDef.spriteUrl);
          if (!tex || tex === Texture.EMPTY) return buildEnemyFallbackBody();
          return buildEnemySpriteBody(tex);
        } catch {
          return buildEnemyFallbackBody();
        }
      })();
      const enemy = new CharacterController(false, GOBLIN_ALPHA, enemyBody);
      app.stage.addChild(player.container);
      app.stage.addChild(enemy.container);
      playerRef.current = player;
      enemyRef.current = enemy;

      const dmg = new DamageNumberManager();
      app.stage.addChild(dmg.container);
      dmgRef.current = dmg;

      const updateLayout = (size: number) => {
        if (size <= 0) return;
        const scale = size / REFERENCE_SIZE;
        scaleRef.current = scale;
        app.renderer.resize(size, size);

        player.baseX = PLAYER_BASE_X * scale;
        player.baseY = size - CHAR_BASE_Y_OFFSET * scale;
        player.container.x = player.baseX;
        player.container.y = player.baseY;
        player.container.scale.set(scale, scale);

        enemy.baseX = ENEMY_BASE_X * scale;
        enemy.baseY = size - CHAR_BASE_Y_OFFSET * scale;
        enemy.container.x = enemy.baseX;
        enemy.container.y = enemy.baseY;
        enemy.container.scale.set(-scale, scale); // flip horizontally to face left
      };

      const parent = containerRef.current?.parentElement;
      if (parent) {
        const rect = parent.getBoundingClientRect();
        updateLayout(rect.width || REFERENCE_SIZE);
        resizeObs = new ResizeObserver(entries => {
          const w = entries[0]?.contentRect.width;
          if (w) updateLayout(w);
        });
        resizeObs.observe(parent);
      } else {
        updateLayout(REFERENCE_SIZE);
      }

      app.ticker.add((ticker) => {
        player.update(ticker.deltaTime);
        enemy.update(ticker.deltaTime);
        dmg.update(ticker.deltaTime);
      });
    })();

    return () => {
      destroyed = true;
      resizeObs?.disconnect();
      appRef.current?.destroy(true);
      appRef.current = null;
    };
  }, []);

  // Subscribe to game store: combat events, tile-place sound, restart, phase fades
  useEffect(() => {
    let prevPendingCount = useGameStore.getState().pendingTiles.length;

    const unsub = useGameStore.subscribe((state, prev) => {
      if (state.pendingTiles.length > prevPendingCount) {
        soundManager.play('tileClick');
      }
      prevPendingCount = state.pendingTiles.length;

      // Phase change → fade wizard target. The update() loop tweens smoothly.
      if (state.phase !== prev.phase && playerRef.current) {
        playerRef.current.idleAlpha =
          state.phase === 'playing' ? WIZARD_ALPHA_PLAYING : WIZARD_ALPHA_COMBAT;
      }

      // Enemy swap (new monster spawned via nextEnemy / restart) — rebuild
      // the enemy body from its sprite. Type comparison handles both initial
      // load and progression.
      if (
        state.enemy &&
        state.enemy.type !== prev.enemy?.type &&
        enemyRef.current
      ) {
        try {
          const tex = Texture.from(state.enemy.spriteUrl);
          const body = (tex && tex !== Texture.EMPTY)
            ? buildEnemySpriteBody(tex)
            : buildEnemyFallbackBody();
          enemyRef.current.swapBody(body);
        } catch {
          enemyRef.current.swapBody(buildEnemyFallbackBody());
        }
      }

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

    playSoundForEvent(event.type);

    // While a combat event is processing for the player, briefly restore full
    // alpha so the attack/hurt animations are clearly visible even if the
    // idleAlpha is currently low (we're still in 'enemy_turn' during enemy_hurt
    // so this is mostly a defensive measure).
    if (event.type === 'player_attack' || event.type === 'player_hurt') {
      player.idleAlpha = WIZARD_ALPHA_COMBAT;
    }

    switch (event.type) {
      case 'player_attack':
        await player.play('attack');
        break;
      case 'enemy_hurt':
        await enemy.play('hurt');
        if (dmg && event.damage) {
          dmg.spawn(event.damage, enemy.baseX, enemy.baseY - 75 * scaleRef.current);
        }
        break;
      case 'enemy_attack':
        await enemy.play('attack');
        break;
      case 'player_hurt':
        await player.play('hurt');
        if (dmg && event.damage) {
          dmg.spawn(event.damage, player.baseX, player.baseY - 75 * scaleRef.current);
        }
        break;
      case 'enemy_death':
        await enemy.play('death');
        break;
      case 'player_death':
        await player.play('death');
        break;
    }

    // After player combat events resolve, re-evaluate the fade target.
    if ((event.type === 'player_attack' || event.type === 'player_hurt') && playerRef.current) {
      const currentPhase = useGameStore.getState().phase;
      playerRef.current.idleAlpha =
        currentPhase === 'playing' ? WIZARD_ALPHA_PLAYING : WIZARD_ALPHA_COMBAT;
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  );
}
