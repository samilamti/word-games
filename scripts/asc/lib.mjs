import { readFileSync } from 'node:fs';
import { createPrivateKey, sign } from 'node:crypto';

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name} (set in .env.local and run with: node --env-file=.env.local <script>)`);
  return v;
};

const b64url = (input) => Buffer.from(input).toString('base64url');

let cached = { jwt: null, exp: 0 };

export function makeJwt() {
  const now = Math.floor(Date.now() / 1000);
  if (cached.jwt && cached.exp > now + 30) return cached.jwt;

  const KEY_ID = required('ASC_KEY_ID');
  const ISSUER_ID = required('ASC_ISSUER_ID');
  const KEY_PATH = required('ASC_KEY_PATH');

  const header = b64url(JSON.stringify({ alg: 'ES256', kid: KEY_ID, typ: 'JWT' }));
  const exp = now + 1100;
  const payload = b64url(JSON.stringify({
    iss: ISSUER_ID,
    iat: now,
    exp,
    aud: 'appstoreconnect-v1',
  }));
  const signingInput = `${header}.${payload}`;
  const key = createPrivateKey(readFileSync(KEY_PATH));
  const signature = sign('SHA256', Buffer.from(signingInput), { key, dsaEncoding: 'ieee-p1363' });
  cached = { jwt: `${signingInput}.${b64url(signature)}`, exp };
  return cached.jwt;
}

export async function asc(method, path, body) {
  const jwt = makeJwt();
  const url = path.startsWith('http') ? path : `https://api.appstoreconnect.apple.com${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${jwt}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const detail = typeof data === 'string'
      ? data
      : JSON.stringify(data?.errors ?? data ?? {}, null, 2);
    const err = new Error(`ASC ${method} ${path} → ${res.status}\n${detail}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
