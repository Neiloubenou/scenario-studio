import { generate } from '../engine/slot-engine.mjs';
import { readFileSync } from 'node:fs';
const cat = JSON.parse(readFileSync(new URL('../catalogue/catalog_full.json', import.meta.url),'utf8'));
const beh = Object.fromEntries(cat.behaviors.map(b=>[b.id,b]));
export function cfgFor(a, b){ const c = JSON.parse(JSON.stringify(a.configuration)); const code=b.code; c.ego.intent = a.intent?.[code] || b.default.intent; if (b.default.sides) c.ego.sides=b.default.sides; if(!c.ego.sides?.length) c.ego.sides=['left']; return c; }
let tot={pairs:0,valid:0,rej:0,pot:0}, bad=[];
const perBeh={};
for (const a of cat.abstracts) { if(!a.configuration) continue;
  for (const bid of a.behaviors) { const b=beh[bid]; const c=cfgFor(a,b); const r=generate(c,{...a,id:a.id+'@'+b.code});
    tot.pairs++; tot.valid+=r.counts.valid; tot.rej+=r.counts.rejected; tot.pot+=r.counts.potential;
    perBeh[b.code]=(perBeh[b.code]||0)+r.counts.valid;
    if (r.status!=='complete' || r.counts.valid===0) bad.push([a.id,b.code,r.status,r.counts,r.errors?.slice(0,2), r.rejected[0]?.reasons?.[0]]);
  } }
console.log(tot); console.log(perBeh); console.log(bad.length); bad.slice(0,30).forEach(x=>console.log(JSON.stringify(x)));
