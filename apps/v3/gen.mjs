/* Scenario Studio v3 generation: from a behavior, propose draft scenarios with their HIRE, criteria and ODD variants.
   Sources: HIRE v2 rows not yet covered, triggering conditions (TC), Foretellix / NHTSA references, free text. */
import { validate, countPotential } from './engine.mjs';
import { clone, baseConfig, variantsFor, sevRank } from './core.mjs';

const LATERAL = new Set(['lane_change', 'move_over']);
const EMVK = ['police', 'ambulance', 'fire', 'tow', 'txdot'];

/* ---------- criteria (same rules as build_data.py) ---------- */
export function criteriaFor(cfg, code, intent){
  const out = ['C01'];
  if (!cfg) return out.concat(intent === 'lane_change' ? ['C02', 'C03', 'C05'] : intent === 'stop_in_lane' ? ['C12'] : ['C07']);
  const r = cfg.road, acts = cfg.actors.filter(x => x.mode !== 'off');
  const slots = new Set(acts.map(x => x.slot)), mans = new Set(acts.flatMap(x => (x.maneuvers || []).map(m => m.type)));
  if (LATERAL.has(intent)) out.push('C02', 'C03', 'C04', 'C05', 'C06');
  else if (intent === 'keep_lane') out.push('C07', 'C08');
  else if (intent === 'emergency_lateral') out.push('C06', 'C12');
  else if (intent === 'stop_on_shoulder') out.push('C05', 'C06', 'C12', 'C13');
  else if (intent === 'stop_in_lane') out.push('C12');
  if (code.endsWith('ORM')) out.push('C15');
  if (code.endsWith('ORE')) out.push('C16');
  if (intent === 'keep_lane' && ([...'BDEFGS'].some(s => slots.has(s)) || mans.has('drift') || mans.has('hug'))) out.push('C06');
  if (code.startsWith('HW')) out.push('C10');
  if (r.speedLimitMps) out.push('C09');
  if (r.curvature || r.grade) out.push('C11');
  if (acts.some(x => x.slot === 'S' && x.kinds.some(k => EMVK.includes(k)))) out.push('C17');
  if (acts.some(x => x.slot === 'C' && x.kinds.includes('police')) && intent === 'stop_on_shoulder') out.push('C14');
  if (intent === 'keep_lane' && code.startsWith('HW') && ((!slots.has('A') && !slots.has('O') && !mans.has('cut_in')) || mans.has('cut_out') || mans.has('accelerate'))) out.push('C18');
  return [...new Set(out)];
}

/* ---------- link object (HIRE justification + risk) for a draft ---------- */
export function makeLink(cfg, beh, rows, D, level){
  const intent = cfg ? cfg.ego.intent : beh.intent;
  const all = Object.entries(D.hire).filter(([, r]) => r.beh === beh.code);
  const byHz = {};
  for (const [id, r] of all) if (!byHz[r.hz] || sevRank(r) > sevRank(D.hire[byHz[r.hz]])) byHz[r.hz] = id;
  rows = [...new Set(rows)].sort((a, b) => sevRank(D.hire[b]) - sevRank(D.hire[a]) || a.localeCompare(b));
  const crit = criteriaFor(cfg, beh.code, intent), risk = {};
  for (const c of crit) { const cand = D.criteria[c].hazards.filter(h => byHz[h]).map(h => byHz[h]); const best = cand.sort((a, b) => sevRank(D.hire[b]) - sevRank(D.hire[a]))[0] || rows[0] || null; risk[c] = {row: best, direct: cand.length > 0}; }
  return {intent, level, rows, worst: rows[0] || null, by_hazard: byHz, criteria: crit, risk, hfs: [], added_from_hire: false, legacy: [], generated: true};
}

