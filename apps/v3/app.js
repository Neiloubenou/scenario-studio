/* ---------- Scenario Studio v3 UI (engine.mjs and core.mjs are concatenated above) ---------- */
const DATA = JSON.parse(document.getElementById('seed').textContent);
const STATS_DEMO = JSON.parse(document.getElementById('stats').textContent);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const fmt = n => (n ?? 0).toLocaleString('en-US');
const pct = (a, b) => b ? (100 * a / b) : 0;
const pctTxt = (a, b) => b ? `${pct(a, b).toFixed(1)}%` : '—';
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3600); };
const BEH = Object.fromEntries(DATA.behaviors.map(b => [b.code, b]));
const SCN = Object.fromEntries(DATA.scenarios.map(s => [s.id, s]));
const VAR = Object.fromEntries(DATA.odd.variants.map(v => [v.id, v]));
const CRIT = DATA.criteria, HIRE = DATA.hire, HZ = DATA.hazards;
const INTENT = {keep_lane: 'Keep lane', lane_change: 'Change lane', move_over: 'Move over', stop_on_shoulder: 'Stop on the shoulder', stop_in_lane: 'Stop in lane', emergency_lateral: 'Emergency lateral avoidance'};
const LEVEL = {justified: ['ok', 'HIRE justified'], indirect: ['ex', 'HIRE indirect'], review: ['ko', 'HIRE to review']};
const ROAD_EXTRAS = {laneWidthM: ['Lane width', 'm'], shoulderWidthM: ['Shoulder width', 'm'], distanceToMandatoryM: ['Distance to mandatory point', 'm'], curvature: ['Curvature', '1/m'], grade: ['Grade', '%'], speedLimitMps: ['Speed limit', 'm/s'], windGustMps: ['Wind gust', 'm/s'], markingQuality: ['Marking quality', ''], mapMismatch: ['Map mismatch', ''], degradation: ['System degradation', '']};

const state = {view: 'overview', beh: 'HW-LC', scn: null, tab: 'summary', search: '', fam: 'all', only: 'all', expanded: new Set(), tvar: 'V00', tstatus: 'all', sel: null, shown: 40,
  results: {mode: 'demo', name: 'Demo results', map: null}, stats: STATS_DEMO};

/* ---------- aggregation ---------- */
const linksOf = code => DATA.scenarios.filter(s => s.links[code]).map(s => ({s, link: s.links[code], st: state.stats[`${s.id}@${code}`]}));
function sumTot(list){ const t = {pot: 0, valid: 0, rej: 0, deferred: 0, pass: 0, fail: 0, not_run: 0}; for (const x of list) if (x.st) for (const k in t) t[k] += x.st.tot[k] || 0; return t; }
function worstFailRisk(list){ let best = null, n = 0; for (const x of list) { if (!x.st) continue; for (const [c, k] of Object.entries(x.st.fails)) { const r = riskOf(x.link, c, HIRE); if (!r) continue; if (!best || sevRank(r) > sevRank(best)) best = r; if (/3/.test(r.S)) n += k; } } return {risk: best, s3: n}; }
function worstLinkRisk(link){ const r = link.worst ? HIRE[link.worst] : null; return r ? {...r, id: link.worst} : null; }
function riskBadge(r, title){ if (!r) return '<span class="muted">—</span>'; const s = (r.S || 'S0').toLowerCase(); return `<span class="risk" title="${esc(title || r.id || '')}"><span class="${s}">${esc(r.S)}</span><span>${esc(r.E)}</span><span>${esc(r.C)}</span></span>`; }
function sbar(t, big){ const tot = (t.pass || 0) + (t.fail || 0) + (t.not_run || 0); if (!tot) return `<div class="sbar${big ? ' big' : ''}"></div>`; return `<div class="sbar${big ? ' big' : ''}" role="img" aria-label="${fmt(t.pass)} pass, ${fmt(t.fail)} fail, ${fmt(t.not_run)} not run"><i class="p" style="width:${pct(t.pass, tot)}%"></i><i class="f" style="width:${pct(t.fail, tot)}%"></i><i class="n" style="width:${pct(t.not_run, tot)}%"></i></div>`; }
const legend = () => `<div class="legend"><span><i style="background:var(--pass)"></i>Pass</span><span><i style="background:var(--fail)"></i>Fail</span><span><i style="background:var(--notrun)"></i>Not run</span><span><i style="background:var(--excl)"></i>Excluded (absurd)</span><span><i style="background:var(--defer)"></i>Deferred (perception)</span></div>`;
const rate = t => { const run = t.pass + t.fail; return run ? `${pct(t.pass, run).toFixed(1)}%` : '—'; };

/* ---------- text helpers ---------- */
function actorLine(slot, a){
  if (!a || !a.present) return '';
  const k = KINDS[a.kind], pos = a.offsetM !== undefined ? `offset ${a.offsetM} m` : `${a.distanceM} m ${SLOTS[slot].pos === 'behind' ? 'behind' : 'ahead'}`;
  const m = a.maneuver && a.maneuver.type !== 'none' ? `, ${MANEUVERS[a.maneuver.type].label}${a.maneuver.decelMps2 !== undefined ? ' ' + a.maneuver.decelMps2 + ' m/s²' : ''}${a.maneuver.accelMps2 !== undefined ? ' ' + a.maneuver.accelMps2 + ' m/s²' : ''}${a.maneuver.lateralM !== undefined ? ' by ' + a.maneuver.lateralM + ' m' : ''}${a.maneuver.startS !== undefined ? ' at ' + a.maneuver.startS + ' s' : ''}` : '';
  return `${slot} ${k.label}${a.count > 1 ? ` ×${a.count} (gap ${a.gapM} m)` : ''}, ${pos}${k.vmax ? `, ${a.speedMps} m/s` : ''}${a.lateralOffsetM !== undefined ? `, lateral ${a.lateralOffsetM} m` : ''}${a.lane ? `, ${a.lane} lane` : ''}${m}`;
}
function cfgActors(c){ return (c.actors || []).filter(x => x.mode !== 'off').map(x => `<div><span class="chip code">${x.slot}</span> ${esc(SLOTS[x.slot].role)} · ${x.mode} · ${x.kinds.map(k => esc(KINDS[k].label)).join(', ')}${(x.maneuvers || []).filter(m => m.type !== 'none').map(m => ' · ' + esc(MANEUVERS[m.type].label)).join('')}${x.count ? ` · convoy ${x.count.join('/')}` : ''}</div>`).join('') || '<span class="muted">none, SDT alone</span>'; }
function roadLine(p){ return `${p.road.laneCount} lanes · start ${p.road.egoStartLane}${Object.keys(ROAD_EXTRAS).filter(k => p.road[k] !== undefined).map(k => ` · ${ROAD_EXTRAS[k][0].toLowerCase()} ${p.road[k]}${ROAD_EXTRAS[k][1] ? ' ' + ROAD_EXTRAS[k][1] : ''}`).join('')}`; }

