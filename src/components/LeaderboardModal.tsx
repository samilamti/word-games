import { useState, useMemo } from 'react';
import { getRuns, sortRuns, clearRuns } from '../leaderboard/leaderboard.ts';
import type { RunRecord, SortKey } from '../leaderboard/leaderboard.ts';
import { useUI } from '../i18n/useUI.ts';

interface Props {
  onClose: () => void;
}

const SORT_KEYS: SortKey[] = ['totalDamage', 'highestSingleHit', 'longestWord', 'turns'];

export function LeaderboardModal({ onClose }: Props) {
  const ui = useUI();
  const [sortKey, setSortKey] = useState<SortKey>('totalDamage');
  const [version, setVersion] = useState(0); // force re-read after clear

  const sortMeta: Record<SortKey, { label: string; tooltip: string }> = {
    totalDamage: { label: ui.sortDamage, tooltip: ui.sortDamageTip },
    highestSingleHit: { label: ui.sortBestHit, tooltip: ui.sortBestHitTip },
    longestWord: { label: ui.sortLongest, tooltip: ui.sortLongestTip },
    turns: { label: ui.sortTurns, tooltip: ui.sortTurnsTip },
  };

  const sorted = useMemo(() => sortRuns(getRuns(), sortKey).slice(0, 10),
                         [sortKey, version]);
  const isEmpty = sorted.length === 0;

  const handleClear = () => {
    if (confirm(ui.clearLeaderboardConfirm)) {
      clearRuns();
      setVersion(v => v + 1);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 250,
        padding: 'env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          padding: '24px 28px',
          backgroundColor: '#1e1e36',
          borderRadius: 14,
          border: '2px solid #3a3a5c',
          maxWidth: 'min(520px, 92vw)',
          width: '100%',
          maxHeight: '80vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: '#ffd54f', fontSize: 22 }}>
            🏆 {ui.leaderboard}
          </h3>
          <button
            onClick={onClose}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              backgroundColor: '#333',
              color: '#ccc',
              border: '1px solid #555',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {ui.close}
          </button>
        </div>

        {/* Sort tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
          {SORT_KEYS.map(key => (
            <button
              key={key}
              onClick={() => setSortKey(key)}
              title={sortMeta[key].tooltip}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                backgroundColor: sortKey === key ? '#ff9800' : '#16162a',
                color: sortKey === key ? '#fff' : '#aaa',
                border: `1px solid ${sortKey === key ? '#ff9800' : '#3a3a5c'}`,
                borderRadius: 14,
                cursor: 'pointer',
              }}
            >
              {sortMeta[key].label}
            </button>
          ))}
        </div>

        {/* Table */}
        {isEmpty ? (
          <div
            style={{
              padding: '32px 12px',
              textAlign: 'center',
              color: '#888',
              fontStyle: 'italic',
            }}
          >
            {ui.leaderboardEmpty}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ color: '#888', borderBottom: '1px solid #3a3a5c' }}>
                <th style={{ textAlign: 'left', padding: '6px 4px' }}>#</th>
                <th style={{ textAlign: 'left', padding: '6px 4px' }}>{ui.colEnemy}</th>
                <th style={{ textAlign: 'right', padding: '6px 4px' }}>{ui.colDmg}</th>
                <th style={{ textAlign: 'right', padding: '6px 4px' }}>{ui.colBest}</th>
                <th style={{ textAlign: 'left', padding: '6px 4px' }}>{ui.colWord}</th>
                <th style={{ textAlign: 'right', padding: '6px 4px' }}>{ui.sortTurns}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r: RunRecord, i: number) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #2d2d44' }}>
                  <td style={{ padding: '6px 4px', color: i === 0 ? '#ffd54f' : '#999', fontWeight: i === 0 ? 'bold' : 'normal' }}>
                    {i + 1}
                  </td>
                  <td style={{ padding: '6px 4px', color: '#e0e0e0' }}>{r.enemyName}</td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', color: '#ff9800', fontWeight: 'bold' }}>
                    {r.totalDamage}
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', color: '#ef5350' }}>
                    {r.highestSingleHit}
                  </td>
                  <td style={{ padding: '6px 4px', color: '#4caf50' }}>
                    {r.longestWord || '—'}
                    {r.longestWord ? <span style={{ color: '#666', marginLeft: 4 }}>({r.longestWord.length})</span> : null}
                  </td>
                  <td style={{ padding: '6px 4px', textAlign: 'right', color: '#aaa' }}>{r.turns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!isEmpty && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <button
              onClick={handleClear}
              style={{
                padding: '6px 14px',
                fontSize: 12,
                backgroundColor: 'transparent',
                color: '#888',
                border: '1px solid #555',
                borderRadius: 6,
                cursor: 'pointer',
              }}
            >
              {ui.journalClearAll}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
