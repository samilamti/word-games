/**
 * Locale definitions for Lexica Knights.
 *
 * Each locale provides:
 *   - the Scrabble-standard tile distribution for that language
 *   - point values per letter
 *   - UI string translations
 *   - the URL to fetch the dictionary from
 *
 * Tile distributions follow the Wikipedia "Scrabble letter distributions"
 * standards (https://en.wikipedia.org/wiki/Scrabble_letter_distributions).
 * Blank/wild tiles are tracked separately on the rack/bag side.
 */

export type LocaleCode = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it';

export interface LetterDef {
  letter: string;
  count: number;
  points: number;
  tier: 'common' | 'uncommon' | 'rare' | 'legendary';
}

export interface UIStrings {
  appTitle: string;
  yourTurn: string;
  submitWord: string;
  recall: string;
  betaFeedback: string;
  leaderboard: string;
  language: string;
  playAgain: string;
  restart: string;
  nextEnemy: string;
  victory: string;
  defeated: string;
  campaignComplete: string;
  victoryBody: string;
  victoryFinalBody: string;
  defeatedBody: string;
  aWild: string;
  appears: string;
  loadingDictionary: string;
  tilesLeft: string;
  dispute: string;
  noTilesInRack: string;
  invalidWord: string;
  exchange: string;
  confirmExchange: string; // {n}
  pass: string;
  cancel: string;
  tilesSwapped: string; // {n}
  passedTurn: string;
  enemyPlays: string; // {name}, {word}, {n}
  enemyForfeits: string; // {name}
  // Settings
  settings: string;
  reduceMotion: string;
  soundEffects: string;
  haptics: string;
  // Generic
  close: string;
  done: string;
  remove: string;
  review: string;
  // Definitions (toast)
  defInEnglish: string;
  defOf: string; // connector in "{tags} of <lemma>"
  defFormOf: string;
  save: string;
  saved: string;
  saveToJournal: string;
  savedToJournal: string;
  // Journal
  journalTitle: string;
  journalWord: string;
  journalWords: string;
  journalDue: string;
  journalSearch: string;
  journalEmpty: string;
  journalNoMatches: string;
  journalClearAll: string;
  journalClearConfirm: string;
  // Review
  reviewShowAnswer: string;
  reviewAgain: string;
  reviewGood: string;
  reviewEasy: string;
  reviewNoneDue: string;
  reviewDoneOne: string;
  reviewDoneMany: string; // {n}
  // Paywall
  paywallHeadlineCampaign: string;
  paywallHeadlineJournal: string;
  paywallHeadlineDefault: string;
  paywallSubtitle: string;
  paywallFeatureCampaign: string;
  paywallFeatureJournal: string;
  paywallFeatureReview: string;
  paywallFeatureVocab: string;
  paywallPriceFallback: string;
  paywallBuy: string;
  paywallBuying: string;
  paywallRestore: string;
  paywallRestoring: string;
  paywallLater: string;
  paywallFooter: string;
  paywallErrorBuy: string;
  paywallErrorRestore: string;
  paywallErrorGeneric: string;
}

export interface LocaleDef {
  code: LocaleCode;
  name: string;          // English label (e.g. "English")
  nativeName: string;    // Native label (e.g. "Español", "Deutsch")
  flag: string;          // Emoji flag for the picker
  letters: LetterDef[];  // tile distribution
  wildCount: number;     // number of blank tiles
  dictUrl: string;       // public path or CDN URL for the word list
  ui: UIStrings;
}

// ─── English (Scrabble TWL/SOWPODS) ───────────────────────────────────────

