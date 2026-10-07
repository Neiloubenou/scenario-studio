/*
 * Scenario Studio slot engine (v3, English).
 * Generalises the Stage 1 combination-engine to the Torc Miro slot grid:
 * A lead origin, B lead target, C follower origin, D follower target,
 * E far lane beside/behind, F far lane ahead, G other-side lane, S shoulder, O object in lane.
 * Every value comes from the abstract configuration. Rules only exclude physically or
 * logically impossible ("absurd") combinations; they are not safety verdicts.
 */

export const KINDS = {
  car:             { type: 'vehicle', L: 4.8,  W: 1.9, vmax: 55, amax: 9,   label: 'Car' },
  pickup:          { type: 'vehicle', L: 5.9,  W: 2.0, vmax: 50, amax: 8.5, label: 'Pickup' },
  tractor_trailer: { type: 'vehicle', L: 22,   W: 2.6, vmax: 33, amax: 6,   label: 'Semi-trailer' },
  motorcycle:      { type: 'vehicle', L: 2.2,  W: 0.8, vmax: 60, amax: 9,   label: 'Motorcycle' },
  wide_load:       { type: 'vehicle', L: 22,   W: 3.5, vmax: 30, amax: 5,   label: 'Wide load' },
  police:          { type: 'emv',     L: 5.2,  W: 2.0, vmax: 60, amax: 9,   label: 'Police' },
  ambulance:       { type: 'emv',     L: 6.7,  W: 2.4, vmax: 45, amax: 8,   label: 'Ambulance' },
  fire:            { type: 'emv',     L: 10,   W: 2.5, vmax: 40, amax: 7,   label: 'Fire truck' },
  tow:             { type: 'emv',     L: 7,    W: 2.5, vmax: 38, amax: 6,   label: 'Tow truck' },
  txdot:           { type: 'emv',     L: 6,    W: 2.4, vmax: 38, amax: 7,   label: 'TxDOT' },
  bus:             { type: 'vehicle', L: 12,   W: 2.6, vmax: 30, amax: 6,   label: 'Bus' },
  cyclist:         { type: 'vru',     L: 1.8,  W: 0.6, vmax: 12, amax: 4,   label: 'Cyclist' },
  pedestrian:      { type: 'vru',     L: 0.5,  W: 0.5, vmax: 3,  amax: 3,   label: 'Pedestrian' },
  deer:            { type: 'animal',  L: 1.6,  W: 0.5, vmax: 15, amax: 6,   label: 'Deer' },
  livestock:       { type: 'animal',  L: 2.4,  W: 0.8, vmax: 5,  amax: 3,   label: 'Livestock' },
  stopped_vehicle: { type: 'static',  L: 4.8,  W: 1.9, vmax: 0,  amax: 0,   label: 'Stopped vehicle' },
  tire_debris:     { type: 'static',  L: 1.0,  W: 0.6, vmax: 0,  amax: 0,   label: 'Tire debris' },
  lost_cargo:      { type: 'static',  L: 1.5,  W: 1.2, vmax: 0,  amax: 0,   label: 'Lost cargo' },
  cones:           { type: 'static',  L: 20,   W: 0.5, vmax: 0,  amax: 0,   label: 'Cones (taper)' },
  crash_scene:     { type: 'static',  L: 25,   W: 3.5, vmax: 0,  amax: 0,   label: 'Crash scene' },
};

export const SLOTS = {
  A: { role: 'Lead, origin lane', lane: 'origin', pos: 'ahead' },
  B: { role: 'Lead, target lane', lane: 'target', pos: 'ahead' },
  C: { role: 'Follower, origin lane', lane: 'origin', pos: 'behind' },
  D: { role: 'Follower, target lane', lane: 'target', pos: 'behind' },
  E: { role: 'Far lane, alongside or behind', lane: 'far', pos: 'offset' },
  F: { role: 'Far lane, ahead', lane: 'far', pos: 'ahead' },
  G: { role: 'Other-side lane', lane: 'other', pos: 'offset' },
  S: { role: 'Right shoulder', lane: 'shoulder', pos: 'ahead' },
  O: { role: 'Object in a lane', lane: 'object', pos: 'ahead' },
};

