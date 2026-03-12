import type { WordDispute, BetaFeedback } from '../types/index.ts';

// Set this to your server endpoint to enable remote storage.
// Leave empty to only use localStorage.
const FEEDBACK_API_URL = '';

const DISPUTES_KEY = 'lexicon_quest_disputes';
const FEEDBACK_KEY = 'lexicon_quest_feedback';

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function appendToArray<T>(key: string, item: T): void {
  const arr = readArray<T>(key);
  arr.push(item);
  localStorage.setItem(key, JSON.stringify(arr));
}

function postToRemote(path: string, payload: unknown): void {
  if (!FEEDBACK_API_URL) return;
  fetch(`${FEEDBACK_API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Fire-and-forget: don't block the game on network errors
  });
}

export function saveDispute(dispute: WordDispute): void {
  appendToArray(DISPUTES_KEY, dispute);
  postToRemote('/disputes', dispute);
}

export function saveFeedback(feedback: BetaFeedback): void {
  appendToArray(FEEDBACK_KEY, feedback);
  postToRemote('/feedback', feedback);
}

export function getDisputes(): WordDispute[] {
  return readArray<WordDispute>(DISPUTES_KEY);
}

export function getFeedback(): BetaFeedback[] {
  return readArray<BetaFeedback>(FEEDBACK_KEY);
}