const EN: LocaleDef = {
  code: 'en',
  name: 'English',
  nativeName: 'English',
  flag: '🇬🇧',
  wildCount: 2,
  dictUrl: 'dictionaries/en.txt',
  letters: [
    { letter: 'A', count: 9, points: 1, tier: 'common' },
    { letter: 'E', count: 12, points: 1, tier: 'common' },
    { letter: 'I', count: 9, points: 1, tier: 'common' },
    { letter: 'O', count: 8, points: 1, tier: 'common' },
    { letter: 'U', count: 4, points: 1, tier: 'common' },
    { letter: 'L', count: 4, points: 1, tier: 'common' },
    { letter: 'N', count: 6, points: 1, tier: 'common' },
    { letter: 'R', count: 6, points: 1, tier: 'common' },
    { letter: 'S', count: 4, points: 1, tier: 'common' },
    { letter: 'T', count: 6, points: 1, tier: 'common' },
    { letter: 'D', count: 4, points: 2, tier: 'uncommon' },
    { letter: 'G', count: 3, points: 2, tier: 'uncommon' },
    { letter: 'B', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'C', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'M', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'P', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'F', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'H', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'V', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'W', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'Y', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'K', count: 1, points: 5, tier: 'rare' },
    { letter: 'J', count: 1, points: 8, tier: 'rare' },
    { letter: 'X', count: 1, points: 8, tier: 'rare' },
    { letter: 'Q', count: 1, points: 10, tier: 'legendary' },
    { letter: 'Z', count: 1, points: 10, tier: 'legendary' },
  ],
  ui: {
    appTitle: 'LEXICA KNIGHTS',
    yourTurn: 'Your turn — spell a word!',
    submitWord: 'Submit Word',
    recall: 'Recall',
    betaFeedback: 'Beta Feedback',
    leaderboard: 'Leaderboard',
    language: 'Language',
    playAgain: 'Play Again',
    restart: 'Restart',
    nextEnemy: 'Next Enemy',
    victory: 'VICTORY!',
    defeated: 'DEFEATED',
    campaignComplete: 'CAMPAIGN COMPLETE!',
    victoryBody: 'The enemy has been vanquished. A new challenger approaches…',
    victoryFinalBody: 'You have vanquished every foe with your words.',
    defeatedBody: 'Your words were not strong enough...',
    aWild: 'A WILD',
    appears: 'APPEARS!',
    loadingDictionary: 'Loading dictionary…',
    tilesLeft: 'tiles left',
    dispute: 'Dispute!',
    noTilesInRack: 'No tiles in rack',
    invalidWord: 'is not a valid word',
    exchange: 'Exchange',
    confirmExchange: 'Confirm Exchange ({n})',
    pass: 'Pass',
    cancel: 'Cancel',
    tilesSwapped: 'Swapped {n} tiles. Enemy\'s turn!',
    passedTurn: 'You passed your turn. Enemy\'s turn!',
    enemyPlays: '{name} plays {word} for {n}!',
    enemyForfeits: '{name} reshuffles its hand.',
    settings: 'Settings',
    reduceMotion: 'Reduce motion',
    soundEffects: 'Sound effects',
    haptics: 'Vibration',
    close: 'Close',
    done: 'Done',
    remove: 'Remove',
    review: 'Review',
    defInEnglish: 'Definition shown in English',
    defOf: 'of',
    defFormOf: 'form of',
    save: 'Save',
    saved: 'Saved',
    saveToJournal: 'Save to journal',
    savedToJournal: 'Saved to journal',
    journalTitle: 'Word Journal',
    journalWord: 'word',
    journalWords: 'words',
    journalDue: 'due',
    journalSearch: 'Search saved words…',
    journalEmpty: 'No saved words yet. Tap “★ Save” on a definition to start your journal.',
    journalNoMatches: 'No matches.',
    journalClearAll: 'Clear All',
    journalClearConfirm: 'Clear the entire word journal on this device? This cannot be undone.',
    reviewShowAnswer: 'Show answer',
    reviewAgain: 'Again',
    reviewGood: 'Good',
    reviewEasy: 'Easy',
    reviewNoneDue: 'No words are due for review right now.',
    reviewDoneOne: 'Reviewed 1 word!',
    reviewDoneMany: 'Reviewed {n} words!',
    paywallHeadlineCampaign: 'Unlock the full campaign',
    paywallHeadlineJournal: 'Unlock your word journal',
    paywallHeadlineDefault: 'Unlock everything',
    paywallSubtitle: 'One purchase. Yours forever, on this device.',
    paywallFeatureCampaign: '⚔️ The full campaign — enemies 3, 4 & 5',
    paywallFeatureJournal: '📖 Word journal — save every word you play',
    paywallFeatureReview: '🧠 Spaced-repetition review & quizzes',
    paywallFeatureVocab: '🌍 Per-language vocabulary tracking',
    paywallPriceFallback: 'One-time purchase',
    paywallBuy: 'Unlock',
    paywallBuying: 'Unlocking…',
    paywallRestore: 'Restore purchase',
    paywallRestoring: 'Restoring…',
    paywallLater: 'Maybe later',
    paywallFooter: 'All 6 languages and live definitions are always free.',
    paywallErrorBuy: 'Purchase was not completed.',
    paywallErrorRestore: 'No previous purchase found to restore.',
    paywallErrorGeneric: 'Something went wrong. Please try again.',
  },
};

// ─── Spanish (Scrabble Spanish standard) ──────────────────────────────────
// Note: standard Spanish Scrabble has CH, LL, RR as digraph tiles. For v1
// we treat them as their individual letter equivalents and let the dict
// handle Ñ as a separate letter (it IS a separate Scrabble tile).

