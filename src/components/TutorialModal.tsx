import { useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useSettingsStore } from '../store/settingsStore.ts';
import { useGameStore } from '../store/gameStore.ts';
import { useUI } from '../i18n/useUI.ts';
import type { UIStrings } from '../i18n/locales.ts';
import { BoardLegend } from './BoardLegend.tsx';
import { PremiumMarker, PREMIUM_COLORS, premiumLabel } from './PremiumMarker.tsx';

/** The intro guide, for players who have never played a tile word game.
 *
 *  Every diagram is built from the game's own markup rather than screenshots:
 *  the mini tiles and cells are the real styling at a smaller size, and the
 *  power-square step embeds the actual BoardLegend. That keeps the guide honest
 *  when the board's look changes, and keeps it wordless enough to survive
 *  translation into six languages.
 *
 *  Interruptible by design: Skip sits in the header of every step, the backdrop
 *  dismisses, and all exits run the same close path, so nobody is ever trapped
 *  in an explanation they didn't need. */

const TILE_PX = 30;

function MiniTile({ letter, points }: { letter: string; points?: number }) {
  return (
    <span
      style={{
        position: 'relative',
        width: TILE_PX,
        height: TILE_PX,
        flexShrink: 0,
        borderRadius: 3,
        backgroundColor: '#f5e6c8',
        color: '#1a1a2e',
        fontSize: TILE_PX * 0.55,
        fontWeight: 'bold',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {letter}
      {points !== undefined && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            right: 2,
            fontSize: TILE_PX * 0.26,
            fontWeight: 'normal',
            color: '#666',
          }}
        >
          {points}
        </span>
      )}
    </span>
  );
}

