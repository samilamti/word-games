import { readFileSync } from 'node:fs';
import { asc } from './lib.mjs';

const buildId = readFileSync('build/ios/build-id.txt', 'utf8').trim();

// Lexica Knights uses only standard HTTPS via WKWebView — exempt from export compliance.
console.log(`Declaring usesNonExemptEncryption=false on build ${buildId}…`);
await asc('PATCH', `/v1/builds/${buildId}`, {
  data: {
    type: 'builds',
    id: buildId,
    attributes: { usesNonExemptEncryption: false },
  },
});
console.log('  ✓ encryption declaration set');
