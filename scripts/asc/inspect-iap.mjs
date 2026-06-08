/**
 * Read-only: report the full_unlock IAP's state and what it's missing
 * (localization name/description, price schedule, review screenshot).
 *
 * Run:  node --env-file=.env.local scripts/asc/inspect-iap.mjs
 */
import { asc } from './lib.mjs';

const APP_ID = '6765603467'; // Lexica Knights
const PRODUCT_ID = 'full_unlock';

const list = await asc('GET', `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`);
const iap = (list.data ?? []).find((p) => p.attributes?.productId === PRODUCT_ID);
if (!iap) { console.error(`✗ IAP "${PRODUCT_ID}" not found on app ${APP_ID}`); process.exit(1); }

console.log(`IAP "${PRODUCT_ID}"  (id=${iap.id})`);
console.log(`  reference name : ${iap.attributes?.name}`);
console.log(`  type           : ${iap.attributes?.inAppPurchaseType}`);
console.log(`  state          : ${iap.attributes?.state}`);
if (iap.attributes?.reviewNote) console.log(`  reviewNote     : ${iap.attributes.reviewNote}`);

// Localizations (buyer-facing display name + description)
const locs = await asc('GET', `/v2/inAppPurchases/${iap.id}/inAppPurchaseLocalizations`);
console.log(`\n  localizations (${locs.data?.length ?? 0}):`);
for (const l of locs.data ?? []) {
  console.log(`    ${l.attributes?.locale}: "${l.attributes?.name}" — "${l.attributes?.description}"  [${l.attributes?.state ?? '—'}]`);
}

// Price schedule
try {
  const price = await asc('GET', `/v2/inAppPurchases/${iap.id}/iapPriceSchedule`);
  console.log(`\n  price schedule : ${price.data ? `present ✓ (id=${price.data.id})` : 'NONE ✗'}`);
} catch (e) {
  console.log(`\n  price schedule : query failed (${e.status})`);
}

// Review screenshot (to-one relationship)
try {
  const shot = await asc('GET', `/v2/inAppPurchases/${iap.id}/appStoreReviewScreenshot`);
  if (shot?.data) {
    const st = shot.data.attributes?.assetDeliveryState?.state;
    console.log(`  review screenshot : present ✓ (id=${shot.data.id}, asset state=${st})`);
  } else {
    console.log('  review screenshot : MISSING ✗');
  }
} catch (e) {
  console.log(`  review screenshot : ${e.status === 404 ? 'MISSING ✗' : `query failed (${e.status})`}`);
}

// Availability (territories) — required alongside price in modern ASC
try {
  const av = await asc('GET', `/v2/inAppPurchases/${iap.id}/inAppPurchaseAvailability`);
  console.log(`  availability      : present ✓ (id=${av.data?.id}, availableInNewTerritories=${av.data?.attributes?.availableInNewTerritories})`);
} catch (e) {
  console.log(`  availability      : ${e.status === 404 ? 'MISSING ✗' : `query failed (${e.status})`}`);
}