const ES: LocaleDef = {
  code: 'es',
  name: 'Spanish',
  nativeName: 'Español',
  flag: '🇪🇸',
  wildCount: 2,
  dictUrl: 'dictionaries/es.txt',
  letters: [
    { letter: 'A', count: 12, points: 1, tier: 'common' },
    { letter: 'E', count: 12, points: 1, tier: 'common' },
    { letter: 'I', count: 6, points: 1, tier: 'common' },
    { letter: 'O', count: 9, points: 1, tier: 'common' },
    { letter: 'U', count: 5, points: 1, tier: 'common' },
    { letter: 'L', count: 4, points: 1, tier: 'common' },
    { letter: 'N', count: 5, points: 1, tier: 'common' },
    { letter: 'R', count: 5, points: 1, tier: 'common' },
    { letter: 'S', count: 6, points: 1, tier: 'common' },
    { letter: 'T', count: 4, points: 1, tier: 'common' },
    { letter: 'C', count: 4, points: 2, tier: 'uncommon' },
    { letter: 'D', count: 5, points: 2, tier: 'uncommon' },
    { letter: 'G', count: 2, points: 2, tier: 'uncommon' },
    { letter: 'B', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'M', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'P', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'H', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'F', count: 1, points: 4, tier: 'uncommon' },
    { letter: 'V', count: 1, points: 4, tier: 'uncommon' },
    { letter: 'Y', count: 1, points: 4, tier: 'uncommon' },
    { letter: 'Q', count: 1, points: 5, tier: 'rare' },
    { letter: 'J', count: 1, points: 8, tier: 'rare' },
    { letter: 'Ñ', count: 1, points: 8, tier: 'rare' },
    { letter: 'X', count: 1, points: 8, tier: 'rare' },
    { letter: 'Z', count: 1, points: 10, tier: 'legendary' },
  ],
  ui: {
    appTitle: 'LEXICA KNIGHTS',
    yourTurn: 'Tu turno — ¡forma una palabra!',
    submitWord: 'Enviar Palabra',
    recall: 'Recuperar',
    betaFeedback: 'Comentarios',
    leaderboard: 'Clasificación',
    language: 'Idioma',
    playAgain: 'Jugar de nuevo',
    restart: 'Reiniciar',
    nextEnemy: 'Siguiente Enemigo',
    victory: '¡VICTORIA!',
    defeated: 'DERROTADO',
    campaignComplete: '¡CAMPAÑA COMPLETADA!',
    victoryBody: 'El enemigo ha sido vencido. Un nuevo rival se aproxima…',
    victoryFinalBody: 'Has vencido a todos los enemigos con tus palabras.',
    defeatedBody: 'Tus palabras no fueron lo suficientemente fuertes...',
    aWild: 'UN SALVAJE',
    appears: '¡APARECE!',
    loadingDictionary: 'Cargando diccionario…',
    tilesLeft: 'fichas restantes',
    dispute: '¡Disputar!',
    noTilesInRack: 'Sin fichas en el atril',
    invalidWord: 'no es una palabra válida',
    exchange: 'Cambiar',
    confirmExchange: 'Confirmar cambio ({n})',
    pass: 'Pasar',
    cancel: 'Cancelar',
    tilesSwapped: 'Cambiaste {n} fichas. ¡Turno del enemigo!',
    passedTurn: 'Pasaste tu turno. ¡Turno del enemigo!',
    enemyPlays: '¡{name} juega {word} por {n}!',
    enemyForfeits: '{name} baraja sus fichas de nuevo.',
    settings: 'Ajustes',
    reduceMotion: 'Reducir movimiento',
    soundEffects: 'Efectos de sonido',
    haptics: 'Vibración',
    close: 'Cerrar',
    done: 'Listo',
    remove: 'Eliminar',
    review: 'Repasar',
    defInEnglish: 'Definición en inglés',
    defOf: 'de',
    defFormOf: 'forma de',
    save: 'Guardar',
    saved: 'Guardado',
    saveToJournal: 'Guardar en el diario',
    savedToJournal: 'Guardado en el diario',
    journalTitle: 'Diario de palabras',
    journalWord: 'palabra',
    journalWords: 'palabras',
    journalDue: 'pendientes',
    journalSearch: 'Buscar palabras guardadas…',
    journalEmpty: 'Aún no hay palabras guardadas. Toca “★ Guardar” en una definición para empezar tu diario.',
    journalNoMatches: 'Sin resultados.',
    journalClearAll: 'Borrar todo',
    journalClearConfirm: '¿Borrar todo el diario de palabras de este dispositivo? Esto no se puede deshacer.',
    reviewShowAnswer: 'Mostrar respuesta',
    reviewAgain: 'Otra vez',
    reviewGood: 'Bien',
    reviewEasy: 'Fácil',
    reviewNoneDue: 'No hay palabras para repasar ahora mismo.',
    reviewDoneOne: '¡1 palabra repasada!',
    reviewDoneMany: '¡{n} palabras repasadas!',
    paywallHeadlineCampaign: 'Desbloquea la campaña completa',
    paywallHeadlineJournal: 'Desbloquea tu diario de palabras',
    paywallHeadlineDefault: 'Desbloquéalo todo',
    paywallSubtitle: 'Una compra. Tuyo para siempre, en este dispositivo.',
    paywallFeatureCampaign: '⚔️ La campaña completa: enemigos 3, 4 y 5',
    paywallFeatureJournal: '📖 Diario de palabras: guarda cada palabra que juegas',
    paywallFeatureReview: '🧠 Repaso espaciado y cuestionarios',
    paywallFeatureVocab: '🌍 Seguimiento de vocabulario por idioma',
    paywallPriceFallback: 'Compra única',
    paywallBuy: 'Desbloquear',
    paywallBuying: 'Desbloqueando…',
    paywallRestore: 'Restaurar compra',
    paywallRestoring: 'Restaurando…',
    paywallLater: 'Quizás más tarde',
    paywallFooter: 'Los 6 idiomas y las definiciones en directo son siempre gratis.',
    paywallErrorBuy: 'La compra no se completó.',
    paywallErrorRestore: 'No se encontró ninguna compra previa para restaurar.',
    paywallErrorGeneric: 'Algo salió mal. Inténtalo de nuevo.',
  },
};

// ─── French (Scrabble French standard / ODS) ──────────────────────────────