/* ---------- scene (to scale) ---------- */
function sceneSVG(p, cfg, title){
  const {li, ents} = actorGeometry(p, cfg);
  const n = li.n, LW = 40, X0 = 46, shoulder = 30, ramp = cfg.road?.rampOnRight ? LW : 0;
  const W = X0 + n * LW + shoulder + ramp + 16, xmin = -70, xmax = Math.max(170, ...ents.map(e => e.x1 + 15));
  const Hpx = 380, sc = (Hpx - 30) / (xmax - xmin), Y = x => 14 + (xmax - x) * sc;
  const laneX = idx => idx === -1 ? X0 + n * LW + ramp + shoulder / 2 : idx === -2 ? X0 + n * LW + LW / 2 : X0 + (n - 1 - idx) * LW + LW / 2;
  let s = `<svg class="scene" viewBox="0 0 ${W} ${Hpx}" role="img" aria-label="${esc(title)}"><rect x="${X0}" y="0" width="${n * LW + ramp}" height="${Hpx}" fill="var(--asphalt)"/><rect x="${X0 + n * LW + ramp}" y="0" width="${shoulder}" height="${Hpx}" fill="var(--asphalt)" opacity=".6"/>`;
  s += `<line x1="${X0}" y1="0" x2="${X0}" y2="${Hpx}" stroke="var(--lane-yellow)" stroke-width="3"/><line x1="${X0 + n * LW + ramp}" y1="0" x2="${X0 + n * LW + ramp}" y2="${Hpx}" stroke="var(--marking)" stroke-width="2.5"/>`;
  for (let i = 1; i < n + (ramp ? 1 : 0); i++) s += `<line x1="${X0 + LW * i}" y1="0" x2="${X0 + LW * i}" y2="${Hpx}" stroke="var(--marking)" stroke-width="2" stroke-dasharray="${i === n ? '4 6' : '14 12'}"/>`;
  for (let t = Math.ceil(xmin / 50) * 50; t <= xmax; t += 50) s += `<line x1="${X0 - 8}" y1="${Y(t)}" x2="${X0}" y2="${Y(t)}" stroke="var(--muted)"/><text x="${X0 - 11}" y="${Y(t) + 4}" text-anchor="end" font-family="var(--f-mono)" font-size="10" fill="var(--muted)">${t} m</text>`;
  const tgt = li.target;
  if (['lane_change', 'move_over'].includes(p.ego.intent) && tgt >= 0 && tgt < n) s += `<path d="M${laneX(li.ego)} ${Y(2)} C ${laneX(li.ego)} ${Y(22)}, ${laneX(tgt)} ${Y(18)}, ${laneX(tgt)} ${Y(42)}" fill="none" stroke="var(--lane-yellow)" stroke-width="2" stroke-dasharray="4 3"/><path d="M${laneX(tgt) - 5} ${Y(38)} L${laneX(tgt)} ${Y(44)} L${laneX(tgt) + 5} ${Y(38)}" fill="none" stroke="var(--lane-yellow)" stroke-width="2"/>`;
  for (const e of ents) {
    const x = laneX(e.lane), w = Math.max(8, Math.min(LW - 6, e.W * 10)), y0 = Y(e.x1), h = Math.max(6, (e.x1 - e.x0) * sc);
    const k = e.kind ? KINDS[e.kind] : null, a = e.id === 'SDT' ? null : p.actors[e.id];
    const fill = e.id === 'SDT' ? 'var(--sdt)' : k.type === 'emv' ? 'var(--emv)' : k.type === 'static' ? 'var(--obj)' : 'var(--car)';
    s += `<g>`;
    if (e.n > 1) { for (let i = 0; i < e.n; i++) { const top = e.x1 - i * (e.L + e.gap); s += `<rect x="${x - w / 2}" y="${Y(top)}" width="${w}" height="${Math.max(5, e.L * sc)}" rx="3" fill="${fill}" stroke="var(--car-line)"/>`; } }
    else s += `<rect x="${x - w / 2}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${e.id === 'SDT' ? 'var(--sdt-line)' : 'var(--car-line)'}"/>`;
    s += `<text x="${x}" y="${y0 + Math.min(h, 20) / 2 + 4}" text-anchor="middle" font-family="var(--f-display)" font-weight="800" font-size="${e.id === 'SDT' ? 9 : 11}" fill="${e.id === 'SDT' ? 'var(--asphalt)' : 'var(--road-label)'}">${e.id}</text>`;
    if (a && a.maneuver && a.maneuver.type !== 'none') { const lbl = {brake: '▼', accelerate: '▲', lane_change_into_target: tgt > e.lane ? '◀' : '▶', cut_in: '◀', cut_out: '▶', hug: '⇤', take_exit: '↘', drift: '↔'}[a.maneuver.type] || '•'; s += `<text x="${x + w / 2 + 2}" y="${y0 + 10}" font-size="10" fill="var(--lane-yellow)">${lbl}</text>`; }
    s += `</g>`;
  }
  return s + `</svg>`;
}

/* ---------- OpenSCENARIO DSL template ---------- */
function oscText(v, scn, beh, link, cfg, variant, res){
  const p = v.parameters, li = laneIndices(p), side = li.dir > 0 ? 'left' : 'right', other = side === 'left' ? 'right' : 'left';
  const vname = {A: 'a_lead_origin', B: 'b_lead_target', C: 'c_follow_origin', D: 'd_follow_target', E: 'e_far_lane', F: 'f_far_lane_ahead', G: 'g_other_side', S: 's_shoulder', O: 'o_object'};
  const L = ['# ASAM OpenSCENARIO DSL 2.0 authoring template (not parser-validated).',
    `# behavior : ${beh.code} ${beh.name}${beh.jama ? ' | ' + beh.jama.id : ''}`, `# scenario : ${scn.id} v${scn.version || 1} | ${scn.title}`,
    `# odd      : ${variant.id} ${variant.name}${variant.exposure != null ? ` (${variant.exposure}% of I-35 exposure)` : ''}`, `# concrete : ${v.id}`,
    `# hire     : ${link.level} | worst ${link.worst || 'none'}`, `# criteria : ${link.criteria.map(c => `${c} ${CRIT[c].req}`).join(' ; ')}`,
    `# expected : ${v.expected.txt} (${v.expected.why}) [candidate oracle]`, `# result   : ${res ? res.status + (res.criterion ? ' on ' + res.criterion : '') : 'not run'}`,
    `# intent   : ${p.ego.intent}${p.ego.side ? ' ' + p.ego.side : ''}, observed on the ADS, never scripted below.`,
    'import <BASIC_OSC_PATH>', 'import <MAP_VERSION_OSC_PATH>', '', `scenario ${scn.id.toLowerCase().replace(/-/g, '_')}_${v.id.toLowerCase().replace(/-/g, '_')}:`,
    '    map: Map', '    map.set_map_file(map_version)', '    ego_vehicle: Truck', `    # road: ${roadLine(p)}`];
  const acts = Object.entries(p.actors).filter(([, x]) => x.present).flatMap(([s, x]) => { if (!(x.count > 1)) return [[s, x]]; const step = KINDS[x.kind].L + x.gapM; return Array.from({length: x.count}, (_, i) => [s, {...x, _i: i + 1, ...(x.offsetM !== undefined ? {offsetM: x.offsetM - i * step} : {distanceM: x.distanceM + i * step})}]); });
  const nm = (s, x) => vname[s] + (x._i ? `_${x._i}` : '');
  for (const [s, x] of acts) L.push(`    ${nm(s, x)}: ${KINDS[x.kind].type === 'static' ? 'StationaryObject' : 'Vehicle'}   # ${KINDS[x.kind].label}`);
  L.push('    do serial:', '        initialization: parallel(duration: 2s):', '            ego_vehicle.drive() with:', '                position(at_point: <EGO_START>, at: start, project_on_route: true)', `                speed(${p.ego.speedMps} mps, at: start)`);
  const laneOf = s => ({A: 'lane(same_as: ego_vehicle, at: start)', C: 'lane(same_as: ego_vehicle, at: start)', B: `lane(side_of: ego_vehicle, side: ${side}, at: start)`, D: `lane(side_of: ego_vehicle, side: ${side}, at: start)`, E: `lane(side_of: ego_vehicle, side: ${side}, offset: 2, at: start)`, F: `lane(side_of: ego_vehicle, side: ${side}, offset: 2, at: start)`, G: `lane(side_of: ego_vehicle, side: ${other}, at: start)`})[s];
  for (const [s, x] of acts) {
    const k = KINDS[x.kind], pos = x.offsetM !== undefined ? `position(${Math.abs(x.offsetM)} m, ${x.offsetM >= 0 ? 'ahead_of' : 'behind'}: ego_vehicle, at: start)` : `position(${x.distanceM} m, ${SLOTS[s].pos === 'behind' ? 'behind' : 'ahead_of'}: ego_vehicle, at: start)`;
    if (k.vmax === 0 || x.speedMps === 0) L.push(`            ${nm(s, x)}.remain_stationary() with:`, `                ${pos}`);
    else { L.push(`            ${nm(s, x)}.drive() with:`, `                ${pos}`, `                speed(${x.speedMps} mps, at: start)`); if (laneOf(s)) L.push(`                ${laneOf(s)}`); }
  }
  const stim = acts.filter(([, x]) => x.maneuver && x.maneuver.type !== 'none');
  if (stim.length) { L.push('        stimulus: parallel:'); for (const [s, x] of stim) { const m = x.maneuver, vn = nm(s, x); L.push('            serial:', `                wait(${(m.startS ?? 0) + (x._i ? x._i - 1 : 0)} s)`);
    if (m.type === 'brake') L.push(`                ${vn}.change_speed(target: 0 mps, rate: ${m.decelMps2} mpsps)`);
    if (m.type === 'accelerate') L.push(`                ${vn}.change_speed(target: ${Math.round(x.speedMps + m.accelMps2 * 4)} mps, rate: ${m.accelMps2} mpsps)`);
    if (m.type === 'lane_change_into_target') L.push(`                ${vn}.change_lane(side: ${other}, num_of_lanes: 1)`);
    if (m.type === 'cut_in') L.push(`                ${vn}.change_lane(lane: same_as(ego_vehicle))`);
    if (m.type === 'cut_out') L.push(`                ${vn}.change_lane(side: ${side}, num_of_lanes: 1)`);
    if (m.type === 'drift') L.push(`                ${vn}.drive() with: lateral(distance: 0.8 m, line: center, side_of: ego_vehicle)`);
    if (m.type === 'hug') L.push(`                ${vn}.drive() with: lateral(distance: ${m.lateralM} m, line: center, side_of: ego_vehicle)`);
    if (m.type === 'take_exit') L.push(`                ${vn}.change_lane(side: right, num_of_lanes: 1)  # exit ramp`); } }
  L.push('        observation: parallel(duration: <OBSERVATION_S> s):', ...link.criteria.map(c => `            # check ${c} ${CRIT[c].name}: ${CRIT[c].metric} ${CRIT[c].threshold} (${CRIT[c].req})`), '');
  return L.join('\n');
}

