/**
 * Create the one-time "full unlock" non-consumable IAP in App Store Connect.
 *
 * Run:  node --env-file=.env.local scripts/asc/create-iap.mjs          (dry-run)
 *       node --env-file=.env.local scripts/asc/create-iap.mjs --go     (create)
 *
 * Dry-run (default) authenticates, lists existing IAPs, and prints the plan —
 * it changes nothing. `--go` creates the IAP + en-US localization if missing
 * (idempotent: productId is PERMANENT once created, so re-runs are safe).
 *
 * Price is intentionally NOT set here — pick a SEK tier separately
 * (set-iap-price.mjs); the review screenshot is a submission-time UI step.
 * RevenueCat references this productId; keep it identical to the Play product.
 */
import { asc } from './lib.mjs';

const APP_ID = '6765603467'; // Lexica Knights (stable ASC app id; see CLAUDE.md)

const PRODUCT_ID = 'full_unlock'; // PERMANENT; must match the Play product + RC
const REFERENCE_NAME = 'Full Unlock'; // internal (<=64)
const LOCALE = 'en-US';
const DISPLAY_NAME = 'Full Unlock'; // shown to buyers (<=30)
const DESCRIPTION = 'Full campaign, word journal, review & vocab.'; // (<=45)

const GO = process.argv.includes('--go');

const tooLong = (label, value, max) => {
  if (value.length > max) {
    console.error(`✗ ${label} is ${value.length} chars (max ${max}): ${JSON.stringify(value)}`);
    process.exit(1);
  }
};
tooLong('reference name', REFERENCE_NAME, 64);
tooLong('display name', DISPLAY_NAME, 30);
tooLong('description', DESCRIPTION, 45);

// 1) Already exists? (read-only; also validates auth)
const list = await asc('GET', `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`);
let iap = (list.data ?? []).find((p) => p.attributes?.productId === PRODUCT_ID) ?? null;

console.log(`App ${APP_ID} — non-consumable IAP "${PRODUCT_ID}":`);
console.log(
  iap
    ? `  already exists ✓  (id=${iap.id}, state=${iap.attributes?.state})`
    : '  not created yet',
);
console.log('\nPlan:');
console.log('  type            NON_CONSUMABLE');
console.log(`  productId       ${PRODUCT_ID}   (PERMANENT once created)`);
console.log(`  reference name  ${REFERENCE_NAME}`);
console.log(`  ${LOCALE}         "${DISPLAY_NAME}" — "${DESCRIPTION}"`);
console.log('  price           set separately (SEK tier)');

if (!GO) {
  console.log('\n— dry-run — nothing changed. Re-run with --go to create.');
  process.exit(0);
}

// 2) Create the IAP if missing
if (!iap) {
  console.log('\nCreating in-app purchase…');
  const created = await asc('POST', '/v2/inAppPurchases', {
    data: {
      type: 'inAppPurchases',
      attributes: {
        name: REFERENCE_NAME,
        productId: PRODUCT_ID,
        inAppPurchaseType: 'NON_CONSUMABLE',
        familySharable: false,
      },
      relationships: { app: { data: { type: 'apps', id: APP_ID } } },
    },
  });
  iap = created.data;
  console.log(`  ✓ created (id=${iap.id})`);
}

// 3) Ensure the en-US localization exists
const locs = await asc('GET', `/v2/inAppPurchases/${iap.id}/inAppPurchaseLocalizations`);
if ((locs.data ?? []).some((l) => l.attributes?.locale === LOCALE)) {
  console.log(`  ${LOCALE} localization already present ✓`);
} else {
  console.log(`  adding ${LOCALE} localization…`);
  await asc('POST', '/v1/inAppPurchaseLocalizations', {
    data: {
      type: 'inAppPurchaseLocalizations',
      attributes: { locale: LOCALE, name: DISPLAY_NAME, description: DESCRIPTION },
      relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iap.id } } },
    },
  });
  console.log(`  ✓ ${LOCALE} localization added`);
}

console.log(`\n✓ IAP ready. RevenueCat product id = ${PRODUCT_ID}  (ASC resource id = ${iap.id})`);
console.log('Next: set a SEK price, then add a review screenshot at submission time.');
