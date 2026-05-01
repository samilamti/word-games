import { mkdirSync, writeFileSync } from 'node:fs';
import { asc } from './lib.mjs';

const bundleId = process.env.ASC_BUNDLE_ID;
if (!bundleId) throw new Error('ASC_BUNDLE_ID not set in .env.local');

const res = await asc(
  'GET',
  `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}&fields[apps]=name,bundleId,sku,primaryLocale,contentRightsDeclaration,isOrEverWasMadeForKids`,
);

if (res.data.length === 0) {
  console.error(`No App Store Connect record found for bundle ID "${bundleId}".`);
  console.error(`Create it manually at https://appstoreconnect.apple.com → My Apps → "+"`);
  console.error(`(Apple's API does not support POST /v1/apps — web UI only.)`);
  process.exit(1);
}

const app = res.data[0];
console.log(`Found App Store Connect record:`);
console.log(`  resource id:   ${app.id}`);
console.log(`  name:          ${app.attributes.name}`);
console.log(`  bundle id:     ${app.attributes.bundleId}`);
console.log(`  sku:           ${app.attributes.sku}`);
console.log(`  primary loc:   ${app.attributes.primaryLocale}`);
console.log(`  made for kids: ${app.attributes.isOrEverWasMadeForKids ?? false}`);

mkdirSync('build/ios', { recursive: true });
writeFileSync('build/ios/app-id.txt', app.id);
console.log(`\nWrote build/ios/app-id.txt = ${app.id}`);
