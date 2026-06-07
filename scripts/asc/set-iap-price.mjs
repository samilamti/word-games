/**
 * Set the SEK price of the full_unlock IAP via App Store Connect.
 *
 * Run:  node --env-file=.env.local scripts/asc/set-iap-price.mjs            (dry-run, target 79)
 *       node --env-file=.env.local scripts/asc/set-iap-price.mjs --sek=79
 *       node --env-file=.env.local scripts/asc/set-iap-price.mjs --sek=79 --go
 *
 * Apple sells at fixed price points, not arbitrary amounts. This finds the SWE
 * price point nearest the target, prints it (+ neighbours), and on --go creates
 * a price schedule with SWE as the base territory (Apple auto-derives the other
 * storefronts' equivalent prices). Re-running --go replaces the schedule.
 */
import { asc } from './lib.mjs';

const APP_ID = '6765603467';
const PRODUCT_ID = 'full_unlock';
const BASE_TERRITORY = 'SWE';
const TARGET = Number(process.argv.find((a) => a.startsWith('--sek='))?.slice(6) ?? '79');
const GO = process.argv.includes('--go');

const iaps = await asc('GET', `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`);
const iap = (iaps.data ?? []).find((p) => p.attributes?.productId === PRODUCT_ID);
if (!iap) {
  console.error(`✗ IAP "${PRODUCT_ID}" not found — run create-iap.mjs --go first.`);
  process.exit(1);
}

// Gather SWE price points (paginated).
let points = [];
let url = `/v2/inAppPurchases/${iap.id}/pricePoints?filter[territory]=${BASE_TERRITORY}&limit=200`;
while (url) {
  const page = await asc('GET', url);
  points.push(...(page.data ?? []));
  url = page.links?.next ?? null;
}
const tiers = points
  .map((p) => ({ id: p.id, price: Number(p.attributes?.customerPrice) }))
  .filter((p) => Number.isFinite(p.price))
  .sort((a, b) => a.price - b.price);
if (tiers.length === 0) {
  console.error('✗ no SWE price points returned for this IAP');
  process.exit(1);
}

const chosen = [...tiers].sort(
  (a, b) => Math.abs(a.price - TARGET) - Math.abs(b.price - TARGET),
)[0];
const ci = tiers.findIndex((t) => t.id === chosen.id);

console.log(`IAP "${PRODUCT_ID}" (id=${iap.id}) — base territory ${BASE_TERRITORY}`);
console.log(`  target ${TARGET} kr → nearest tier ${chosen.price} kr  (price point ${chosen.id})`);
console.log(
  '  nearby: ' +
    tiers
      .slice(Math.max(0, ci - 2), ci + 3)
      .map((t) => (t.id === chosen.id ? `[${t.price}]` : `${t.price}`))
      .join(' / ') +
    ' kr',
);

if (!GO) {
  console.log('\n— dry-run — re-run with --go to set the price.');
  process.exit(0);
}

const ph = '${price1}'; // ASC inline-creation "local id" must be in ${...} form (per 409 ENTITY_ERROR.INCLUDED.INVALID_ID)
await asc('POST', '/v1/inAppPurchasePriceSchedules', {
  data: {
    type: 'inAppPurchasePriceSchedules',
    relationships: {
      inAppPurchase: { data: { type: 'inAppPurchases', id: iap.id } },
      baseTerritory: { data: { type: 'territories', id: BASE_TERRITORY } },
      manualPrices: { data: [{ type: 'inAppPurchasePrices', id: ph }] },
    },
  },
  included: [
    {
      type: 'inAppPurchasePrices',
      id: ph,
      attributes: { startDate: null },
      relationships: {
        inAppPurchasePricePoint: {
          data: { type: 'inAppPurchasePricePoints', id: chosen.id },
        },
      },
    },
  ],
});
console.log(`  ✓ price set to ${chosen.price} kr (base ${BASE_TERRITORY}; other storefronts auto-derived)`);
