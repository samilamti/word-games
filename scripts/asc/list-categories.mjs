import { asc } from './lib.mjs';

const cats = await asc('GET', '/v1/appCategories?include=subcategories&exists[parent]=false&limit=200');

const byId = {};
for (const inc of cats.included ?? []) byId[inc.id] = inc;

for (const cat of cats.data) {
  console.log(`${cat.id}`);
  for (const sub of cat.relationships?.subcategories?.data ?? []) {
    const s = byId[sub.id];
    console.log(`  └ ${sub.id}${s ? '' : ''}`);
  }
}
