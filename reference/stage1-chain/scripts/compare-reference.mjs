// Compares the tool output with the hand-written reference.
// Usage: node scripts/compare-reference.mjs <engine.mjs> <abstract.json> <expected.json> <set.json>
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
const [enginePath, absPath, expPath, setPath] = process.argv.slice(2);
const { generateCases } = await import(pathToFileURL(resolve(enginePath)).href);
const abs = JSON.parse(readFileSync(absPath, 'utf8'));
const exp = JSON.parse(readFileSync(expPath, 'utf8'));
const set = JSON.parse(readFileSync(setPath, 'utf8'));
const flat = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o ?? {})) { const key = p ? `${p}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out); else out[key] = v; } return out; };
const rows = [];
const check = (name, ok, detail = '') => rows.push({ check: name, result: ok ? 'PASS' : 'FAIL', detail });
for (const k of ['potential', 'valid', 'rejected']) check(`count ${k}`, set.counts[k] === exp.expected_counts[k], `got ${set.counts[k]}, expected ${exp.expected_counts[k]}`);
check('set complete (not truncated)', set.status === 'complete', set.status);
for (const m of exp.must_contain) {
  const hit = set.variants.find(v => { const f = flat(v.parameters); return Object.entries(m.parameters).every(([k, val]) => f[k] === val); });
  check(`contains: ${m.label}`, !!hit, hit ? hit.id : 'not found');
}
const allTraced = [...set.variants, ...set.rejected].every(v => exp.trace_required.every(k => v.trace && v.trace[k] !== undefined) && v.trace.behavior === exp.behavior && v.trace.abstract === exp.abstract);
check('every case traces behavior, abstract, version, HIRE', allTraced);
const ids = set.variants.map(v => v.id);
check('IDs unique', new Set(ids).size === ids.length, `${ids.length} ids`);
// determinism: same abstract -> same IDs
const { configFromAbstract } = { configFromAbstract: a => ({ ...structuredClone(a.configuration), requirement: { id: a.id, revision: `v${a.version}`, text: a.description, provenance: 'abstract_scenario', source: { kind: 'abstract', behaviors: a.behaviors, catalogue_refs: a.catalogue_refs ?? {} }, constraints: { roadTypes: a.configuration.road.types } } }) };
const again = generateCases(configFromAbstract(abs));
check('regeneration gives identical IDs', JSON.stringify(again.variants.map(v => v.id)) === JSON.stringify(ids));
for (const r of exp.must_reject) {
  const a2 = structuredClone(abs);
  for (const [path, val] of Object.entries(r.override)) { const ks = path.split('.'); let n = a2.configuration; for (const k of ks.slice(0, -1)) n = n[k]; n[ks.at(-1)] = val; }
  const res = generateCases(configFromAbstract(a2));
  const ok = res.variants.length === 0 && res.rejected.length > 0 && res.rejected.every(x => x.ruleIds.includes(r.rule));
  check(`rejects: ${r.label}`, ok, `${res.rejected.length} rejected by ${r.rule}`);
}
console.table(rows);
const failed = rows.filter(r => r.result === 'FAIL').length;
console.log(failed ? `${failed} check(s) failed` : 'ALL CHECKS PASS');
process.exit(failed ? 1 : 0);
