/**
 * Configure RevenueCat for the one-time unlock via the v2 REST API — end to end.
 *
 * Run:  node --env-file=.env.local scripts/revenuecat/configure.mjs        (dry-run)
 *       node --env-file=.env.local scripts/revenuecat/configure.mjs --go   (apply)
 *
 * Needs in .env.local: RC_SECRET_KEY (v2 `sk_...`, project_configuration
 * read_write) and the App Store Connect API key creds (ASC_KEY_ID,
 * ASC_ISSUER_ID, ASC_KEY_PATH → the .p8) so RevenueCat can be connected to the
 * Apple app + import products. Idempotent: list-then-create on lookup_key /
 * store_identifier / bundle_id. Builds:
 *   app_store app (← ASC API key) · entitlement `unlock` ← product `full_unlock`
 *   · current offering `default` → package `lifetime` → product
 * Prints the public production SDK key (appl_…) for VITE_RC_IOS_KEY.
 */
import { readFileSync } from 'node:fs';

const KEY = process.env.RC_SECRET_KEY;
if (!KEY) {
  console.error('Missing RC_SECRET_KEY in .env.local (v2 `sk_...`). Run: node --env-file=.env.local scripts/revenuecat/configure.mjs [--go]');
  process.exit(1);
}

const BASE = 'https://api.revenuecat.com/v2';
const GO = process.argv.includes('--go');

const BUNDLE_ID = 'com.samixavierlamti.lexiconquest';
const APP_NAME = 'Lexica Knights';
const ENTITLEMENT = 'unlock';
const PRODUCT_SID = 'full_unlock';
const OFFERING = 'default';
const PACKAGE = 'lifetime';

async function rc(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`RC ${method} ${path} → ${res.status} ${data?.type ?? ''}: ${data?.message ?? text}`);
    err.status = res.status;
    err.type = data?.type;
    throw err;
  }
  return data;
}

async function list(path) {
  const items = [];
  let next = path;
  while (next) {
    const p = next.startsWith('/v2') ? next.slice(3) : next;
    const page = await rc('GET', p);
    items.push(...(page.items ?? []));
    next = page.next_page ?? null;
  }
  return items;
}

/** Find by key field; create if missing (skipped in dry-run). */
async function ensure(label, listPath, createPath, body, keyField, keyValue) {
  const found = (await list(listPath)).find((x) => x[keyField] === keyValue);
  if (found) { console.log(`  • ${label} "${keyValue}" exists ✓ (${found.id})`); return found; }
  if (!GO) { console.log(`  • ${label} "${keyValue}" — would CREATE`); return null; }
  try {
    const res = await rc('POST', createPath, body);
    console.log(`  • ${label} "${keyValue}" created ✓ (${res.id})`);
    return res;
  } catch (e) {
    if (e.type === 'resource_already_exists') {
      const again = (await list(listPath)).find((x) => x[keyField] === keyValue);
      console.log(`  • ${label} "${keyValue}" already existed ✓ (${again?.id})`);
      return again;
    }
    throw e;
  }
}

console.log(GO ? 'Configuring RevenueCat (--go)…\n' : 'RevenueCat config — DRY RUN (no changes)\n');

// 1) project
const projects = await list('/projects');
if (projects.length === 0) throw new Error('No RevenueCat projects found for this key.');
const project = projects.find((p) => /lexica/i.test(p.name ?? '')) ?? projects[0];
console.log(`Project: ${project.name} (${project.id})\n`);

// 2) App Store app — find or create (attaching the App Store Connect API key)
console.log('App Store app:');
let app = (await list(`/projects/${project.id}/apps`)).find((a) => a.type === 'app_store');
if (app) {
  console.log(`  • exists ✓ (${app.id}; ASC API key configured: ${app.app_store?.app_store_connect_api_key_configured})`);
} else if (!GO) {
  console.log(`  • would CREATE app_store app "${APP_NAME}" (${BUNDLE_ID}) + attach ASC API key ${process.env.ASC_KEY_ID}`);
} else {
  const p8 = readFileSync(process.env.ASC_KEY_PATH, 'utf8'); // PEM contents (kept out of logs)
  app = await rc('POST', `/projects/${project.id}/apps`, {
    name: APP_NAME,
    type: 'app_store',
    app_store: {
      bundle_id: BUNDLE_ID,
      app_store_connect_api_key: p8,
      app_store_connect_api_key_id: process.env.ASC_KEY_ID,
      app_store_connect_api_key_issuer: process.env.ASC_ISSUER_ID,
    },
  });
  console.log(`  • created ✓ (${app.id}; ASC API key configured: ${app.app_store?.app_store_connect_api_key_configured})`);
}

