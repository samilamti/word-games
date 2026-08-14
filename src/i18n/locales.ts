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

import type { EnemyType } from '../types/enemies.ts';

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
  retryFight: string;
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
  music: string;
  haptics: string;
  howToPlay: string;
  // Premium squares — used for the board aria-labels, the legend rows and the
  // placement hint toast, so one translation serves all three surfaces.
  premiumDoubleLetter: string;
  premiumTripleLetter: string;
  premiumDoubleWord: string;
  premiumTripleWord: string;
  premiumGemForge: string;
  premiumCenter: string;
  premiumVoid: string;
  legendTitle: string;
  // Tutorial
  tutSpellTitle: string;
  tutSpellBody: string;
  tutAttackTitle: string;
  tutAttackBody: string;
  tutPremiumTitle: string;
  tutPremiumBody: string;
  tutConnectTitle: string;
  tutConnectBody: string;
  tutBattleTitle: string;
  tutBattleBody: string;
  tutSkip: string;
  tutNext: string;
  tutBack: string;
  tutFight: string;
  tutStepOf: string; // {n}, {total}
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
  // Status / combat messages
  placeTilesFirst: string;
  spellResult: string; // {words}, {n}
  disputedTag: string;
  tilesReturned: string;
  // Placement errors (validatePlacement)
  errNotStraight: string;
  errNotContiguous: string;
  errFirstCenter: string;
  errMustConnect: string;
  errNoWords: string;
  // Beta feedback
  feedbackThanks: string;
  feedbackCategory: string;
  feedbackYour: string;
  feedbackPlaceholder: string;
  feedbackSend: string;
  feedbackCatBug: string;
  feedbackCatSuggestion: string;
  feedbackCatWord: string;
  feedbackCatOther: string;
  // Dispute dialog
  disputeTitle: string;
  disputeQuestion: string; // {word} — bolded + quoted at the call site
  disputeMeaning: string;
  disputePlaceholder: string;
  disputeSubmit: string;
  disputeFooter1: string;
  disputeFooter2: string;
  // Leaderboard
  leaderboardView: string;
  sortDamage: string;
  sortBestHit: string;
  sortLongest: string;
  sortTurns: string;
  sortDamageTip: string;
  sortBestHitTip: string;
  sortLongestTip: string;
  sortTurnsTip: string;
  clearLeaderboardConfirm: string;
  leaderboardEmpty: string;
  colEnemy: string;
  colDmg: string;
  colBest: string;
  colWord: string;
  // HUD score breakdown
  hudWordDmg: string; // {word}, {n}
  hudBonus: string; // {n}
  hudTotalDamage: string; // {n}
  // Language picker
  localeTiles: string; // {n}
  localeSwitchNote: string;
  // Accessibility labels
  changeLanguage: string;
  blankTile: string;
}

/** Per-enemy display strings. Keyed by EnemyType so `tsc` enforces a
 *  translation for every enemy in every locale (campaign flavor, not UI
 *  chrome — localized on request). */
