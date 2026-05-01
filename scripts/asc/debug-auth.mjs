import { createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { makeJwt } from './lib.mjs';

const key = createPrivateKey(readFileSync(process.env.ASC_KEY_PATH));
console.log('--- Key inspection ---');
console.log('  type:    ', key.asymmetricKeyType);
console.log('  details: ', key.asymmetricKeyDetails);

const jwt = makeJwt();
const [hb64, pb64, sb64] = jwt.split('.');
const header  = JSON.parse(Buffer.from(hb64, 'base64url').toString('utf8'));
const payload = JSON.parse(Buffer.from(pb64, 'base64url').toString('utf8'));

console.log('\n--- JWT header ---');
console.log(header);
console.log('\n--- JWT payload ---');
console.log({
  ...payload,
  iat_iso: new Date(payload.iat * 1000).toISOString(),
  exp_iso: new Date(payload.exp * 1000).toISOString(),
  ttl_sec: payload.exp - payload.iat,
});
console.log('\n--- Sig length (bytes, expect 64 for ES256 raw) ---');
console.log(Buffer.from(sb64, 'base64url').length);

console.log('\n--- Env (sanity check, masked) ---');
console.log({
  ASC_KEY_ID: process.env.ASC_KEY_ID,
  ASC_ISSUER_ID: process.env.ASC_ISSUER_ID,
  ASC_KEY_PATH: process.env.ASC_KEY_PATH,
  ASC_TEAM_ID: process.env.ASC_TEAM_ID,
});