/* ---------- templates: hazard x command -> actors ---------- */
const act = (slot, mode, kinds, k) => Object.assign({slot, mode, kinds, maneuvers: [{type: 'none'}]}, k);
function actorsFor(hz, cmd){
  const c = (cmd || '').replace(/ \(.*\)/, '');
  if (hz === 'H2') {
    if (/Deceleration/.test(c)) return {actors: [act('A', 'required', ['car', 'tractor_trailer'], {distanceM: [30, 60], speedMps: [20, 25], maneuvers: [{type: 'brake', decelMps2: [3, 6], startS: [1, 2]}]})], what: 'Lead vehicle braking'};
    if (/Acceleration/.test(c)) return {actors: [act('A', 'required', ['car', 'tractor_trailer'], {distanceM: [40, 80], speedMps: [15, 20]})], what: 'Slower lead vehicle'};
    if (/Steering/.test(c)) return {actors: [act('O', 'required', ['lost_cargo', 'stopped_vehicle'], {distanceM: [60, 120], lanes: ['origin']})], what: 'Obstacle ahead in the lane'};
    return {actors: [act('A', 'required', ['car'], {distanceM: [80, 150], speedMps: [0]})], what: 'Stopped vehicle ahead'};
  }
  if (hz === 'H1') {
    if (/Turn Signal/.test(c)) return {actors: [act('D', 'required', ['car', 'tractor_trailer'], {distanceM: [20, 40], speedMps: [27]})], what: 'Vehicle behind in the adjacent lane'};
    if (/Steering/.test(c)) return {actors: [act('D', 'required', ['car', 'tractor_trailer'], {offsetM: [-10, 0, 5], speedMps: [25]})], what: 'Vehicle alongside in the adjacent lane'};
    return {actors: [act('B', 'required', ['car', 'pickup'], {distanceM: [10, 30], speedMps: [22, 27]})], what: 'Vehicle ahead in the adjacent lane'};
  }
  if (hz === 'H3') {
    if (/Acceleration/.test(c)) return {actors: [act('C', 'required', ['car', 'tractor_trailer'], {distanceM: [15, 30], speedMps: [27, 29]})], what: 'Faster follower behind'};
    return {actors: [act('C', 'required', ['car', 'tractor_trailer'], {distanceM: [10, 20, 30], speedMps: [25, 29]})], what: 'Close follower behind'};
  }
  if (hz === 'H4') return {actors: [act('C', 'required', ['car'], {distanceM: [20, 40], speedMps: [25]}), act('D', 'optional', ['car'], {distanceM: [20, 40], speedMps: [27]})], what: 'Traffic reading the SDT intent'};
  if (hz === 'H5') return {actors: [], what: 'Vehicle dynamics on the road', road: {curvature: [0.0012, 0.0022], grade: [-3.5, 0, 3.5]}};
  return null;
}
const ODD_EFFECT = [
  [/Slope/, {road: {grade: [-4, 4]}}, 'steep grade'], [/Curvature/, {road: {curvature: [0.0012, 0.0022]}}, 'curve'], [/Wind/, {road: {windGustMps: [10, 15]}}, 'crosswind gusts'],
  [/Lane Width/, {road: {laneWidthM: [3.25, 3.35]}}, 'narrow lane'], [/Shoulder/, {road: {shoulderWidthM: [0, 1]}}, 'no shoulder'], [/Lane Boundary/, {road: {markingQuality: ['faded', 'missing']}}, 'degraded markings'],
  [/Work Zones/, {actor: act('O', 'required', ['cones'], {distanceM: [100, 200], lanes: ['origin']})}, 'work zone'],
  [/Disabled|stopped vehicle/, {actor: act('S', 'required', ['stopped_vehicle'], {distanceM: [80, 150], lateralOffsetM: [0.3], speedMps: [0]})}, 'stopped vehicle'],
  [/Road workers|VRU/, {actor: act('O', 'required', ['pedestrian'], {distanceM: [80, 120], speedMps: [0, 1], lanes: ['origin']})}, 'person on the road'],
  [/Crash scene/, {actor: act('O', 'required', ['crash_scene'], {distanceM: [150, 250], lanes: ['origin']})}, 'crash scene'],
  [/FOD|Tire debris/, {actor: act('O', 'required', ['tire_debris', 'lost_cargo'], {distanceM: [60, 120], lanes: ['origin']})}, 'debris'],
  [/Animal/, {actor: act('O', 'required', ['deer', 'livestock'], {distanceM: [80, 150], speedMps: [0, 2], lanes: ['origin']})}, 'animal'],
  [/EMV/, {actor: act('S', 'required', ['police', 'ambulance'], {distanceM: [100, 200], lateralOffsetM: [0.3], speedMps: [0]})}, 'emergency vehicle'],
  [/Sudden object/, {actor: act('O', 'required', ['lost_cargo'], {distanceM: [25, 40], lanes: ['origin']})}, 'sudden object'],
  [/dense traffic|cut-in/, {actor: act('B', 'required', ['car'], {distanceM: [10, 20], speedMps: [22, 25], maneuvers: [{type: 'cut_in', startS: [1, 2]}]})}, 'cut-in in dense traffic'],
  [/Rain|Sun|Temperature|Humidity/, {perception: true}, 'weather / lighting'],
];
function egoFor(beh){
  const urb = beh.code.startsWith('URB');
  const road = {types: [urb ? 'surface_street' : 'highway'], laneCounts: [2, 3], egoStartLanes: ['rightmost']};
  const ego = {lengthM: 22, widthM: 2.6, heightM: 4.1, speedMps: urb ? [11, 15] : [22, 27], intent: beh.intent, sides: beh.sides || ['left']};
  if (beh.code.endsWith('ORM')) road.distanceToMandatoryM = [200, 350];
  if (beh.code.endsWith('ORE')) { road.laneCounts = [3]; road.egoStartLanes = ['middle']; road.rampOnRight = true; }
  if (beh.code.endsWith('SOS')) road.shoulderWidthM = [3.0, 3.6];
  return {road, ego};
}
export function draftFromHire(beh, combo, D){
  if (beh.code === 'HUB-GEN') return null;
  const t = actorsFor(combo.hz, combo.man); if (!t) return null;
  const {road, ego} = egoFor(beh);
  const cfg = {road, ego, actors: clone(t.actors), rules: {}, options: {includeEmptyBaseline: false, maxExpansion: 20000}};
  if (t.road) Object.assign(cfg.road, t.road);
  let oddLabel = '', perception = false;
  for (const [re, eff, label] of ODD_EFFECT) if (re.test(combo.odd)) {
    oddLabel = label;
    if (eff.road) Object.assign(cfg.road, eff.road);
    if (eff.perception) perception = true;
    if (eff.actor && !cfg.actors.some(a => a.slot === eff.actor.slot)) cfg.actors.push(clone(eff.actor));
    break;
  }
  if (beh.code.endsWith('ELM') && !cfg.actors.some(a => a.slot === 'O')) cfg.actors.push(act('O', 'required', ['lost_cargo'], {distanceM: [40, 60], lanes: ['origin']}));
  const title = `${t.what}${oddLabel ? ', ' + oddLabel : ''} · ${combo.mal}`;
  const desc = `Generated from HIRE v2: ${beh.code} ${combo.man.replace(/ command.*/, '').toLowerCase()} deviation (${combo.mal}) leading to ${combo.hz} ${D.hazards[combo.hz].name.toLowerCase()} under ${combo.odd}. ${combo.n} HIRE row(s).`;
  return finishDraft(beh, {title, desc, cfg, perception, rows: combo.rows, source: {type: 'HIRE', ref: `${combo.hz} · ${combo.man} · ${combo.odd}`}}, D);
}
export function draftFromTemplate(beh, tpl, meta, D){
  if (!tpl || !tpl.generable || beh.code === 'HUB-GEN') return null;
  const cfg = clone(tpl.configuration);
  const link = tpl.links[beh.code];
  cfg.ego.intent = link ? link.intent : beh.intent;
  if (beh.sides) cfg.ego.sides = beh.sides;
  const rows = link ? link.rows : Object.entries(D.hire).filter(([, r]) => r.beh === beh.code && (tpl.hazards || []).includes(r.hz)).map(([id]) => id);
  return finishDraft(beh, {title: meta.title, desc: meta.desc, cfg, perception: tpl.perception, rows, template: tpl.id, source: meta.source, tcs: meta.tcs || []}, D);
}
function finishDraft(beh, x, D){
  const errs = validate(x.cfg);
  const link = makeLink(x.cfg, beh, x.rows, D, x.rows.length ? 'justified' : 'review');
  const s = {id: null, family: 'GEN', title: x.title, desc: x.desc, perception: !!x.perception, generable: true, gen_note: null, configuration: x.cfg, fixed: {}, applicability: {roadTypes: x.cfg.road.types},
    version: 1, hazards: [...new Set(x.rows.map(r => D.hire[r]?.hz).filter(Boolean))], jama: [], nhtsa: [], tcs: x.tcs || [], foretellix: [], links: {[beh.code]: link},
    source: x.source, template: x.template || null, status: 'DRAFT', errors: errs};
  const nv = variantsFor(s, D.odd).filter(v => v.sim).length;
  s.estimate = errs.length ? 0 : countPotential(baseConfig(s, beh, link)) * nv;
  return s;
}

