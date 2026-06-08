/**
 * Upload the IAP review screenshot for `full_unlock` to App Store Connect,
 * clearing MISSING_METADATA → READY_TO_SUBMIT.
 *
 * Run:  node --env-file=.env.local scripts/asc/upload-iap-screenshot.mjs        (dry-run)
 *       node --env-file=.env.local scripts/asc/upload-iap-screenshot.mjs --go   (upload)
 *
 * Reserve → PUT chunk(s) → commit (uploaded:true + md5) — same asset pattern as
 * upload-screenshots.mjs. The review screenshot is a TO-ONE relationship on the
 * IAP (one per product), so there's no screenshot "set". Idempotent: if a
 * screenshot already exists it reports and exits.
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename } from 'node:path';
import { asc } from './lib.mjs';

const APP_ID = '6765603467'; // Lexica Knights
const PRODUCT_ID = 'full_unlock';
const FILE = process.argv.find((a) => /\.(png|jpe?g)$/i.test(a)) ?? 'build/ios/iap-review-screenshot.png';
const GO = process.argv.includes('--go');

// 1. Find the IAP.
const list = await asc('GET', `/v1/apps/${APP_ID}/inAppPurchasesV2?limit=200`);
const iap = (list.data ?? []).find((p) => p.attributes?.productId === PRODUCT_ID);
if (!iap) { console.error(`✗ IAP "${PRODUCT_ID}" not found on app ${APP_ID}`); process.exit(1); }
console.log(`IAP "${PRODUCT_ID}"  id=${iap.id}  state=${iap.attributes?.state}`);

// 2. Already has a review screenshot? Keep it only if COMPLETE; otherwise replace
//    (a FAILED asset — e.g. wrong dimensions — must be deleted before re-upload).
const existing = await asc('GET', `/v2/inAppPurchases/${iap.id}/appStoreReviewScreenshot`).catch(() => ({ data: null }));
if (existing?.data) {
  const st = existing.data.attributes?.assetDeliveryState?.state;
  if (st === 'COMPLETE') {
    console.log(`  already has a COMPLETE review screenshot (id=${existing.data.id}). Nothing to do.`);
    process.exit(0);
  }
  console.log(`  existing review screenshot is ${st} (id=${existing.data.id}) — will replace it.`);
  if (GO) {
    await asc('DELETE', `/v1/inAppPurchaseAppStoreReviewScreenshots/${existing.data.id}`);
    console.log('  ✓ deleted the stale screenshot');
  }
}

// 3. Read the file.
const buf = readFileSync(FILE);
const fileName = basename(FILE);
const fileSize = buf.length;
const checksum = createHash('md5').update(buf).digest('hex');
console.log(`\nFile: ${FILE}  (${fileSize} bytes, md5=${checksum.slice(0, 12)}…)`);

if (!GO) {
  console.log('\n— dry-run — would: reserve an upload slot → PUT the file → commit (uploaded:true + md5) → re-check IAP state.');
  console.log('  Re-run with --go to upload.');
  process.exit(0);
}

// 4. Reserve an upload slot.
console.log('\nreserving upload slot…');
const reservation = await asc('POST', '/v1/inAppPurchaseAppStoreReviewScreenshots', {
  data: {
    type: 'inAppPurchaseAppStoreReviewScreenshots',
    attributes: { fileName, fileSize },
    relationships: { inAppPurchaseV2: { data: { type: 'inAppPurchases', id: iap.id } } },
  },
});
const shotId = reservation.data.id;
const uploadOps = reservation.data.attributes.uploadOperations;
console.log(`  ✓ screenshot id=${shotId}, ${uploadOps.length} chunk(s)`);

// 5. PUT each chunk to Apple's asset endpoint (headers come from the reservation).
for (const [i, op] of uploadOps.entries()) {
  const chunk = buf.subarray(op.offset, op.offset + op.length);
  const headers = {};
  for (const h of op.requestHeaders) headers[h.name] = h.value;
  const res = await fetch(op.url, { method: op.method, headers, body: chunk });
  if (!res.ok) throw new Error(`chunk ${i} upload ${res.status}: ${(await res.text()).slice(0, 300)}`);
  console.log(`  ✓ chunk ${i + 1}/${uploadOps.length} (${op.length} bytes)`);
}

// 6. Commit.
console.log('committing…');
await asc('PATCH', `/v1/inAppPurchaseAppStoreReviewScreenshots/${shotId}`, {
  data: { type: 'inAppPurchaseAppStoreReviewScreenshots', id: shotId, attributes: { uploaded: true, sourceFileChecksum: checksum } },
});
console.log('  ✓ committed');

// 7. Re-check IAP state (asset processing can lag a few seconds).
await new Promise((r) => setTimeout(r, 2500));
const after = await asc('GET', `/v2/inAppPurchases/${iap.id}`);
console.log(`\nIAP state now: ${after.data?.attributes?.state}  (if still MISSING_METADATA, give Apple a minute to process the asset, then re-run inspect-iap.mjs)`);
