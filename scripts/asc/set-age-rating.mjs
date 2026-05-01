import { readFileSync } from 'node:fs';
import { asc } from './lib.mjs';

const appInfoId = readFileSync('build/ios/app-info-id.txt', 'utf8').trim();

// 1. Find existing ageRatingDeclaration via the appInfo relationship
let declarationId;
try {
  const existing = await asc('GET', `/v1/appInfos/${appInfoId}/ageRatingDeclaration`);
  declarationId = existing.data?.id;
  if (declarationId) {
    console.log(`Found existing ageRatingDeclaration: ${declarationId}`);
  }
} catch (e) {
  if (e.status !== 404) throw e;
}

// Lexica Knights age-rating profile:
//   • Cartoon combat (HP, damage numbers, attack lunges) — INFREQUENT_OR_MILD
//   • No realistic violence, sexual content, horror, profanity, drugs, gambling, web access, UGC, etc.
const attributes = {
  // Frequency enums — NONE | INFREQUENT_OR_MILD | FREQUENT_OR_INTENSE
  violenceCartoonOrFantasy: 'INFREQUENT_OR_MILD',
  violenceRealistic: 'NONE',
  violenceRealisticProlongedGraphicOrSadistic: 'NONE',
  gunsOrOtherWeapons: 'NONE',
  sexualContentOrNudity: 'NONE',
  sexualContentGraphicAndNudity: 'NONE',
  matureOrSuggestiveThemes: 'NONE',
  horrorOrFearThemes: 'NONE',
  profanityOrCrudeHumor: 'NONE',
  alcoholTobaccoOrDrugUseOrReferences: 'NONE',
  medicalOrTreatmentInformation: 'NONE',     // ENUM despite intuition
  gamblingSimulated: 'NONE',                 // ENUM (verified by Apple 409 response)
  // Booleans
  gambling: false,
  healthOrWellnessTopics: false,             // BOOLEAN (verified by Apple 409 response)
  lootBox: false,
  unrestrictedWebAccess: false,
  userGeneratedContent: false,
  messagingAndChat: false,
  advertising: false,
  ageAssurance: false,
  parentalControls: false,
  contests: 'NONE',                          // type TBD — try ENUM first
  // Kids age band
  kidsAgeBand: null,
};

if (declarationId) {
  console.log('PATCHing existing declaration…');
  await asc('PATCH', `/v1/ageRatingDeclarations/${declarationId}`, {
    data: { type: 'ageRatingDeclarations', id: declarationId, attributes },
  });
  console.log('  ✓ age rating updated');
} else {
  console.log('POSTing new declaration…');
  await asc('POST', '/v1/ageRatingDeclarations', {
    data: {
      type: 'ageRatingDeclarations',
      attributes,
      relationships: {
        appInfo: { data: { type: 'appInfos', id: appInfoId } },
      },
    },
  });
  console.log('  ✓ age rating created');
}