/* ---------- views ---------- */
function setView(v){ state.view = v; document.querySelectorAll('.nav button').forEach(b => b.setAttribute('aria-current', b.dataset.view === v)); render(); window.scrollTo(0, 0); }
function srcBadge(){ const r = state.results, el = $('#srcBadge'); el.className = 'src' + (r.mode === 'demo' ? ' demo' : ''); el.innerHTML = `<i class="dot"></i>${r.mode === 'demo' ? 'DEMO results, not simulation output' : r.mode === 'import' ? 'Results: ' + esc(r.name) : 'No results yet'}`; }

function render(){
  srcBadge();
  const m = $('#main');
  if (state.view === 'overview') m.innerHTML = viewOverview();
  if (state.view === 'behavior') m.innerHTML = viewBehavior();
  if (state.view === 'tree') { m.innerHTML = viewTreeShell(); G.treeMode === 'fi' ? drawFiTree() : drawTree(); }
  if (state.view === 'generate') m.innerHTML = viewGenerate();
  if (state.view === 'sotif') m.innerHTML = viewSotif();
  if (state.view === 'odd') m.innerHTML = viewOdd();
  if (state.view === 'data') m.innerHTML = viewData();
  renderDrawer();
}

function viewOverview(){
  const all = DATA.behaviors.flatMap(b => linksOf(b.code)), t = sumTot(all), w = worstFailRisk(all);
  const gen = DATA.scenarios.filter(s => s.generable).length, nl = DATA.scenarios.reduce((n, s) => n + Object.keys(s.links).length, 0);
  let h = `<section class="hero"><div class="card main">
      <div class="chain"><b>Behavior</b><i>→</i><b>Scenario + HIRE risk</b><i>→</i><b>Pass/fail criteria</b><i>→</i><b>ODD variants</b><i>→</i><b>Concrete tests</b></div>
      <div class="bignum"><b>${rate(t)}</b><span class="muted">of executed tests pass · ${fmt(t.pass)} pass · ${fmt(t.fail)} fail · ${fmt(t.not_run)} not run</span></div>
      ${sbar(t, true)}${legend()}
      <p class="note" style="margin:0">${state.results.mode === 'demo' ? 'Results are DEMO values computed from the candidate oracle so the dashboards can be read today. Import TorSim results in Data to replace them.' : ''}</p></div>
    <div class="kpis">
      <div class="card kpi"><b>${DATA.behaviors.length}</b><span>behaviors (Behavior Table)</span></div>
      <div class="card kpi"><b>${DATA.scenarios.length}</b><span>scenarios · ${gen} generable · ${nl} behavior links</span></div>
      <div class="card kpi"><b>${fmt(t.valid)}</b><span>concrete tests generated</span></div>
      <div class="card kpi excl"><b>${fmt(t.rej)}</b><span>combinations excluded as absurd</span></div>
      <div class="card kpi defer"><b>${fmt(t.deferred)}</b><span>deferred: rain, glare (perception, milestone 2)</span></div>
      <div class="card kpi fail"><b>${fmt(w.s3)}</b><span>failures whose HIRE severity is S3 ${w.risk ? riskBadge(w.risk) : ''}</span></div>
    </div></section>`;
  for (const uc of ['Highway', 'Urban', 'Hub']) {
    h += `<div class="uc-title"><span class="eyebrow">${uc}</span></div><div class="grid">`;
    for (const b of DATA.behaviors.filter(x => x.use_case === uc)) {
      const L = linksOf(b.code), bt = sumTot(L), wr = worstFailRisk(L), ng = L.filter(x => !x.s.generable).length;
      h += `<button type="button" class="card bcard${bt.valid ? '' : ' ng'}" data-beh="${b.code}"><div class="top"><div><span class="chip code">${b.code}</span><h3 style="margin-top:6px">${esc(b.name)}</h3></div><div class="rate">${rate(bt)}</div></div>
        ${sbar(bt)}<div class="stats"><span>${L.length} scenarios${ng ? ` (${ng} milestone 2)` : ''}</span><span>${fmt(bt.valid)} tests</span><span>${bt.fail ? `<b style="color:var(--fail)">${fmt(bt.fail)} fail</b>` : '0 fail'}</span></div>
        <div class="stats"><span>Worst failure risk ${riskBadge(wr.risk)}</span><span>${b.jama ? esc(b.jama.id) : 'no Jama definition exported'}</span></div></button>`;
    }
    h += `</div>`;
  }
  return h;
}

