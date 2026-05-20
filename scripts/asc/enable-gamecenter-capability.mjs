import { readFileSync } from 'node:fs';
import { asc } from './lib.mjs';

const bundleResourceId = readFileSync('build/ios/bundle-id.txt', 'utf8').trim();

// Check what capabilities are already enabled
const existing = await asc('GET', `/v1/bundleIds/${bundleResourceId}/bundleIdCapabilities`);
const have = existing.data.map(c => c.attributes.capabilityType);
console.log(`Currently enabled capabilities on ${bundleResourceId}:`);
for (const c of existing.data) {
  console.log(`  • ${c.attributes.capabilityType}  (id=${c.id})`);
}

if (have.includes('GAME_CENTER')) {
  console.log('\nGame Center already enabled ✓');
  process.exit(0);
}

console.log('\nEnabling GAME_CENTER capability…');
const result = await asc('POST', '/v1/bundleIdCapabilities', {
  data: {
    type: 'bundleIdCapabilities',
    attributes: { capabilityType: 'GAME_CENTER' },
    relationships: {
      bundleId: { data: { type: 'bundleIds', id: bundleResourceId } },
    },
  },
});
console.log(`  ✓ Game Center enabled  (capability id=${result.data.id})`);