function MiniCell({ children, bg }: { children?: ReactNode; bg?: string }) {
  return (
    <span
      style={{
        width: TILE_PX,
        height: TILE_PX,
        flexShrink: 0,
        borderRadius: 3,
        border: '1px solid #3a3a5c',
        backgroundColor: bg ?? '#2d2d44',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </span>
  );
}

function Row({ children, gap = 4 }: { children: ReactNode; gap?: number }) {
  return (
    <div style={{ display: 'flex', gap, alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </div>
  );
}

const stageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 10,
  minHeight: 150,
  padding: '14px 8px',
  backgroundColor: '#16162a',
  borderRadius: 10,
  border: '1px solid #2d2d44',
};

/** Step 1 — letters move from the rack onto the board. */
function SpellDiagram() {
  return (
    <div style={stageStyle}>
      <Row>
        <MiniTile letter="W" points={4} />
        <MiniTile letter="O" points={1} />
        <MiniTile letter="R" points={1} />
        <MiniTile letter="D" points={2} />
      </Row>
      <span style={{ fontSize: 20, color: '#ff9800' }}>↓</span>
      <Row>
        <MiniCell />
        <MiniCell bg="#f5e6c8">
          <span style={{ color: '#1a1a2e', fontWeight: 'bold', fontSize: TILE_PX * 0.55 }}>W</span>
        </MiniCell>
        <MiniCell bg="#f5e6c8">
          <span style={{ color: '#1a1a2e', fontWeight: 'bold', fontSize: TILE_PX * 0.55 }}>O</span>
        </MiniCell>
        <MiniCell />
        <MiniCell />
      </Row>
    </div>
  );
}

/** Step 2 — a submitted word becomes damage. */
function AttackDiagram({ enemySprite }: { enemySprite: string }) {
  return (
    <div style={stageStyle}>
      <Row>
        <MiniTile letter="S" />
        <MiniTile letter="L" />
        <MiniTile letter="A" />
        <MiniTile letter="Y" />
        <span style={{ fontSize: 20, margin: '0 4px' }}>⚔️</span>
        <span style={{ position: 'relative', display: 'inline-flex' }}>
          <img
            src={enemySprite}
            alt=""
            style={{ width: 56, height: 56, objectFit: 'contain' }}
            onError={e => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <span
            style={{
              position: 'absolute',
              top: -4,
              right: -12,
              fontSize: 17,
              fontWeight: 'bold',
              color: '#ff9800',
              textShadow: '0 2px 6px rgba(0,0,0,0.8)',
            }}
          >
            −27
          </span>
        </span>
      </Row>
    </div>
  );
}

/** Step 3 — the key to the coloured squares. */
function PremiumDiagram() {
  return (
    <div style={{ ...stageStyle, alignItems: 'flex-start', padding: '14px 18px' }}>
      <BoardLegend />
    </div>
  );
}

/** Step 4 — the first word covers the star; later words must touch it. */
function ConnectDiagram({ ui }: { ui: UIStrings }) {
  const centerLabel = premiumLabel('CENTER', ui);
  return (
    <div style={stageStyle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row>
          <MiniCell />
          <MiniCell bg="#f5e6c8">
            <span style={{ color: '#1a1a2e', fontWeight: 'bold', fontSize: TILE_PX * 0.5 }}>C</span>
          </MiniCell>
          <MiniCell />
        </Row>
        <Row>
          <MiniCell bg="#f5e6c8">
            <span style={{ color: '#1a1a2e', fontWeight: 'bold', fontSize: TILE_PX * 0.5 }}>A</span>
          </MiniCell>
          <MiniCell bg={PREMIUM_COLORS.CENTER}>
            <PremiumMarker type="CENTER" label={centerLabel} size={TILE_PX} />
          </MiniCell>
          <MiniCell bg="#f5e6c8">
            <span style={{ color: '#1a1a2e', fontWeight: 'bold', fontSize: TILE_PX * 0.5 }}>E</span>
          </MiniCell>
        </Row>
        <Row>
          <MiniCell />
          <MiniCell bg="#f5e6c8">
            <span style={{ color: '#1a1a2e', fontWeight: 'bold', fontSize: TILE_PX * 0.5 }}>T</span>
          </MiniCell>
          <MiniCell />
        </Row>
      </div>
    </div>
  );
}

function MiniHpBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ width: '70%', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 12, color: '#aaa', width: 52, flexShrink: 0 }}>{label}</span>
      <span
        style={{
          flex: 1,
          height: 12,
          borderRadius: 6,
          backgroundColor: '#2d2d44',
          border: '1px solid #3a3a5c',
          overflow: 'hidden',
        }}
      >
        <span
          style={{
            display: 'block',
            width: `${pct}%`,
            height: '100%',
            backgroundColor: color,
          }}
        />
      </span>
    </div>
  );
}

/** Step 5 — the race between two health bars. "HP" matches the label the combat
 *  HUD already uses in every locale, so it stays recognisable on the real board. */
function BattleDiagram() {
  return (
    <div style={stageStyle}>
      <MiniHpBar label="HP" pct={78} color="#4caf50" />
      <span style={{ fontSize: 18, color: '#ff9800' }}>⚔️</span>
      <MiniHpBar label="HP" pct={22} color="#ef5350" />
    </div>
  );
}

interface Step {
  title: string;
  body: string;
  visual: ReactNode;
}

export function TutorialModal() {
  const open = useSettingsStore(s => s.tutorialOpen);
  const closeTutorial = useSettingsStore(s => s.closeTutorial);
  const reduceMotion = useSettingsStore(s => s.reduceMotion);
  const enemySprite = useGameStore(s => s.enemy?.spriteUrl ?? 'enemies/goblin.png');
  const ui = useUI();
  const [index, setIndex] = useState(0);

  if (!open) return null;

  const steps: Step[] = [
    { title: ui.tutSpellTitle, body: ui.tutSpellBody, visual: <SpellDiagram /> },
    {
      title: ui.tutAttackTitle,
      body: ui.tutAttackBody,
      visual: <AttackDiagram enemySprite={enemySprite} />,
    },
    { title: ui.tutPremiumTitle, body: ui.tutPremiumBody, visual: <PremiumDiagram /> },
    { title: ui.tutConnectTitle, body: ui.tutConnectBody, visual: <ConnectDiagram ui={ui} /> },
    { title: ui.tutBattleTitle, body: ui.tutBattleBody, visual: <BattleDiagram /> },
  ];

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const finish = () => {
    setIndex(0);
    closeTutorial();
  };

  return (
    <div
      onClick={finish}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.78)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        // Above every other modal: the guide can open over a fresh board while
        // the enemy toast is still on screen.
        zIndex: 280,
        padding:
          'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          padding: '20px 24px 24px',
          backgroundColor: '#1e1e36',
          borderRadius: 14,
          border: '2px solid #3a3a5c',
          maxWidth: 'min(460px, 92vw)',
          width: '100%',
          maxHeight: '86vh',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 12,
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 12, color: '#888' }}>
            {ui.tutStepOf.replace('{n}', String(index + 1)).replace('{total}', String(steps.length))}
          </span>
          <button onClick={finish} style={skipBtn}>
            {ui.tutSkip}
          </button>
        </div>

        <div
          // Remounting per step replays the fade; under reduce-motion the key is
          // held constant so the content simply swaps.
          key={reduceMotion ? 'static' : index}
          style={{
            animation: reduceMotion ? undefined : 'definitionToast 0.36s ease-out',
            animationFillMode: 'backwards',
          }}
        >
          {step.visual}
          <h3 style={{ margin: '16px 0 8px', color: '#ffd54f', fontSize: 20 }}>{step.title}</h3>
          <p style={{ margin: 0, color: '#ccc', fontSize: 15, lineHeight: 1.5 }}>{step.body}</p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginTop: 20,
          }}
        >
          <button
            onClick={() => setIndex(i => Math.max(0, i - 1))}
            disabled={index === 0}
            style={{ ...skipBtn, opacity: index === 0 ? 0.35 : 1 }}
          >
            {ui.tutBack}
          </button>

          <div style={{ display: 'flex', gap: 6 }} aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  backgroundColor: i === index ? '#ff9800' : '#3a3a5c',
                }}
              />
            ))}
          </div>

          <button onClick={isLast ? finish : () => setIndex(i => i + 1)} style={primaryBtn}>
            {isLast ? ui.tutFight : ui.tutNext}
          </button>
        </div>
      </div>
    </div>
  );
}

const skipBtn: CSSProperties = {
  padding: '6px 14px',
  fontSize: 13,
  backgroundColor: '#333',
  color: '#ccc',
  border: '1px solid #555',
  borderRadius: 6,
  cursor: 'pointer',
};

const primaryBtn: CSSProperties = {
  padding: '10px 22px',
  fontSize: 15,
  fontWeight: 'bold',
  backgroundColor: '#ff9800',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
};