function behaviorSelect(id){ return `<select id="${id}" aria-label="Behavior">${['Highway', 'Urban', 'Hub'].map(uc => `<optgroup label="${uc}">${DATA.behaviors.filter(b => b.use_case === uc).map(b => `<option value="${b.code}" ${b.code === state.beh ? 'selected' : ''}>${b.code} · ${esc(b.name)}</option>`).join('')}</optgroup>`).join('')}</select>`; }
function oddCoverage(L){
  const vs = DATA.odd.variants; let cov = 0, tot = 0, n = 0, m = 0;
  for (const v of vs) { const app = L.some(x => x.st && x.st.variants[v.id]); if (!app) continue; m++; const e = v.exposure || 0; tot += e; if (L.some(x => x.st?.variants[v.id]?.pass > 0)) { cov += e; n++; } }
  return {n, m, exp: tot ? 100 * cov / tot : 0};
}
function viewBehavior(){
  const b = BEH[state.beh], L = linksOf(b.code), t = sumTot(L), oc = oddCoverage(L);
  const fams = [...new Set(L.map(x => x.s.family))];
  let rows = L.filter(x => (state.fam === 'all' || x.s.family === state.fam) && (!state.search || (x.s.id + ' ' + x.s.title).toLowerCase().includes(state.search.toLowerCase())) && (state.only === 'all' || (state.only === 'fail' ? x.st?.tot.fail > 0 : state.only === 'm2' ? !x.s.generable : true)));
  rows.sort((a, c) => (c.st?.tot.fail || 0) - (a.st?.tot.fail || 0) || sevRank(worstLinkRisk(c.link)) - sevRank(worstLinkRisk(a.link)));
  const fails = {}; for (const x of L) if (x.st) for (const [c, k] of Object.entries(x.st.fails)) fails[c] = (fails[c] || 0) + k;
  const fmax = Math.max(1, ...Object.values(fails));
  const byVar = {}; for (const x of L) if (x.st) for (const [vid, s] of Object.entries(x.st.variants)) { const o = byVar[vid] ??= {pass: 0, fail: 0, not_run: 0, deferred: 0, valid: 0}; for (const k in o) o[k] += s[k] || 0; }
  const rules = {}; for (const x of L) if (x.st) for (const [r, k] of Object.entries(x.st.rules)) rules[r] = (rules[r] || 0) + k;
  let h = `<div class="bhead">${behaviorSelect('behSel')}<span class="chip">${b.use_case}</span><span class="chip">Intent: ${esc(INTENT[b.intent] || b.intent)}</span>${b.jama ? `<span class="chip code">${esc(b.jama.id)}</span>` : ''}<button class="btn small" type="button" data-goto="tree">View as tree</button></div>
    <h2 style="font-size:24px;font-weight:800;margin-top:10px">${esc(b.name)}</h2>
    ${b.jama ? `<details class="def"><summary>Jama definition</summary><pre>${esc(b.jama.text)}</pre></details>` : ''}
    <div class="kpis section">
      <div class="card kpi"><b>${L.length}</b><span>scenarios linked</span></div>
      <div class="card kpi"><b>${fmt(t.valid)}</b><span>concrete tests</span></div>
      <div class="card kpi pass"><b>${rate(t)}</b><span>pass rate (executed)</span></div>
      <div class="card kpi fail"><b>${fmt(t.fail)}</b><span>failed tests</span></div>
      <div class="card kpi excl"><b>${fmt(t.rej)}</b><span>excluded as absurd</span></div>
      <div class="card kpi defer"><b>${fmt(t.deferred)}</b><span>deferred (perception)</span></div>
      <div class="card kpi"><b>${oc.n}/${oc.m}</b><span>ODD variants with a pass · ${oc.exp.toFixed(1)}% exposure</span></div>
    </div>
    <div class="cols section"><div style="min-width:0">
      <div class="section-head"><h2>Scenarios</h2><span class="hint">Sorted by failures, then HIRE risk. Click a row to open the scenario.</span></div>
      <div class="filters"><input id="search" type="search" placeholder="Search scenario" value="${esc(state.search)}" aria-label="Search scenario">
        <select id="famSel" aria-label="Family"><option value="all">All families</option>${fams.map(f => `<option value="${f}" ${f === state.fam ? 'selected' : ''}>${esc(f)} · ${esc(DATA.families[f]?.name || '')}</option>`).join('')}</select>
        <div class="seg" role="group" aria-label="Filter"><button type="button" data-only="all" aria-pressed="${state.only === 'all'}">All</button><button type="button" data-only="fail" aria-pressed="${state.only === 'fail'}">With failures</button><button type="button" data-only="m2" aria-pressed="${state.only === 'm2'}">Milestone 2</button></div></div>
      <div class="tablewrap"><table><thead><tr><th>Scenario</th><th>HIRE risk</th><th>Criteria</th><th class="num">Tests</th><th style="min-width:150px">Results</th><th class="num">Fail</th><th class="num">Excl.</th></tr></thead><tbody>
      ${rows.map(x => { const st = x.st, lv = LEVEL[x.link.level]; return `<tr class="click" data-scn="${x.s.id}"><td><div class="stitle">${esc(x.s.title)}</div><div class="sid">${x.s.id} · ${esc(DATA.families[x.s.family]?.name || x.s.family)}${x.link.added_from_hire ? ' · added from HIRE' : ''}</div></td>
        <td>${riskBadge(worstLinkRisk(x.link))}<div style="margin-top:4px"><span class="chip ${lv[0]}">${lv[1]}</span></div></td><td class="num">${x.link.criteria.length}</td>
        <td class="num">${st ? fmt(st.tot.valid) : '<span class="chip nr">milestone 2</span>'}</td><td>${st ? sbar(st.tot) + `<div class="note" style="margin-top:3px">${rate(st.tot)} pass</div>` : ''}</td>
        <td class="num">${st && st.tot.fail ? `<b style="color:var(--fail)">${fmt(st.tot.fail)}</b>` : st ? '0' : ''}</td><td class="num">${st ? fmt(st.tot.rej) : ''}</td></tr>`; }).join('') || `<tr><td colspan="7" class="empty">No scenario matches these filters.</td></tr>`}
      </tbody></table></div></div>
      <aside class="side">
        <div class="card panel"><h3>Failures by criterion</h3>${Object.keys(fails).length ? `<div class="hbars">${Object.entries(fails).sort((a, c) => c[1] - a[1]).map(([c, k]) => { const cr = CRIT[c]; const r = L.map(x => riskOf(x.link, c, HIRE)).filter(Boolean).sort((a, d) => sevRank(d) - sevRank(a))[0]; return `<div class="hbar"><span><b class="mono">${c}</b> ${esc(cr ? cr.name : 'Unspecified')} ${riskBadge(r)}</span><span class="num">${fmt(k)}</span><div class="track"><i style="width:${pct(k, fmax)}%"></i></div></div>`; }).join('')}</div>` : '<p class="note">No failure.</p>'}</div>
        <div class="card panel"><h3>Results by ODD variant</h3><div class="hbars">${DATA.odd.variants.filter(v => byVar[v.id]).map(v => { const o = byVar[v.id]; return `<div class="hbar"><span>${esc(v.name)} <span class="muted">${v.exposure != null ? v.exposure + '%' : ''}</span></span><span class="num">${o.deferred ? `<span class="chip df">deferred</span>` : rate(o)}</span><div class="track" style="background:var(--line-2)">${o.deferred ? `<i style="width:100%;background:var(--defer)"></i>` : `<i style="width:${pct(o.pass, o.pass + o.fail + o.not_run)}%;background:var(--pass)"></i>`}</div></div>`; }).join('')}</div><p class="note" style="margin:10px 0 0">Exposure: share of I-35 South miles or hours where the condition holds (L1–L5 ODD report).</p></div>
        <div class="card panel"><h3>Why combinations were excluded</h3>${Object.keys(rules).length ? `<div class="hbars">${Object.entries(rules).sort((a, c) => c[1] - a[1]).map(([r, k]) => `<div class="hbar"><span><b class="mono">${r}</b> ${esc(RULES.find(x => x.id === r)?.label || '')}</span><span class="num">${fmt(k)}</span></div>`).join('')}</div>` : '<p class="note">Nothing excluded.</p>'}</div>
      </aside></div>`;
  return h;
}

