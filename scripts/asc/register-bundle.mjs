import { mkdirSync, writeFileSync } from 'node:fs';
import { asc } from './lib.mjs';

const identifier = process.env.ASC_BUNDLE_ID;
const name       = process.env.ASC_APP_NAME;
if (!identifier || !name) {
  throw new Error('ASC_BUNDLE_ID and ASC_APP_NAME must be set in .env.local');
}

const existing = await asc(
  'GET',
  `/v1/bundleIds?filter[identifier]=${encodeURIComponent(identifier)}&fields[bundleIds]=identifier,name,platform,seedId`,
);

let resource;
if (existing.data.length > 0) {
  resource = existing.data[0];
  console.log(`Already registered (idempotent):`);
} else {
  console.log(`Registering bundle ID "${identifier}" with name "${name}"…`);
  const created = await asc('POST', '/v1/bundleIds', {
    data: {
      type: 'bundleIds',
      attributes: { identifier, name, platform: 'IOS' },
    },
  });
  resource = created.data;
  console.log(`Registered successfully:`);
}

console.log(`  resource id: ${resource.id}`);
console.log(`  identifier:  ${resource.attributes.identifier}`);
console.log(`  name:        ${resource.attributes.name}`);
console.log(`  platform:    ${resource.attributes.platform}`);
console.log(`  seed id:     ${resource.attributes.seedId ?? '(none)'}`);

mkdirSync('build/ios', { recursive: true });
writeFileSync('build/ios/bundle-id.txt', resource.id);
console.log(`\nWrote build/ios/bundle-id.txt = ${resource.id}`);
