import type { WordDispute, BetaFeedback } from '../types/index.ts';

const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY;
const WEB3FORMS_URL = 'https://api.web3forms.com/submit';

const DISPUTES_KEY = 'lexica_knights_disputes';
const FEEDBACK_KEY = 'lexica_knights_feedback';

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

function emailViaWeb3Forms(subject: string, fields: Record<string, unknown>): void {
  if (!WEB3FORMS_KEY) return;
  fetch(WEB3FORMS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_KEY,
      subject,
      from_name: 'Lexica Knights Beta',
      botcheck: '',
      ...fields,
    }),
  }).catch(() => {
    // Fire-and-forget: don't block the game on network errors
  });
}

export function saveDispute(dispute: WordDispute): void {
  appendToArray(DISPUTES_KEY, dispute);
  emailViaWeb3Forms(`[Lexica Knights] Word dispute: ${dispute.word}`, {
    ...dispute,
    timestamp_iso: new Date(dispute.timestamp).toISOString(),
  });
}

export function saveFeedback(feedback: BetaFeedback): void {
  appendToArray(FEEDBACK_KEY, feedback);
  emailViaWeb3Forms(`[Lexica Knights] Feedback: ${feedback.category}`, {
    ...feedback,
    timestamp_iso: new Date(feedback.timestamp).toISOString(),
  });
}

export function getDisputes(): WordDispute[] {
  return readArray<WordDispute>(DISPUTES_KEY);
}

export function getFeedback(): BetaFeedback[] {
  return readArray<BetaFeedback>(FEEDBACK_KEY);
}
