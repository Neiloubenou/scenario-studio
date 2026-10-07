import { readFileSync, writeFileSync } from 'node:fs';
import { linkStats } from './core.mjs';
const D = JSON.parse(readFileSync(new URL('./studio.json', import.meta.url), 'utf8'));
const B = Object.fromEntries(D.behaviors.map(b => [b.code, b]));
const t0 = Date.now(); const stats = {}; let tot = {pot: 0, valid: 0, rej: 0, deferred: 0, pass: 0, fail: 0, not_run: 0};
for (const s of D.scenarios) for (const [code, link] of Object.entries(s.links)) {
  if (!s.generable) continue;
  const st = linkStats(s, B[code], link, D.odd, null); stats[`${s.id}@${code}`] = st;
  for (const k in tot) tot[k] += st.tot[k];
}
writeFileSync(new URL('./stats_demo.json', import.meta.url), JSON.stringify(stats));
console.log('ms', Date.now() - t0, tot);
