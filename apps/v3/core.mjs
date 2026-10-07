/* Scenario Studio v3 core: ODD variants, concrete generation per behavior, demo results, risk.
   Shared by the build (node) and the page (browser). Depends on engine.mjs. */
import { generate, hash64, countPotential } from './engine.mjs';

export const clone = o => JSON.parse(JSON.stringify(o));

export function baseConfig(scn, beh, link){
  const c = clone(scn.configuration);
  c.ego.intent = link.intent || beh.intent || 'keep_lane';
  if (beh.sides) c.ego.sides = beh.sides;
  if (!c.ego.sides || !c.ego.sides.length) c.ego.sides = ['left'];
  return c;
}

/* ODD variants that apply to a scenario: nominal always; a simulable variant only when the scenario
   does not already vary that dimension itself; perception variants are listed but deferred (milestone 2). */
export function variantsFor(scn, ODD){
  if (!scn.generable) return [];
  const road = scn.configuration.road || {};
  const hw = (road.types || []).includes('highway');
  return ODD.variants.filter(v => {
    if (v.id === 'V00') return true;
    if (!hw) return false;
    if (!v.sim) return true;
    return v.dims.every(d => !(Array.isArray(road[d]) && road[d].length));
  });
}
export function variantConfig(base, variant){
  const c = clone(base);
  for (const [k, val] of Object.entries(variant.set || {})) c.road[k] = [val];
  return c;
}
export function runVariant(scn, beh, link, variant){
  const c = variantConfig(baseConfig(scn, beh, link), variant);
  const r = generate(c, {id: `${scn.id}@${beh.code}#${variant.id}`, version: scn.version || 1, applicability: scn.applicability, fixed: scn.fixed});
  return {cfg: c, r};
}

/* ---------- demo results: deterministic, clearly not simulation output ---------- */
function u01(id, salt){ const h = hash64({id, salt}); return parseInt(h.slice(0, 8), 16) / 0xffffffff; }
const HARD = new Set(['V01', 'V04', 'V05', 'V07']);
export function demoResult(v, link, variantId){
  if (u01(v.id, 'run') < 0.07) return {status: 'not_run'};
  const ex = v.expected || {}, why = ex.why || '';
  let p = 0.006;
  if (ex.cat === 'hold' && /</.test(why)) p += 0.12;
  if (ex.cat === 'other') p += 0.06;
  if (HARD.has(variantId)) p += 0.05;
  const A = v.parameters.actors || {};
  if (Object.values(A).some(a => a.present && a.maneuver?.type === 'cut_in' && (a.distanceM ?? 99) <= 10)) p += 0.10;
  if (Object.values(A).some(a => a.present && a.maneuver?.type === 'brake' && a.maneuver.decelMps2 >= 7)) p += 0.06;
  if (u01(v.id, 'fail') >= p) return {status: 'pass'};
  const C = link.criteria;
  const pick = (...ids) => ids.find(id => C.includes(id)) || 'C01';
  let crit;
  if (/lead gap/.test(why)) crit = pick('C02');
  else if (/rear gap/.test(why)) crit = pick('C03');
  else if (/brake at/.test(why)) crit = pick('C04', 'C03');
  else if (/lateral|drift|hugs|alongside/.test(why)) crit = pick('C06');
  else if (variantId === 'V04' || variantId === 'V03') crit = pick('C11', 'C07');
  else if (variantId === 'V01' || variantId === 'V07') crit = pick('C07', 'C08', 'C06');
  else if (/shoulder/.test(ex.txt || '')) crit = pick('C13', 'C12');
  else if (/hazard lights/i.test(ex.txt || '')) crit = pick('C12');
  else { const pool = C.filter(c => !['C01', 'C09', 'C10', 'C18'].includes(c)); crit = pool[Math.floor(u01(v.id, 'crit') * pool.length)] || 'C01'; }
  if (u01(v.id, 'coll') < 0.25) crit = 'C01';
  return {status: 'fail', criterion: crit};
}

/* ---------- risk ---------- */
export function sevRank(r){ const n = x => (x && /\d/.test(x)) ? +x.replace(/\D/g, '') : 0; return r ? n(r.S) * 100 + n(r.E) * 10 + n(r.C) : 0; }
export function riskOf(link, critId, HIRE){ const ref = link.risk?.[critId]; return ref && ref.row ? {...HIRE[ref.row], id: ref.row, direct: ref.direct} : null; }

/* ---------- statistics for one link (scenario x behavior) ---------- */
export function linkStats(scn, beh, link, ODD, results /* Map id->result or null for demo */){
  const out = {variants: {}, tot: {pot: 0, valid: 0, rej: 0, deferred: 0, pass: 0, fail: 0, not_run: 0}, rules: {}, fails: {}};
  for (const v of variantsFor(scn, ODD)) {
    if (!v.sim) { const n = countPotential(baseConfig(scn, beh, link)); out.variants[v.id] = {deferred: n}; out.tot.deferred += n; continue; }
    const {r} = runVariant(scn, beh, link, v);
    const s = {pot: r.counts.potential, valid: r.counts.valid, rej: r.counts.rejected, pass: 0, fail: 0, not_run: 0, rules: {}, fails: {}};
    for (const x of r.rejected) for (const id of x.ruleIds) { s.rules[id] = (s.rules[id] || 0) + 1; out.rules[id] = (out.rules[id] || 0) + 1; }
    for (const c of r.variants) {
      const res = results ? (results.get(c.id) || {status: 'not_run'}) : demoResult(c, link, v.id);
      s[res.status] = (s[res.status] || 0) + 1;
      if (res.status === 'fail') { const k = res.criterion || 'unspecified'; s.fails[k] = (s.fails[k] || 0) + 1; out.fails[k] = (out.fails[k] || 0) + 1; }
    }
    out.variants[v.id] = s;
    for (const k of ['pot', 'valid', 'rej', 'pass', 'fail', 'not_run']) out.tot[k] += s[k];
  }
  return out;
}
