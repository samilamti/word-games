import { asc } from './lib.mjs';

const apps = await asc('GET', '/v1/apps?limit=200&fields[apps]=name,bundleId,sku,primaryLocale');
console.log(`OK — auth works. Found ${apps.data.length} app(s) in this account:`);
for (const app of apps.data) {
  const a = app.attributes;
  console.log(`  • ${a.name}  (${a.bundleId})  sku=${a.sku}`);
}

const bundles = await asc('GET', `/v1/bundleIds?filter[identifier]=${process.env.ASC_BUNDLE_ID}&fields[bundleIds]=identifier,name,platform`);
console.log('');
if (bundles.data.length === 0) {
  console.log(`Bundle ID "${process.env.ASC_BUNDLE_ID}" is NOT yet registered.`);
} else {
  console.log(`Bundle ID "${process.env.ASC_BUNDLE_ID}" is already registered:`);
  for (const b of bundles.data) {
    console.log(`  • id=${b.id}  name=${b.attributes.name}  platform=${b.attributes.platform}`);
  }
}
