/**
 * Set the in-app purchase AVAILABILITY (territories) for `full_unlock`.
 *
 * Modern App Store Connect requires an IAP to have BOTH a price schedule AND an
 * availability record (which territories it's sold in) before it can leave
 * MISSING_METADATA. set-iap-price.mjs sets the price; this sets availability.
 * Defaults to all territories + availableInNewTerritories:true (worldwide reach).
 *
 * Run:  node --env-file=.env.local scripts/asc/set-iap-availability.mjs        (dry-run)
 *       node --env-file=.env.local scripts/asc/set-iap-availability.mjs --go   (apply)
 */
import { asc } from './lib.mjs';

const APP_ID = '6765603467'; // Lexica Knights
const PRODUCT_ID = 'full_unlock';
const GO = process.argv.includes('--go');

// 1. Find the IAP.
const list = await asc('GET', `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`);
const iap = (list.data ?? []).find((p) => p.attributes?.productId === PRODUCT_ID);
if (!iap) { console.error(`✗ IAP "${PRODUCT_ID}" not found on app ${APP_ID}`); process.exit(1); }
console.log(`IAP "${PRODUCT_ID}"  id=${iap.id}  state=${iap.attributes?.state}`);

// 2. Already has availability? (404 = none)
const existing = await asc('GET', `/v2/inAppPurchases/${iap.id}/inAppPurchaseAvailability`)
  .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
if (existing?.data) {
  console.log(`  availability already set (id=${existing.data.id}, availableInNewTerritories=${existing.data.attributes?.availableInNewTerritories}). Nothing to do.`);
  process.exit(0);
}
console.log('  availability: NONE — will create across all territories.');

// 3. Fetch all territories.
const terrs = await asc('GET', '/v1/territories?limit=200');
const ids = (terrs.data ?? []).map((t) => t.id);
console.log(`  territories to enable: ${ids.length}`);

if (!GO) {
  console.log(`\n— dry-run — would create availability (availableInNewTerritories:true) across all ${ids.length} territories. Re-run with --go.`);
  process.exit(0);
}

// 4. Create the availability.
console.log('\ncreating availability…');
const res = await asc('POST', '/v1/inAppPurchaseAvailabilities', {
  data: {
    type: 'inAppPurchaseAvailabilities',
    attributes: { availableInNewTerritories: true },
    relationships: {
      // NB: this resource names the product relationship `inAppPurchase` (the
      // screenshot resource calls the same thing `inAppPurchaseV2` — discovered via 409).
      inAppPurchase: { data: { type: 'inAppPurchases', id: iap.id } },
      availableTerritories: { data: ids.map((id) => ({ type: 'territories', id })) },
    },
  },
});
console.log(`  ✓ availability created (id=${res.data.id})`);

// 5. Re-check IAP state (recompute can lag a few seconds).
await new Promise((r) => setTimeout(r, 2500));
const after = await asc('GET', `/v2/inAppPurchases/${iap.id}`);
console.log(`\nIAP state now: ${after.data?.attributes?.state}  (expect READY_TO_SUBMIT once both price + availability + screenshot are recognized)`);
