import { readFileSync, writeFileSync } from 'node:fs';
import { asc } from './lib.mjs';

const appId = readFileSync('build/ios/app-id.txt', 'utf8').trim();
const versionId = readFileSync('build/ios/app-store-version-id.txt', 'utf8').trim();

// Find the most-recent VALID build
const builds = await asc(
  'GET',
  `/v1/builds?filter[app]=${appId}&fields[builds]=version,uploadedDate,processingState&sort=-uploadedDate&limit=5`,
);
const ready = builds.data.find(b => b.attributes.processingState === 'VALID');
if (!ready) {
  console.error('No VALID build available.');
  process.exit(1);
}
console.log(`Latest VALID build: ${ready.id}  v${ready.attributes.version}  (uploaded ${ready.attributes.uploadedDate})`);

// Check what's currently attached
const versionDetail = await asc('GET', `/v1/appStoreVersions/${versionId}?include=build`);
const currentlyAttached = versionDetail.data.relationships?.build?.data?.id;

if (currentlyAttached === ready.id) {
  console.log('Already attached ✓');
  process.exit(0);
}

console.log(`Currently attached: ${currentlyAttached ?? '(none)'} — re-attaching to ${ready.id}…`);
await asc('PATCH', `/v1/appStoreVersions/${versionId}`, {
  data: {
    type: 'appStoreVersions',
    id: versionId,
    relationships: { build: { data: { type: 'builds', id: ready.id } } },
  },
});
writeFileSync('build/ios/build-id.txt', ready.id);
console.log(`✓ AppStoreVersion now references build ${ready.id}`);