/* ---------- HIRE coverage for one behavior ---------- */
export function hireCombos(beh, D){
  const m = new Map();
  for (const [id, r] of Object.entries(D.hire)) {
    if (r.beh !== beh.code) continue;
    const odd = /Any|Nominal/.test(r.odd) ? 'Nominal (dry / day / clear)' : r.odd;
    const key = `${r.hz}|${r.man.replace(/ \(.*\)/, '')}|${odd}`;
    const c = m.get(key) || {key, hz: r.hz, man: r.man.replace(/ \(.*\)/, ''), odd, rows: [], mals: new Set(), worst: null, mrm: 0};
    c.rows.push(id); c.mals.add(r.mal); if (r.mrm) c.mrm++;
    if (!c.worst || sevRank(r) > sevRank(D.hire[c.worst])) c.worst = id;
    m.set(key, c);
  }
  const covered = new Map();
  for (const s of D.scenarios) { const l = s.links[beh.code]; if (!l) continue; for (const id of l.rows) covered.set(id, (covered.get(id) || new Set()).add(s.id)); }
  return [...m.values()].map(c => { const by = new Set(); c.rows.forEach(id => (covered.get(id) || []).forEach(x => by.add(x))); return {...c, n: c.rows.length, mal: [...c.mals][0], mals: [...c.mals], covered: [...by]}; })
    .sort((a, b) => (a.covered.length > 0) - (b.covered.length > 0) || sevRank(D.hire[b.worst]) - sevRank(D.hire[a.worst]));
}

