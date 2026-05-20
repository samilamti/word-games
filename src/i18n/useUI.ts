import { useGameStore } from '../store/gameStore.ts';
import { LOCALES } from './locales.ts';
import type { UIStrings } from './locales.ts';

/** Subscribe to the current locale's UI string bundle. Re-renders when the
 *  player switches languages. */
export function useUI(): UIStrings {
  const locale = useGameStore(s => s.locale);
  return LOCALES[locale].ui;
}
