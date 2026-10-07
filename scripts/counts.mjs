import { generate } from '../engine/slot-engine.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const cat = JSON.parse(readFileSync(new URL('../catalogue/catalog_full.json', import.meta.url),'utf8'));
const beh = Object.fromEntries(cat.behaviors.map(b=>[b.id,b]));
const cfgFor=(a,b)=>{const c=JSON.parse(JSON.stringify(a.configuration)); c.ego.intent=a.intent?.[b.code]||b.default.intent; if(b.default.sides) c.ego.sides=b.default.sides; if(!c.ego.sides?.length) c.ego.sides=['left']; return c;};
const out={};
for (const a of cat.abstracts) { out[a.id]={}; if(!a.configuration) continue;
  for (const bid of a.behaviors){ const b=beh[bid]; const c=cfgFor(a,b); const r=generate(c,{...a,id:a.id+'@'+b.code}); out[a.id][b.code]={intent:c.ego.intent,potential:r.counts.potential,valid:r.counts.valid,rejected:r.counts.rejected}; } }
writeFileSync(new URL('../catalogue/counts.json', import.meta.url), JSON.stringify(out)); console.log('ok');