/* ---------- text matcher (English and French) -> template scenario ---------- */
const N = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
const TEXT_RULES = [
  [/(shoulder|accotement)/, /(police|ambulance|fire|emv|tow|lights)/, ['LC-OOD-01', 'EMV-04']], [/(shoulder|accotement)/, /(stopped|disabled|broken|parked|arrete|panne)/, ['LC-REF-01', 'OBJ-03']],
  [/(emv|emergency vehicle|ambulance|police|fire truck|pompier|urgence)/, /(approach|behind|siren|derriere)/, ['LC-OOD-02', 'EMV-03']], [/(emv|emergency vehicle|ambulance|police|fire truck|urgence)/, null, ['EMV-05', 'EMV-06']],
  [/brake.?check/, null, ['CI-07']], [/(cut.?in|cuts in|rabat)/, /(two|deux|platoon|convoy)/, ['CI-08']], [/(cut.?in|cuts in|rabat)/, /(right|droite)/, ['CI-03']],
  [/(cut.?in|cuts in|rabat)/, /(truck|semi|trailer|camion)/, ['CI-05']], [/(cut.?in|cuts in|rabat)/, /(short|tight|close|serre)/, ['CI-02']], [/(cut.?in|cuts in|rabat|merging vehicle)/, null, ['CI-01', 'CI-06']],
  [/(cut.?out|cuts out)/, /(reveal|stopped|obstacle)/, ['LC-CUR-02']], [/(cut.?out|cuts out)/, null, ['LV-11']],
  [/(marking|marquage|lane line|edge line)/, null, ['LC-RD-06', 'RD-09']], [/(wrong.?way|contresens|opposite direction|oncoming)/, null, ['AB-01']], [/(crash|accident)/, null, ['LC-OOD-04']],
  [/(animal|deer|cerf|cattle|livestock)/, null, ['OBJ-04']], [/(pedestrian|pieton|person|worker|people|vru)/, null, ['OBJ-05']], [/(cyclist|bicycle|bike|velo)/, null, ['URB-10']],
  [/(debris|tire|pneu|object|objet|cargo|fod|obstacle)/, /(sudden|fall|late)/, ['OBJ-06']], [/(debris|tire|pneu|small)/, null, ['OBJ-01', 'LC-OOD-03']], [/(cargo|object|objet|obstacle|fod)/, null, ['OBJ-02', 'LC-OOD-03']],
  [/(lane drop|lane end|fin de voie|merge at lane end)/, null, ['LC-RD-01']], [/(work zone|construction|cone|travaux|closure)/, null, ['LC-RD-02']], [/(weav)/, null, ['LC-RD-03', 'RMP-13']],
  [/(on.?ramp|merge|merging|entrance|acceleration lane)/, null, ['RMP-01', 'LC-RD-05', 'CI-06']], [/(off.?ramp|exit|sortie)/, null, ['LC-RD-04', 'RMP-11', 'RMP-06']],
  [/(blind spot|angle mort)/, null, ['LC-TGT-06']], [/(motorcycle|moto)/, null, ['LC-TGT-06', 'LV-09', 'ADJ-03']], [/(fast|speeding|rapide)/, /(behind|rear|approach)/, ['LC-TGT-01', 'ADJ-04']],
  [/(tailgat|too close behind|follower)/, null, ['AB-02', 'LC-CUR-03']], [/(hug|close to the line)/, null, ['ADJ-06']], [/(slow)/, /(adjacent|neighbo|next lane)/, ['ADJ-05']],
  [/(stopped|queue)/, /(adjacent|neighbo|next lane)/, ['ADJ-07']], [/(drift|swerv|sway|weaving vehicle|lateral swirl)/, null, ['ADJ-01', 'ADJ-02']],
  [/(lead|vehicle ahead|leader|front vehicle)/, /(hard|sudden|emergency|panic)/, ['LV-04']], [/(lead|vehicle ahead|leader)/, /(brak|decel|slows)/, ['LV-03']],
  [/(stopped|stationary|stalled)/, /(ahead|in lane|ego lane)/, ['LV-05']], [/(slow)/, /(lead|ahead)/, ['LV-02']], [/(stop.?and.?go|traffic jam|congestion|dense traffic)/, null, ['LV-07']],
  [/(no shoulder|bridge)/, null, ['RD-11']], [/(curve|curvature|bend)/, null, ['RD-14', 'LC-RD-07', 'RMP-08']], [/(grade|slope|downhill|uphill)/, null, ['RD-13', 'LC-RD-07']],
  [/(wind|gust)/, null, ['RD-12']], [/(narrow|lane width)/, null, ['RD-09']], [/(speed limit)/, null, ['RD-10']], [/(map)/, null, ['LC-RD-08']],
  [/(trailer|weight|load)/, null, ['RD-13', 'LC-TGT-07']], [/(sensor|fault|failure|degrad|loss of)/, null, ['FB-01', 'FB-02']],
  [/(lane change|changes lane|overtak)/, null, ['LC-NOM-02', 'LC-NOM-01']], [/(free road|open road|no traffic)/, null, ['LV-01']],
];
export function matchTemplate(text, beh, D){
  const t = N(text);
  for (const [a, b, ids] of TEXT_RULES) if (a.test(t) && (!b || b.test(t))) {
    const cands = ids.map(id => D.scenarios.find(s => s.id === id)).filter(Boolean);
    return cands.find(s => s.links[beh.code] && s.generable) || cands.find(s => s.generable) || null;
  }
  return null;
}

/* ---------- draft from a structured spec (Claude or manual) ---------- */
export function draftFromSpec(beh, spec, D){
  const {road, ego} = egoFor(beh);
  Object.assign(road, spec.road || {});
  const actors = (spec.actors || []).map(a => Object.assign({mode: 'required', maneuvers: [{type: 'none'}]}, a));
  const cfg = {road, ego, actors, rules: {}, options: {includeEmptyBaseline: false, maxExpansion: 20000}};
  const hz = new Set(spec.hazards || []);
  const rows = Object.entries(D.hire).filter(([, r]) => r.beh === beh.code && hz.has(r.hz)).map(([id]) => id);
  return finishDraft(beh, {title: spec.title || 'Described scenario', desc: spec.desc || '', cfg, perception: !!spec.perception, rows, source: spec.source || {type: 'Text', ref: ''}}, D);
}