export const MANEUVERS = {
  none: { label: 'none', params: [] },
  brake: { label: 'brakes', params: ['decelMps2', 'startS'] },
  accelerate: { label: 'accelerates', params: ['accelMps2', 'startS'] },
  lane_change_into_target: { label: 'enters the target lane', params: ['startS'] },
  cut_in: { label: 'cuts in ahead of the SDT', params: ['startS'] },
  cut_out: { label: 'cuts out', params: ['startS'] },
  drift: { label: 'drifts toward the SDT', params: ['startS'] },
  hug: { label: 'hugs the line on the SDT side', params: ['lateralM', 'startS'] },
  take_exit: { label: 'takes the exit on the right', params: ['decelMps2', 'startS'] },
};

export const RULES = [
  { id: 'R_EGO_START_LANE', label: 'Start lane exists', desc: 'A middle start lane needs at least 3 lanes.' },
  { id: 'R_LANES_FOR_SLOTS', label: 'Lanes needed by the actors', desc: 'The target, far or other-side lane must exist for the requested actors and maneuvers.' },
  { id: 'R_REQUIREMENT_ROAD_TYPE', label: 'Road type applies', desc: 'The road type must be one allowed by the scenario.' },
  { id: 'R_ODD_SPEED', label: 'SDT speed within the limit', desc: 'SDT speed at most 29.05 m/s (65 mph, TORC-SYSRQ-14073). ODD Operating Speed Range goes to 30.4 m/s: open point.' },
  { id: 'R_SPEED_ENVELOPE', label: 'Speed possible for the actor type', desc: 'Speed between 0 and the type maximum (illustrative values).' },
  { id: 'R_DECEL_LIMIT', label: 'Braking or acceleration possible', desc: 'Deceleration or acceleration at most the type maximum.' },
  { id: 'R_INITIAL_OVERLAP', label: 'No overlap at start', desc: 'Two actors (or an actor and the SDT) cannot share the same space in the same lane at t = 0.' },
  { id: 'R_UNAVOIDABLE_AT_START', label: 'No collision already unavoidable', desc: 'In one lane, a faster follower cannot start less than 0.5 s from contact.' },
  { id: 'R_SHOULDER_ENVELOPE', label: 'Fully on the shoulder', desc: 'When the scenario requires it: offset ≥ 0 and offset + width ≤ shoulder width.' },
  { id: 'R_ACTOR_WIDTH_LANE', label: 'Actor fits its lane', desc: 'Actor width does not exceed lane width.' },
  { id: 'R_MANDATORY_DISTANCE', label: 'Stop possible before the mandatory point', desc: 'The SDT must at least be able to stop before the lane end, exit or taper: v² / (2 × 4.5 m/s²), SDT deceleration from TORC-SYSRQ-10649.' },
  { id: 'R_HUG_IN_LANE', label: 'Lane hugger stays in its lane', desc: 'Half actor width + offset ≤ half lane width; beyond that it is a drift, not a lane hugger.' },
  { id: 'R_CURVE_SPEED', label: 'Curve drivable', desc: 'v² × curvature ≤ g·(e + f − 0.15·G), TORC-SYSRQ-10172 / 14120, superelevation e = 0.06 assumed, f = 0.17 − 0.00143·V(mph).' },
];

const MODE_STATES = { required: [true], optional: [false, true], off: [false] };