/* ---------- drawer ---------- */
function openScn(id, tab){ state.scn = id; state.tab = tab || 'summary'; state.tvar = 'V00'; state.tstatus = 'all'; state.sel = null; state.shown = 40; renderDrawer(); }
function closeScn(){ state.scn = null; renderDrawer(); }
const genCache = new Map();
function genFor(s, b, link, vid){ const key = `${s.id}@${b.code}#${vid}`; if (!genCache.has(key)) { if (genCache.size > 40) genCache.clear(); genCache.set(key, runVariant(s, b, link, VAR[vid])); } return genCache.get(key); }
function resultOf(c, link, vid){ const R = state.results; if (R.mode === 'demo') return demoResult(c, link, vid); if (R.mode === 'import') return R.map.get(c.id) || {status: 'not_run'}; return {status: 'not_run'}; }
function renderDrawer(){
  const root = $('#drawerRoot');
  if (!state.scn) { root.innerHTML = ''; document.body.style.overflow = ''; return; }
  document.body.style.overflow = 'hidden';
  const s = SCN[state.scn], b = BEH[state.beh] && s.links[state.beh] ? BEH[state.beh] : BEH[Object.keys(s.links)[0]], link = s.links[b.code], st = state.stats[`${s.id}@${b.code}`];
  const tabs = [['summary', 'Summary'], ['hire', `HIRE & risk (${link.rows.length})`], ['criteria', `Pass/fail criteria (${link.criteria.length})`], ['odd', 'ODD variants'], ['fitc', `FI & TC (${(s.tcs || []).length})`], ['tests', `Tests${st ? ' (' + fmt(st.tot.valid) + ')' : ''}`]];
  let body = '';
  if (state.tab === 'summary') {
    let fig = `<div class="empty">${esc(s.gen_note || 'Not generable yet.')}</div>`;
    if (s.generable) { const g = genFor(s, b, link, 'V00'); const v = g.r.variants[0]; if (v) fig = `<figure class="fig" style="margin:0">${sceneSVG(v.parameters, g.cfg, 'Scene ' + s.id)}<figcaption>Representative concrete ${esc(v.id)}, nominal ODD, positions at t = 0 to scale.</figcaption></figure>`; }
    body = `<div class="scene-grid">${fig}<dl class="facts">
      <dt>Description</dt><dd>${esc(s.desc)}</dd>
      <dt>Behavior</dt><dd><span class="chip code">${b.code}</span> ${esc(b.name)} · SDT intent: <b>${esc(INTENT[link.intent] || link.intent)}</b></dd>
      <dt>Also serves</dt><dd>${Object.keys(s.links).filter(c => c !== b.code).map(c => `<button class="chip code" type="button" data-switch="${c}">${c}</button>`).join(' ') || '<span class="muted">only this behavior</span>'}</dd>
      <dt>Family</dt><dd>${esc(DATA.families[s.family]?.name || s.family)}</dd>
      ${s.generable ? `<dt>Actors</dt><dd>${cfgActors(s.configuration)}</dd><dt>Road</dt><dd>${esc((s.configuration.road.types || []).join(', '))} · ${s.configuration.road.laneCounts.join(' or ')} lanes · start ${s.configuration.road.egoStartLanes.join(' or ')} · SDT ${s.configuration.ego.speedMps.join(', ')} m/s</dd>` : ''}
      <dt>HIRE risk</dt><dd>${riskBadge(worstLinkRisk(link))} <span class="chip ${LEVEL[link.level][0]}">${LEVEL[link.level][1]}</span> ${link.hfs.map(h => `<span class="chip code">${h}</span>`).join(' ')}</dd>
      <dt>Results</dt><dd>${st ? sbar(st.tot) + `<div class="note" style="margin-top:4px">${fmt(st.tot.pass)} pass · ${fmt(st.tot.fail)} fail · ${fmt(st.tot.not_run)} not run · ${fmt(st.tot.rej)} excluded · ${fmt(st.tot.deferred)} deferred</div>` : '<span class="muted">not generated</span>'}</dd>
      <dt>Jama</dt><dd>${s.jama.map(j => `<span class="chip code" title="${esc(DATA.jama[j]?.name || '')}">${esc(j)}</span>`).join(' ') || '—'}</dd>
      <dt>NHTSA pre-crash</dt><dd>${s.nhtsa.map(n => `<span class="chip">#${n} ${esc(DATA.nhtsa[n] || '')}</span>`).join(' ') || '—'}</dd>
      <dt>Foretellix SAFE</dt><dd>${s.foretellix.map(f => `<span class="chip ${f.level === 'couvert' ? 'ok' : 'ex'}">§${esc(f.ref)} ${esc(DATA.foretellix[f.ref]?.title || '')} · ${f.level === 'couvert' ? 'covered' : 'partial'}</span>`).join(' ') || '—'}</dd>
      <dt>Triggering conditions</dt><dd>${s.tcs.map(t => `<span class="chip code">${esc(t)}</span>`).join(' ') || '—'}</dd></dl></div>`;
  }
  if (state.tab === 'hire') {
    body = `<p class="note" style="margin-top:0">HIRE v2 rows of ${b.code} that justify this scenario (${esc(link.level)}). The risk shown for a criterion is the worst HIRE row of the hazard that criterion protects.</p>
      <div class="section-head"><h2>Worst rating per hazard</h2></div><div class="tablewrap"><table><thead><tr><th>Hazard</th><th>Torc ID</th><th>Risk</th><th>Worst HIRE row</th><th>Hazardous event</th></tr></thead><tbody>
      ${Object.entries(link.by_hazard).map(([h, id]) => { const r = HIRE[id]; return `<tr><td><b>${h}</b> ${esc(HZ[h].name)}</td><td class="mono">${esc(HZ[h].torc || 'to map')}</td><td>${riskBadge({...r, id})}${r.mrm ? ' <span class="chip df">MRM</span>' : ''}</td><td class="mono">${esc(id)}</td><td class="muted">${esc(r.ev)}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="section-head section"><h2>Rows justifying the link</h2><span class="hint">${link.rows.length} rows</span></div><div class="tablewrap"><table><thead><tr><th>HIRE v2 ID</th><th>ODD condition</th><th>Command</th><th>Malfunction</th><th>Hazard</th><th>Risk</th></tr></thead><tbody>
      ${link.rows.slice(0, 80).map(id => { const r = HIRE[id]; return r ? `<tr><td class="mono">${esc(id)}</td><td class="muted">${esc(r.odd)}</td><td>${esc(r.man)}</td><td>${esc(r.mal)}</td><td>${r.hz}</td><td>${riskBadge({...r, id})}</td></tr>` : ''; }).join('')}</tbody></table></div>`;
  }
  if (state.tab === 'criteria') {
    body = `<p class="note" style="margin-top:0">Criteria come from Jama requirements selected by the SDT intent and the scene. Thresholds marked open points need Torc confirmation.</p>
      <div class="tablewrap"><table><thead><tr><th>Criterion</th><th>Requirement</th><th>Metric · threshold</th><th>Protects</th><th>Risk if it fails</th><th class="num">Failures</th></tr></thead><tbody>
      ${link.criteria.map(c => { const cr = CRIT[c], r = riskOf(link, c, HIRE); return `<tr><td><b class="mono">${c}</b> <b>${esc(cr.name)}</b></td><td><span class="chip code" title="${esc(cr.req_text)}">${esc(cr.req)}</span>${DATA.jama[cr.req] ? `<div class="note">${esc(DATA.jama[cr.req].name)}</div>` : ''}</td><td>${esc(cr.metric)}<div><b>${esc(cr.threshold)}</b></div></td><td>${cr.hazards.map(h => `<span class="chip" title="${esc(HZ[h].name)}">${h}</span>`).join(' ')}</td><td>${riskBadge(r)}${r && !r.direct ? '<div class="note">no HIRE row for this hazard, link worst used</div>' : ''}</td><td class="num">${st && st.fails[c] ? `<b style="color:var(--fail)">${fmt(st.fails[c])}</b>` : '0'}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  if (state.tab === 'odd') {
    const app = s.generable ? variantsFor(s, DATA.odd).map(v => v.id) : [];
    body = `<p class="note" style="margin-top:0">One ODD condition is changed at a time from the nominal case (one factor at a time). Exposure is the share of I-35 South miles or hours where the condition holds. Rain and glare are deferred while perception is assumed perfect.</p>
      <div class="tablewrap"><table><thead><tr><th>ODD variant</th><th>ODD element</th><th class="num">Exposure</th><th>Status</th><th class="num">Combinations</th><th class="num">Tests</th><th>Excluded by</th><th style="min-width:130px">Results</th></tr></thead><tbody>
      ${DATA.odd.variants.map(v => { const x = st?.variants[v.id]; const on = app.includes(v.id); return `<tr><td><b>${esc(v.name)}</b><div class="note">${esc(v.desc)}</div></td><td class="muted">${esc(v.odd)}</td><td class="num">${v.exposure != null ? v.exposure + '%' : 'n/a'}</td>
        <td>${!on ? `<span class="chip nr">${s.generable ? 'varied by the scenario itself' : 'milestone 2'}</span>` : x?.deferred ? '<span class="chip df">deferred</span>' : '<span class="chip ok">simulated</span>'}</td>
        <td class="num">${x ? fmt(x.pot ?? x.deferred) : ''}</td><td class="num">${x && !x.deferred ? fmt(x.valid) : ''}</td><td>${x && x.rules ? Object.entries(x.rules).map(([r, k]) => `<span class="chip ex">${r} ${k}</span>`).join(' ') : ''}</td><td>${x && !x.deferred ? sbar(x) : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  }
  if (state.tab === 'tests') body = testsTab(s, b, link, st);
  if (state.tab === 'fitc') body = fiTcTab(s);
  $('#drawerRoot').innerHTML = `<div class="scrim" data-close="1"></div><aside class="drawer" role="dialog" aria-label="Scenario ${esc(s.id)}"><div class="dhead"><div class="row"><div><div class="sid">${s.id} · ${b.code} · ${esc(DATA.families[s.family]?.name || '')}</div><h2>${esc(s.title)}</h2></div><button class="btn small x" type="button" data-close="1">Close</button></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button type="button" role="tab" data-tab="${k}" aria-selected="${state.tab === k}">${l}</button>`).join('')}</div></div><div class="dbody">${body}</div></aside>`;
}
function testsTab(s, b, link, st){
  if (!s.generable) return `<div class="empty">${esc(s.gen_note)}</div>`;
  const app = variantsFor(s, DATA.odd).filter(v => v.sim);
  if (!app.find(v => v.id === state.tvar)) state.tvar = 'V00';
  const v = VAR[state.tvar], g = genFor(s, b, link, v.id);
  let rows = state.tstatus === 'excluded' ? g.r.rejected.map(x => ({x, res: {status: 'excluded'}})) : g.r.variants.map(x => ({x, res: resultOf(x, link, v.id)})).filter(o => state.tstatus === 'all' || o.res.status === state.tstatus);
  const counts = {all: g.r.variants.length, pass: 0, fail: 0, not_run: 0, excluded: g.r.rejected.length}; for (const x of g.r.variants) counts[resultOf(x, link, v.id).status]++;
  const sel = rows.find(o => o.x.id === state.sel) || rows[0];
  let h = `<div class="filters"><label class="eyebrow" for="tvar">ODD variant</label><select id="tvar">${app.map(x => `<option value="${x.id}" ${x.id === v.id ? 'selected' : ''}>${esc(x.name)}${x.exposure != null ? ` · ${x.exposure}%` : ''}</option>`).join('')}</select>
    <div class="seg" role="group" aria-label="Status">${[['all', 'All'], ['pass', 'Pass'], ['fail', 'Fail'], ['not_run', 'Not run'], ['excluded', 'Excluded']].map(([k, l]) => `<button type="button" data-tstatus="${k}" aria-pressed="${state.tstatus === k}">${l} ${fmt(counts[k])}</button>`).join('')}</div></div>
    <div class="tablewrap"><table><thead><tr><th>Concrete</th><th>${state.tstatus === 'excluded' ? 'Rule and reason' : 'Result'}</th><th>Expected (candidate oracle)</th><th>Road · SDT</th><th>Actors</th></tr></thead><tbody>
    ${rows.slice(0, state.shown).map(({x, res}) => { const p = x.parameters; return `<tr class="click ${sel && sel.x.id === x.id ? 'sel' : ''}" data-con="${x.id}"><td class="mono">${x.id}</td>
      <td>${res.status === 'excluded' ? x.ruleIds.map(r => `<span class="chip ex">${r}</span>`).join(' ') + `<div class="note">${esc(x.reasons.join(' '))}</div>` : res.status === 'pass' ? '<span class="chip ok">pass</span>' : res.status === 'fail' ? `<span class="chip ko">fail</span> <span class="mono">${esc(res.criterion || '')}</span> ${riskBadge(riskOf(link, res.criterion, HIRE))}` : '<span class="chip nr">not run</span>'}</td>
      <td>${x.expected ? `${esc(x.expected.txt)}<div class="note">${esc(x.expected.why)}</div>` : ''}</td><td class="mono">${esc(roadLine(p))} · ${p.ego.speedMps} m/s</td><td style="font-size:12.5px">${Object.entries(p.actors).filter(([, a]) => a.present).map(([k, a]) => esc(actorLine(k, a))).join('<br>') || '<span class="muted">none</span>'}</td></tr>`; }).join('') || '<tr><td colspan="5" class="empty">Nothing in this view.</td></tr>'}</tbody></table></div>
    ${rows.length > state.shown ? `<div style="margin-top:8px"><button class="btn small" type="button" id="more">Show 60 more (${fmt(state.shown)} / ${fmt(rows.length)})</button></div>` : ''}`;
  if (sel) h += `<div class="con-grid"><figure class="fig" style="margin:0">${sceneSVG(sel.x.parameters, g.cfg, 'Scene ' + sel.x.id)}<figcaption>${esc(sel.x.id)} at t = 0</figcaption></figure>${sel.res.status === 'excluded' ? `<div class="card panel"><b>Excluded by ${esc(sel.x.ruleIds.join(', '))}</b><p>${esc(sel.x.reasons.join(' '))}</p><p class="note">No OpenSCENARIO file is produced for an excluded combination.</p></div>` : `<pre class="code">${esc(oscText(sel.x, s, b, link, g.cfg, v, sel.res))}</pre>`}</div>`;
  return h;
}

/* ---------- tree (flowchart) ---------- */
function viewTreeShell(){
  const mode = `<div class="seg" role="group" aria-label="Start from"><button type="button" data-tree-mode="behavior" aria-pressed="${G.treeMode === 'behavior'}">From a behavior</button><button type="button" data-tree-mode="fi" aria-pressed="${G.treeMode === 'fi'}">From an FI</button></div>`;
  if (G.treeMode === 'fi') return `<div class="tree-tools">${mode}<select id="fiSel" aria-label="Functional insufficiency">${Object.values(DATA.sotif.fis).map(f => `<option value="${f.id}" ${f.id === G.treeFi ? 'selected' : ''}>${f.id} · ${esc(f.name.slice(0, 70))}</option>`).join('')}</select>${legend()}</div>
    <p class="note">FI → triggering conditions → scenarios → test results. Click a scenario to open it. A red TC has no scenario yet.</p><div class="tree-wrap" id="treeWrap"></div>`;
  return `<div class="tree-tools">${mode}${behaviorSelect('treeSel')}<button class="btn small" type="button" id="expAll">Expand all</button><button class="btn small" type="button" id="colAll">Collapse</button>${legend()}</div>
    <p class="note">Behavior → scenarios → ODD variants → test results. Click a scenario to show its variants, click ↗ to open it.</p><div class="tree-wrap" id="treeWrap"></div>`;
}
function drawTree(){
  const b = BEH[state.beh], L = linksOf(b.code).sort((a, c) => (c.st?.tot.fail || 0) - (a.st?.tot.fail || 0));
  const NW = 270, NH = 50, GAP = 12, X = [20, 340, 660], leaves = [];
  const nodes = [], links = [];
  let y = 20;
  const root = {x: X[0], label: `${b.code} · ${b.name}`, sub: `${L.length} scenarios · ${fmt(sumTot(L).valid)} tests · ${rate(sumTot(L))} pass`, t: sumTot(L), kind: 'beh'};
  for (const x of L) {
    const sn = {x: X[1], label: `${x.s.id} · ${x.s.title}`, sub: x.st ? `${fmt(x.st.tot.valid)} tests · ${rate(x.st.tot)} pass · ${x.link.criteria.length} criteria` : 'milestone 2', t: x.st?.tot, kind: 'scn', id: x.s.id, risk: worstLinkRisk(x.link), exp: state.expanded.has(x.s.id), has: !!x.st};
    if (sn.exp && x.st) {
      const kids = [];
      for (const [vid, s] of Object.entries(x.st.variants)) { const v = VAR[vid]; const n = {x: X[2], y, label: v.name + (v.exposure != null ? ` · ${v.exposure}%` : ''), sub: s.deferred ? `${fmt(s.deferred)} deferred (perception)` : `${fmt(s.valid)} tests · ${fmt(s.fail)} fail · ${fmt(s.rej)} excluded`, t: s.deferred ? null : s, kind: 'var', deferred: !!s.deferred}; nodes.push(n); kids.push(n); y += NH + GAP; }
      sn.y = (kids[0].y + kids[kids.length - 1].y) / 2; kids.forEach(k => links.push([sn, k]));
    } else { sn.y = y; y += NH + GAP; }
    nodes.push(sn); links.push([root, sn]);
  }
  root.y = L.length ? (nodes.filter(n => n.kind === 'scn')[0].y + nodes.filter(n => n.kind === 'scn').at(-1).y) / 2 : 20; nodes.push(root);
  const H = Math.max(y + 10, 120), W = X[2] + NW + 20;
  const color = n => n.deferred ? 'var(--defer)' : !n.t || !(n.t.pass + n.t.fail) ? 'var(--notrun)' : n.t.fail ? (n.t.fail / (n.t.pass + n.t.fail) > 0.1 ? 'var(--fail)' : 'var(--amber)') : 'var(--pass)';
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tree of ${esc(b.code)}">`;
  for (const [a, c] of links) { const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = c.x, y2 = c.y + NH / 2, mx = (x1 + x2) / 2; s += `<path class="tlink" d="M${x1} ${y1} C${mx} ${y1},${mx} ${y2},${x2} ${y2}"/>`; }
  const clip = (t, n) => t.length > n ? t.slice(0, n - 1) + '…' : t;
  for (const n of nodes) {
    const tot = n.t ? n.t.pass + n.t.fail + n.t.not_run : 0;
    s += `<g class="tnode" ${n.kind === 'scn' ? `data-tnode="${n.id}"` : n.kind === 'beh' ? 'data-goto="behavior"' : ''} transform="translate(${n.x},${n.y})"><rect class="box" width="${NW}" height="${NH}" rx="8"/><rect width="5" height="${NH}" rx="2" fill="${color(n)}"/>
      <text class="t1" x="14" y="19">${esc(clip(n.label, n.kind === "scn" ? 33 : 38))}</text><text class="t2" x="14" y="36">${esc(clip(n.sub, 46))}</text>`;
    if (tot) { const w = NW - 28; let x0 = 14; for (const [k, c] of [['pass', 'var(--pass)'], ['fail', 'var(--fail)'], ['not_run', 'var(--notrun)']]) { const ww = w * (n.t[k] || 0) / tot; s += `<rect x="${x0}" y="${NH - 7}" width="${ww}" height="3" fill="${c}"/>`; x0 += ww; } }
    if (n.kind === 'scn') s += `<text x="${NW - 14}" y="19" text-anchor="end" font-size="13" fill="var(--accent)" data-open="${n.id}" style="cursor:pointer">↗</text>${n.has ? `<text x="${NW - 30}" y="19" text-anchor="end" font-size="12" fill="var(--muted)">${n.exp ? '−' : '+'}</text>` : ''}${n.risk ? `<text x="${NW - 14}" y="36" text-anchor="end" font-family="var(--f-mono)" font-size="10.5" font-weight="600" fill="${/3/.test(n.risk.S) ? 'var(--s3)' : 'var(--muted)'}">${esc(n.risk.S + n.risk.E + n.risk.C)}</text>` : ''}`;
    s += `</g>`;
  }
  $('#treeWrap').innerHTML = s + '</svg>';
}

/* ---------- ODD ---------- */
function viewOdd(){
  const vs = DATA.odd.variants, all = DATA.behaviors.map(b => [b, linksOf(b.code)]);
  const vt = {}; for (const [, L] of all) for (const x of L) if (x.st) for (const [vid, s] of Object.entries(x.st.variants)) { const o = vt[vid] ??= {pass: 0, fail: 0, not_run: 0, valid: 0, deferred: 0, rej: 0}; for (const k in o) o[k] += s[k] || 0; }
  const heat = (o) => { if (!o) return '<td class="muted">—</td>'; if (o.deferred) return `<td style="background:var(--defer-soft);color:var(--defer)">deferred</td>`; const run = o.pass + o.fail; if (!run) return '<td class="muted">not run</td>'; const r = o.pass / run; const bg = r >= 0.97 ? 'var(--pass-soft)' : r >= 0.9 ? 'var(--excl-soft)' : 'var(--fail-soft)'; return `<td style="background:${bg}">${(100 * r).toFixed(0)}%</td>`; };
  let h = `<div class="section-head section"><h2>ODD variants used for generation</h2><span class="hint">I-35 South (${DATA.odd.routes.join(', ')}), L1–L5 ODD report. One condition changes at a time.</span></div>
    <div class="tablewrap"><table><thead><tr><th>Variant</th><th>ODD element</th><th class="num">Exposure on I-35</th><th>Status</th><th class="num">Tests</th><th class="num">Excluded</th><th class="num">Pass rate</th></tr></thead><tbody>
    ${vs.map(v => { const o = vt[v.id]; return `<tr><td><b>${esc(v.name)}</b><div class="note">${esc(v.desc)}</div></td><td class="muted">${esc(v.odd)}</td><td class="num">${v.exposure != null ? v.exposure + '%' : 'n/a'}</td><td>${v.sim ? '<span class="chip ok">simulated</span>' : '<span class="chip df">deferred, perception</span>'}</td><td class="num">${o ? fmt(o.valid || o.deferred) : '—'}</td><td class="num">${o ? fmt(o.rej) : '—'}</td><td class="num">${o && !o.deferred ? rate(o) : '—'}</td></tr>`; }).join('')}</tbody></table></div>
    <div class="section-head section"><h2>Behavior × ODD variant</h2><span class="hint">Pass rate of executed tests. Green ≥ 97 %, amber ≥ 90 %, red below.</span></div>
    <div class="tablewrap"><table class="heat"><thead><tr><th>Behavior</th>${vs.map(v => `<th title="${esc(v.name)}">${v.id}</th>`).join('')}</tr></thead><tbody>
    ${all.map(([b, L]) => { const by = {}; for (const x of L) if (x.st) for (const [vid, s] of Object.entries(x.st.variants)) { const o = by[vid] ??= {pass: 0, fail: 0, not_run: 0, deferred: 0}; for (const k in o) o[k] += s[k] || 0; } return `<tr><td><span class="chip code">${b.code}</span></td>${vs.map(v => heat(by[v.id])).join('')}</tr>`; }).join('')}</tbody></table></div>
    <p class="note">${vs.map(v => `${v.id} ${esc(v.name)}`).join(' · ')}</p>
    <div class="section-head section"><h2>ODD elements</h2><span class="hint">Specification vs observed on the route. The Abstract Scenario Manager keeps the full Jama taxonomy (L0–L6) and the scenario links; this page brings the measured exposure.</span></div>
    <div class="odd-grid">${DATA.odd.elements.filter(e => e.spec || e.bins.some(x => !/^(unknown|n\/a|none)$/i.test(x.label)) && e.bins.length > 1).map(e => { const mx = Math.max(...e.bins.map(x => x.pct), 1); return `<div class="card oel"><div class="row" style="display:flex;justify-content:space-between;gap:8px"><h4>${esc(e.name)}</h4><span class="chip code">${esc(e.layer)}</span></div><div class="note">${esc(e.path)}${e.jama ? ' · ' + esc(e.jama) : ''}</div>
      <div style="font-size:12.5px">${e.spec ? `Spec <b>${esc(e.spec.min)} to ${esc(e.spec.max)} ${esc(e.spec.unit || '')}</b>` : ''}${e.observed ? ` · observed ${esc(e.observed.min)} to ${esc(e.observed.max)} ${esc(e.observed.unit || '')}` : ''}</div>
      ${e.bins.length ? `<div class="dist" role="img" aria-label="Distribution of ${esc(e.name)}">${e.bins.map(x => `<i title="${esc(x.label)}: ${x.pct}%" style="height:${Math.max(2, 100 * x.pct / mx)}%"></i>`).join('')}</div><div class="note">${esc(e.bins[0].label)} … ${esc(e.bins.at(-1).label)} · ${esc(e.metric || '')} · ${esc(e.source || '')}</div>` : `<div class="note">${esc(e.source || '')}</div>`}</div>`; }).join('')}</div>`;
  return h;
}

/* ---------- data ---------- */
function viewData(){
  const r = state.results;
  return `<div class="section-head section"><h2>Test results</h2><span class="hint">Current source: <b>${r.mode === 'demo' ? 'DEMO values (candidate oracle)' : r.mode === 'import' ? esc(r.name) : 'none'}</b></span></div>
    <div class="drop" id="drop"><b>Drop a TorSim results file here</b><p class="note">CSV or JSON, one row per concrete: <span class="mono">concrete_id,status,criterion</span> · status = pass, fail or not_run · criterion = C01…C18 (optional).</p>
      <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap"><button class="btn primary" type="button" id="pick">Choose a file</button><button class="btn" type="button" id="useDemo">Use demo results</button><button class="btn" type="button" id="useNone">Clear results</button><button class="btn" type="button" id="tpl">Download a template</button></div></div>
    <div class="section-head section"><h2>Export</h2></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" type="button" id="expProj">Project (.json)</button><button class="btn" type="button" id="expCsv">Tests of ${esc(state.beh)} (.csv)</button><button class="btn" type="button" id="expOsc">OpenSCENARIO of ${esc(state.beh)} (.zip)</button></div>
    <p class="note">The project file holds behaviors, scenarios with their HIRE links and criteria, ODD variants and the result counts. Concrete tests are rebuilt from it with the same IDs.</p>
    <div class="section-head section"><h2>Data model</h2></div>
    <div class="tablewrap"><table><thead><tr><th>Object</th><th>Key fields</th><th>Relation</th></tr></thead><tbody>
      <tr><td><b>Behavior</b></td><td class="mono">code, name, use_case, intent, jama</td><td>17 behaviors, codes of the Abstract Scenario Manager</td></tr>
      <tr><td><b>Scenario</b></td><td class="mono">id, family, title, configuration (road, SDT, actors by slot), links</td><td>n:m with behaviors</td></tr>
      <tr><td><b>Link</b></td><td class="mono">intent, level, rows (HIRE v2), worst, by_hazard, criteria, risk</td><td>scenario × behavior, justified by HIRE</td></tr>
      <tr><td><b>Criterion</b></td><td class="mono">id, metric, threshold, req (Jama), hazards</td><td>a failure takes the HIRE risk of the hazard it protects</td></tr>
      <tr><td><b>ODD variant</b></td><td class="mono">id, set (road values), exposure, sim</td><td>from the I-35 L1–L5 ODD report</td></tr>
      <tr><td><b>Concrete test</b></td><td class="mono">SCN-hash, parameters, expected</td><td>scenario × behavior × variant × values; excluded ones keep rule and reason</td></tr>
      <tr><td><b>Result</b></td><td class="mono">concrete_id, status, criterion</td><td>imported from TorSim or real drives</td></tr></tbody></table></div>
    <div class="section-head section"><h2>Sources and open points</h2></div>
    <ul class="note" style="font-size:13px;line-height:1.7">${DATA.meta.sources.map(x => `<li>${esc(x)}</li>`).join('')}
      <li>Open: SDT speed cap 29.05 m/s (TORC-SYSRQ-14073) vs ODD Operating Speed Range 30.4 m/s.</li><li>Open: Torc hazard IDs known for H2 (TORC-HAZ-31) and H3 (TORC-HAZ-28) only.</li><li>Open: exact TorSim OSC format; import of the Abstract Scenario Manager catalogue (286 scenarios).</li></ul>`;
}

/* ---------- results import ---------- */
function parseResults(txt){
  const map = new Map(); const norm = s => /^(pass|passed|success|ok)$/i.test(s) ? 'pass' : /^(fail|failed|ko|error)$/i.test(s) ? 'fail' : 'not_run';
  const t = txt.trim();
  if (t.startsWith('[') || t.startsWith('{')) { let j = JSON.parse(t); if (!Array.isArray(j)) j = j.results || []; for (const r of j) if (r.concrete_id) map.set(r.concrete_id, {status: norm(String(r.status || '')), criterion: r.criterion || undefined}); return map; }
  const lines = t.split(/\r?\n/); const head = lines[0].split(/[,;\t]/).map(x => x.trim().toLowerCase()); const ci = head.indexOf('concrete_id'), si = head.indexOf('status'), ki = head.indexOf('criterion');
  if (ci < 0 || si < 0) throw new Error('columns');
  for (const l of lines.slice(1)) { const c = l.split(/[,;\t]/).map(x => x.trim()); if (c[ci]) map.set(c[ci], {status: norm(c[si] || ''), criterion: ki >= 0 && c[ki] ? c[ki] : undefined}); }
  return map;
}
async function recompute(mode, map, name){
  if (mode === 'demo') { state.results = {mode, name: 'Demo results', map: null}; state.stats = STATS_DEMO; genCache.clear(); render(); toast('Demo results restored.'); return; }
  const prog = $('#progress'); prog.hidden = false; const stats = {}; const jobs = [];
  for (const s of DATA.scenarios) if (s.generable) for (const [code, link] of Object.entries(s.links)) jobs.push([s, code, link]);
  const empty = new Map();
  for (let i = 0; i < jobs.length; i++) {
    const [s, code, link] = jobs[i];
    stats[`${s.id}@${code}`] = linkStats(s, BEH[code], link, DATA.odd, mode === 'none' ? empty : map);
    if (i % 6 === 0) { $('#progTxt').textContent = `Matching results… ${i + 1} / ${jobs.length} scenario links`; $('#progBar').style.width = `${100 * (i + 1) / jobs.length}%`; await new Promise(r => setTimeout(r, 0)); }
  }
  prog.hidden = true; state.results = {mode, name, map}; state.stats = stats; genCache.clear(); render();
  if (mode === 'import') { let m = 0; for (const st of Object.values(stats)) m += st.tot.pass + st.tot.fail; toast(`${fmt(map.size)} results read, ${fmt(m)} matched to generated tests.`); } else toast('Results cleared: every test is not run.');
}
function readFile(f){ const rd = new FileReader(); rd.onload = () => { try { const map = parseResults(rd.result); recompute('import', map, f.name); } catch (e) { toast('This file has no concrete_id and status columns. Download the template to see the format.'); } }; rd.readAsText(f); }

/* ---------- export ---------- */
let downloads = null;
(async () => { try { downloads = await window.claude?.use?.('downloads'); } catch (e) { downloads = null; } })();
async function save(filename, data){
  if (!downloads) { toast('Saving files is not available in this view.'); return; }
  try { await downloads.save({filename, data}); toast(`${filename} ready.`); } catch (e) { toast(e && e.code === 'declined' ? 'Download cancelled.' : 'The download failed.'); }
}
function projectJSON(){ return JSON.stringify({schema: 'scenario-studio/project@0.3', exported: new Date().toISOString(), results_source: state.results.mode === 'demo' ? 'DEMO' : state.results.name, behaviors: DATA.behaviors, hazards: DATA.hazards, criteria: DATA.criteria, odd_variants: DATA.odd.variants, scenarios: DATA.scenarios, stats: state.stats}, null, 1); }
function eachTest(code, fn){ for (const x of linksOf(code)) { if (!x.s.generable) continue; for (const v of variantsFor(x.s, DATA.odd).filter(v => v.sim)) { const g = runVariant(x.s, BEH[code], x.link, v); for (const c of g.r.variants) fn(x, v, g, c); } } }
function exportCsv(){ const out = ['concrete_id,behavior,scenario,odd_variant,status,criterion,expected,road,sdt_speed_mps']; eachTest(state.beh, (x, v, g, c) => { const r = resultOf(c, x.link, v.id); out.push([c.id, state.beh, x.s.id, v.id, r.status, r.criterion || '', `"${c.expected.txt}"`, `"${roadLine(c.parameters)}"`, c.parameters.ego.speedMps].join(',')); }); save(`tests_${state.beh}.csv`, out.join('\n')); }
async function exportOsc(){
  if (!window.JSZip) { toast('Zip library unavailable.'); return; }
  const zip = new JSZip(); let n = 0; const b = BEH[state.beh];
  eachTest(state.beh, (x, v, g, c) => { if (n < 20000) { zip.file(`${x.s.id}/${v.id}/${c.id}.osc`, oscText(c, x.s, b, x.link, g.cfg, v, resultOf(c, x.link, v.id))); n++; } });
  zip.file('project.json', projectJSON());
  save(`osc_${state.beh}.zip`, await zip.generateAsync({type: 'uint8array'}));
  if (n >= 20000) toast('Zip limited to the first 20,000 tests.');
}
function template(){ const rows = ['concrete_id,status,criterion']; let k = 0; eachTest(state.beh, (x, v, g, c) => { if (k++ < 20) rows.push(`${c.id},${k % 7 ? 'pass' : 'fail'},${k % 7 ? '' : x.link.criteria[1] || 'C01'}`); }); save('results_template.csv', rows.join('\n')); }

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-view],[data-beh],[data-scn],[data-close],[data-tab],[data-switch],[data-only],[data-tstatus],[data-con],[data-open],[data-tnode],[data-goto],button');
  if (!t) return;
  if (t.dataset.view) return setView(t.dataset.view);
  if (t.dataset.beh) { state.beh = t.dataset.beh; state.search = ''; state.fam = 'all'; return setView('behavior'); }
  if (t.dataset.scn) return openScn(t.dataset.scn);
  if (t.dataset.close) return closeScn();
  if (t.dataset.tab) { state.tab = t.dataset.tab; return renderDrawer(); }
  if (t.dataset.switch) { state.beh = t.dataset.switch; render(); return; }
  if (t.dataset.only) { state.only = t.dataset.only; return render(); }
  if (t.dataset.tstatus) { state.tstatus = t.dataset.tstatus; state.sel = null; state.shown = 40; return renderDrawer(); }
  if (t.dataset.con) { state.sel = t.dataset.con; const y = $('.dbody').scrollTop; renderDrawer(); $('.dbody').scrollTop = y; return; }
  if (t.dataset.open) return openScn(t.dataset.open);
  if (t.dataset.tnode) { const id = t.dataset.tnode; state.expanded.has(id) ? state.expanded.delete(id) : state.expanded.add(id); return drawTree(); }
  if (t.dataset.goto) return setView(t.dataset.goto);
  if (t.id === 'more') { state.shown += 60; const y = $('.dbody').scrollTop; renderDrawer(); $('.dbody').scrollTop = y; return; }
  if (t.id === 'expAll') { linksOf(state.beh).forEach(x => state.expanded.add(x.s.id)); return drawTree(); }
  if (t.id === 'colAll') { state.expanded.clear(); return drawTree(); }
  if (t.id === 'pick') return $('#fileIn').click();
  if (t.id === 'useDemo') return recompute('demo');
  if (t.id === 'useNone') return recompute('none', new Map(), 'none');
  if (t.id === 'tpl') return template();
  if (t.id === 'expProj') return save('scenario_studio_project.json', projectJSON());
  if (t.id === 'expCsv') return exportCsv();
  if (t.id === 'expOsc') return exportOsc();
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'behSel' || t.id === 'treeSel') { state.beh = t.value; state.search = ''; state.fam = 'all'; return render(); }
  if (t.id === 'famSel') { state.fam = t.value; return render(); }
  if (t.id === 'tvar') { state.tvar = t.value; state.sel = null; state.shown = 40; return renderDrawer(); }
  if (t.id === 'fileIn' && t.files[0]) { readFile(t.files[0]); t.value = ''; }
});
document.addEventListener('input', e => { if (e.target.id === 'search') { state.search = e.target.value; const pos = e.target.selectionStart; render(); const s = $('#search'); s.focus(); s.setSelectionRange(pos, pos); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.scn) closeScn(); });
document.addEventListener('dragover', e => { const d = e.target.closest?.('#drop'); if (d) { e.preventDefault(); d.classList.add('over'); } });
document.addEventListener('dragleave', e => { const d = e.target.closest?.('#drop'); if (d) d.classList.remove('over'); });
document.addEventListener('drop', e => { const d = e.target.closest?.('#drop'); if (d) { e.preventDefault(); d.classList.remove('over'); if (e.dataTransfer.files[0]) readFile(e.dataTransfer.files[0]); } });
