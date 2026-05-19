// Final step — moves the version from PREPARE_FOR_SUBMISSION → WAITING_FOR_REVIEW.
// Apple's App Review takes 1–3 days. Run only after you have:
//   • completed the App Privacy questionnaire in the web UI
//   • verified your privacy URL is live (https://samilamti.github.io/word-games/PRIVACY.md)
//   • reviewed all metadata in App Store Connect
//
// Usage:
//   node --env-file=.env.local scripts/asc/submit-for-review.mjs --confirm
//
// (without --confirm, this script just summarizes what would happen)

import { readFileSync } from 'node:fs';
import { asc } from './lib.mjs';

const versionId = readFileSync('build/ios/app-store-version-id.txt', 'utf8').trim();
const confirmed = process.argv.includes('--confirm');

// Pre-flight: verify the version is in PREPARE_FOR_SUBMISSION
const v = await asc('GET', `/v1/appStoreVersions/${versionId}?include=build,appStoreVersionLocalizations,appStoreVersionSubmission`);
console.log(`Version ${v.data.attributes.versionString}`);
console.log(`  state:           ${v.data.attributes.appStoreState}`);
console.log(`  release type:    ${v.data.attributes.releaseType}`);
console.log(`  build attached:  ${v.data.relationships?.build?.data?.id ?? '(none)'}`);
console.log(`  existing submission: ${v.data.relationships?.appStoreVersionSubmission?.data?.id ?? '(none)'}`);

if (v.data.attributes.appStoreState !== 'PREPARE_FOR_SUBMISSION') {
  console.error(`\nNot in PREPARE_FOR_SUBMISSION (current: ${v.data.attributes.appStoreState}). Aborting.`);
  process.exit(1);
}
if (!v.data.relationships?.build?.data?.id) {
  console.error(`\nNo build attached. Run check-build.mjs first.`);
  process.exit(1);
}

if (!confirmed) {
  console.log(`\n[dry-run] Would POST /v1/appStoreVersionSubmissions to submit v${v.data.attributes.versionString} for App Review.`);
  console.log(`Re-run with --confirm to actually submit.`);
  process.exit(0);
}

console.log(`\nSubmitting for App Review…`);
const result = await asc('POST', '/v1/appStoreVersionSubmissions', {
  data: {
    type: 'appStoreVersionSubmissions',
    relationships: { appStoreVersion: { data: { type: 'appStoreVersions', id: versionId } } },
  },
});
console.log(`✓ Submission created: ${result.data.id}`);
console.log(`The version will move to WAITING_FOR_REVIEW. Apple typically responds within 1–3 days.`);