function fnv(str, seed) { let h = seed >>> 0; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; }
export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canonical(v[k])).join(',')}}`;
  return JSON.stringify(v);
}
export function hash64(v) { const s = canonical(v); return fnv(s, 2166136261).toString(16).padStart(8, '0') + fnv(s, 0x9747b28c).toString(16).padStart(8, '0'); }

const hasConvoy = a => Array.isArray(a.count) && a.count.length > 0;
const uniqSorted = a => [...new Set(a)].sort((x, y) => (typeof x === 'number' && typeof y === 'number') ? x - y : String(x).localeCompare(String(y)));
const list = (a, def) => Array.isArray(a) && a.length ? a : def;

/* ---------- validation ---------- */
export function validate(cfg) {
  const errors = [];
  const num = (arr, path, { min = -Infinity, max = Infinity, required = true, integer = false } = {}) => {
    if (!Array.isArray(arr) || !arr.length) { if (required) errors.push(`${path} : at least one value`); return; }
    for (const v of arr) {
      if (typeof v !== 'number' || !Number.isFinite(v)) errors.push(`${path} : « ${v} » is not a number`);
      else if (v < min || v > max) errors.push(`${path} : ${v} outside [${min}, ${max}]`);
      else if (integer && !Number.isInteger(v)) errors.push(`${path} : ${v} must be an integer`);
    }
  };
  const r = cfg.road || {}, e = cfg.ego || {};
  if (!list(r.types).length) errors.push('Road: at least one type');
  num(r.laneCounts, 'Road · lane count', { min: 1, max: 8, integer: true });
  if (!list(r.egoStartLanes, []).length) errors.push('Road: at least one start lane');
  num(e.speedMps, 'SDT · speed', { min: 0 });
  num([e.lengthM], 'SDT · length', { min: 0.1 }); num([e.widthM], 'SDT · width', { min: 0.1 });
  if (['lane_change', 'move_over', 'emergency_lateral'].includes(e.intent) && !list(e.sides, []).length) errors.push('SDT: at least one lane change side');
  for (const k of ['laneWidthM', 'shoulderWidthM', 'distanceToMandatoryM', 'curvature', 'grade']) if (r[k] !== undefined) num(r[k], `Road · ${k}`, { required: false });
  const seen = new Set();
  for (const a of cfg.actors || []) {
    const p = `Actor ${a.slot}`;
    if (!SLOTS[a.slot]) { errors.push(`${p} : unknown slot`); continue; }
    if (seen.has(a.slot)) errors.push(`${p} : duplicate slot`); seen.add(a.slot);
    if (!MODE_STATES[a.mode]) errors.push(`${p} : invalid presence`);
    if (a.mode === 'off') continue;
    const kinds = list(a.kinds, []);
    if (!kinds.length) errors.push(`${p} : at least one actor type`);
    for (const k of kinds) if (!KINDS[k]) errors.push(`${p} : type '${k}' unknown`);
    const pos = SLOTS[a.slot].pos;
    if (a.offsetM !== undefined) num(a.offsetM, `${p} · longitudinal offset`);
    else if (pos === 'offset') num(a.offsetM, `${p} · longitudinal offset`);
    else num(a.distanceM, `${p} · distance`, { min: 0 });
    const stat = kinds.every(k => KINDS[k] && KINDS[k].type === 'static');
    if (!stat && !kinds.every(k => KINDS[k] && KINDS[k].vmax === 0)) num(a.speedMps, `${p} · speed`, { min: 0 });
    if (a.slot === 'S') num(a.lateralOffsetM, `${p} · lateral offset`);
    if (hasConvoy(a)) { num(a.count, `${p} · vehicle count`, { min: 1, max: 12, integer: true }); if (a.count.some(n => n > 1)) num(a.gapM, `${p} · convoy gap`, { min: 0 }); if (a.slot === 'S' || a.slot === 'O') errors.push(`${p} : convoys are not allowed in this slot`); }
    for (const m of list(a.maneuvers, [{ type: 'none' }])) {
      if (!MANEUVERS[m.type]) { errors.push(`${p} : unknown maneuver '${m.type}'`); continue; }
      for (const prm of MANEUVERS[m.type].params) num(m[prm], `${p} · ${m.type}.${prm}`, { min: 0 });
    }
  }
  return errors;
}

/* ---------- expansion ---------- */
function expandManeuvers(ms) {
  const out = [];
  for (const m of list(ms, [{ type: 'none' }])) {
    const prms = MANEUVERS[m.type].params;
    let combos = [{ type: m.type }];
    for (const prm of prms) combos = combos.flatMap(c => uniqSorted(m[prm]).map(v => ({ ...c, [prm]: v })));
    out.push(...combos);
  }
  return out;
}
function actorAxes(a) {
  const axes = [['kind', uniqSorted(a.kinds)]];
  if (a.offsetM !== undefined || SLOTS[a.slot].pos === 'offset') axes.push(['offsetM', uniqSorted(a.offsetM)]);
  else axes.push(['distanceM', uniqSorted(a.distanceM)]);
  const stat = a.kinds.every(k => KINDS[k].vmax === 0);
  axes.push(['speedMps', stat ? [0] : uniqSorted(a.speedMps)]);
  if (a.slot === 'S') axes.push(['lateralOffsetM', uniqSorted(a.lateralOffsetM)]);
  if (a.slot === 'O') axes.push(['lane', uniqSorted(list(a.lanes, ['target']))]);
  if (hasConvoy(a)) { axes.push(['count', uniqSorted(a.count)]); axes.push(['gapM', uniqSorted(list(a.gapM, [0]))]); }
  axes.push(['maneuver', expandManeuvers(a.maneuvers)]);
  return axes;
}
function globalAxes(cfg) {
  const r = cfg.road, e = cfg.ego;
  const axes = [
    ['road.type', uniqSorted(r.types)], ['road.laneCount', uniqSorted(r.laneCounts)], ['road.egoStartLane', uniqSorted(r.egoStartLanes)],
    ['ego.speedMps', uniqSorted(e.speedMps)],
  ];
  if (['lane_change', 'move_over', 'emergency_lateral'].includes(e.intent)) axes.push(['ego.side', uniqSorted(e.sides)]);
  for (const k of ['laneWidthM', 'shoulderWidthM', 'distanceToMandatoryM', 'curvature', 'grade', 'speedLimitMps', 'windGustMps', 'markingQuality', 'mapMismatch', 'degradation'])
    if (Array.isArray(r[k]) && r[k].length) axes.push([`road.${k}`, uniqSorted(r[k])]);
  return axes;
}
function* product(axes, i = 0, cur = {}) {
  if (i === axes.length) { yield cur; return; }
  const [k, vals] = axes[i];
  for (const v of vals) yield* product(axes, i + 1, { ...cur, [k]: v });
}
function setPath(o, path, v) { const ks = path.split('.'); let n = o; for (const k of ks.slice(0, -1)) n = n[k] ??= {}; n[ks.at(-1)] = v; }

function patterns(cfg) {
  const acts = (cfg.actors || []).filter(a => a.mode !== 'off');
  let pats = [{}];
  for (const a of acts) pats = pats.flatMap(p => MODE_STATES[a.mode].map(s => ({ ...p, [a.slot]: s })));
  const optional = acts.filter(a => a.mode === 'optional').map(a => a.slot);
  if (!cfg.options?.includeEmptyBaseline && optional.length) pats = pats.filter(p => optional.some(s => p[s]));
  const n = p => Object.values(p).filter(Boolean).length;
  return pats.sort((x, y) => n(x) - n(y));
}

/* ---------- geometry helpers ---------- */
export function laneIndices(p) {
  const n = p.road.laneCount, start = p.road.egoStartLane;
  const ego = start === 'rightmost' ? 0 : start === 'leftmost' ? n - 1 : 1;
  const dir = p.ego.side === 'right' ? -1 : 1;
  return { n, ego, target: ego + dir, far: ego + 2 * dir, other: ego - dir, dir };
}
export function actorGeometry(p, cfg) {
  const ego = p.ego, li = laneIndices(p);
  const ents = [{ id: 'SDT', lane: li.ego, x0: -ego.lengthM, x1: 0, v: ego.speedMps, W: ego.widthM }];
  for (const [slot, a] of Object.entries(p.actors || {})) {
    if (!a.present) continue;
    const k = KINDS[a.kind], s = SLOTS[slot];
    let lane = s.lane === 'origin' ? li.ego : s.lane === 'target' ? li.target : s.lane === 'far' ? li.far : s.lane === 'other' ? li.other : s.lane === 'shoulder' ? -1 : (a.lane === 'origin' ? li.ego : li.target);
    if (slot === 'G' && cfg?.road?.rampOnRight) lane = -2;
    const nC = a.count > 1 ? a.count : 1, gap = nC > 1 ? (a.gapM ?? 0) : 0, ext = nC * k.L + (nC - 1) * gap;
    let x0, x1;
    if (a.offsetM !== undefined) { x1 = a.offsetM; x0 = a.offsetM - ext; }
    else if (s.pos === 'behind') { x1 = -ego.lengthM - a.distanceM; x0 = x1 - ext; }
    else { x0 = a.distanceM; x1 = a.distanceM + ext; }
    ents.push({ id: slot, lane, x0, x1, v: a.speedMps, W: k.W, kind: a.kind, n: nC, gap, L: k.L });
  }
  return { li, ents };
}

/* ---------- rules ---------- */
export function exclusions(p, cfg, abs) {
  const out = [];
  const R = (id, reason) => { if (cfg.rules?.[id] !== false) out.push({ ruleId: id, reason }); };
  const { li, ents } = actorGeometry(p, cfg);
  const n = li.n;
  if (p.road.egoStartLane === 'middle' && n < 3) R('R_EGO_START_LANE', `No middle lane with ${n} lane(s).`);
  else {
    const needs = [];
    if (['lane_change', 'move_over', 'emergency_lateral'].includes(p.ego.intent) || ['B', 'D'].some(s => p.actors[s]?.present) || (p.actors.O?.present && p.actors.O.lane === 'target')) needs.push(['target', li.target, 'target lane']);
    if (['E', 'F'].some(s => p.actors[s]?.present)) needs.push(['far', li.far, 'lane beyond the target']);
    if (p.actors.G?.present && !cfg.road?.rampOnRight) needs.push(['other', li.other, 'other-side lane']);
    for (const [, idx, label] of needs) if (idx < 0 || idx >= n) R('R_LANES_FOR_SLOTS', `No ${label}${p.ego.side ? ` on the ${p.ego.side}` : ''} with ${n} lane(s) and start lane ${p.road.egoStartLane}.`);
  }
  const roadTypes = abs?.applicability?.roadTypes;
  if (Array.isArray(roadTypes) && roadTypes.length && !roadTypes.includes(p.road.type)) R('R_REQUIREMENT_ROAD_TYPE', `Road '${p.road.type}' outside the allowed types (${roadTypes.join(', ')}).`);
  if (p.ego.speedMps > 29.05) R('R_ODD_SPEED', `SDT at ${p.ego.speedMps} m/s, above 29.05 m/s (65 mph, TORC-SYSRQ-14073).`);
  for (const [slot, a] of Object.entries(p.actors)) {
    if (!a.present) continue;
    const k = KINDS[a.kind];
    if (a.speedMps < 0 || a.speedMps > k.vmax) R('R_SPEED_ENVELOPE', `${slot} (${k.label}) at ${a.speedMps} m/s, outside [0, ${k.vmax}].`);
    const m = a.maneuver;
    if (m?.type === 'brake' && m.decelMps2 > k.amax) R('R_DECEL_LIMIT', `${slot} brakes at ${m.decelMps2} m/s², maximum ${k.amax} for ${k.label}.`);
    if (m?.type === 'accelerate' && m.accelMps2 > k.amax / 2) R('R_DECEL_LIMIT', `${slot} accelerates at ${m.accelMps2} m/s², maximum ${k.amax / 2} for ${k.label}.`);
    if (k.vmax === 0 && m && m.type !== 'none') R('R_SPEED_ENVELOPE', `${slot} (${k.label}) is static and cannot '${MANEUVERS[m.type].label}'.`);
    const lw = p.road.laneWidthM ?? 3.66;
    if (m?.type === 'hug' && k.W / 2 + m.lateralM > lw / 2 + 1e-9) R('R_HUG_IN_LANE', `${slot} (${k.label}) offset by ${m.lateralM} m would leave its lane (${(k.W / 2 + m.lateralM).toFixed(2)} m > ${(lw / 2).toFixed(2)} m): that is a drift.`);
    if (m?.type === 'take_exit' && !cfg.road?.rampOnRight) R('R_LANES_FOR_SLOTS', `${slot} takes an exit but the road has no ramp on the right.`);
    if (slot !== 'S' && k.type !== 'static' && k.W > lw) R('R_ACTOR_WIDTH_LANE', `${slot} (${k.label}, ${k.W} m) wider than the lane (${lw} m).`);
    if (slot === 'S' && abs?.fixed?.fullyOnShoulder) {
      const sw = p.road.shoulderWidthM ?? 0;
      if (a.lateralOffsetM < -1e-9 || a.lateralOffsetM + k.W > sw + 1e-9) R('R_SHOULDER_ENVELOPE', `S: offset ${a.lateralOffsetM} m + width ${k.W} m on a ${sw} m shoulder.`);
    }
  }
  // same-lane overlap and unavoidable contact at t0
  const byLane = {};
  for (const e of ents) (byLane[e.lane] ??= []).push(e);
  for (const lane of Object.keys(byLane)) {
    const L = byLane[lane].sort((a, b) => a.x0 - b.x0);
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
      const a = L[i], b = L[j];
      if (a.x1 > b.x0 - 0.5) R('R_INITIAL_OVERLAP', `${a.id} and ${b.id} overlap at start in the same lane.`);
    }
    for (let i = 0; i + 1 < L.length; i++) {
      const f = L[i], l = L[i + 1], gap = l.x0 - f.x1, closing = f.v - l.v;
      if (gap > 0.5 && closing > 0 && gap / closing < 0.5) R('R_UNAVOIDABLE_AT_START', `${f.id} reaches ${l.id} in ${(gap / closing).toFixed(2)} s from the start.`);
    }
  }
  if (p.road.distanceToMandatoryM !== undefined) { const need = Math.round(p.ego.speedMps ** 2 / 9); if (p.road.distanceToMandatoryM < need) R('R_MANDATORY_DISTANCE', `${p.road.distanceToMandatoryM} m before the mandatory point: the SDT cannot even stop (${need} m at ${p.ego.speedMps} m/s).`); }
  if (p.road.curvature !== undefined && p.road.curvature > 0) { const v = p.ego.speedMps, f = Math.min(0.17, Math.max(0.07, 0.17 - 0.00143 * v * 2.23694)), G = (p.road.grade ?? 0) / 100, lim = 9.81 * (0.06 + f - 0.15 * G), al = v * v * p.road.curvature; if (al > lim) R('R_CURVE_SPEED', `Lateral acceleration ${al.toFixed(2)} m/s² above ${lim.toFixed(2)} m/s² at ${v} m/s.`); }
  // dedupe identical reasons
  const seen = new Set();
  return out.filter(x => { const k = x.ruleId + x.reason; if (seen.has(k)) return false; seen.add(k); return true; });
}

/* ---------- candidate oracle (Jama-based where a requirement exists; not a pass/fail verdict) ---------- */
export function lagDecelLimit(v) { return v <= 30 ? 3 : v >= 45 ? 5 : 3 + (v - 30) / 15 * 2; } // TORC-SYSRQ-10649 bOMVLag
export function expected(p, cfg) {
  const e = p.ego, A = p.actors, v = e.speedMps;
  const why = [];
  let unsafe = false;
  const targetCheck = () => {
    if (A.B?.present && A.B.distanceM !== undefined) { const lg = A.B.distanceM / Math.max(v, 1); if (lg < 1.5) { unsafe = true; why.push(`lead gap ${lg.toFixed(1)} s < 1.5 s`); } if (A.B.maneuver?.type === 'brake') why.push('B brakes'); if (A.B.speedMps === 0 && A.B.distanceM < 250) { unsafe = true; why.push(`B${A.B.count > 1 ? ` (queue of ${A.B.count})` : ''} stopped at ${A.B.distanceM} m in the target lane`); } if (A.B.maneuver?.type === 'cut_in') { unsafe = true; why.push('B crosses toward the SDT lane: let it pass'); } }
    if (A.D?.present) {
      if (A.D.offsetM !== undefined && A.D.offsetM > -(e.lengthM + 2)) { unsafe = true; why.push('D alongside the combination'); }
      else if (A.D.distanceM !== undefined) {
        const dv = A.D.speedMps + (A.D.maneuver?.type === 'accelerate' ? A.D.maneuver.accelMps2 * 3 : 0);
        const rg = A.D.distanceM / Math.max(dv, 1), c = dv - v, a = c > 0 ? c * c / (2 * Math.max(A.D.distanceM - 1.0 * dv, 0.5)) : 0, lim = lagDecelLimit(dv);
        if (rg < 1) { unsafe = true; why.push(`rear gap ${rg.toFixed(1)} s < 1 s`); }
        if (a > lim) { unsafe = true; why.push(`D would need to brake at ${a.toFixed(1)} > ${lim.toFixed(1)} m/s²`); }
      }
    }
    if (A.E?.present && A.E.maneuver?.type === 'lane_change_into_target' && Math.abs(A.E.offsetM ?? 0) < e.lengthM + 5) { unsafe = true; why.push('E merges into the same lane'); }
    if (A.O?.present && A.O.lane === 'target' && A.O.distanceM < 60) { unsafe = true; why.push(`object at ${A.O.distanceM} m in the target lane`); }
  };
  switch (e.intent) {
    case 'lane_change': targetCheck(); return unsafe ? { cat: 'hold', txt: 'Wait or abort the lane change', why: why.join(' ; ') } : { cat: 'go', txt: 'Change lane (signal ≥ 3 s before)', why: why.length ? why.join(' ; ') : 'Jama gaps met (1.5 s / 1 s)' };
    case 'move_over': targetCheck(); return unsafe ? { cat: 'hold', txt: 'Stay and slow to 20 mph below the limit', why: why.join(' ; ') } : { cat: 'go', txt: 'Move over to the left', why: 'left lane free' };
    case 'emergency_lateral': targetCheck(); return unsafe ? { cat: 'hold', txt: 'Maximum braking in lane', why: why.join(' ; ') } : { cat: 'go', txt: 'Lateral avoidance into the adjacent lane', why: 'adjacent lane free' };
    case 'stop_on_shoulder': { const sw = p.road.shoulderWidthM ?? 3; const blocked = A.S?.present && (A.S.distanceM ?? 999) < 300; return sw >= e.widthM + 0.3 && !blocked ? { cat: 'go', txt: 'Controlled stop on the shoulder, hazard lights', why: `shoulder ${sw} m` } : { cat: 'hold', txt: 'Emergency stop in lane (shoulder unavailable)', why: blocked ? 'shoulder occupied' : `shoulder ${sw} m too narrow` }; }
    case 'stop_in_lane': { const rear = A.C?.present && A.C.distanceM !== undefined ? A.C.distanceM / Math.max(A.C.speedMps, 1) : Infinity; return { cat: 'other', txt: 'Stop in lane, hazard lights (SYSRQ-14130)', why: rear < 2 ? `follower at ${rear.toFixed(1)} s: rear-end risk (H3)` : 'no close follower' }; }
  }
  if (A.O?.present && A.O.lane === 'origin') { const ds = v * 1.2 + v * v / 9; return A.O.distanceM >= ds ? { cat: 'hold', txt: 'Brake in lane', why: `stop possible in ${Math.round(ds)} m` } : { cat: 'other', txt: 'Avoidance or emergency braking', why: `cannot stop within ${Math.round(ds)} m` }; }
  if (A.A?.present && A.A.maneuver?.type === 'take_exit') return { cat: 'hold', txt: 'Keep the gap while the lead exits, then resume speed', why: `A slows at ${A.A.maneuver.decelMps2} m/s² taking the exit at ${A.A.maneuver.startS} s` };
  for (const s of ['B', 'D', 'G']) if (A[s]?.present && A[s].maneuver?.type === 'hug') { const lw = p.road.laneWidthM ?? 3.66, gapLat = (lw - e.widthM) / 2 + (lw - KINDS[A[s].kind].W) / 2 - A[s].maneuver.lateralM; return gapLat < 0.3 ? { cat: 'hold', txt: 'Bias in lane or slow to keep ≥ 0.3 m lateral (SYSRQ-14128)', why: `${s} hugs the line, lateral room ${gapLat.toFixed(2)} m` } : { cat: 'go', txt: 'Stay centered, watch for a cut-in', why: `${s} hugs the line, lateral room ${gapLat.toFixed(2)} m ≥ 0.3 m` }; }
  if (A.A?.present && A.A.maneuver?.type === 'brake') return { cat: 'hold', txt: 'Brake and keep the gap', why: `A brakes at ${A.A.maneuver.decelMps2} m/s²` };
  if (A.A?.present && A.A.speedMps === 0) return { cat: 'hold', txt: 'Stop behind the stopped vehicle', why: `at ${A.A.distanceM} m` };
  if (A.G?.present && A.G.count > 1 && A.G.maneuver?.type === 'cut_in') return { cat: 'hold', txt: 'Open gaps and align within the merging convoy', why: `${A.G.count} vehicles merge, gap ${A.G.gapM} m` };
  if (A.A?.present && A.A.maneuver?.type === 'cut_out') return { cat: 'go', txt: 'Resume set speed smoothly once the lane is clear', why: `A cuts out at ${A.A.maneuver.startS} s` };
  for (const s of ['B', 'D', 'G', 'E']) if (A[s]?.present && A[s].maneuver?.type === 'cut_in') return { cat: 'hold', txt: 'Reopen the gap after the cut-in', why: `${s} cuts in at ${A[s].maneuver.startS} s` };
  for (const s of ['B', 'D', 'G', 'E']) if (A[s]?.present && A[s].maneuver?.type === 'drift') return { cat: 'hold', txt: 'Keep ≥ 0.3 m lateral (SYSRQ-14128)', why: `${s} drifts toward the SDT` };
  for (const s of ['B', 'D']) if (A[s]?.present && A[s].count > 1 && A[s].speedMps < v - 5) return { cat: 'go', txt: 'Keep lane, watch for a cut-in from the convoy', why: `${A[s].count} vehicles at ${A[s].speedMps} m/s alongside (speed difference ${(v - A[s].speedMps).toFixed(0)} m/s)` };
  if (A.A?.present && A.A.speedMps < v) return { cat: 'go', txt: 'Follow the lead (Adaptive Follow)', why: `A at ${A.A.speedMps} m/s` };
  if (A.S?.present && KINDS[A.S.kind]?.type === 'emv') return { cat: 'hold', txt: 'Slow to 20 mph below the limit', why: 'EMV on the shoulder, no lane change in this behavior' };
  return { cat: 'go', txt: 'Keep lane', why: 'nothing requires a maneuver' };
}

/* ---------- generation ---------- */
export function countPotential(cfg) {
  const g = globalAxes(cfg).reduce((n, [, v]) => n * v.length, 1);
  let total = 0;
  for (const pat of patterns(cfg)) {
    let n = g;
    for (const a of cfg.actors) if (pat[a.slot]) n *= actorAxes(a).reduce((m, [, v]) => m * v.length, 1);
    total += n;
  }
  return total;
}
export function generate(cfg, abs) {
  const errors = validate(cfg);
  if (errors.length) return { status: 'invalid', errors, counts: { potential: 0, evaluated: 0, valid: 0, rejected: 0 }, variants: [], rejected: [] };
  const max = cfg.options?.maxExpansion ?? 20000;
  const potential = countPotential(cfg);
  const variants = [], rejected = [];
  let evaluated = 0;
  const gAxes = globalAxes(cfg);
  outer: for (const pat of patterns(cfg)) {
    const present = cfg.actors.filter(a => pat[a.slot]);
    const aAxes = present.flatMap(a => actorAxes(a).map(([k, v]) => [`actors.${a.slot}.${k}`, v]));
    for (const flat of product([...gAxes, ...aAxes])) {
      if (evaluated >= max) break outer;
      evaluated++;
      const p = { road: {}, ego: { intent: cfg.ego.intent, lengthM: cfg.ego.lengthM, widthM: cfg.ego.widthM, heightM: cfg.ego.heightM }, actors: {} };
      for (const a of cfg.actors) if (a.mode !== 'off') p.actors[a.slot] = { present: !!pat[a.slot] };
      for (const [k, v] of Object.entries(flat)) setPath(p, k, v);
      const id = hash64({ abstract: abs?.id ?? null, version: abs?.version ?? null, p });
      const ex = exclusions(p, cfg, abs);
      if (ex.length) rejected.push({ id: `REJ-${id}`, parameters: p, ruleIds: [...new Set(ex.map(x => x.ruleId))], reasons: ex.map(x => x.reason) });
      else variants.push({ id: `SCN-${id}`, parameters: p, expected: expected(p, cfg), status: 'draft_for_engineering_review' });
    }
  }
  const truncated = potential > evaluated;
  return { status: truncated ? 'truncated' : 'complete', errors: [], counts: { potential, evaluated, valid: variants.length, rejected: rejected.length, truncated }, variants, rejected,
    configurationId: `CFG-${hash64(cfg)}`, execution: { status: 'not_simulated', simulatorRunId: null } };
}