const FR: LocaleDef = {
  code: 'fr',
  name: 'French',
  nativeName: 'Français',
  flag: '🇫🇷',
  wildCount: 2,
  dictUrl: 'dictionaries/fr.txt',
  letters: [
    { letter: 'A', count: 9, points: 1, tier: 'common' },
    { letter: 'E', count: 15, points: 1, tier: 'common' },
    { letter: 'I', count: 8, points: 1, tier: 'common' },
    { letter: 'O', count: 6, points: 1, tier: 'common' },
    { letter: 'U', count: 6, points: 1, tier: 'common' },
    { letter: 'L', count: 5, points: 1, tier: 'common' },
    { letter: 'N', count: 6, points: 1, tier: 'common' },
    { letter: 'R', count: 6, points: 1, tier: 'common' },
    { letter: 'S', count: 6, points: 1, tier: 'common' },
    { letter: 'T', count: 6, points: 1, tier: 'common' },
    { letter: 'D', count: 3, points: 2, tier: 'uncommon' },
    { letter: 'G', count: 2, points: 2, tier: 'uncommon' },
    { letter: 'M', count: 3, points: 2, tier: 'uncommon' },
    { letter: 'B', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'C', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'P', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'F', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'H', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'V', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'J', count: 1, points: 8, tier: 'rare' },
    { letter: 'K', count: 1, points: 10, tier: 'legendary' },
    { letter: 'Q', count: 1, points: 8, tier: 'rare' },
    { letter: 'W', count: 1, points: 10, tier: 'legendary' },
    { letter: 'X', count: 1, points: 10, tier: 'legendary' },
    { letter: 'Y', count: 1, points: 10, tier: 'legendary' },
    { letter: 'Z', count: 1, points: 10, tier: 'legendary' },
  ],
  ui: {
    appTitle: 'LEXICA KNIGHTS',
    yourTurn: 'À toi — épelle un mot !',
    submitWord: 'Soumettre le mot',
    recall: 'Rappeler',
    betaFeedback: 'Commentaires',
    leaderboard: 'Classement',
    language: 'Langue',
    playAgain: 'Rejouer',
    restart: 'Redémarrer',
    nextEnemy: 'Ennemi suivant',
    victory: 'VICTOIRE !',
    defeated: 'VAINCU',
    campaignComplete: 'CAMPAGNE TERMINÉE !',
    victoryBody: 'L\'ennemi a été vaincu. Un nouveau challenger approche…',
    victoryFinalBody: 'Tu as vaincu tous les ennemis avec tes mots.',
    defeatedBody: 'Tes mots n\'étaient pas assez forts...',
    aWild: 'UN SAUVAGE',
    appears: 'APPARAÎT !',
    loadingDictionary: 'Chargement du dictionnaire…',
    tilesLeft: 'jetons restants',
    dispute: 'Contester !',
    noTilesInRack: 'Aucun jeton sur le chevalet',
    invalidWord: 'n\'est pas un mot valide',
    exchange: 'Échanger',
    confirmExchange: 'Confirmer l\'échange ({n})',
    pass: 'Passer',
    cancel: 'Annuler',
    tilesSwapped: '{n} jetons échangés. Au tour de l\'ennemi !',
    passedTurn: 'Tu as passé ton tour. Au tour de l\'ennemi !',
    enemyPlays: '{name} joue {word} pour {n} !',
    enemyForfeits: '{name} rebrasse sa main.',
    settings: 'Paramètres',
    reduceMotion: 'Réduire les animations',
    soundEffects: 'Effets sonores',
    haptics: 'Vibrations',
    close: 'Fermer',
    done: 'Terminé',
    remove: 'Supprimer',
    review: 'Réviser',
    defInEnglish: 'Définition en anglais',
    defOf: 'de',
    defFormOf: 'forme de',
    save: 'Enregistrer',
    saved: 'Enregistré',
    saveToJournal: 'Enregistrer au journal',
    savedToJournal: 'Enregistré au journal',
    journalTitle: 'Journal de mots',
    journalWord: 'mot',
    journalWords: 'mots',
    journalDue: 'à réviser',
    journalSearch: 'Rechercher des mots…',
    journalEmpty: 'Aucun mot enregistré. Touche « ★ Enregistrer » sur une définition pour commencer ton journal.',
    journalNoMatches: 'Aucun résultat.',
    journalClearAll: 'Tout effacer',
    journalClearConfirm: 'Effacer tout le journal de mots sur cet appareil ? Cette action est irréversible.',
    reviewShowAnswer: 'Voir la réponse',
    reviewAgain: 'Encore',
    reviewGood: 'Bien',
    reviewEasy: 'Facile',
    reviewNoneDue: 'Aucun mot à réviser pour le moment.',
    reviewDoneOne: '1 mot révisé !',
    reviewDoneMany: '{n} mots révisés !',
    paywallHeadlineCampaign: 'Débloque la campagne complète',
    paywallHeadlineJournal: 'Débloque ton journal de mots',
    paywallHeadlineDefault: 'Tout débloquer',
    paywallSubtitle: 'Un seul achat. À toi pour toujours, sur cet appareil.',
    paywallFeatureCampaign: '⚔️ La campagne complète — ennemis 3, 4 et 5',
    paywallFeatureJournal: '📖 Journal de mots — enregistre chaque mot joué',
    paywallFeatureReview: '🧠 Révision espacée et quiz',
    paywallFeatureVocab: '🌍 Suivi du vocabulaire par langue',
    paywallPriceFallback: 'Achat unique',
    paywallBuy: 'Débloquer',
    paywallBuying: 'Déblocage…',
    paywallRestore: 'Restaurer l\'achat',
    paywallRestoring: 'Restauration…',
    paywallLater: 'Plus tard',
    paywallFooter: 'Les 6 langues et les définitions en direct sont toujours gratuites.',
    paywallErrorBuy: 'L\'achat n\'a pas été finalisé.',
    paywallErrorRestore: 'Aucun achat précédent à restaurer.',
    paywallErrorGeneric: 'Une erreur s\'est produite. Réessaie.',
  },
};

