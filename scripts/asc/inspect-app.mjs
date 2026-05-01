import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { asc } from './lib.mjs';

const appId = readFileSync('build/ios/app-id.txt', 'utf8').trim();

const state = { appId };

// 1. App Infos (where primary category lives)
const appInfos = await asc('GET', `/v1/apps/${appId}/appInfos?include=appInfoLocalizations,primaryCategory,secondaryCategory`);
state.appInfos = appInfos.data.map(ai => ({
  id: ai.id,
  state: ai.attributes.appStoreState,
  ageRating: ai.attributes.appStoreAgeRating,
  primaryCategory: ai.relationships?.primaryCategory?.data?.id ?? null,
  secondaryCategory: ai.relationships?.secondaryCategory?.data?.id ?? null,
  localizations: ai.relationships?.appInfoLocalizations?.data?.map(l => l.id) ?? [],
}));

// 2. App Info Localizations (subtitle, privacy URL live here)
const editableAppInfo = state.appInfos.find(ai => /PREPARE_FOR_SUBMISSION|READY_FOR_SUBMISSION|DEVELOPER_REJECTED|REJECTED|WAITING_FOR_REVIEW/.test(ai.state)) ?? state.appInfos[0];
if (editableAppInfo) {
  const locs = await asc('GET', `/v1/appInfos/${editableAppInfo.id}/appInfoLocalizations`);
  state.appInfoLocalizations = locs.data.map(l => ({
    id: l.id,
    locale: l.attributes.locale,
    name: l.attributes.name,
    subtitle: l.attributes.subtitle,
    privacyPolicyUrl: l.attributes.privacyPolicyUrl,
    privacyPolicyText: l.attributes.privacyPolicyText,
  }));
}

// 3. App Store Versions (description, keywords, what's new — draft v1.0)
const versions = await asc('GET', `/v1/apps/${appId}/appStoreVersions?include=appStoreVersionLocalizations`);
state.appStoreVersions = versions.data.map(v => ({
  id: v.id,
  versionString: v.attributes.versionString,
  appStoreState: v.attributes.appStoreState,
  releaseType: v.attributes.releaseType,
  localizations: v.relationships?.appStoreVersionLocalizations?.data?.map(l => l.id) ?? [],
}));

// 4. App Store Version Localizations (description, keywords)
const editableVersion = state.appStoreVersions[0];
if (editableVersion) {
  const versionLocs = await asc('GET', `/v1/appStoreVersions/${editableVersion.id}/appStoreVersionLocalizations`);
  state.versionLocalizations = versionLocs.data.map(l => ({
    id: l.id,
    locale: l.attributes.locale,
    description: l.attributes.description?.slice(0, 60) + (l.attributes.description?.length > 60 ? '…' : ''),
    keywords: l.attributes.keywords,
    promotionalText: l.attributes.promotionalText,
    supportUrl: l.attributes.supportUrl,
    marketingUrl: l.attributes.marketingUrl,
  }));
}

// 5. Age rating declaration (if exists)
try {
  const ageRating = await asc('GET', `/v1/apps/${appId}/ageRatingDeclaration`);
  state.ageRatingDeclaration = ageRating.data;
} catch (e) {
  state.ageRatingDeclaration = e.status === 404 ? '(not yet created)' : `error: ${e.status}`;
}

// 6. Pricing
try {
  const prices = await asc('GET', `/v1/apps/${appId}/appPriceSchedule?include=manualPrices`);
  state.priceSchedule = prices.data?.id ?? '(none)';
} catch (e) {
  state.priceSchedule = `error: ${e.status}`;
}

console.log(JSON.stringify(state, null, 2));

mkdirSync('build/ios', { recursive: true });
writeFileSync('build/ios/state.json', JSON.stringify(state, null, 2));

// Save IDs we'll need
if (editableAppInfo) writeFileSync('build/ios/app-info-id.txt', editableAppInfo.id);
if (editableVersion) writeFileSync('build/ios/app-store-version-id.txt', editableVersion.id);
const enUSAppInfoLoc = state.appInfoLocalizations?.find(l => l.locale === 'en-US');
if (enUSAppInfoLoc) writeFileSync('build/ios/app-info-localization-id.txt', enUSAppInfoLoc.id);
const enUSVersionLoc = state.versionLocalizations?.find(l => l.locale === 'en-US');
if (enUSVersionLoc) writeFileSync('build/ios/app-store-version-localization-id.txt', enUSVersionLoc.id);
console.log('\nSaved IDs to build/ios/*.txt');
