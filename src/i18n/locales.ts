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