export interface EnemyStrings {
  name: string;
  tagline: string;
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
  enemies: Record<EnemyType, EnemyStrings>;
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
    retryFight: 'Retry Fight',
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
    music: 'Music',
    haptics: 'Vibration',
    howToPlay: 'How to play',
    premiumDoubleLetter: 'Letter ×2',
    premiumTripleLetter: 'Letter ×3',
    premiumDoubleWord: 'Word ×2',
    premiumTripleWord: 'Word ×3',
    premiumGemForge: 'Gem Forge — letter ×2',
    premiumCenter: 'Start here — word ×2',
    premiumVoid: 'Blocked square',
    legendTitle: 'Power squares',
    tutSpellTitle: 'Spell a word',
    tutSpellBody: 'Drag letters from your rack onto the board — or just tap them — to spell a word.',
    tutAttackTitle: 'Words are weapons',
    tutAttackBody: 'Submit your word to strike the enemy. The longer the word, the harder it hits.',
    tutPremiumTitle: 'Power squares',
    tutPremiumBody: 'Coloured squares multiply your damage — either one letter, or your whole word.',
    tutConnectTitle: 'Connect your words',
    tutConnectBody: 'Your first word must cover the star. After that, every new word has to touch the letters already on the board.',
    tutBattleTitle: 'Win the battle',
    tutBattleBody: 'The enemy spells a word back at you every turn, and swapping or passing costs you a turn. Empty their health before yours runs out!',
    tutSkip: 'Skip',
    tutNext: 'Next',
    tutBack: 'Back',
    tutFight: 'Fight!',
    tutStepOf: 'Step {n} of {total}',
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
    placeTilesFirst: 'Place some tiles first!',
    spellResult: '{words}! {n} damage!',
    disputedTag: '(disputed)',
    tilesReturned: 'Tiles returned to rack.',
    errNotStraight: 'Tiles must be in a straight line',
    errNotContiguous: 'Tiles must be contiguous (no gaps)',
    errFirstCenter: 'First word must cover the center square',
    errMustConnect: 'Word must connect to an existing tile',
    errNoWords: 'No valid words formed',
    feedbackThanks: 'Thanks for your feedback!',
    feedbackCategory: 'Category',
    feedbackYour: 'Your feedback',
    feedbackPlaceholder: 'Tell us what you think...',
    feedbackSend: 'Send Feedback',
    feedbackCatBug: 'Bug Report',
    feedbackCatSuggestion: 'Suggestion',
    feedbackCatWord: 'Word Issue',
    feedbackCatOther: 'Other',
    disputeTitle: 'Dispute Word',
    disputeQuestion: 'You think {word} is a valid word?',
    disputeMeaning: 'What does it mean? (optional)',
    disputePlaceholder: 'e.g. A type of bird found in South America...',
    disputeSubmit: 'Submit Dispute',
    disputeFooter1: 'The word will be accepted and you\'ll receive points.',
    disputeFooter2: 'Your dispute will be reviewed by our team.',
    leaderboardView: 'View leaderboard',
    sortDamage: 'Damage',
    sortBestHit: 'Best Hit',
    sortLongest: 'Longest',
    sortTurns: 'Turns',
    sortDamageTip: 'Total damage dealt this run',
    sortBestHitTip: 'Biggest single-turn damage',
    sortLongestTip: 'Longest word played',
    sortTurnsTip: 'Fewest turns to victory',
    clearLeaderboardConfirm: 'Clear all leaderboard entries on this device? This cannot be undone.',
    leaderboardEmpty: 'No completed runs yet. Defeat an enemy to record your first run!',
    colEnemy: 'Enemy',
    colDmg: 'Dmg',
    colBest: 'Best',
    colWord: 'Word',
    hudWordDmg: '{word}: {n} dmg',
    hudBonus: 'Bonus: +{n}',
    hudTotalDamage: 'Total: {n} damage',
    changeLanguage: 'Change language',
    localeTiles: '{n} tiles',
    localeSwitchNote:
      "Switching languages starts a fresh game with that language's tile distribution and dictionary.",
    blankTile: 'blank tile',
  },
  enemies: {
    goblin: { name: 'Ink Goblin', tagline: 'A scrappy little scribbler with a poisoned pen.' },
    orc: { name: 'Brute Orc', tagline: 'Tusked, axe-handed, and unimpressed by your vocabulary.' },
    troll: { name: 'Cave Troll', tagline: 'Bigger than a bookshelf and twice as stubborn.' },
    undead: { name: 'Risen Undead', tagline: 'Whispering forgotten words from a forgotten tongue.' },
    wraith: { name: 'Shadow Wraith', tagline: 'A grief without a body, hungry for sentences.' },
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
    retryFight: 'Repetir combate',
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
    music: 'Música',
    haptics: 'Vibración',
    howToPlay: 'Cómo jugar',
    premiumDoubleLetter: 'Letra ×2',
    premiumTripleLetter: 'Letra ×3',
    premiumDoubleWord: 'Palabra ×2',
    premiumTripleWord: 'Palabra ×3',
    premiumGemForge: 'Forja de gemas — letra ×2',
    premiumCenter: 'Empieza aquí — palabra ×2',
    premiumVoid: 'Casilla bloqueada',
    legendTitle: 'Casillas de poder',
    tutSpellTitle: 'Forma una palabra',
    tutSpellBody: 'Arrastra letras de tu atril al tablero — o simplemente tócalas — para formar una palabra.',
    tutAttackTitle: 'Las palabras son armas',
    tutAttackBody: 'Envía tu palabra para golpear al enemigo. Cuanto más larga sea, más fuerte golpea.',
    tutPremiumTitle: 'Casillas de poder',
    tutPremiumBody: 'Las casillas de colores multiplican tu daño: una sola letra o la palabra entera.',
    tutConnectTitle: 'Conecta tus palabras',
    tutConnectBody: 'Tu primera palabra debe cubrir la estrella. Después, cada palabra nueva tiene que tocar las letras que ya están en el tablero.',
    tutBattleTitle: 'Gana la batalla',
    tutBattleBody: 'El enemigo te responde con una palabra cada turno, y cambiar fichas o pasar te cuesta un turno. ¡Agota su salud antes de que se agote la tuya!',
    tutSkip: 'Saltar',
    tutNext: 'Siguiente',
    tutBack: 'Atrás',
    tutFight: '¡A luchar!',
    tutStepOf: 'Paso {n} de {total}',
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
    placeTilesFirst: '¡Coloca algunas fichas primero!',
    spellResult: '¡{words}! {n} de daño!',
    disputedTag: '(disputada)',
    tilesReturned: 'Fichas devueltas al atril.',
    errNotStraight: 'Las fichas deben estar en línea recta',
    errNotContiguous: 'Las fichas deben ser contiguas (sin huecos)',
    errFirstCenter: 'La primera palabra debe cubrir la casilla central',
    errMustConnect: 'La palabra debe conectar con una ficha existente',
    errNoWords: 'No se formaron palabras válidas',
    feedbackThanks: '¡Gracias por tus comentarios!',
    feedbackCategory: 'Categoría',
    feedbackYour: 'Tus comentarios',
    feedbackPlaceholder: 'Cuéntanos qué piensas...',
    feedbackSend: 'Enviar comentarios',
    feedbackCatBug: 'Informe de error',
    feedbackCatSuggestion: 'Sugerencia',
    feedbackCatWord: 'Problema de palabra',
    feedbackCatOther: 'Otro',
    disputeTitle: 'Disputar palabra',
    disputeQuestion: '¿Crees que {word} es una palabra válida?',
    disputeMeaning: '¿Qué significa? (opcional)',
    disputePlaceholder: 'p. ej. Un tipo de ave de Sudamérica...',
    disputeSubmit: 'Enviar disputa',
    disputeFooter1: 'La palabra se aceptará y recibirás puntos.',
    disputeFooter2: 'Tu disputa será revisada por nuestro equipo.',
    leaderboardView: 'Ver clasificación',
    sortDamage: 'Daño',
    sortBestHit: 'Mejor golpe',
    sortLongest: 'Más larga',
    sortTurns: 'Turnos',
    sortDamageTip: 'Daño total infligido en esta partida',
    sortBestHitTip: 'Mayor daño en un solo turno',
    sortLongestTip: 'Palabra más larga jugada',
    sortTurnsTip: 'Menos turnos para la victoria',
    clearLeaderboardConfirm: '¿Borrar toda la clasificación de este dispositivo? Esto no se puede deshacer.',
    leaderboardEmpty: 'Aún no hay partidas completadas. ¡Derrota a un enemigo para registrar tu primera partida!',
    colEnemy: 'Enemigo',
    colDmg: 'Daño',
    colBest: 'Mejor',
    colWord: 'Palabra',
    hudWordDmg: '{word}: {n} de daño',
    hudBonus: 'Bonus: +{n}',
    hudTotalDamage: 'Total: {n} de daño',
    changeLanguage: 'Cambiar idioma',
    localeTiles: '{n} fichas',
    localeSwitchNote:
      'Cambiar de idioma inicia una partida nueva con la distribución de fichas y el diccionario de ese idioma.',
    blankTile: 'ficha en blanco',
  },
  enemies: {
    goblin: { name: 'Goblin de Tinta', tagline: 'Un pequeño garabateador peleón con una pluma envenenada.' },
    orc: { name: 'Orco Bruto', tagline: 'Con colmillos, hacha en mano y nada impresionado por tu vocabulario.' },
    troll: { name: 'Trol de las Cavernas', tagline: 'Más grande que una estantería y el doble de terco.' },
    undead: { name: 'No-Muerto Resucitado', tagline: 'Susurrando palabras olvidadas en una lengua olvidada.' },
    wraith: { name: 'Espectro de Sombra', tagline: 'Un duelo sin cuerpo, hambriento de frases.' },
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
    retryFight: 'Recommencer le combat',
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
    music: 'Musique',
    haptics: 'Vibrations',
    howToPlay: 'Comment jouer',
    premiumDoubleLetter: 'Lettre ×2',
    premiumTripleLetter: 'Lettre ×3',
    premiumDoubleWord: 'Mot ×2',
    premiumTripleWord: 'Mot ×3',
    premiumGemForge: 'Forge de gemmes — lettre ×2',
    premiumCenter: 'Départ — mot ×2',
    premiumVoid: 'Case bloquée',
    legendTitle: 'Cases de pouvoir',
    tutSpellTitle: 'Composez un mot',
    tutSpellBody: 'Faites glisser les lettres de votre chevalet sur le plateau — ou touchez-les simplement — pour composer un mot.',
    tutAttackTitle: 'Les mots sont des armes',
    tutAttackBody: 'Validez votre mot pour frapper l\'ennemi. Plus le mot est long, plus le coup est fort.',
    tutPremiumTitle: 'Cases de pouvoir',
    tutPremiumBody: 'Les cases colorées multiplient vos dégâts : une seule lettre, ou le mot entier.',
    tutConnectTitle: 'Reliez vos mots',
    tutConnectBody: 'Votre premier mot doit couvrir l\'étoile. Ensuite, chaque nouveau mot doit toucher les lettres déjà posées.',
    tutBattleTitle: 'Gagnez le combat',
    tutBattleBody: 'L\'ennemi vous répond par un mot à chaque tour, et échanger ou passer vous coûte un tour. Videz sa santé avant que la vôtre ne s\'épuise !',
    tutSkip: 'Passer',
    tutNext: 'Suivant',
    tutBack: 'Retour',
    tutFight: 'Au combat !',
    tutStepOf: 'Étape {n} sur {total}',
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
    placeTilesFirst: 'Place d\'abord quelques jetons !',
    spellResult: '{words} ! {n} dégâts !',
    disputedTag: '(contesté)',
    tilesReturned: 'Jetons remis sur le chevalet.',
    errNotStraight: 'Les jetons doivent être alignés',
    errNotContiguous: 'Les jetons doivent se suivre (sans trous)',
    errFirstCenter: 'Le premier mot doit couvrir la case centrale',
    errMustConnect: 'Le mot doit toucher un jeton existant',
    errNoWords: 'Aucun mot valide formé',
    feedbackThanks: 'Merci pour tes commentaires !',
    feedbackCategory: 'Catégorie',
    feedbackYour: 'Tes commentaires',
    feedbackPlaceholder: 'Dis-nous ce que tu en penses...',
    feedbackSend: 'Envoyer',
    feedbackCatBug: 'Rapport de bug',
    feedbackCatSuggestion: 'Suggestion',
    feedbackCatWord: 'Problème de mot',
    feedbackCatOther: 'Autre',
    disputeTitle: 'Contester le mot',
    disputeQuestion: 'Tu penses que {word} est un mot valide ?',
    disputeMeaning: 'Que signifie-t-il ? (facultatif)',
    disputePlaceholder: 'ex. Un type d\'oiseau d\'Amérique du Sud...',
    disputeSubmit: 'Envoyer la contestation',
    disputeFooter1: 'Le mot sera accepté et tu recevras des points.',
    disputeFooter2: 'Ta contestation sera examinée par notre équipe.',
    leaderboardView: 'Voir le classement',
    sortDamage: 'Dégâts',
    sortBestHit: 'Meilleur coup',
    sortLongest: 'Plus long',
    sortTurns: 'Tours',
    sortDamageTip: 'Dégâts totaux infligés dans cette partie',
    sortBestHitTip: 'Plus gros dégâts en un seul tour',
    sortLongestTip: 'Mot le plus long joué',
    sortTurnsTip: 'Moins de tours jusqu\'à la victoire',
    clearLeaderboardConfirm: 'Effacer tout le classement sur cet appareil ? Cette action est irréversible.',
    leaderboardEmpty: 'Aucune partie terminée. Bats un ennemi pour enregistrer ta première partie !',
    colEnemy: 'Ennemi',
    colDmg: 'Dég.',
    colBest: 'Meilleur',
    colWord: 'Mot',
    hudWordDmg: '{word} : {n} dég.',
    hudBonus: 'Bonus : +{n}',
    hudTotalDamage: 'Total : {n} dégâts',
    changeLanguage: 'Changer de langue',
    localeTiles: '{n} jetons',
    localeSwitchNote:
      'Changer de langue lance une nouvelle partie avec la distribution de jetons et le dictionnaire de cette langue.',
    blankTile: 'jeton blanc',
  },
  enemies: {
    goblin: { name: 'Gobelin d\'Encre', tagline: 'Un petit gribouilleur hargneux à la plume empoisonnée.' },
    orc: { name: 'Orc Brutal', tagline: 'Défenses en avant, hache à la main, et pas impressionné par ton vocabulaire.' },
    troll: { name: 'Troll des Cavernes', tagline: 'Plus grand qu\'une bibliothèque et deux fois plus têtu.' },
    undead: { name: 'Mort-Vivant Ressuscité', tagline: 'Murmurant des mots oubliés dans une langue oubliée.' },
    wraith: { name: 'Spectre d\'Ombre', tagline: 'Un chagrin sans corps, affamé de phrases.' },
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
    retryFight: 'Kampf wiederholen',
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
    music: 'Musik',
    haptics: 'Vibration',
    howToPlay: 'Spielanleitung',
    premiumDoubleLetter: 'Buchstabe ×2',
    premiumTripleLetter: 'Buchstabe ×3',
    premiumDoubleWord: 'Wort ×2',
    premiumTripleWord: 'Wort ×3',
    premiumGemForge: 'Edelsteinschmiede — Buchstabe ×2',
    premiumCenter: 'Startfeld — Wort ×2',
    premiumVoid: 'Gesperrtes Feld',
    legendTitle: 'Kraftfelder',
    tutSpellTitle: 'Bilde ein Wort',
    tutSpellBody: 'Zieh Buchstaben von deinem Ständer auf das Brett — oder tippe sie einfach an — um ein Wort zu bilden.',
    tutAttackTitle: 'Wörter sind Waffen',
    tutAttackBody: 'Bestätige dein Wort, um den Gegner zu treffen. Je länger das Wort, desto härter der Schlag.',
    tutPremiumTitle: 'Kraftfelder',
    tutPremiumBody: 'Farbige Felder vervielfachen deinen Schaden — entweder einen Buchstaben oder dein ganzes Wort.',
    tutConnectTitle: 'Verbinde deine Wörter',
    tutConnectBody: 'Dein erstes Wort muss den Stern bedecken. Danach muss jedes neue Wort die Buchstaben berühren, die schon auf dem Brett liegen.',
    tutBattleTitle: 'Gewinne den Kampf',
    tutBattleBody: 'Der Gegner antwortet jede Runde mit einem eigenen Wort, und Tauschen oder Passen kostet dich einen Zug. Leere seine Lebenspunkte, bevor deine aufgebraucht sind!',
    tutSkip: 'Überspringen',
    tutNext: 'Weiter',
    tutBack: 'Zurück',
    tutFight: 'Kämpfen!',
    tutStepOf: 'Schritt {n} von {total}',
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
    placeTilesFirst: 'Lege zuerst ein paar Steine!',
    spellResult: '{words}! {n} Schaden!',
    disputedTag: '(angefochten)',
    tilesReturned: 'Steine zurück in den Halter.',
    errNotStraight: 'Steine müssen in einer Reihe liegen',
    errNotContiguous: 'Steine müssen lückenlos aneinander liegen',
    errFirstCenter: 'Das erste Wort muss das Mittelfeld bedecken',
    errMustConnect: 'Das Wort muss an einen vorhandenen Stein anschließen',
    errNoWords: 'Keine gültigen Wörter gebildet',
    feedbackThanks: 'Danke für dein Feedback!',
    feedbackCategory: 'Kategorie',
    feedbackYour: 'Dein Feedback',
    feedbackPlaceholder: 'Sag uns, was du denkst...',
    feedbackSend: 'Feedback senden',
    feedbackCatBug: 'Fehlerbericht',
    feedbackCatSuggestion: 'Vorschlag',
    feedbackCatWord: 'Wortproblem',
    feedbackCatOther: 'Sonstiges',
    disputeTitle: 'Wort anfechten',
    disputeQuestion: 'Du meinst, {word} ist ein gültiges Wort?',
    disputeMeaning: 'Was bedeutet es? (optional)',
    disputePlaceholder: 'z. B. Eine Vogelart aus Südamerika...',
    disputeSubmit: 'Anfechtung senden',
    disputeFooter1: 'Das Wort wird akzeptiert und du erhältst Punkte.',
    disputeFooter2: 'Deine Anfechtung wird von unserem Team geprüft.',
    leaderboardView: 'Bestenliste ansehen',
    sortDamage: 'Schaden',
    sortBestHit: 'Bester Treffer',
    sortLongest: 'Längstes',
    sortTurns: 'Züge',
    sortDamageTip: 'Gesamtschaden in diesem Durchlauf',
    sortBestHitTip: 'Größter Schaden in einem Zug',
    sortLongestTip: 'Längstes gespieltes Wort',
    sortTurnsTip: 'Wenigste Züge bis zum Sieg',
    clearLeaderboardConfirm: 'Alle Bestenlisten-Einträge auf diesem Gerät löschen? Dies kann nicht rückgängig gemacht werden.',
    leaderboardEmpty: 'Noch keine abgeschlossenen Durchläufe. Besiege einen Gegner, um deinen ersten Durchlauf einzutragen!',
    colEnemy: 'Gegner',
    colDmg: 'Sch.',
    colBest: 'Bester',
    colWord: 'Wort',
    hudWordDmg: '{word}: {n} Sch.',
    hudBonus: 'Bonus: +{n}',
    hudTotalDamage: 'Gesamt: {n} Schaden',
    changeLanguage: 'Sprache ändern',
    localeTiles: '{n} Steine',
    localeSwitchNote:
      'Ein Sprachwechsel startet ein neues Spiel mit der Steinverteilung und dem Wörterbuch dieser Sprache.',
    blankTile: 'leerer Stein',
  },
  enemies: {
    goblin: { name: 'Tinten-Goblin', tagline: 'Ein kampflustiger kleiner Schreiberling mit vergifteter Feder.' },
    orc: { name: 'Brutaler Ork', tagline: 'Mit Hauern, Axt in der Hand und unbeeindruckt von deinem Wortschatz.' },
    troll: { name: 'Höhlentroll', tagline: 'Größer als ein Bücherregal und doppelt so stur.' },
    undead: { name: 'Auferstandener Untoter', tagline: 'Flüstert vergessene Worte aus einer vergessenen Sprache.' },
    wraith: { name: 'Schattengespenst', tagline: 'Ein Kummer ohne Körper, hungrig nach Sätzen.' },
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
    retryFight: 'Repetir combate',
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
    music: 'Música',
    haptics: 'Vibração',
    howToPlay: 'Como jogar',
    premiumDoubleLetter: 'Letra ×2',
    premiumTripleLetter: 'Letra ×3',
    premiumDoubleWord: 'Palavra ×2',
    premiumTripleWord: 'Palavra ×3',
    premiumGemForge: 'Forja de gemas — letra ×2',
    premiumCenter: 'Começa aqui — palavra ×2',
    premiumVoid: 'Casa bloqueada',
    legendTitle: 'Casas de poder',
    tutSpellTitle: 'Forma uma palavra',
    tutSpellBody: 'Arrasta as letras do teu suporte para o tabuleiro — ou toca nelas — para formar uma palavra.',
    tutAttackTitle: 'As palavras são armas',
    tutAttackBody: 'Confirma a tua palavra para atacar o inimigo. Quanto mais longa a palavra, mais forte o golpe.',
    tutPremiumTitle: 'Casas de poder',
    tutPremiumBody: 'As casas coloridas multiplicam o teu dano — uma só letra ou a palavra inteira.',
    tutConnectTitle: 'Liga as tuas palavras',
    tutConnectBody: 'A tua primeira palavra tem de cobrir a estrela. Depois disso, cada palavra nova tem de tocar nas letras já colocadas.',
    tutBattleTitle: 'Vence a batalha',
    tutBattleBody: 'O inimigo responde com uma palavra em cada turno, e trocar peças ou passar custa-te um turno. Esgota a vida dele antes que a tua acabe!',
    tutSkip: 'Saltar',
    tutNext: 'Seguinte',
    tutBack: 'Voltar',
    tutFight: 'Lutar!',
    tutStepOf: 'Passo {n} de {total}',
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
    placeTilesFirst: 'Coloca primeiro algumas peças!',
    spellResult: '{words}! {n} de dano!',
    disputedTag: '(contestada)',
    tilesReturned: 'Peças devolvidas ao atril.',
    errNotStraight: 'As peças têm de estar em linha reta',
    errNotContiguous: 'As peças têm de ser contíguas (sem espaços)',
    errFirstCenter: 'A primeira palavra tem de cobrir a casa central',
    errMustConnect: 'A palavra tem de ligar a uma peça existente',
    errNoWords: 'Nenhuma palavra válida formada',
    feedbackThanks: 'Obrigado pelos teus comentários!',
    feedbackCategory: 'Categoria',
    feedbackYour: 'Os teus comentários',
    feedbackPlaceholder: 'Diz-nos o que achas...',
    feedbackSend: 'Enviar comentários',
    feedbackCatBug: 'Relatório de erro',
    feedbackCatSuggestion: 'Sugestão',
    feedbackCatWord: 'Problema de palavra',
    feedbackCatOther: 'Outro',
    disputeTitle: 'Contestar palavra',
    disputeQuestion: 'Achas que {word} é uma palavra válida?',
    disputeMeaning: 'O que significa? (opcional)',
    disputePlaceholder: 'p. ex. Um tipo de ave da América do Sul...',
    disputeSubmit: 'Enviar contestação',
    disputeFooter1: 'A palavra será aceite e receberás pontos.',
    disputeFooter2: 'A tua contestação será revista pela nossa equipa.',
    leaderboardView: 'Ver classificação',
    sortDamage: 'Dano',
    sortBestHit: 'Melhor golpe',
    sortLongest: 'Mais longa',
    sortTurns: 'Turnos',
    sortDamageTip: 'Dano total causado nesta partida',
    sortBestHitTip: 'Maior dano num único turno',
    sortLongestTip: 'Palavra mais longa jogada',
    sortTurnsTip: 'Menos turnos até à vitória',
    clearLeaderboardConfirm: 'Limpar toda a classificação neste dispositivo? Isto não pode ser anulado.',
    leaderboardEmpty: 'Ainda não há partidas concluídas. Derrota um inimigo para registar a tua primeira partida!',
    colEnemy: 'Inimigo',
    colDmg: 'Dano',
    colBest: 'Melhor',
    colWord: 'Palavra',
    hudWordDmg: '{word}: {n} de dano',
    hudBonus: 'Bónus: +{n}',
    hudTotalDamage: 'Total: {n} de dano',
    changeLanguage: 'Mudar idioma',
    localeTiles: '{n} peças',
    localeSwitchNote:
      'Mudar de idioma inicia um jogo novo com a distribuição de peças e o dicionário desse idioma.',
    blankTile: 'peça em branco',
  },
  enemies: {
    goblin: { name: 'Goblin de Tinta', tagline: 'Um pequeno rabiscador brigão com uma pena envenenada.' },
    orc: { name: 'Orc Bruto', tagline: 'De presas, machado na mão e nada impressionado com o teu vocabulário.' },
    troll: { name: 'Troll das Cavernas', tagline: 'Maior que uma estante e o dobro de teimoso.' },
    undead: { name: 'Morto-Vivo Ressurgido', tagline: 'Sussurrando palavras esquecidas numa língua esquecida.' },
    wraith: { name: 'Espectro das Sombras', tagline: 'Um luto sem corpo, faminto por frases.' },
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
    retryFight: 'Riprova lo scontro',
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
    music: 'Musica',
    haptics: 'Vibrazione',
    howToPlay: 'Come si gioca',
    premiumDoubleLetter: 'Lettera ×2',
    premiumTripleLetter: 'Lettera ×3',
    premiumDoubleWord: 'Parola ×2',
    premiumTripleWord: 'Parola ×3',
    premiumGemForge: 'Forgia di gemme — lettera ×2',
    premiumCenter: 'Si parte da qui — parola ×2',
    premiumVoid: 'Casella bloccata',
    legendTitle: 'Caselle speciali',
    tutSpellTitle: 'Componi una parola',
    tutSpellBody: 'Trascina le lettere dal leggio sul tabellone — o toccale semplicemente — per comporre una parola.',
    tutAttackTitle: 'Le parole sono armi',
    tutAttackBody: 'Conferma la parola per colpire il nemico. Più è lunga, più forte è il colpo.',
    tutPremiumTitle: 'Caselle speciali',
    tutPremiumBody: 'Le caselle colorate moltiplicano i tuoi danni: una sola lettera oppure l\'intera parola.',
    tutConnectTitle: 'Collega le parole',
    tutConnectBody: 'La prima parola deve coprire la stella. Poi ogni nuova parola deve toccare le lettere già sul tabellone.',
    tutBattleTitle: 'Vinci lo scontro',
    tutBattleBody: 'Il nemico ti risponde con una parola a ogni turno, e cambiare tessere o passare ti costa un turno. Azzera la sua salute prima che finisca la tua!',
    tutSkip: 'Salta',
    tutNext: 'Avanti',
    tutBack: 'Indietro',
    tutFight: 'Combatti!',
    tutStepOf: 'Passo {n} di {total}',
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
    placeTilesFirst: 'Posiziona prima delle tessere!',
    spellResult: '{words}! {n} danni!',
    disputedTag: '(contestata)',
    tilesReturned: 'Tessere rimesse sul leggio.',
    errNotStraight: 'Le tessere devono essere in linea retta',
    errNotContiguous: 'Le tessere devono essere contigue (senza spazi)',
    errFirstCenter: 'La prima parola deve coprire la casella centrale',
    errMustConnect: 'La parola deve collegarsi a una tessera esistente',
    errNoWords: 'Nessuna parola valida formata',
    feedbackThanks: 'Grazie per il tuo feedback!',
    feedbackCategory: 'Categoria',
    feedbackYour: 'Il tuo feedback',
    feedbackPlaceholder: 'Dicci cosa ne pensi...',
    feedbackSend: 'Invia feedback',
    feedbackCatBug: 'Segnalazione bug',
    feedbackCatSuggestion: 'Suggerimento',
    feedbackCatWord: 'Problema parola',
    feedbackCatOther: 'Altro',
    disputeTitle: 'Contestare la parola',
    disputeQuestion: 'Pensi che {word} sia una parola valida?',
    disputeMeaning: 'Cosa significa? (facoltativo)',
    disputePlaceholder: 'es. Un tipo di uccello del Sud America...',
    disputeSubmit: 'Invia contestazione',
    disputeFooter1: 'La parola verrà accettata e riceverai punti.',
    disputeFooter2: 'La tua contestazione sarà esaminata dal nostro team.',
    leaderboardView: 'Vedi classifica',
    sortDamage: 'Danni',
    sortBestHit: 'Colpo migliore',
    sortLongest: 'Più lunga',
    sortTurns: 'Turni',
    sortDamageTip: 'Danni totali inflitti in questa partita',
    sortBestHitTip: 'Danno maggiore in un solo turno',
    sortLongestTip: 'Parola più lunga giocata',
    sortTurnsTip: 'Meno turni alla vittoria',
    clearLeaderboardConfirm: 'Cancellare tutta la classifica su questo dispositivo? L\'azione è irreversibile.',
    leaderboardEmpty: 'Nessuna partita completata. Sconfiggi un nemico per registrare la tua prima partita!',
    colEnemy: 'Nemico',
    colDmg: 'Dan.',
    colBest: 'Migliore',
    colWord: 'Parola',
    hudWordDmg: '{word}: {n} danni',
    hudBonus: 'Bonus: +{n}',
    hudTotalDamage: 'Totale: {n} danni',
    changeLanguage: 'Cambia lingua',
    localeTiles: '{n} tessere',
    localeSwitchNote:
      'Cambiare lingua avvia una nuova partita con la distribuzione delle tessere e il dizionario di quella lingua.',
    blankTile: 'tessera vuota',
  },
  enemies: {
    goblin: { name: 'Goblin d\'Inchiostro', tagline: 'Un piccolo scribacchino agguerrito con una penna avvelenata.' },
    orc: { name: 'Orco Bruto', tagline: 'Con zanne, ascia in pugno e per niente colpito dal tuo vocabolario.' },
    troll: { name: 'Troll delle Caverne', tagline: 'Più grande di una libreria e il doppio più testardo.' },
    undead: { name: 'Non-Morto Risorto', tagline: 'Sussurra parole dimenticate in una lingua dimenticata.' },
    wraith: { name: 'Spettro d\'Ombra', tagline: 'Un dolore senza corpo, affamato di frasi.' },
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
