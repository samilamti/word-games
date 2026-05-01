import { readFileSync } from 'node:fs';
import { asc } from './lib.mjs';

const appInfoId      = readFileSync('build/ios/app-info-id.txt', 'utf8').trim();
const appInfoLocId   = readFileSync('build/ios/app-info-localization-id.txt', 'utf8').trim();
const versionLocId   = readFileSync('build/ios/app-store-version-localization-id.txt', 'utf8').trim();

// ─── 1. Categories — patch the parent appInfo with GAMES + subcategories ───
//     primaryCategory = GAMES (parent); primarySubcategoryOne/Two = subcategories.
//     Apple's taxonomy has no GAMES_WORD — word games map to GAMES_PUZZLE.
console.log('1/3  Setting primaryCategory=GAMES with subcategories PUZZLE+STRATEGY…');
await asc('PATCH', `/v1/appInfos/${appInfoId}`, {
  data: {
    type: 'appInfos',
    id: appInfoId,
    relationships: {
      primaryCategory:        { data: { type: 'appCategories', id: 'GAMES' } },
      primarySubcategoryOne:  { data: { type: 'appCategories', id: 'GAMES_PUZZLE' } },
      primarySubcategoryTwo:  { data: { type: 'appCategories', id: 'GAMES_STRATEGY' } },
    },
  },
});
console.log('     ✓ categories set');

// ─── 2. App Info Localization — subtitle, privacy URL ───
const SUBTITLE = 'Words. Combat. Dictionary.';
const PRIVACY_URL = 'https://samilamti.github.io/word-games/PRIVACY.md';
console.log(`\n2/3  Setting subtitle="${SUBTITLE}" (${SUBTITLE.length}/30) + privacy URL on en-US appInfo…`);
await asc('PATCH', `/v1/appInfoLocalizations/${appInfoLocId}`, {
  data: {
    type: 'appInfoLocalizations',
    id: appInfoLocId,
    attributes: {
      subtitle: SUBTITLE,
      privacyPolicyUrl: PRIVACY_URL,
    },
  },
});
console.log(`     ✓ subtitle + privacy URL = ${PRIVACY_URL}`);

// ─── 3. Version Localization — description, keywords, support/marketing URLs ───
const DESCRIPTION = `Spell words to deal damage. Defeat monsters with your vocabulary.

Lexica Knights is a single-player word combat RPG that turns the classic letter-tile board into a turn-based duel. Place letters, form words, deal damage based on word value and length, and survive your enemy's counterattack — all on a 13×13 board with premium squares that amplify your strikes.

• Word Combat — Longer and rarer words hit harder. Chain double-letter and triple-word squares for devastating combos.
• 13×13 Strategic Board — Premium squares (Double/Triple Letter, Double/Triple Word, Gem Forge) reward bold placement.
• Turn-Based Battles — Spell, deal damage, survive, refill. Every word is a weapon.
• Animated Combat — Wizard vs. monster sprites with attack lunges, hit reactions, and floating damage numbers.
• Procedural Audio — Synthesized sound effects, no streaming.
• Word Dispute — Think the dictionary is wrong? Dispute a rejected word and the game accepts it.

Built for offline play. No accounts, no ads, no tracking, no in-app purchases. Your data stays on your device.`;

// avoid trademarked terms (scrabble, boggle), avoid duplicating words from title/subtitle
const KEYWORDS = 'puzzle,rpg,letters,strategy,quest,fantasy,vocabulary,wordgame,tilegame,solo,offline,spelling';

console.log(`\n3/3  Setting description (${DESCRIPTION.length}/4000), keywords (${KEYWORDS.length}/100), URLs…`);
await asc('PATCH', `/v1/appStoreVersionLocalizations/${versionLocId}`, {
  data: {
    type: 'appStoreVersionLocalizations',
    id: versionLocId,
    attributes: {
      description: DESCRIPTION,
      keywords: KEYWORDS,
      supportUrl: 'https://github.com/samilamti/word-games/issues',
      marketingUrl: 'https://samilamti.github.io/word-games/',
    },
  },
});
console.log('     ✓ description, keywords, support+marketing URLs');

console.log('\nDone. (whatsNew is intentionally not set — Apple rejects it on first version.)');
console.log(`\nNote: privacy URL ${PRIVACY_URL} must be live (push to GitHub) before submission.`);