// 3) entitlement
console.log('Entitlement:');
const ent = await ensure('entitlement', `/projects/${project.id}/entitlements`,
  `/projects/${project.id}/entitlements`,
  { lookup_key: ENTITLEMENT, display_name: 'Full Unlock' }, 'lookup_key', ENTITLEMENT);

// 4) product (RC v2 non-consumable type = "one_time"; fall back if rejected)
console.log('Product:');
let prod = null;
if (app) {
  prod = (await list(`/projects/${project.id}/products?app_id=${app.id}`)).find((p) => p.store_identifier === PRODUCT_SID) ?? null;
  if (prod) {
    console.log(`  • product "${PRODUCT_SID}" exists ✓ (${prod.id})`);
  } else if (!GO) {
    console.log(`  • product "${PRODUCT_SID}" — would CREATE (type one_time)`);
  } else {
    for (const type of ['one_time', 'non_consumable']) {
      try {
        prod = await rc('POST', `/projects/${project.id}/products`, { store_identifier: PRODUCT_SID, app_id: app.id, type });
        console.log(`  • product "${PRODUCT_SID}" created ✓ (${prod.id}, type=${type})`);
        break;
      } catch (e) {
        if (e.type === 'resource_already_exists') {
          prod = (await list(`/projects/${project.id}/products?app_id=${app.id}`)).find((p) => p.store_identifier === PRODUCT_SID);
          console.log(`  • product "${PRODUCT_SID}" already existed ✓ (${prod?.id})`);
          break;
        }
        if (type === 'one_time' && /type|enum|parameter/i.test(e.message)) {
          console.log('    (type "one_time" rejected — trying "non_consumable")');
          continue;
        }
        throw e;
      }
    }
  }
} else {
  console.log(`  • would CREATE product "${PRODUCT_SID}" after the app exists`);
}

// 5) attach product → entitlement
console.log('Attach product → entitlement:');
if (GO && ent && prod) {
  await rc('POST', `/projects/${project.id}/entitlements/${ent.id}/actions/attach_products`, { product_ids: [prod.id] });
  console.log(`  • attached ${prod.id} → ${ent.id} ✓`);
} else { console.log('  • would attach product → entitlement'); }

// 6) offering + mark current
console.log('Offering:');
const off = await ensure('offering', `/projects/${project.id}/offerings`,
  `/projects/${project.id}/offerings`,
  { lookup_key: OFFERING, display_name: 'Default' }, 'lookup_key', OFFERING);
if (off?.is_current) {
  console.log('  • already current ✓');
} else if (GO && off) {
  await rc('POST', `/projects/${project.id}/offerings/${off.id}`, { is_current: true });
  console.log('  • marked current ✓');
} else { console.log('  • would mark current'); }

// 7) package
console.log('Package:');
let pkg = null;
if (off) {
  pkg = await ensure('package', `/projects/${project.id}/offerings/${off.id}/packages`,
    `/projects/${project.id}/offerings/${off.id}/packages`,
    { lookup_key: PACKAGE, display_name: 'Lifetime' }, 'lookup_key', PACKAGE);
} else { console.log(`  • would create offering "${OFFERING}" + package "${PACKAGE}"`); }

// 8) attach product → package  (body shape: {products:[{product_id, eligibility_criteria}]})
console.log('Attach product → package:');
if (GO && pkg && prod) {
  await rc('POST', `/projects/${project.id}/packages/${pkg.id}/actions/attach_products`,
    { products: [{ product_id: prod.id, eligibility_criteria: 'all' }] });
  console.log(`  • attached ${prod.id} → package ${pkg.id} ✓`);
} else { console.log('  • would attach product → package'); }

// 9) public production SDK key (appl_…) for VITE_RC_IOS_KEY
console.log('Public SDK key (appl_…):');
if (GO && app) {
  const keys = await list(`/projects/${project.id}/apps/${app.id}/public_api_keys`);
  const prod_key = keys.find((k) => k.environment === 'production') ?? keys[0];
  if (prod_key?.key) {
    console.log(`  • production public key: ${prod_key.key}`);
    console.log('    → add to .env.local as VITE_RC_IOS_KEY (next step), then rebuild.');
  } else {
    console.log('  • no public key returned (check dashboard).');
  }
} else { console.log('  • would fetch the production public key'); }

console.log(`\n${GO ? '✓ RevenueCat configured.' : '— dry-run complete — re-run with --go to apply.'}`);
