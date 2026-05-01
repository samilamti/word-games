import { readFileSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, resolve } from 'node:path';
import { asc, makeJwt } from './lib.mjs';

const versionLocId = readFileSync('build/ios/app-store-version-localization-id.txt', 'utf8').trim();
const SHOTS_DIR = 'build/ios/screenshots';
const DISPLAY_TYPE = 'APP_IPHONE_67'; // 1290x2796 — iPhone 16 Plus / 6.7" (newest type Apple's API accepts)

// 1. Find or create the screenshot set for this display type + localization
console.log(`Locating appScreenshotSet for ${DISPLAY_TYPE} on version localization ${versionLocId}…`);
const sets = await asc('GET', `/v1/appStoreVersionLocalizations/${versionLocId}/appScreenshotSets`);
let set = sets.data.find(s => s.attributes.screenshotDisplayType === DISPLAY_TYPE);

if (!set) {
  console.log('  not found, creating…');
  const created = await asc('POST', '/v1/appScreenshotSets', {
    data: {
      type: 'appScreenshotSets',
      attributes: { screenshotDisplayType: DISPLAY_TYPE },
      relationships: {
        appStoreVersionLocalization: {
          data: { type: 'appStoreVersionLocalizations', id: versionLocId },
        },
      },
    },
  });
  set = created.data;
}
console.log(`  ✓ screenshotSet id = ${set.id}`);

// 2. Upload each screenshot file in build/ios/screenshots/
const files = readdirSync(SHOTS_DIR).filter(f => f.endsWith('.png')).sort();
console.log(`\nFound ${files.length} screenshot(s): ${files.join(', ')}`);

for (const fileName of files) {
  const filePath = resolve(SHOTS_DIR, fileName);
  const fileBuf = readFileSync(filePath);
  const fileSize = fileBuf.length;
  const checksum = createHash('md5').update(fileBuf).digest('hex');

  console.log(`\n→ ${fileName}  (${fileSize} bytes, md5=${checksum.slice(0, 12)}…)`);

  // 2a. Reserve an upload slot — returns uploadOperations
  console.log('  reserving slot…');
  const reservation = await asc('POST', '/v1/appScreenshots', {
    data: {
      type: 'appScreenshots',
      attributes: { fileName, fileSize },
      relationships: {
        appScreenshotSet: { data: { type: 'appScreenshotSets', id: set.id } },
      },
    },
  });
  const screenshotId = reservation.data.id;
  const uploadOps = reservation.data.attributes.uploadOperations;
  console.log(`  ✓ screenshot id=${screenshotId}, ${uploadOps.length} upload chunk(s)`);

  // 2b. PUT each chunk
  const jwt = makeJwt();
  for (const [i, op] of uploadOps.entries()) {
    const chunk = fileBuf.subarray(op.offset, op.offset + op.length);
    const headers = {};
    for (const h of op.requestHeaders) headers[h.name] = h.value;
    const res = await fetch(op.url, { method: op.method, headers, body: chunk });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Chunk ${i} upload ${res.status}: ${txt.slice(0, 300)}`);
    }
    console.log(`  ✓ chunk ${i + 1}/${uploadOps.length} uploaded (${op.length} bytes)`);
  }

  // 2c. Commit
  console.log('  committing…');
  await asc('PATCH', `/v1/appScreenshots/${screenshotId}`, {
    data: {
      type: 'appScreenshots',
      id: screenshotId,
      attributes: { uploaded: true, sourceFileChecksum: checksum },
    },
  });
  console.log(`  ✓ committed: ${fileName}`);
}

console.log(`\nAll ${files.length} screenshot(s) uploaded.`);
