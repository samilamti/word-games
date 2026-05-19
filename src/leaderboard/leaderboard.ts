/**
 * Local high-score leaderboard, per-device, localStorage-backed.
 *
 * A "run" is a single completed battle where the player defeated the enemy.
 * Each run records the player's performance metrics so they can compare
 * later runs against their best.
 *
 * This is intentionally local-only (no network, no iOS capabilities). If we
 * decide to ship Game Center cross-device leaderboards later, the recordRun
 * call becomes the natural place to also submit to Game Center.
 */

export interface RunRecord {
  id: string;
  timestamp: number;
  enemyType: string;
  enemyName: string;
  enemyIndex: number;
  totalDamage: number;
  turns: number;
  longestWord: string;
  highestSingleHit: number;
}

const STORAGE_KEY = 'lexica_knights_runs';
const MAX_ENTRIES = 50;

export function getRuns(): RunRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordRun(record: Omit<RunRecord, 'id'>): RunRecord {
  const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
  const entry: RunRecord = { id, ...record };
  const all = getRuns();
  all.push(entry);
  // Keep newest 50.
  all.sort((a, b) => b.timestamp - a.timestamp);
  const capped = all.slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  } catch {
    // localStorage may be full or unavailable; fail silently — leaderboard
    // is a nice-to-have, not core gameplay.
  }
  return entry;
}

export type SortKey =
  | 'totalDamage'
  | 'turns'           // lower = better
  | 'longestWord'     // by length
  | 'highestSingleHit';

export function sortRuns(runs: RunRecord[], key: SortKey): RunRecord[] {
  const copy = [...runs];
  copy.sort((a, b) => {
    if (key === 'turns') return a.turns - b.turns;
    if (key === 'longestWord') return b.longestWord.length - a.longestWord.length;
    return (b[key] as number) - (a[key] as number);
  });
  return copy;
}

export function clearRuns(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