// ─── German (Scrabble German standard) ────────────────────────────────────

const DE: LocaleDef = {
  code: 'de',
  name: 'German',
  nativeName: 'Deutsch',
  flag: '🇩🇪',
  wildCount: 2,
  dictUrl: 'dictionaries/de.txt',
  letters: [
    { letter: 'A', count: 5, points: 1, tier: 'common' },
    { letter: 'E', count: 15, points: 1, tier: 'common' },
    { letter: 'I', count: 6, points: 1, tier: 'common' },
    { letter: 'N', count: 9, points: 1, tier: 'common' },
    { letter: 'R', count: 6, points: 1, tier: 'common' },
    { letter: 'S', count: 7, points: 1, tier: 'common' },
    { letter: 'T', count: 6, points: 1, tier: 'common' },
    { letter: 'U', count: 6, points: 1, tier: 'common' },
    { letter: 'D', count: 4, points: 1, tier: 'common' },
    { letter: 'G', count: 3, points: 2, tier: 'uncommon' },
    { letter: 'H', count: 4, points: 2, tier: 'uncommon' },
    { letter: 'L', count: 3, points: 2, tier: 'uncommon' },
    { letter: 'M', count: 4, points: 3, tier: 'uncommon' },
    { letter: 'O', count: 3, points: 2, tier: 'uncommon' },
    { letter: 'B', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'W', count: 1, points: 3, tier: 'uncommon' },
    { letter: 'Z', count: 1, points: 3, tier: 'uncommon' },
    { letter: 'C', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'F', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'K', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'P', count: 1, points: 4, tier: 'uncommon' },
    { letter: 'Ä', count: 1, points: 6, tier: 'rare' },
    { letter: 'J', count: 1, points: 6, tier: 'rare' },
    { letter: 'Ü', count: 1, points: 6, tier: 'rare' },
    { letter: 'V', count: 1, points: 6, tier: 'rare' },
    { letter: 'Ö', count: 1, points: 8, tier: 'rare' },
    { letter: 'X', count: 1, points: 8, tier: 'rare' },
    { letter: 'Q', count: 1, points: 10, tier: 'legendary' },
    { letter: 'Y', count: 1, points: 10, tier: 'legendary' },
  ],
  ui: {
    appTitle: 'LEXICA KNIGHTS',
    yourTurn: 'Du bist dran — bilde ein Wort!',
    submitWord: 'Wort einreichen',
    recall: 'Zurück',
    betaFeedback: 'Feedback',
    leaderboard: 'Bestenliste',
    language: 'Sprache',
    playAgain: 'Nochmal spielen',
    restart: 'Neustart',
    nextEnemy: 'Nächster Gegner',
    victory: 'SIEG!',
    defeated: 'BESIEGT',
    campaignComplete: 'KAMPAGNE BEENDET!',
    victoryBody: 'Der Feind ist besiegt. Ein neuer Herausforderer naht…',
    victoryFinalBody: 'Du hast jeden Feind mit deinen Worten besiegt.',
    defeatedBody: 'Deine Worte waren nicht stark genug...',
    aWild: 'EIN WILDER',
    appears: 'ERSCHEINT!',
    loadingDictionary: 'Wörterbuch wird geladen…',
    tilesLeft: 'Steine übrig',
    dispute: 'Anfechten!',
    noTilesInRack: 'Keine Steine im Halter',
    invalidWord: 'ist kein gültiges Wort',
    exchange: 'Tauschen',
    confirmExchange: 'Tausch bestätigen ({n})',
    pass: 'Passen',
    cancel: 'Abbrechen',
    tilesSwapped: '{n} Steine getauscht. Gegner ist dran!',
    passedTurn: 'Du hast ausgesetzt. Gegner ist dran!',
    enemyPlays: '{name} spielt {word} für {n}!',
    enemyForfeits: '{name} mischt seine Steine neu.',
    settings: 'Einstellungen',
    reduceMotion: 'Bewegung reduzieren',
    soundEffects: 'Soundeffekte',
    haptics: 'Vibration',
    close: 'Schließen',
    done: 'Fertig',
    remove: 'Entfernen',
    review: 'Wiederholen',
    defInEnglish: 'Definition auf Englisch',
    defOf: 'von',
    defFormOf: 'Form von',
    save: 'Speichern',
    saved: 'Gespeichert',
    saveToJournal: 'Im Journal speichern',
    savedToJournal: 'Im Journal gespeichert',
    journalTitle: 'Wort-Journal',
    journalWord: 'Wort',
    journalWords: 'Wörter',
    journalDue: 'fällig',
    journalSearch: 'Gespeicherte Wörter suchen…',
    journalEmpty: 'Noch keine Wörter gespeichert. Tippe bei einer Definition auf „★ Speichern“, um dein Journal zu starten.',
    journalNoMatches: 'Keine Treffer.',
    journalClearAll: 'Alle löschen',
    journalClearConfirm: 'Das gesamte Wort-Journal auf diesem Gerät löschen? Dies kann nicht rückgängig gemacht werden.',
    reviewShowAnswer: 'Antwort zeigen',
    reviewAgain: 'Nochmal',
    reviewGood: 'Gut',
    reviewEasy: 'Leicht',
    reviewNoneDue: 'Momentan sind keine Wörter zur Wiederholung fällig.',
    reviewDoneOne: '1 Wort wiederholt!',
    reviewDoneMany: '{n} Wörter wiederholt!',
    paywallHeadlineCampaign: 'Schalte die ganze Kampagne frei',
    paywallHeadlineJournal: 'Schalte dein Wort-Journal frei',
    paywallHeadlineDefault: 'Alles freischalten',
    paywallSubtitle: 'Ein Kauf. Für immer deins, auf diesem Gerät.',
    paywallFeatureCampaign: '⚔️ Die ganze Kampagne – Gegner 3, 4 & 5',
    paywallFeatureJournal: '📖 Wort-Journal – speichere jedes gespielte Wort',
    paywallFeatureReview: '🧠 Wiederholung mit Abständen & Quizze',
    paywallFeatureVocab: '🌍 Wortschatz-Verfolgung pro Sprache',
    paywallPriceFallback: 'Einmaliger Kauf',
    paywallBuy: 'Freischalten',
    paywallBuying: 'Wird freigeschaltet…',
    paywallRestore: 'Kauf wiederherstellen',
    paywallRestoring: 'Wird wiederhergestellt…',
    paywallLater: 'Vielleicht später',
    paywallFooter: 'Alle 6 Sprachen und Live-Definitionen sind immer kostenlos.',
    paywallErrorBuy: 'Der Kauf wurde nicht abgeschlossen.',
    paywallErrorRestore: 'Kein früherer Kauf zum Wiederherstellen gefunden.',
    paywallErrorGeneric: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
  },
};

