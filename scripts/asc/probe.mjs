import { makeJwt } from './lib.mjs';

const jwt = makeJwt();

const endpoints = [
  '/v1/users?limit=1',
  '/v1/apps?limit=1',
  '/v1/bundleIds?limit=1',
  '/v1/userInvitations?limit=1',
];

for (const ep of endpoints) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${ep}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const body = await res.text();
  let parsed;
  try { parsed = JSON.parse(body); } catch { parsed = body; }
  const errLine = parsed?.errors?.[0]
    ? `${parsed.errors[0].code}: ${parsed.errors[0].title}`
    : (res.ok ? '(OK)' : body.slice(0, 200));
  console.log(`${ep.padEnd(38)} → ${res.status}  ${errLine}`);
}

console.log('\n--- JWT (first/last 20 chars only) ---');
console.log(`${jwt.slice(0, 20)}...${jwt.slice(-20)}`);
console.log(`length: ${jwt.length}`);
