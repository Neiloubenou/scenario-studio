import { generate } from '../engine/slot-engine.mjs';
const abs = { id: 'LC-REF-01', version: 1, applicability: { roadTypes: ['highway'] }, fixed: { fullyOnShoulder: true } };
const cfg = {
  road: { types: ['highway'], laneCounts: [2, 3], egoStartLanes: ['rightmost'], shoulderWidthM: [3.6] },
  ego: { speedMps: [20], lengthM: 18, widthM: 2.6, heightM: 4, intent: 'move_over', sides: ['left'] },
  actors: [
    { slot: 'A', mode: 'optional', kinds: ['car'], distanceM: [30], speedMps: [15] },
    { slot: 'C', mode: 'optional', kinds: ['car'], distanceM: [30], speedMps: [15] },
    { slot: 'S', mode: 'required', kinds: ['stopped_vehicle'], distanceM: [40, 60, 80], lateralOffsetM: [0, 0.8] },
  ],
  rules: {}, options: { includeEmptyBaseline: false, maxExpansion: 20000 }
};
let r = generate(cfg, abs);
console.log(r.status, r.counts, r.errors);
const has = (f) => r.variants.some(v => f(v.parameters));
console.log('front only 2 lanes 40 off0', has(p => p.road.laneCount===2 && p.actors.A.present && !p.actors.C.present && p.actors.S.distanceM===40 && p.actors.S.lateralOffsetM===0));
console.log('both 3 lanes 80 off0.8', has(p => p.road.laneCount===3 && p.actors.A.present && p.actors.C.present && p.actors.S.distanceM===80 && p.actors.S.lateralOffsetM===0.8));
console.log('rear only 2 lanes 60', has(p => p.road.laneCount===2 && !p.actors.A.present && p.actors.C.present && p.actors.S.distanceM===60));
const r2 = generate(cfg, abs); console.log('deterministic', JSON.stringify(r2.variants.map(v=>v.id))===JSON.stringify(r.variants.map(v=>v.id)));
cfg.actors[2].lateralOffsetM = [-0.5]; r = generate(cfg, abs);
console.log('intrusion', r.counts, r.rejected[0]?.ruleIds, r.rejected[0]?.reasons);
console.log(r.variants.length===0 && r.rejected.every(x=>x.ruleIds.includes('R_SHOULDER_ENVELOPE')));
// absurd checks
const c2 = structuredClone(cfg); c2.actors[2].lateralOffsetM=[0]; c2.actors[0].distanceM=[0.2]; c2.road.laneCounts=[1,2]; c2.road.egoStartLanes=['rightmost','middle'];
r = generate(c2, abs); console.log(r.counts); const rc={}; r.rejected.forEach(x=>x.ruleIds.forEach(i=>rc[i]=(rc[i]||0)+1)); console.log(rc); console.log(r.rejected.slice(0,3).map(x=>x.reasons));
console.log(r.variants[0]?.expected);