// ─── Portuguese (Scrabble Portuguese standard) ────────────────────────────

const PT: LocaleDef = {
  code: 'pt',
  name: 'Portuguese',
  nativeName: 'Português',
  flag: '🇵🇹',
  wildCount: 3,
  dictUrl: 'dictionaries/pt.txt',
  letters: [
    { letter: 'A', count: 14, points: 1, tier: 'common' },
    { letter: 'E', count: 11, points: 1, tier: 'common' },
    { letter: 'I', count: 10, points: 1, tier: 'common' },
    { letter: 'O', count: 10, points: 1, tier: 'common' },
    { letter: 'S', count: 8, points: 1, tier: 'common' },
    { letter: 'M', count: 6, points: 1, tier: 'common' },
    { letter: 'R', count: 6, points: 1, tier: 'common' },
    { letter: 'T', count: 5, points: 1, tier: 'common' },
    { letter: 'U', count: 7, points: 1, tier: 'common' },
    { letter: 'L', count: 5, points: 1, tier: 'common' },
    { letter: 'C', count: 4, points: 2, tier: 'uncommon' },
    { letter: 'D', count: 5, points: 2, tier: 'uncommon' },
    { letter: 'N', count: 4, points: 1, tier: 'common' },
    { letter: 'P', count: 4, points: 3, tier: 'uncommon' },
    { letter: 'B', count: 3, points: 3, tier: 'uncommon' },
    { letter: 'G', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'V', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'F', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'H', count: 2, points: 4, tier: 'uncommon' },
    { letter: 'Q', count: 1, points: 6, tier: 'rare' },
    { letter: 'J', count: 2, points: 5, tier: 'rare' },
    { letter: 'Ç', count: 2, points: 3, tier: 'uncommon' },
    { letter: 'X', count: 1, points: 8, tier: 'rare' },
    { letter: 'Z', count: 1, points: 8, tier: 'rare' },
  ],
  ui: {
    appTitle: 'LEXICA KNIGHTS',
    yourTurn: 'Tua vez — soletra uma palavra!',
    submitWord: 'Enviar palavra',
    recall: 'Recolher',
    betaFeedback: 'Feedback',
    leaderboard: 'Classificação',
    language: 'Idioma',
    playAgain: 'Jogar de novo',
    restart: 'Reiniciar',
    nextEnemy: 'Próximo Inimigo',
    victory: 'VITÓRIA!',
    defeated: 'DERROTADO',
    campaignComplete: 'CAMPANHA COMPLETA!',
    victoryBody: 'O inimigo foi derrotado. Um novo desafiante se aproxima…',
    victoryFinalBody: 'Derrotaste todos os inimigos com as tuas palavras.',
    defeatedBody: 'As tuas palavras não foram fortes o suficiente...',
    aWild: 'UM SELVAGEM',
    appears: 'APARECE!',
    loadingDictionary: 'A carregar dicionário…',
    tilesLeft: 'peças restantes',
    dispute: 'Contestar!',
    noTilesInRack: 'Sem peças no atril',
    invalidWord: 'não é uma palavra válida',
    exchange: 'Trocar',
    confirmExchange: 'Confirmar troca ({n})',
    pass: 'Passar',
    cancel: 'Cancelar',
    tilesSwapped: 'Trocaste {n} peças. Vez do inimigo!',
    passedTurn: 'Passaste a tua vez. Vez do inimigo!',
    enemyPlays: '{name} joga {word} por {n}!',
    enemyForfeits: '{name} baralha as suas peças.',
    settings: 'Definições',
    reduceMotion: 'Reduzir movimento',
    soundEffects: 'Efeitos sonoros',
    haptics: 'Vibração',
    close: 'Fechar',
    done: 'Concluído',
    remove: 'Remover',
    review: 'Rever',
    defInEnglish: 'Definição em inglês',
    defOf: 'de',
    defFormOf: 'forma de',
    save: 'Guardar',
    saved: 'Guardado',
    saveToJournal: 'Guardar no diário',
    savedToJournal: 'Guardado no diário',
    journalTitle: 'Diário de palavras',
    journalWord: 'palavra',
    journalWords: 'palavras',
    journalDue: 'pendentes',
    journalSearch: 'Procurar palavras guardadas…',
    journalEmpty: 'Ainda não há palavras guardadas. Toca em “★ Guardar” numa definição para começar o teu diário.',
    journalNoMatches: 'Sem resultados.',
    journalClearAll: 'Limpar tudo',
    journalClearConfirm: 'Limpar todo o diário de palavras neste dispositivo? Isto não pode ser anulado.',
    reviewShowAnswer: 'Mostrar resposta',
    reviewAgain: 'De novo',
    reviewGood: 'Bem',
    reviewEasy: 'Fácil',
    reviewNoneDue: 'Não há palavras para rever neste momento.',
    reviewDoneOne: '1 palavra revista!',
    reviewDoneMany: '{n} palavras revistas!',
    paywallHeadlineCampaign: 'Desbloqueia a campanha completa',
    paywallHeadlineJournal: 'Desbloqueia o teu diário de palavras',
    paywallHeadlineDefault: 'Desbloqueia tudo',
    paywallSubtitle: 'Uma compra. Teu para sempre, neste dispositivo.',
    paywallFeatureCampaign: '⚔️ A campanha completa — inimigos 3, 4 e 5',
    paywallFeatureJournal: '📖 Diário de palavras — guarda cada palavra que jogas',
    paywallFeatureReview: '🧠 Revisão espaçada e questionários',
    paywallFeatureVocab: '🌍 Acompanhamento de vocabulário por idioma',
    paywallPriceFallback: 'Compra única',
    paywallBuy: 'Desbloquear',
    paywallBuying: 'A desbloquear…',
    paywallRestore: 'Restaurar compra',
    paywallRestoring: 'A restaurar…',
    paywallLater: 'Talvez mais tarde',
    paywallFooter: 'Os 6 idiomas e as definições ao vivo são sempre gratuitos.',
    paywallErrorBuy: 'A compra não foi concluída.',
    paywallErrorRestore: 'Não foi encontrada nenhuma compra anterior para restaurar.',
    paywallErrorGeneric: 'Algo correu mal. Tenta novamente.',
  },
};

