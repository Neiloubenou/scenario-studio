// Scenario Studio v3 checks: manual reference, every link generates, determinism, stats file in sync.
import { readFileSync } from 'node:fs';
import { runVariant, linkStats } from '../apps/v3/core.mjs';
const D = JSON.parse(readFileSync(new URL('../apps/v3/studio.json', import.meta.url), 'utf8'));
const S = JSON.parse(readFileSync(new URL('../apps/v3/stats_demo.json', import.meta.url), 'utf8'));
const B = Object.fromEntries(D.behaviors.map(b => [b.code, b])), V0 = D.odd.variants[0];
let ok = true; const check = (label, cond, info = '') => { console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${info ? '  ' + info : ''}`); ok = ok && cond; };
const ref = D.scenarios.find(s => s.id === 'LC-REF-01');
const g = runVariant(ref, B['HW-LC'], ref.links['HW-LC'], V0);
check('reference LC-REF-01 x HW-LC, nominal ODD: 36 combinations', g.r.counts.potential === 36, `got ${g.r.counts.potential}`);
check('reference: 36 valid, 0 excluded', g.r.counts.valid === 36 && g.r.counts.rejected === 0, `got ${g.r.counts.valid}/${g.r.counts.rejected}`);
const g2 = runVariant(ref, B['HW-LC'], ref.links['HW-LC'], V0);
check('deterministic concrete IDs', JSON.stringify(g.r.variants.map(v => v.id)) === JSON.stringify(g2.r.variants.map(v => v.id)));
let errors = 0, links = 0, mismatch = 0;
for (const s of D.scenarios) if (s.generable) for (const [code, link] of Object.entries(s.links)) {
  links++; const r = runVariant(s, B[code], link, V0); if (r.r.status !== 'complete') errors++;
  if (links % 25 === 0) { const st = linkStats(s, B[code], link, D.odd, null); if (JSON.stringify(st.tot) !== JSON.stringify(S[`${s.id}@${code}`].tot)) mismatch++; }
}
check(`all ${links} generable links run without configuration error`, errors === 0, `${errors} errors`);
check('stats_demo.json in sync with the engine (sampled links)', mismatch === 0, `${mismatch} mismatches`);
check('every link has at least one HIRE row', D.scenarios.every(s => Object.values(s.links).every(l => l.rows.length > 0)));
check('every link has pass/fail criteria with a requirement', D.scenarios.every(s => Object.values(s.links).every(l => l.criteria.length && l.criteria.every(c => D.criteria[c]?.req))));
// generation
const { hireCombos, draftFromHire, matchTemplate, draftFromTemplate } = await import('../apps/v3/gen.mjs');
let drafts = 0, invalid = 0;
for (const code of ['HW-AF', 'HW-LC', 'HW-ORM', 'HW-ORE', 'HW-SOS', 'URB-AF']) for (const c of hireCombos(B[code], D)) { const d = draftFromHire(B[code], c, D); if (!d) continue; drafts++; if (d.errors.length || !d.estimate) invalid++; }
check(`drafts from HIRE are valid and produce tests (${drafts} drafts)`, drafts > 50 && invalid === 0, `${invalid} invalid`);
const tpl = matchTemplate('a semi cuts in close in front', B['HW-AF'], D);
check('text matcher finds a template', tpl?.id === 'CI-05', tpl?.id);
check('draft from a template keeps HIRE rows and criteria', (() => { const d = draftFromTemplate(B['HW-AF'], tpl, {title: 't', desc: '', source: {type: 'Text'}}, D); return d && !d.errors.length && d.links['HW-AF'].rows.length > 0 && d.links['HW-AF'].criteria.includes('C01'); })());
// SOTIF analyses
const so = D.sotif;
check('SOTIF data: 42 FIs, 277 TCs, 10 STPA context groups', Object.keys(so.fis).length === 42 && Object.keys(so.tcs).length === 277 && so.stpa.groups.length === 10);
const tcWithScn = new Set(D.scenarios.flatMap(s => s.tcs)); const fiReached = Object.values(so.fis).filter(f => Object.values(so.tcs).some(t => t.fis.includes(f.id) && tcWithScn.has(t.id))).length;
check('FI → TC → scenario chain reaches most FIs', fiReached >= 30, `${fiReached} FIs reached`);
process.exit(ok ? 0 : 1);
