import { readFileSync, writeFileSync } from 'node:fs';
import { asc } from './lib.mjs';

const appId = readFileSync('build/ios/app-id.txt', 'utf8').trim();
const versionId = readFileSync('build/ios/app-store-version-id.txt', 'utf8').trim();

const builds = await asc(
  'GET',
  `/v1/builds?filter[app]=${appId}&fields[builds]=version,uploadedDate,processingState,expired,usesNonExemptEncryption,buildAudienceType&sort=-uploadedDate&limit=5`,
);

if (builds.data.length === 0) {
  console.log('No builds found yet — Apple may still be processing the upload (usually 5–30 min).');
  process.exit(1);
}

console.log(`Recent builds for app ${appId}:`);
for (const b of builds.data) {
  console.log(`  • ${b.id}  v${b.attributes.version}  ${b.attributes.processingState}  uploaded=${b.attributes.uploadedDate}`);
}

const ready = builds.data.find(b => b.attributes.processingState === 'VALID');
if (!ready) {
  console.log('\nNo VALID build yet. Try again in a few minutes.');
  process.exit(2);
}

writeFileSync('build/ios/build-id.txt', ready.id);
console.log(`\nWrote build/ios/build-id.txt = ${ready.id}`);

// Check current version → build relationship
const versionDetail = await asc('GET', `/v1/appStoreVersions/${versionId}?include=build`);
const attached = versionDetail.data.relationships?.build?.data?.id;
if (attached === ready.id) {
  console.log(`Build already attached to AppStoreVersion ${versionId} ✓`);
} else if (attached) {
  console.log(`AppStoreVersion has a different build attached: ${attached}`);
} else {
  console.log(`AppStoreVersion has no build attached. Attaching ${ready.id}…`);
  await asc('PATCH', `/v1/appStoreVersions/${versionId}`, {
    data: {
      type: 'appStoreVersions',
      id: versionId,
      relationships: { build: { data: { type: 'builds', id: ready.id } } },
    },
  });
  console.log('  ✓ build attached');
}