// ─── Italian (Scrabble Italian standard) ──────────────────────────────────

const IT: LocaleDef = {
  code: 'it',
  name: 'Italian',
  nativeName: 'Italiano',
  flag: '🇮🇹',
  wildCount: 2,
  dictUrl: 'dictionaries/it.txt',
  letters: [
    { letter: 'A', count: 14, points: 1, tier: 'common' },
    { letter: 'E', count: 11, points: 1, tier: 'common' },
    { letter: 'I', count: 12, points: 1, tier: 'common' },
    { letter: 'O', count: 15, points: 1, tier: 'common' },
    { letter: 'C', count: 6, points: 2, tier: 'common' },
    { letter: 'R', count: 6, points: 2, tier: 'common' },
    { letter: 'S', count: 6, points: 2, tier: 'common' },
    { letter: 'T', count: 6, points: 2, tier: 'common' },
    { letter: 'L', count: 5, points: 3, tier: 'uncommon' },
    { letter: 'M', count: 5, points: 3, tier: 'uncommon' },
    { letter: 'N', count: 5, points: 3, tier: 'uncommon' },
    { letter: 'U', count: 5, points: 3, tier: 'uncommon' },
    { letter: 'B', count: 3, points: 5, tier: 'rare' },
    { letter: 'D', count: 3, points: 5, tier: 'rare' },
    { letter: 'F', count: 3, points: 5, tier: 'rare' },
    { letter: 'P', count: 3, points: 5, tier: 'rare' },
    { letter: 'V', count: 3, points: 5, tier: 'rare' },
    { letter: 'G', count: 2, points: 8, tier: 'rare' },
    { letter: 'H', count: 2, points: 8, tier: 'rare' },
    { letter: 'Z', count: 2, points: 8, tier: 'rare' },
    { letter: 'Q', count: 1, points: 10, tier: 'legendary' },
  ],
  ui: {
    appTitle: 'LEXICA KNIGHTS',
    yourTurn: 'Tocca a te — forma una parola!',
    submitWord: 'Invia parola',
    recall: 'Richiama',
    betaFeedback: 'Feedback',
    leaderboard: 'Classifica',
    language: 'Lingua',
    playAgain: 'Gioca ancora',
    restart: 'Ricomincia',
    nextEnemy: 'Prossimo Nemico',
    victory: 'VITTORIA!',
    defeated: 'SCONFITTO',
    campaignComplete: 'CAMPAGNA COMPLETATA!',
    victoryBody: 'Il nemico è stato sconfitto. Un nuovo sfidante si avvicina…',
    victoryFinalBody: 'Hai sconfitto ogni nemico con le tue parole.',
    defeatedBody: 'Le tue parole non erano abbastanza forti...',
    aWild: 'UN SELVAGGIO',
    appears: 'APPARE!',
    loadingDictionary: 'Caricamento dizionario…',
    tilesLeft: 'tessere rimaste',
    dispute: 'Contestare!',
    noTilesInRack: 'Nessuna tessera sul leggio',
    invalidWord: 'non è una parola valida',
    exchange: 'Scambia',
    confirmExchange: 'Conferma scambio ({n})',
    pass: 'Passa',
    cancel: 'Annulla',
    tilesSwapped: 'Scambiate {n} tessere. Turno del nemico!',
    passedTurn: 'Hai passato il turno. Turno del nemico!',
    enemyPlays: '{name} gioca {word} per {n}!',
    enemyForfeits: '{name} rimescola le sue tessere.',
    settings: 'Impostazioni',
    reduceMotion: 'Riduci animazioni',
    soundEffects: 'Effetti sonori',
    haptics: 'Vibrazione',
    close: 'Chiudi',
    done: 'Fatto',
    remove: 'Rimuovi',
    review: 'Ripassa',
    defInEnglish: 'Definizione in inglese',
    defOf: 'di',
    defFormOf: 'forma di',
    save: 'Salva',
    saved: 'Salvato',
    saveToJournal: 'Salva nel diario',
    savedToJournal: 'Salvato nel diario',
    journalTitle: 'Diario delle parole',
    journalWord: 'parola',
    journalWords: 'parole',
    journalDue: 'da rivedere',
    journalSearch: 'Cerca parole salvate…',
    journalEmpty: 'Nessuna parola salvata. Tocca “★ Salva” su una definizione per iniziare il tuo diario.',
    journalNoMatches: 'Nessun risultato.',
    journalClearAll: 'Cancella tutto',
    journalClearConfirm: 'Cancellare l\'intero diario delle parole su questo dispositivo? L\'azione è irreversibile.',
    reviewShowAnswer: 'Mostra risposta',
    reviewAgain: 'Ancora',
    reviewGood: 'Bene',
    reviewEasy: 'Facile',
    reviewNoneDue: 'Nessuna parola da ripassare al momento.',
    reviewDoneOne: '1 parola ripassata!',
    reviewDoneMany: '{n} parole ripassate!',
    paywallHeadlineCampaign: 'Sblocca la campagna completa',
    paywallHeadlineJournal: 'Sblocca il tuo diario delle parole',
    paywallHeadlineDefault: 'Sblocca tutto',
    paywallSubtitle: 'Un solo acquisto. Tuo per sempre, su questo dispositivo.',
    paywallFeatureCampaign: '⚔️ La campagna completa — nemici 3, 4 e 5',
    paywallFeatureJournal: '📖 Diario delle parole — salva ogni parola giocata',
    paywallFeatureReview: '🧠 Ripasso a intervalli e quiz',
    paywallFeatureVocab: '🌍 Monitoraggio del vocabolario per lingua',
    paywallPriceFallback: 'Acquisto unico',
    paywallBuy: 'Sblocca',
    paywallBuying: 'Sblocco…',
    paywallRestore: 'Ripristina acquisto',
    paywallRestoring: 'Ripristino…',
    paywallLater: 'Forse più tardi',
    paywallFooter: 'Tutte e 6 le lingue e le definizioni dal vivo sono sempre gratuite.',
    paywallErrorBuy: 'L\'acquisto non è stato completato.',
    paywallErrorRestore: 'Nessun acquisto precedente da ripristinare.',
    paywallErrorGeneric: 'Qualcosa è andato storto. Riprova.',
  },
};

export const LOCALES: Record<LocaleCode, LocaleDef> = {
  en: EN,
  es: ES,
  fr: FR,
  de: DE,
  pt: PT,
  it: IT,
};

export const LOCALE_LIST: LocaleDef[] = [EN, ES, FR, DE, IT, PT];

/** Detect the best locale match from the browser/navigator language. */
export function detectLocale(): LocaleCode {
  if (typeof navigator === 'undefined') return 'en';
  const candidates = (navigator.languages ?? [navigator.language ?? 'en']).map(l => l.toLowerCase());
  for (const c of candidates) {
    const prefix = c.slice(0, 2) as LocaleCode;
    if (prefix in LOCALES) return prefix;
  }
  return 'en';
}

const STORAGE_KEY = 'lexica_knights_locale';

export function getStoredLocale(): LocaleCode | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw in LOCALES) return raw as LocaleCode;
  } catch {}
  return null;
}

export function setStoredLocale(locale: LocaleCode): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {}
}
