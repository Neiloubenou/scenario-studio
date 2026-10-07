/* ---------- Scenario Studio v2 UI (engine code is concatenated above) ---------- */
const DATA = JSON.parse(document.getElementById('seed').textContent);
const clone = o => JSON.parse(JSON.stringify(o));
const ORIGINAL = Object.fromEntries(DATA.abstracts.map(a => [a.id, clone(a)]));
const state = {
  beh: DATA.behaviors.find(b => b.use_case === 'Highway' && b.name.startsWith('Lane Changes')).id,
  abs: 'LC-REF-01', fam: 'all', perfectOnly: false, tab: 'scene', mode: 'work', ucFilter: 'all',
  results: {}, view: 'valid', ruleFilter: null, shown: 50, sel: null, modified: new Set(),
};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3400); };
const absOf = id => DATA.abstracts.find(a => a.id === id);
const behOf = id => DATA.behaviors.find(b => b.id === id);
const absForBeh = bid => DATA.abstracts.filter(a => (a.behaviors || []).includes(bid));
const human = n => String(n || '').replace(/^sut[._]/, '').replace(/_/g, ' ');
const mph = v => Math.round(v * 2.23694);
const curBeh = () => behOf(state.beh);
const resKey = (a, b) => `${a.id}@${b.code}`;
const titleOf = a => a.title || human(a.name);
function intentFor(a, b){ return (a.intent || {})[b.code] || b.default?.intent || 'keep_lane'; }
function cfgFor(a, b){ const c = clone(a.configuration); c.ego.intent = intentFor(a, b); if (b.default?.sides) c.ego.sides = b.default.sides; if (!c.ego.sides || !c.ego.sides.length) c.ego.sides = ['left']; return c; }
const INTENT = {keep_lane: 'Rester dans la voie', lane_change: 'Changement de voie', move_over: 'Se décaler (move-over)', stop_on_shoulder: 'Arrêt sur l\u2019accotement', stop_in_lane: 'Arrêt en voie', emergency_lateral: 'Évitement latéral d\u2019urgence'};
const SIDE = {left: 'gauche', right: 'droite'};
const START = {rightmost: 'voie de droite', middle: 'voie du milieu', leftmost: 'voie de gauche'};
const SLOT_MANEUVERS = {A: ['none', 'brake', 'accelerate', 'cut_out', 'take_exit'], B: ['none', 'brake', 'accelerate', 'cut_in', 'cut_out', 'drift', 'hug', 'take_exit'], C: ['none', 'brake', 'accelerate'], D: ['none', 'brake', 'accelerate', 'cut_in', 'drift', 'hug'], E: ['none', 'lane_change_into_target'], F: ['none', 'brake', 'lane_change_into_target'], G: ['none', 'cut_in', 'drift', 'brake', 'hug'], S: ['none'], O: ['none']};
const PRM_LABEL = {decelMps2: ['décélération', 'm/s²'], accelMps2: ['accélération', 'm/s²'], startS: ['déclenchement', 's'], lateralM: ['décalage vers le SDT', 'm']};
const fxRefs = a => (a.foretellix || []).map(r => (DATA.foretellix || {})[r.ref] ? {...r, ...(DATA.foretellix[r.ref])} : r);
const TYPE_LABEL = {vehicle: 'Véhicule', emv: 'Véhicule d’urgence', static: 'Objet / véhicule immobile'};
const ROAD_EXTRAS = {laneWidthM: ['Largeur de voie', 'm'], shoulderWidthM: ['Largeur d’accotement', 'm'], distanceToMandatoryM: ['Distance au point obligatoire', 'm'], curvature: ['Courbure', '1/m'], grade: ['Pente', '%'], speedLimitMps: ['Limite de vitesse', 'm/s'], windGustMps: ['Rafale de vent', 'm/s'], markingQuality: ['État du marquage', ''], mapMismatch: ['Écart carte / réalité', ''], degradation: ['Dégradation système', '']};
const TEXT_EXTRAS = new Set(['markingQuality', 'mapMismatch', 'degradation']);

/* ---------- Behaviors and abstract list ---------- */
function renderBehaviors(){
  $('#behTotal').textContent = `${DATA.behaviors.length} · ${DATA.abstracts.length} abstracts`;
  $('#behList').innerHTML = ['Highway', 'Urban', 'Hub'].map(uc => `<div class="uc"><span class="eyebrow">${uc}</span>${DATA.behaviors.filter(b => b.use_case === uc).map(b => { const n = absForBeh(b.id).length; return `<button class="beh" type="button" data-beh="${esc(b.id)}" aria-current="${b.id === state.beh}"><span class="nm">${esc(b.name)}<br><span class="ddt">${esc(b.code)} · ${esc(b.ddt)}${b.jama ? ' · ' + esc(b.jama.id) : ''}</span></span><span class="count ${n ? 'has' : ''}">${n}</span></button>`; }).join('')}</div>`).join('');
}
function visibleAbstracts(){ return absForBeh(state.beh).filter(a => (state.fam === 'all' || a.family === state.fam) && (!state.perfectOnly || !a.perception_dependent)); }
function renderAbstractList(){
  const b = curBeh(), all = absForBeh(state.beh), fams = [...new Set(all.map(a => a.family))];
  $('#famFilter').innerHTML = `<option value="all">Toutes les familles</option>` + fams.map(f => `<option value="${esc(f)}" ${f === state.fam ? 'selected' : ''}>${esc(f)} · ${esc((DATA.families[f] || {}).name || '')}</option>`).join('');
  const list = visibleAbstracts();
  $('#absCount').textContent = all.length ? `${list.length} / ${all.length}` : '0';
  const def = b.jama ? `<details class="jdef"><summary><span class="chip info">${esc(b.jama.id)}</span> Définition Jama du behavior</summary><pre class="jtext">${esc(b.jama.text)}</pre></details>` : `<div class="jdef muted">Pas de définition Jama dans l'export du 26/03 pour ce behavior.</div>`;
  const intent = `<div class="jdef">Intention du SDT pour ce behavior : <b>${esc(INTENT[b.default?.intent] || b.default?.intent)}</b></div>`;
  if (!all.length) { $('#absList').innerHTML = def + `<div class="empty"><strong>Aucun abstract pour « ${esc(b.name)} »</strong><span>Importez un catalogue (JSON au format de l'export) pour ce behavior.</span><button class="btn small" type="button" data-act="import">Importer un catalogue</button></div>`; return; }
  $('#absList').innerHTML = def + intent + list.map(a => { const gen = !!a.configuration, n = gen ? countPotential(cfgFor(a, b)) : 0; return `<button class="acard" type="button" data-abs="${esc(a.id)}" aria-current="${a.id === state.abs}">
    <span class="row1"><span class="id">${esc(a.id)}</span><span class="chip fam">${esc(a.family)}</span>${a.status === 'REFERENCE' ? '<span class="chip ok">référence</span>' : ''}${a.perception_dependent ? '<span class="chip perc">perception</span>' : ''}${!gen ? '<span class="chip warn">génération jalon 2</span>' : ''}${(a.link_origin || {})[b.code] ? '<span class="chip info">ajouté via HIRE</span>' : ''}${((a.hire_links || {})[b.code] || {}).level === 'justifié indirectement' ? '<span class="chip warn">HIRE indirect</span>' : ''}${state.modified.has(a.id) ? '<span class="chip warn">modifié</span>' : ''}</span>
    <span class="ttl">${esc(titleOf(a))}</span>
    <span class="meta">${gen ? (a.configuration.actors || []).map(x => `<span class="slot s-${x.mode}">${x.slot}</span>`).join('') : ''}<span class="mono muted">${a.behaviors.length > 1 ? `${a.behaviors.length} behaviors · ` : ''}${gen ? n.toLocaleString('fr-FR') + ' comb.' : '—'}</span></span></button>`; }).join('') || `<div class="empty">Aucun abstract ne correspond aux filtres.</div>`;
}
function representative(a){
  const c = cfgFor(a, curBeh()), first = v => Array.isArray(v) ? v[0] : v;
  const p = {road: {type: first(c.road.types), laneCount: Math.max(...c.road.laneCounts), egoStartLane: first(c.road.egoStartLanes)}, ego: {intent: c.ego.intent, side: first(c.ego.sides || []), speedMps: first(c.ego.speedMps), lengthM: c.ego.lengthM, widthM: c.ego.widthM}, actors: {}};
  if (p.road.egoStartLane === 'middle' && p.road.laneCount < 3) p.road.laneCount = 3;
  for (const k of Object.keys(ROAD_EXTRAS)) if (Array.isArray(c.road[k]) && c.road[k].length) p.road[k] = c.road[k][0];
  for (const x of c.actors || []) { if (x.mode === 'off') continue; const m = (x.maneuvers || [{type: 'none'}]).find(m => m.type !== 'none') || {type: 'none'}; const mm = {type: m.type}; for (const prm of (MANEUVERS[m.type] || {params: []}).params) mm[prm] = (m[prm] || [])[0];
    p.actors[x.slot] = {present: true, kind: x.kinds[0], speedMps: (x.speedMps || [0])[0], maneuver: mm, ...(x.offsetM !== undefined ? {offsetM: x.offsetM[0]} : {distanceM: (x.distanceM || [0])[0]}), ...(x.slot === 'S' ? {lateralOffsetM: (x.lateralOffsetM || [0])[0]} : {}), ...(x.slot === 'O' ? {lane: (x.lanes || ['target'])[0]} : {}), ...((x.count || []).length ? {count: Math.max(...x.count), gapM: (x.gapM || [0])[0]} : {}), optional: x.mode === 'optional'}; }
  return {p, c};
}
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
    const dash = a && a.optional ? ' stroke-dasharray="3 2"' : '';
    s += `<g>`;
    if (e.n > 1) { for (let i = 0; i < e.n; i++) { const top = e.x1 - i * (e.L + e.gap); s += `<rect x="${x - w / 2}" y="${Y(top)}" width="${w}" height="${Math.max(5, e.L * sc)}" rx="3" fill="${fill}" stroke="var(--car-line)"${dash}/>`; } }
    else s += `<rect x="${x - w / 2}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${fill}" stroke="${e.id === 'SDT' ? 'var(--sdt-line)' : 'var(--car-line)'}"${dash}/>`;
    s += `<text x="${x}" y="${y0 + Math.min(h, 20) / 2 + 4}" text-anchor="middle" font-family="var(--f-display)" font-weight="800" font-size="${e.id === 'SDT' ? 9 : 11}" fill="${e.id === 'SDT' ? 'var(--asphalt)' : 'var(--road-label)'}">${e.id}</text>`;
    if (a && a.maneuver && a.maneuver.type !== 'none') { const lbl = {brake: '▼', accelerate: '▲', lane_change_into_target: tgt > e.lane ? '◀' : '▶', cut_in: '◀', cut_out: '▶', hug: '⇤', take_exit: '↘'}[a.maneuver.type] || '•'; s += `<text x="${x + w / 2 + 2}" y="${y0 + 10}" font-size="10" fill="var(--lane-yellow)">${lbl}</text>`; }
    s += `</g>`;
  }
  return s + `</svg>`;
}

/* ---------- HIRE v2 justification ---------- */
const LEVEL_CHIP = {'justifié': 'ok', 'justifié indirectement': 'warn', 'à relire': 'crit'};
function hireTab(a, b, legacy){
  const L = (a.hire_links || {})[b.code];
  if (!L) return `<div class="empty">Pas de justification HIRE calculée pour ce lien.</div>`;
  const rows = L.rows.map(id => [id, DATA.hire2[id]]).filter(x => x[1]);
  const origin = (a.link_origin || {})[b.code];
  let h = `<div class="hj"><div class="hj-head"><span class="chip ${LEVEL_CHIP[L.level]}">${esc(L.level)}</span>${origin ? `<span class="chip info">${esc(origin)}</span>` : ''}<span class="muted">${L.n} ligne(s) du HIRE v2 justifient le lien ${esc(a.id)} → ${esc(b.code)}</span></div>
    <p class="hj-why">${esc(L.why)}.</p>
    <dl class="facts hj-facts">
      <div class="fact"><dt>Hazards</dt><dd>${L.hz.map(z => `<span class="chip">${esc(z)} ${esc(DATA.hazard_names[z] || '')}</span>`).join(' ')}${L.scene_hz.length ? ` <span class="muted">· la scène expose ${esc(L.scene_hz.join(', '))}</span>` : ''}</dd></div>
      ${L.cmd.length ? `<div class="fact"><dt>Commandes sollicitées</dt><dd>${esc(L.cmd.join(', '))}</dd></div>` : ''}
      <div class="fact"><dt>HFS</dt><dd>${L.hfs.map(id => { const f = DATA.hfs[id]; return `<span class="chip" title="${esc(f ? f.narrative : '')}">${esc(id)}</span>`; }).join(' ') || '—'}</dd></div>
      <div class="fact"><dt>Condition ODD</dt><dd>${L.odd_match.length ? L.odd_match.map(o => `<span class="chip ok">${esc(o)} · dans le HIRE</span>`).join(' ') : ''}${L.odd_missing.map(o => `<span class="chip warn">${esc(o)} · absente du HIRE pour ce behavior</span>`).join(' ')}${!L.odd_match.length && !L.odd_missing.length ? '<span class="muted">conditions nominales</span>' : ''}</dd></div></dl></div>
    <div class="tablewrap"><table><thead><tr><th>ID HIRE v2</th><th>Condition ODD</th><th>Commande</th><th>Malfunction</th><th>Hazard</th><th>S</th><th>E</th><th>C</th><th>MRM</th></tr></thead><tbody>
    ${rows.map(([id, h]) => `<tr><td class="mono" title="${esc(h.ev)}">${esc(id)}</td><td class="muted">${esc(h.odd)}</td><td>${esc(h.man)}</td><td>${esc(h.mal)}</td><td class="num">${esc(h.hz)}</td>${['S', 'E', 'C'].map(x => `<td><span class="sev ${esc((h[x] || '').toLowerCase())}">${esc(h[x])}</span></td>`).join('')}<td>${h.mrm ? '<span class="chip info">MRM</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
    <p class="note">Source : 2026_SDT_HIRE_from_HAZOP_v2.xlsx (1 156 HARA) et Hazardous_Functional_Scenarios_V1.xlsx. Règle : le lien est « justifié » quand le HIRE de ce behavior relie une commande sollicitée par la scène au hazard pour lequel l'abstract a été écrit ; « indirectement » quand c'est un autre hazard exposé par la scène, ou quand l'abstract n'est pas encore générable. Proposé, à relire.</p>`;
  if (legacy.length) h += `<h3 class="hj-sub">Lignes du HIRE Jama existant (Lane Change)</h3><div class="tablewrap"><table><thead><tr><th>Ligne HIRE</th><th>Malfunction</th><th>Contexte</th><th>Hazard</th><th>S</th><th>E</th><th>C</th></tr></thead><tbody>${legacy.map(h => `<tr><td class="mono" title="${esc(h.ev)}">${esc(h.id.replace('HW_ Lane Changes / Overtaking_', 'HW_LC_'))}</td><td>${esc(h.mal)}</td><td class="muted">${esc(h.ctx)}</td><td class="num">${esc(h.hz)}</td>${['S', 'E', 'C'].map(x => `<td><span class="sev ${esc((h[x] || '').toLowerCase())}">${esc(h[x])}</span></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  return h;
}
function renderGaps(){
  const G = DATA.hire_gaps, open = G.filter(g => !g.covered_by.length), byUc = uc => open.filter(g => g.uc === uc);
  const row = g => `<tr><td class="mono">${esc(g.code)}</td><td>${g.kind === 'hazard' ? 'Hazard' : 'Condition ODD'}</td><td>${esc(g.label)}</td><td class="num">${g.n}</td><td class="num">${g.mrm || ''}</td><td class="muted">${esc((g.mals || []).slice(0, 5).join(', '))}</td><td>${g.not_modelled ? '<span class="chip info">non modélisé au jalon 1 (perception parfaite, adhérence)</span>' : (g.candidates || []).length ? 'Lier ' + g.candidates.map(esc).join(', ') : g.code.startsWith('HW') ? 'Nouvel abstract' : 'Catalogue urbain / hub à compléter (jalon 2)'}</td></tr>`;
  const covered = G.length - open.length;
  let h = `<div class="mx-head"><div><h2>Trous du catalogue vus depuis le HIRE v2</h2><p class="muted">${G.length} combinaisons du HIRE (behavior × hazard et behavior × condition ODD) · ${covered} couvertes par au moins un abstract · ${open.length} sans abstract. Les liens ajoutés et RMP-14 viennent de cette analyse.</p></div></div>`;
  for (const uc of ['Highway', 'Urban', 'Hub']) { const r = byUc(uc); h += `<h3 class="hj-sub">${uc} · ${r.length} trou(s)</h3>` + (r.length ? `<div class="tablewrap"><table><thead><tr><th>Behavior</th><th>Type</th><th>Combinaison HIRE</th><th>Lignes</th><th>MRM</th><th>Malfunctions</th><th>Action proposée</th></tr></thead><tbody>${r.map(row).join('')}</tbody></table></div>` : '<p class="note">Aucun trou.</p>'); }
  $('#matrix').innerHTML = h;
}

/* ---------- Detail ---------- */
function actorLine(slot, a){
  if (!a || !a.present) return '';
  const k = KINDS[a.kind]; const pos = a.offsetM !== undefined ? `décalage ${a.offsetM} m` : `${a.distanceM} m`;
  const m = a.maneuver && a.maneuver.type !== 'none' ? `, ${MANEUVERS[a.maneuver.type].label}${a.maneuver.decelMps2 !== undefined ? ' ' + a.maneuver.decelMps2 + ' m/s²' : ''}${a.maneuver.accelMps2 !== undefined ? ' ' + a.maneuver.accelMps2 + ' m/s²' : ''}${a.maneuver.lateralM !== undefined ? ' de ' + a.maneuver.lateralM + ' m' : ''}${a.maneuver.startS !== undefined ? ' à ' + a.maneuver.startS + ' s' : ''}` : '';
  const conv = a.count > 1 ? ` ×${a.count} (écart ${a.gapM} m)` : '';
  return `${slot} ${k.label}${conv} ${pos}${k.vmax ? `, ${a.speedMps} m/s` : ''}${a.lateralOffsetM !== undefined ? `, latéral ${a.lateralOffsetM} m` : ''}${a.lane ? `, voie ${a.lane === 'target' ? 'cible' : 'd’origine'}` : ''}${m}`;
}
function renderDetail(){
  const a = absOf(state.abs), el = $('#detail');
  if (!a || !(a.behaviors || []).includes(state.beh)) { el.innerHTML = `<div class="empty"><strong>Choisissez un behavior puis un scénario abstrait.</strong></div>`; return; }
  const b = curBeh(), gen = !!a.configuration, c = gen ? cfgFor(a, b) : null;
  const hire = (a.hire || []).map(id => DATA.hire[id]).filter(Boolean);
  const jama = (a.jama || []).map(id => DATA.jama_reqs[id]).filter(Boolean);
  if (!gen && state.tab === 'actors') state.tab = 'scene';
  const tabs = [['scene', 'Scénario'], ...(gen ? [['actors', `Acteurs et valeurs (${(a.configuration.actors || []).length})`]] : []), ['jama', `Exigences Jama (${jama.length + (a.requirements || []).length})`], ['hire', `HIRE (${((a.hire_links || {})[b.code] || {}).n ?? hire.length})`], ['tcfi', `TC et FI (${(a.tcs || []).length})`], ['rule', 'Règle et KPIs']];
  let body = '';
  if (state.tab === 'scene') {
    const fig = gen ? (() => { const {p, c} = representative(a); return `<figure class="fig">${sceneSVG(p, c, 'Scène représentative de ' + a.id)}<figcaption>Scène représentative à l'échelle pour ce behavior : premières valeurs, acteurs optionnels en pointillé.</figcaption></figure>`; })() : `<div class="nogen">${esc(a.gen_note || 'Génération non disponible.')}</div>`;
    body = `<div class="scene-wrap">${fig}<dl class="facts">
      <div class="fact"><dt>Description</dt><dd>${esc(a.description)}</dd></div>
      <div class="fact"><dt>Behaviors liés</dt><dd>${a.behaviors.map(id => { const x = behOf(id); return `<button class="chip ${id === state.beh ? 'ok' : ''}" type="button" data-gobeh="${esc(id)}">${esc(x.code)} · ${esc(x.name)}</button>`; }).join(' ')}</dd></div>
      ${gen ? `<div class="fact"><dt>SDT</dt><dd>${esc(INTENT[c.ego.intent])}${['lane_change', 'move_over', 'emergency_lateral'].includes(c.ego.intent) ? ' vers la ' + c.ego.sides.map(x => SIDE[x]).join(' ou ') : ''} (défini par ${esc(b.code)}) · ${c.ego.speedMps.map(v => `${v} m/s (${mph(v)} mph)`).join(', ')}</dd></div>
      <div class="fact"><dt>Route</dt><dd>${c.road.types.join(', ')} · ${c.road.laneCounts.join(' ou ')} voies · départ ${c.road.egoStartLanes.map(x => START[x]).join(' ou ')}${Object.keys(ROAD_EXTRAS).filter(k => c.road[k]).map(k => ` · ${ROAD_EXTRAS[k][0].toLowerCase()} ${c.road[k].join(', ')} ${ROAD_EXTRAS[k][1]}`).join('')}</dd></div>
      <div class="fact"><dt>Acteurs</dt><dd>${(c.actors || []).length ? c.actors.map(x => `<div><span class="slot s-${x.mode}">${x.slot}</span> ${esc(SLOTS[x.slot].role)} · ${x.mode === 'required' ? 'obligatoire' : x.mode === 'optional' ? 'optionnel' : 'absent'} · ${x.kinds.map(k => KINDS[k].label).join(', ')}${(x.maneuvers || []).filter(m => m.type !== 'none').map(m => ' · ' + MANEUVERS[m.type].label).join('')}</div>`).join('') : 'aucun, SDT seul'}</dd></div>` : ''}
      <div class="fact"><dt>NHTSA pré-crash</dt><dd>${(a.nhtsa || []).map(n => `<span class="chip" title="${esc(DATA.nhtsa[n])}">#${n} ${esc(DATA.nhtsa[n])}</span>`).join(' ') || '<span class="muted">aucune typologie de collision directe</span>'}</dd></div>
      <div class="fact"><dt>Foretellix SAFE</dt><dd>${fxRefs(a).map(r => `<span class="chip ${r.level === 'couvert' ? 'ok' : 'warn'}" title="${esc(r.desc || '')}">§${esc(r.ref)} ${esc(r.title || '')} · ${esc(r.level)}</span>`).join(' ') || '<span class="muted">pas d’équivalent dans la bibliothèque publique SAFE (2020)</span>'}</dd></div>
      <div class="fact"><dt>Hazards</dt><dd>${(a.hazards || []).join(', ') || '—'}</dd></div>
      <div class="fact"><dt>Source</dt><dd>${esc(a.source || '')}${a.torc_ref ? ' · ' + esc(a.torc_ref) : ''}</dd></div></dl></div>`;
  }
  if (state.tab === 'actors') body = actorsEditor(a);
  if (state.tab === 'jama') body = `<p class="note" style="margin:0 0 10px">Exigences Jama que cet abstract permet de vérifier (export « Driver Out 2026 SDT Requirements », 26/03/2026, et instantané EMV / Stop-in-Lane du repo). Liens proposés, à relire.</p>
    <div class="jlist">${jama.map(r => `<details class="jreq"><summary><span class="mono">${esc(r.id)}</span> ${esc(r.name)} ${r.status ? `<span class="chip">${esc(r.status)}</span>` : ''}</summary><pre class="jtext">${esc(r.text)}</pre></details>`).join('') || '<p class="muted">Aucune exigence liée.</p>'}</div>
    <p class="eyebrow" style="margin:14px 0 6px">Exigences ajoutées à la main</p>
    <div class="tablewrap"><table><thead><tr><th>ID Jama</th><th>Titre</th><th>Conditions fixées</th><th>Critère</th><th></th></tr></thead><tbody>${(a.requirements || []).map((r, i) => `<tr><td class="mono">${esc(r.id)}</td><td>${esc(r.title)}</td><td>${esc(r.fixes)}</td><td>${esc(r.criterion)}</td><td><button class="btn small" type="button" data-delreq="${i}">Retirer</button></td></tr>`).join('') || `<tr><td colspan="5" class="muted">Aucune.</td></tr>`}</tbody></table></div>
    <form class="reqform" id="reqForm"><input id="rqId" placeholder="TORC-SYSRQ-…" aria-label="ID Jama" required><input id="rqTitle" placeholder="Titre" aria-label="Titre"><input id="rqFix" placeholder="Conditions fixées" aria-label="Conditions fixées"><input id="rqCrit" placeholder="Critère (ex. < 70 s)" aria-label="Critère"><button class="btn small primary" type="submit">Lier l'exigence</button></form>`;
  if (state.tab === 'hire') body = hireTab(a, b, hire);
  if (state.tab === 'tcfi') body = `<div class="tablewrap"><table><thead><tr><th>TC</th><th>Couche</th><th>Condition déclenchante</th><th>Hazards</th></tr></thead><tbody>${(a.tcs || []).map(t => { const x = DATA.tc[t] || {}; return `<tr><td class="mono">${esc(t)}</td><td class="num">${esc(x.layer || '')}</td><td>${esc(x.tc || '')}</td><td class="num">${esc(x.haz || '')}</td></tr>`; }).join('') || '<tr><td colspan="4" class="muted">Aucune TC reliée.</td></tr>'}</tbody></table></div>
    ${(a.fis || []).length ? `<div class="tablewrap" style="margin-top:12px"><table><thead><tr><th>FI</th><th>Bloc</th><th>Insuffisance fonctionnelle</th></tr></thead><tbody>${a.fis.map(f => { const x = DATA.fi[f] || {}; return `<tr><td class="mono">${esc(f)}</td><td>${esc(x.block)}</td><td>${esc(x.name)}</td></tr>`; }).join('')}</tbody></table></div>` : ''}<p class="note">Hors génération au jalon 1 (perception parfaite).</p>`;
  if (state.tab === 'rule') body = a.rule ? `<p class="eyebrow" style="margin:0 0 6px">Comportement voulu (rule book)</p><p class="rule">${esc(a.rule)}</p><div class="cols2"><div><p class="eyebrow" style="margin:0 0 6px">Tâches SDT</p><ul class="clean">${(a.tasks || []).map(t => `<li><span class="mono">${esc(t)}</span> ${esc((DATA.tasks[t] || {}).name || '')}</li>`).join('')}</ul></div><div><p class="eyebrow" style="margin:0 0 6px">KPIs et checkers</p><ul class="clean">${(a.kpis || []).map(k => { const x = DATA.kpis[k] || {}; return `<li><span class="mono">${esc(x.metric || k)}</span> <span class="muted">· ${esc(x.cat || '')} · seuil : ${esc(x.threshold || 'TBD')}</span></li>`; }).join('')}</ul></div></div>` : `<div class="empty">Règle, tâches et KPIs détaillés à compléter pour cet abstract (faits pour les 29 abstracts Lane Change). Les critères viennent des exigences Jama liées.</div>`;
  el.innerHTML = `<div class="detail-head"><div class="trace"><span class="chip">${esc(b.use_case)}</span><span>${esc(b.code)} · ${esc(b.name)}</span><span>›</span><span class="chip fam">${esc(a.family)}</span><span>${esc((DATA.families[a.family] || {}).name || '')}</span></div>
      <h2>${esc(a.id)} · ${esc(titleOf(a))}</h2>
      <div class="trace">${a.status === 'REFERENCE' ? '<span class="chip ok">référence jalon 1</span>' : ''}${a.perception_dependent ? '<span class="chip perc">dépend de la perception</span>' : '<span class="chip ok">perception parfaite OK</span>'}${!gen ? '<span class="chip warn">génération jalon 2</span>' : ''}<span class="chip">${esc(a.status || 'PROPOSED')}</span>${a.behaviors.length > 1 ? `<span class="chip info">partagé par ${a.behaviors.length} behaviors</span>` : ''}${state.modified.has(a.id) ? '<span class="chip warn">modifié dans cette session</span> <button class="btn small" type="button" data-act="reset">Revenir au catalogue</button>' : ''}</div></div>
    <div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button class="tab" role="tab" type="button" data-tab="${k}" aria-selected="${k === state.tab}">${l}</button>`).join('')}</div><div class="tabbody">${body}</div>`;
}
const fmtList = a => (a || []).join(', ');
function inp(path, val, label, unit, wide){ return `<label class="fld${wide ? ' wide' : ''}"><span>${label}${unit ? ` · ${unit}` : ''}</span><input data-path="${path}" value="${esc(fmtList(val))}" inputmode="decimal" spellcheck="false"></label>`; }
function checks(path, options, selected, labels){ return `<div class="checks" data-checks="${path}">${options.map(o => `<label class="ck"><input type="checkbox" value="${esc(o)}" ${selected.includes(o) ? 'checked' : ''}> ${esc(labels ? labels[o] || o : o)}</label>`).join('')}</div>`; }
function actorsEditor(a){
  const c = a.configuration, used = new Set(c.actors.map(x => x.slot));
  const cb = cfgFor(a, curBeh());
  const roadExtras = Object.keys(ROAD_EXTRAS).filter(k => Array.isArray(c.road[k]));
  let h = `<div class="ed-card"><div class="ed-head"><b>Route et SDT</b><span class="muted">${countPotential(cb).toLocaleString('fr-FR')} combinaisons pour ${esc(curBeh().code)}</span></div>
    <div class="ed-grid">
      <div class="fld"><span>Type de route</span>${checks('road.types', ['highway', 'surface_street'], c.road.types, {highway: 'Highway', surface_street: 'Surface street'})}</div>
      ${inp('road.laneCounts', c.road.laneCounts, 'Nombre de voies', '')}
      <div class="fld"><span>Voie de départ</span>${checks('road.egoStartLanes', ['rightmost', 'middle', 'leftmost'], c.road.egoStartLanes, START)}</div>
      <label class="fld"><span>Intention du SDT pour ${esc(curBeh().code)} (observée, pas scriptée)</span><select id="intentSel"><option value="">Par défaut du behavior (${esc(INTENT[curBeh().default?.intent])})</option>${Object.entries(INTENT).map(([k, l]) => `<option value="${k}" ${(a.intent || {})[curBeh().code] === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <div class="fld"><span>Côté${curBeh().default?.sides ? ' (imposé par le behavior)' : ''}</span>${checks('ego.sides', ['left', 'right'], c.ego.sides || [], SIDE)}</div>
      ${inp('ego.speedMps', c.ego.speedMps, `Vitesse SDT (${c.ego.speedMps.map(mph).join(', ')} mph)`, 'm/s')}
      ${inp('ego.lengthM', [c.ego.lengthM], 'Longueur camion', 'm')}${inp('ego.widthM', [c.ego.widthM], 'Largeur camion', 'm')}
      ${roadExtras.map(k => TEXT_EXTRAS.has(k) ? `<label class="fld"><span>${ROAD_EXTRAS[k][0]}</span><input data-path="road.${k}" data-text="1" value="${esc(fmtList(c.road[k]))}" spellcheck="false"></label>` : inp(`road.${k}`, c.road[k], ROAD_EXTRAS[k][0], ROAD_EXTRAS[k][1])).join('')}
    </div>
    <div class="ed-foot"><select id="addRoad" aria-label="Ajouter un paramètre de route"><option value="">+ paramètre de route</option>${Object.keys(ROAD_EXTRAS).filter(k => !roadExtras.includes(k)).map(k => `<option value="${k}">${ROAD_EXTRAS[k][0]}</option>`).join('')}</select>
    ${c.actors.some(x => x.slot === 'S') ? `<label class="ck"><input type="checkbox" id="fixFully" ${a.fixed?.fullyOnShoulder ? 'checked' : ''}> L'abstract fixe « entièrement sur l'accotement »</label>` : ''}</div></div>`;
  for (const [i, x] of c.actors.entries()) {
    const type = KINDS[x.kinds[0]]?.type || 'vehicle', kinds = Object.keys(KINDS).filter(k => KINDS[k].type === type), stat = type === 'static';
    const offset = x.offsetM !== undefined || SLOTS[x.slot].pos === 'offset', allowed = SLOT_MANEUVERS[x.slot];
    const ms = x.maneuvers || [{type: 'none'}], has = t => ms.some(m => m.type === t), get = t => ms.find(m => m.type === t) || {};
    h += `<div class="ed-card" data-actor="${i}"><div class="ed-head"><span class="slot big s-${x.mode}">${x.slot}</span><b>${esc(SLOTS[x.slot].role)}</b>
      <select data-apath="mode" aria-label="Présence de ${x.slot}"><option value="required" ${x.mode === 'required' ? 'selected' : ''}>Obligatoire</option><option value="optional" ${x.mode === 'optional' ? 'selected' : ''}>Optionnel</option><option value="off" ${x.mode === 'off' ? 'selected' : ''}>Absent</option></select>
      <button class="btn small" type="button" data-delactor="${i}">Retirer</button></div>
      <div class="ed-grid">
        <label class="fld"><span>Type d'acteur</span><select data-atype="1">${Object.entries(TYPE_LABEL).map(([k, l]) => `<option value="${k}" ${type === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <div class="fld wide"><span>Modèles</span>${checks('kinds', kinds, x.kinds, Object.fromEntries(kinds.map(k => [k, `${KINDS[k].label} (${KINDS[k].L} × ${KINDS[k].W} m)`])))}</div>
        ${offset ? inp('offsetM', x.offsetM, 'Décalage longitudinal (avant de l’acteur vs avant du SDT)', 'm') : inp('distanceM', x.distanceM, SLOTS[x.slot].pos === 'behind' ? 'Distance derrière le SDT' : 'Distance devant le SDT', 'm')}
        ${stat ? '' : inp('speedMps', x.speedMps, 'Vitesse', 'm/s')}
        ${x.slot !== 'S' && x.slot !== 'O' && !stat ? inp('count', x.count, 'Nombre de véhicules (convoi, vide = 1)', '') + ((x.count || []).some(n => n > 1) ? inp('gapM', x.gapM, 'Écart entre véhicules du convoi', 'm') : '') : ''}
        ${x.slot === 'S' ? inp('lateralOffsetM', x.lateralOffsetM, 'Décalage depuis le bord de voie', 'm') : ''}
        ${x.slot === 'O' ? `<div class="fld"><span>Voie de l'objet</span>${checks('lanes', ['target', 'origin'], x.lanes || ['target'], {target: 'cible', origin: 'origine'})}</div>` : ''}
        ${allowed.length > 1 && !stat ? `<div class="fld wide"><span>Manœuvres</span>${checks('maneuverTypes', allowed, ms.map(m => m.type), Object.fromEntries(allowed.map(t => [t, MANEUVERS[t].label])))}</div>
          ${allowed.filter(t => t !== 'none' && has(t)).map(t => MANEUVERS[t].params.map(prm => inp(`m.${t}.${prm}`, get(t)[prm], `${MANEUVERS[t].label} · ${PRM_LABEL[prm][0]}`, PRM_LABEL[prm][1])).join('')).join('')}` : ''}
      </div></div>`;
  }
  const free = Object.keys(SLOTS).filter(s => !used.has(s));
  h += `<div class="ed-foot"><select id="addActor" aria-label="Ajouter un acteur"><option value="">+ ajouter un acteur</option>${free.map(s => `<option value="${s}">${s} · ${esc(SLOTS[s].role)}</option>`).join('')}</select>
    <span class="note">Valeurs séparées par des virgules. Toute modification reste dans cette session ; exportez le catalogue pour la garder.</span></div>`;
  const errs = validate(cb);
  if (errs.length) h += `<div class="errs"><b>À corriger avant de générer :</b><ul>${errs.map(e => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
  return h;
}
function touch(a){ state.modified.add(a.id); for (const k of Object.keys(state.results)) if (k.startsWith(a.id + '@')) delete state.results[k]; }
function parseNums(s){ return s.split(/[,;\s]+/).filter(Boolean).map(Number); }
function onEditorInput(t){
  const a = absOf(state.abs), c = a.configuration;
  const card = t.closest('[data-actor]'), x = card ? c.actors[Number(card.dataset.actor)] : null;
  if (t.dataset.path && !card) {
    const [root, key] = t.dataset.path.split('.');
    let v = t.tagName === 'SELECT' ? t.value : t.dataset.text ? t.value.split(',').map(s => s.trim()).filter(Boolean) : parseNums(t.value);
    if (key === 'lengthM' || key === 'widthM') v = v[0];
    c[root][key] = v;
  } else if (t.dataset.path && x) {
    const path = t.dataset.path;
    if (path.startsWith('m.')) { const [, type, prm] = path.split('.'); const m = x.maneuvers.find(m => m.type === type); if (m) m[prm] = parseNums(t.value); }
    else x[path] = parseNums(t.value);
  } else if (t.dataset.apath === 'mode' && x) x.mode = t.value;
  else if (t.dataset.atype && x) { const kinds = Object.keys(KINDS).filter(k => KINDS[k].type === t.value); x.kinds = [kinds[0]]; if (t.value === 'static') { x.speedMps = [0]; x.maneuvers = [{type: 'none'}]; } else if (!x.speedMps || !x.speedMps.some(v => v > 0)) x.speedMps = t.value === 'emv' && x.slot === 'S' ? [0] : [25]; }
  else if (t.closest('[data-checks]')) {
    const box = t.closest('[data-checks]'), vals = [...box.querySelectorAll('input:checked')].map(i => i.value), path = box.dataset.checks;
    if (!card) { const [root, key] = path.split('.'); c[root][key] = key === 'laneCounts' ? vals.map(Number) : vals; }
    else if (path === 'maneuverTypes') { const prev = x.maneuvers || []; x.maneuvers = vals.map(type => prev.find(m => m.type === type) || Object.assign({type}, Object.fromEntries(MANEUVERS[type].params.map(p => [p, p === 'startS' ? [1] : p === 'lateralM' ? [0.5] : [3]])))); if (!x.maneuvers.length) x.maneuvers = [{type: 'none'}]; }
    else x[path] = vals;
  } else return false;
  touch(a); return true;
}

/* ---------- Generation and results ---------- */
function renderGen(){
  const a = absOf(state.abs), el = $('#gen');
  if (!a || !(a.behaviors || []).includes(state.beh)) { el.hidden = true; return; }
  el.hidden = false;
  if (!a.configuration) { el.innerHTML = `<div class="gen-head"><h2>Générer tous les scénarios</h2></div><div class="empty">${esc(a.gen_note || 'Génération non disponible pour cet abstract.')}</div>`; return; }
  const b = curBeh(), c = cfgFor(a, b), r = state.results[resKey(a, b)], n = countPotential(c), errs = validate(c), max = c.options?.maxExpansion ?? 20000;
  let h = `<div class="gen-head"><h2>Générer tous les scénarios</h2><span class="muted">${esc(a.id)} pour ${esc(b.code)} · intention ${esc(INTENT[c.ego.intent])} · ${n.toLocaleString('fr-FR')} combinaisons potentielles</span></div>
    <details class="rules"><summary>Règles d'exclusion des scénarios absurdes (${RULES.filter(x => c.rules?.[x.id] !== false).length}/${RULES.length} actives)</summary><div class="rule-list">${RULES.map(x => `<label class="ck rule-row"><input type="checkbox" data-rule="${x.id}" ${c.rules?.[x.id] !== false ? 'checked' : ''}><span><b class="mono">${x.id}</b> ${esc(x.label)}<br><span class="muted">${esc(x.desc)}</span></span></label>`).join('')}</div></details>
    <div class="controls"><label class="field"><span>Limite d'évaluation</span><input id="maxExp" type="number" min="1" max="100000" value="${max}"></label>
      <label class="ck"><input type="checkbox" id="inclEmpty" ${c.options?.includeEmptyBaseline ? 'checked' : ''}> Inclure le cas sans aucun acteur optionnel</label>
      <button class="btn primary" type="button" id="btnGen" ${errs.length ? 'disabled' : ''}>Générer ${Math.min(n, max).toLocaleString('fr-FR')} combinaisons</button>
      ${errs.length ? '<span class="chip crit">corrigez les valeurs dans « Acteurs et valeurs »</span>' : ''}${n > max ? `<span class="chip warn">${n.toLocaleString('fr-FR')} > limite : l'ensemble sera tronqué</span>` : ''}</div>`;
  if (!r) { el.innerHTML = h + `<div class="empty">Cliquez sur Générer : chaque combinaison est évaluée, les scénarios absurdes sont exclus avec leur règle et leur raison.</div>`; return; }
  const byRule = {}; r.rejected.forEach(x => x.ruleIds.forEach(id => byRule[id] = (byRule[id] || 0) + 1));
  const go = r.variants.filter(v => v.expected.cat === 'go').length, hold = r.variants.filter(v => v.expected.cat === 'hold').length;
  let rows = state.view === 'valid' ? r.variants : r.rejected.filter(x => !state.ruleFilter || x.ruleIds.includes(state.ruleFilter));
  const sel = [...r.variants, ...r.rejected].find(x => x.id === state.sel);
  h += `<div class="summary"><div class="stat"><b>${r.counts.potential.toLocaleString('fr-FR')}</b><span>potentiels</span></div><div class="stat"><b>${r.counts.valid.toLocaleString('fr-FR')}</b><span>retenus</span></div><div class="stat"><b>${r.counts.rejected.toLocaleString('fr-FR')}</b><span>exclus</span></div>
      <span class="chip ${r.status === 'complete' ? 'ok' : 'warn'}">${r.status === 'complete' ? 'ensemble complet' : 'tronqué à la limite'}</span><span class="chip ok">${go} action nominale</span><span class="chip warn">${hold} action prudente (attendre, céder, freiner)</span>
      <div class="seg" role="group" aria-label="Vue"><button type="button" data-view="valid" aria-pressed="${state.view === 'valid'}">Retenus</button><button type="button" data-view="rejected" aria-pressed="${state.view === 'rejected'}">Exclus</button></div></div>
    ${state.view === 'rejected' && Object.keys(byRule).length ? `<div class="rulebar">${Object.entries(byRule).sort((x, y) => y[1] - x[1]).map(([id, k]) => `<button class="chip crit" type="button" data-rf="${id}" aria-pressed="${state.ruleFilter === id}">${id} · ${k}</button>`).join('')}${state.ruleFilter ? '<button class="chip" type="button" data-rf="">toutes</button>' : ''}</div>` : ''}
    <div class="results"><div class="tablewrap"><table><thead><tr><th>Scénario</th><th class="exp">${state.view === 'valid' ? 'Attendu (oracle candidat)' : 'Règle et raison d’exclusion'}</th><th>Route</th><th>SDT</th><th>Acteurs</th></tr></thead><tbody>
    ${rows.slice(0, state.shown).map(v => { const p = v.parameters; return `<tr data-con="${esc(v.id)}" aria-selected="${v.id === state.sel}"><td class="num">${esc(v.id)}</td>
      <td class="exp">${v.expected ? `<span class="chip ${v.expected.cat === 'go' ? 'ok' : v.expected.cat === 'hold' ? 'warn' : 'info'}">${esc(v.expected.txt)}</span> <span class="muted">${esc(v.expected.why)}</span>` : v.ruleIds.map(id => `<span class="chip crit">${id}</span>`).join(' ') + ` <span class="muted">${esc(v.reasons.join(' '))}</span>`}</td>
      <td class="num">${p.road.laneCount} v. · ${esc(p.road.egoStartLane)}${Object.keys(ROAD_EXTRAS).filter(k => p.road[k] !== undefined).map(k => ` · ${p.road[k]}${ROAD_EXTRAS[k][1] ? ' ' + ROAD_EXTRAS[k][1] : ''}`).join('')}</td>
      <td class="num">${p.ego.speedMps} m/s${p.ego.side ? ' · ' + SIDE[p.ego.side] : ''}</td>
      <td class="actors-cell">${Object.entries(p.actors).filter(([, x]) => x.present).map(([s, x]) => esc(actorLine(s, x))).join('<br>') || '<span class="muted">aucun</span>'}</td></tr>`; }).join('')}
    </tbody></table></div></div>
    <div class="more">${rows.length > state.shown ? `<button class="btn small" type="button" id="btnMore">Afficher ${Math.min(100, rows.length - state.shown)} de plus</button>` : ''}<span>${Math.min(state.shown, rows.length)} / ${rows.length} affichés · oracle candidat : gaps ≥ 1 s, freinage imposé ≤ 3 m/s² (à valider)</span></div>
    <div class="osc-panel"><div class="bar"><span class="eyebrow">Scénario concret sélectionné</span><span class="mono muted">${sel ? esc(sel.id) : ''}</span><span class="spacer"></span>
      <button class="btn small" type="button" id="btnCopy" ${sel && !sel.ruleIds ? '' : 'disabled'}>Copier l'OSC</button><button class="btn small primary" type="button" id="btnZip" ${r.variants.length && r.status === 'complete' ? '' : 'disabled'}>Exporter ${r.variants.length} OSC + manifeste (.zip)</button></div>
      ${sel ? `<div class="con-wrap"><figure class="fig">${sceneSVG(sel.parameters, c, 'Scène du scénario ' + sel.id)}<figcaption>${sel.ruleIds ? 'Combinaison exclue' : 'Positions à t = 0, à l’échelle'}</figcaption></figure>${sel.ruleIds ? `<div class="note"><b>Exclu par ${sel.ruleIds.join(', ')}.</b><br>${esc(sel.reasons.join(' '))}<br>Aucun OSC n'est produit pour une combinaison exclue.</div>` : `<pre class="code" id="oscCode">${esc(oscFor(sel, a, c))}</pre>`}</div>` : '<p class="note">Sélectionnez une ligne.</p>'}
      <p class="note">Le concret n'est pas stocké à part : sa recette (behavior, abstract, version, valeurs) est dans l'en-tête de l'OSC et dans le manifeste. La réponse du SDT n'est jamais écrite dans l'OSC.</p></div>`;
  el.innerHTML = h;
}
function oscFor(v, a, c){
  const p = v.parameters, b = curBeh(), li = laneIndices(p);
  const side = li.dir > 0 ? 'left' : 'right', other = side === 'left' ? 'right' : 'left';
  const vname = {A: 'a_lead_origin', B: 'b_lead_target', C: 'c_follow_origin', D: 'd_follow_target', E: 'e_far_lane', F: 'f_far_lane_ahead', G: 'g_other_side', S: 's_shoulder', O: 'o_object'};
  const L = [
    '# ASAM OpenSCENARIO DSL 2.0.0 authoring template, NOT executable or parser-validated.',
    `# behavior : ${b.id} | ${b.code} ${b.name} (${b.use_case})${b.jama ? ' | ' + b.jama.id : ''}`, `# abstract : ${a.id} v${a.version || 1} | ${a.name}`, `# concrete : ${v.id} | ${v.status}`,
    `# hire     : ${(a.hire || []).slice(0, 6).join(' ; ')}${(a.hire || []).length > 6 ? ` (+${a.hire.length - 6})` : ''}`,
    `# jama     : ${[...(a.jama || []), ...(a.requirements || []).map(r => r.id)].join(' ; ') || 'aucune exigence liée'}`,
    `# expected : ${v.expected.txt} (${v.expected.why}) [oracle candidat]`,
    `# intent   : ${p.ego.intent}${p.ego.side ? ' ' + p.ego.side : ''} — observed on the ADS, never scripted below.`,
    'import <BASIC_OSC_PATH>', 'import <MAP_VERSION_OSC_PATH>', '',
    `scenario ${a.name}_${v.id.toLowerCase().replace(/-/g, '_')}:`, '    map: Map', '    map.set_map_file(map_version)', '    ego_vehicle: Truck',
    `    # road: ${p.road.type}, ${p.road.laneCount} lanes, ego starts ${p.road.egoStartLane}${Object.keys(ROAD_EXTRAS).filter(k => p.road[k] !== undefined).map(k => `, ${k}=${p.road[k]}`).join('')}`];
  const acts0 = Object.entries(p.actors).filter(([, x]) => x.present);
  const acts = acts0.flatMap(([s, x]) => { if (!(x.count > 1)) return [[s, x]]; const step = KINDS[x.kind].L + x.gapM; return Array.from({length: x.count}, (_, i) => [s, {...x, _i: i + 1, ...(x.offsetM !== undefined ? {offsetM: x.offsetM - i * step} : {distanceM: x.distanceM + i * step})}]); });
  const nm = (s, x) => vname[s] + (x._i ? `_${x._i}` : '');
  for (const [s, x] of acts) L.push(`    ${nm(s, x)}: ${KINDS[x.kind].type === 'static' ? 'StationaryObject' : 'Vehicle'}   # ${KINDS[x.kind].label}${x._i ? ` (convoi ${x._i}/${x.count}, écart ${x.gapM} m)` : ''}`);
  L.push('    do serial:', '        initialization: parallel(duration: 2s):', '            ego_vehicle.drive() with:', '                position(at_point: geodetic_position_2d(latitude: <EGO_LAT> deg, longitude: <EGO_LON> deg), at: start, project_on_route: true)', `                speed(${p.ego.speedMps} mps, at: start)`);
  const laneOf = s => ({A: 'lane(same_as: ego_vehicle, at: start)', C: 'lane(same_as: ego_vehicle, at: start)', B: `lane(side_of: ego_vehicle, side: ${side}, at: start)`, D: `lane(side_of: ego_vehicle, side: ${side}, at: start)`, E: `lane(side_of: ego_vehicle, side: ${side}, offset: 2, at: start)  # lane beyond target`, F: `lane(side_of: ego_vehicle, side: ${side}, offset: 2, at: start)  # lane beyond target`, G: `lane(side_of: ego_vehicle, side: ${other}, at: start)`})[s];
  for (const [s, x] of acts) {
    const k = KINDS[x.kind], pos = x.offsetM !== undefined ? `position(${Math.abs(x.offsetM)} m, ${x.offsetM >= 0 ? 'ahead_of' : 'behind'}: ego_vehicle, at: start)` : `position(${x.distanceM} m, ${SLOTS[s].pos === 'behind' ? 'behind' : 'ahead_of'}: ego_vehicle, at: start)`;
    if (k.vmax === 0 || x.speedMps === 0) { L.push(`            ${nm(s, x)}.remain_stationary() with:`, `                ${pos}`); if (s === 'S') L.push(`                # right shoulder, inner-edge offset ${x.lateralOffsetM} m${p.road.shoulderWidthM !== undefined ? `, shoulder ${p.road.shoulderWidthM} m` : ''}`); if (s === 'O') L.push(`                # in ${x.lane} lane`); }
    else { L.push(`            ${nm(s, x)}.drive() with:`, `                ${pos}`, `                speed(${x.speedMps} mps, at: start)`); if (laneOf(s)) L.push(`                ${laneOf(s)}`); }
  }
  const stim = acts.filter(([, x]) => x.maneuver && x.maneuver.type !== 'none');
  if (stim.length) { L.push('        stimulus: parallel:'); for (const [s, x] of stim) { const m = x.maneuver, vn = nm(s, x); L.push(`            serial:`, `                wait(${(m.startS ?? 0) + (x._i ? x._i - 1 : 0)} s)${x._i > 1 ? '  # convoy member, staggered 1 s' : ''}`);
    if (m.type === 'brake') L.push(`                ${vn}.change_speed(target: 0 mps, rate: ${m.decelMps2} mpsps)`);
    if (m.type === 'accelerate') L.push(`                ${vn}.change_speed(target: ${Math.round(x.speedMps + m.accelMps2 * 4)} mps, rate: ${m.accelMps2} mpsps)`);
    if (m.type === 'lane_change_into_target') L.push(`                ${vn}.change_lane(side: ${other}, num_of_lanes: 1)  # into the SDT target lane`);
    if (m.type === 'cut_in') L.push(`                ${vn}.change_lane(lane: same_as(ego_vehicle))`);
    if (m.type === 'cut_out') L.push(`                ${vn}.change_lane(side: ${side}, num_of_lanes: 1)`);
    if (m.type === 'drift') L.push(`                ${vn}.drive() with: lateral(distance: 0.8 m, line: center, side_of: ego_vehicle)  # drift toward the SDT lane`);
    if (m.type === 'hug') L.push(`                ${vn}.drive() with: lateral(distance: ${m.lateralM} m, line: center, side_of: ego_vehicle)  # stays in its own lane`);
    if (m.type === 'take_exit') L.push(`                parallel:`, `                    ${vn}.change_lane(side: right, num_of_lanes: 1)  # onto the exit ramp`, `                    ${vn}.change_speed(target: ${Math.max(0, Math.round(x.speedMps - m.decelMps2 * 4))} mps, rate: ${m.decelMps2} mpsps)`); } }
  L.push('        observation: parallel(duration: <OBSERVATION_S> s):', '            # <ADS_CLOSED_LOOP_OBSERVATION_BINDING>', '');
  return L.join('\n');
}

/* ---------- Import / export ---------- */
let downloads = null;
(async () => { try { downloads = await window.claude?.use?.('downloads'); } catch (e) { downloads = null; } })();
async function save(filename, data){
  if (!downloads) { toast('Le téléchargement n’est pas disponible dans cette vue.'); return; }
  try { await downloads.save({filename, data}); toast(`${filename} prêt.`); }
  catch (e) { toast(e && e.code === 'declined' ? 'Téléchargement annulé.' : e && e.code === 'rate_limited' ? 'Une demande est déjà ouverte.' : 'Le téléchargement a échoué.'); }
}
function catalogueJSON(){ return JSON.stringify({schema: 'scenario-studio/catalogue@0.3', exported: new Date().toISOString().slice(0, 10), kinds: KINDS, slots: SLOTS, rules: RULES, behaviors: DATA.behaviors, families: DATA.families, nhtsa: DATA.nhtsa, abstracts: DATA.abstracts}, null, 2); }
async function exportZip(){
  const a = absOf(state.abs), b = curBeh(), c = cfgFor(a, b), r = state.results[resKey(a, b)];
  if (!window.JSZip) { toast('La bibliothèque zip n’a pas pu être chargée.'); return; }
  const zip = new JSZip();
  zip.file('manifest.json', JSON.stringify({behavior: state.beh, behavior_code: b.code, intent: c.ego.intent, jama: a.jama, abstract: a.id, abstract_version: a.version || 1, hire: a.hire, requirements: a.requirements, configurationId: r.configurationId, status: r.status, counts: r.counts,
    variants: r.variants.map(v => ({id: v.id, parameters: v.parameters, expected: v.expected, file: `osc/${v.id}.osc`})), rejected: r.rejected.map(x => ({id: x.id, parameters: x.parameters, ruleIds: x.ruleIds, reasons: x.reasons})), execution: r.execution}, null, 2));
  zip.file('abstract.json', JSON.stringify(a, null, 2));
  r.variants.forEach(v => zip.file(`osc/${v.id}.osc`, oscFor(v, a, c)));
  save(`${a.id}_${b.code}_scenarios.zip`, await zip.generateAsync({type: 'blob'}));
}
function importCatalogue(text){
  let j; try { j = JSON.parse(text); } catch (e) { toast('Ce fichier n’est pas un JSON valide.'); return; }
  let added = 0, updated = 0; const rejected = [];
  for (const b of (j.behaviors || [])) if (b && b.id && b.name && b.use_case && !behOf(b.id)) DATA.behaviors.push(b);
  for (const a of (Array.isArray(j) ? j : j.abstracts || [])) {
    if (!a || !a.id || !a.name || !Array.isArray(a.behaviors)) { rejected.push(a?.id || 'sans id'); continue; }
    if (a.behaviors.some(id => !behOf(id))) { rejected.push(`${a.id} (behavior inconnu)`); continue; }
    const errs = a.configuration ? validate(a.configuration) : []; if (errs.length) { rejected.push(`${a.id} (${errs[0]})`); continue; }
    const norm = Object.assign({version: 1, family: 'IMPORT', jama: [], nhtsa: [], intent: {}, title: a.name, description: '', hire: [], tcs: [], fis: [], requirements: [], tasks: [], kpis: [], status: 'IMPORTED', source: 'import', env: '', rule: ''}, a);
    const i = DATA.abstracts.findIndex(x => x.id === a.id);
    if (i >= 0) { DATA.abstracts[i] = norm; updated++; } else { DATA.abstracts.push(norm); added++; }
    ORIGINAL[a.id] = clone(norm); touch(norm); state.modified.delete(norm.id);
  }
  toast(`${added} ajouté(s), ${updated} mis à jour${rejected.length ? `, ${rejected.length} rejeté(s) : ${rejected.slice(0, 2).join(' ; ')}` : ''}.`);
  renderAll();
}

/* ---------- Events ---------- */
function runGen(){ const a = absOf(state.abs), b = curBeh(); if (!a || !a.configuration) return null; const r = generate(cfgFor(a, b), {...a, id: resKey(a, b)}); state.results[resKey(a, b)] = r; state.view = 'valid'; state.ruleFilter = null; state.shown = 50; state.sel = r.variants[0]?.id || r.rejected[0]?.id || null; return r; }
document.addEventListener('click', e => {
  const t = e.target.closest('[data-beh],[data-gobeh],[data-mx],[data-mode],[data-uc],[data-abs],[data-tab],[data-view],[data-rf],[data-con],[data-act],[data-delactor],[data-delreq],#btnGen,#btnMore,#btnCopy,#btnZip,#btnImport,#btnExportCat');
  if (!t) return;
  if (t.dataset.beh) { state.beh = t.dataset.beh; state.fam = 'all'; state.abs = visibleAbstracts()[0]?.id || null; state.tab = 'scene'; if (state.abs && !state.results[resKey(absOf(state.abs), curBeh())]) runGen(); renderAll(); return; }
  if (t.dataset.gobeh) { state.beh = t.dataset.gobeh; state.fam = 'all'; if (!state.results[resKey(absOf(state.abs), curBeh())]) runGen(); renderAll(); return; }
  if (t.dataset.mode) { state.mode = t.dataset.mode; renderAll(); return; }
  if (t.dataset.uc) { state.ucFilter = t.dataset.uc; renderMatrix(); return; }
  if (t.dataset.mx) { const [aid, bid] = t.dataset.mx.split('|'); state.abs = aid; if (bid) state.beh = bid; else if (!absOf(aid).behaviors.includes(state.beh)) state.beh = absOf(aid).behaviors[0]; state.mode = 'work'; state.fam = 'all'; state.tab = 'scene'; if (!state.results[resKey(absOf(state.abs), curBeh())]) runGen(); renderAll(); window.scrollTo(0, 0); return; }
  if (t.dataset.abs) { state.abs = t.dataset.abs; if (!state.results[resKey(absOf(state.abs), curBeh())]) runGen(); renderAll(); return; }
  if (t.dataset.tab) { state.tab = t.dataset.tab; renderDetail(); return; }
  if (t.dataset.view) { state.view = t.dataset.view; state.shown = 50; renderGen(); return; }
  if (t.dataset.rf !== undefined) { state.ruleFilter = t.dataset.rf || null; state.shown = 50; renderGen(); return; }
  if (t.dataset.con) { state.sel = t.dataset.con; renderGen(); return; }
  if (t.dataset.delactor !== undefined) { const a = absOf(state.abs); a.configuration.actors.splice(Number(t.dataset.delactor), 1); touch(a); renderDetail(); renderGen(); renderAbstractList(); return; }
  if (t.dataset.delreq !== undefined) { const a = absOf(state.abs); a.requirements.splice(Number(t.dataset.delreq), 1); touch(a); renderDetail(); return; }
  if (t.dataset.act === 'import' || t.id === 'btnImport') { $('#importFile').click(); return; }
  if (t.dataset.act === 'reset') { const i = DATA.abstracts.findIndex(x => x.id === state.abs); DATA.abstracts[i] = clone(ORIGINAL[state.abs]); state.modified.delete(state.abs); delete state.results[state.abs]; renderAll(); return; }
  if (t.id === 'btnGen') { const r = runGen(); if (!r) return; renderGen(); renderAbstractList(); toast(`${r.counts.evaluated.toLocaleString('fr-FR')} combinaisons évaluées : ${r.counts.valid} retenues, ${r.counts.rejected} exclues.`); return; }
  if (t.id === 'btnMore') { state.shown += 100; renderGen(); return; }
  if (t.id === 'btnCopy') { const txt = $('#oscCode')?.textContent || ''; navigator.clipboard?.writeText(txt).then(() => toast('OSC copié.'), () => { const r = document.createRange(); r.selectNodeContents($('#oscCode')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); toast('Texte sélectionné, copiez avec Ctrl+C.'); }); return; }
  if (t.id === 'btnZip') { exportZip(); return; }
  if (t.id === 'btnExportCat') { save('scenario_studio_catalogue.json', catalogueJSON()); return; }
});
document.addEventListener('change', e => {
  const t = e.target, a = absOf(state.abs);
  if (t.id === 'famFilter') { state.fam = t.value; renderAbstractList(); return; }
  if (t.id === 'perfectOnly') { state.perfectOnly = t.checked; renderAbstractList(); return; }
  if (t.id === 'importFile' && t.files && t.files[0]) { const rd = new FileReader(); rd.onload = () => importCatalogue(String(rd.result)); rd.readAsText(t.files[0]); t.value = ''; return; }
  if (!a) return;
  if (t.dataset.rule) { a.configuration.rules = a.configuration.rules || {}; a.configuration.rules[t.dataset.rule] = t.checked; touch(a); renderGen(); return; }
  if (t.id === 'maxExp') { a.configuration.options = {...(a.configuration.options || {}), maxExpansion: Math.max(1, Math.min(100000, Number(t.value) || 20000))}; touch(a); renderGen(); return; }
  if (t.id === 'inclEmpty') { a.configuration.options = {...(a.configuration.options || {}), includeEmptyBaseline: t.checked}; touch(a); renderGen(); return; }
  if (t.id === 'intentSel') { a.intent = {...(a.intent || {})}; if (t.value) a.intent[curBeh().code] = t.value; else delete a.intent[curBeh().code]; touch(a); renderDetail(); renderGen(); renderAbstractList(); return; }
  if (t.id === 'fixFully') { a.fixed = {...(a.fixed || {}), fullyOnShoulder: t.checked}; touch(a); renderGen(); return; }
  if (t.id === 'addActor' && t.value) { const s = t.value, pos = SLOTS[s].pos; a.configuration.actors.push(Object.assign({slot: s, mode: 'optional', kinds: s === 'O' ? ['tire_debris'] : s === 'S' ? ['stopped_vehicle'] : ['car'], maneuvers: [{type: 'none'}]}, pos === 'offset' ? {offsetM: [-10, 10], speedMps: [25]} : {distanceM: [30], speedMps: s === 'S' || s === 'O' ? [0] : [25]}, s === 'S' ? {lateralOffsetM: [0]} : {}, s === 'O' ? {lanes: ['target']} : {})); touch(a); renderAll(); return; }
  if (t.id === 'addRoad' && t.value) { a.configuration.road[t.value] = TEXT_EXTRAS.has(t.value) ? ['nominal'] : [({laneWidthM: 3.66, shoulderWidthM: 3.0, distanceToMandatoryM: 400, curvature: 0, grade: 0})[t.value]]; touch(a); renderDetail(); renderGen(); return; }
  if (state.tab === 'actors' && onEditorInput(t)) { renderDetail(); renderGen(); renderAbstractList(); }
});
document.addEventListener('submit', e => {
  if (e.target.id !== 'reqForm') return; e.preventDefault();
  const a = absOf(state.abs); a.requirements = a.requirements || [];
  a.requirements.push({id: $('#rqId').value.trim(), title: $('#rqTitle').value.trim(), fixes: $('#rqFix').value.trim(), criterion: $('#rqCrit').value.trim()});
  touch(a); renderDetail(); toast('Exigence liée à l’abstract.');
});
function renderMatrix(){
  const ucs = ['Highway', 'Urban', 'Hub'], bs = DATA.behaviors.filter(b => state.ucFilter === 'all' || b.use_case === state.ucFilter);
  const abs = DATA.abstracts.filter(a => a.behaviors.some(id => bs.find(b => b.id === id)));
  const fams = [...new Set(abs.map(a => a.family))];
  const links = abs.reduce((n, a) => n + a.behaviors.filter(id => bs.find(b => b.id === id)).length, 0);
  let h = `<div class="mx-head"><div><h2>Matrice Behavior × Catalogue</h2><p class="muted">${abs.length} abstracts · ${bs.length} behaviors · ${links} liens. Une case = l'abstract sert à vérifier ce behavior ; la lettre donne l'intention du SDT. Cliquez une case pour l'ouvrir.</p></div>
    <div class="seg" role="group" aria-label="Use case">${['all', ...ucs].map(u => `<button type="button" data-uc="${u}" aria-pressed="${state.ucFilter === u}">${u === 'all' ? 'Tous' : u}</button>`).join('')}</div></div>
    <p class="note mx-legend">K rester dans la voie · L changement de voie · M se décaler · S arrêt accotement · I arrêt en voie · E évitement latéral · <span class="chip warn">2</span> génération jalon 2 · contour pointillé : justifié indirectement par le HIRE · point : lien ajouté depuis le HIRE</p>
    <div class="tablewrap mx-wrap"><table class="mx"><thead><tr><th class="mx-a">Abstract</th>${bs.map(b => `<th class="mx-b" title="${esc(b.name)}"><span>${esc(b.code)}</span></th>`).join('')}<th>Σ</th></tr>
    <tr class="mx-count"><td>abstracts par behavior</td>${bs.map(b => `<td>${absForBeh(b.id).length}</td>`).join('')}<td></td></tr></thead><tbody>`;
  const L = {keep_lane: 'K', lane_change: 'L', move_over: 'M', stop_on_shoulder: 'S', stop_in_lane: 'I', emergency_lateral: 'E'};
  for (const f of fams) {
    h += `<tr class="mx-fam"><td colspan="${bs.length + 2}">${esc(f)} · ${esc((DATA.families[f] || {}).name || '')}</td></tr>`;
    for (const a of abs.filter(x => x.family === f)) h += `<tr><td class="mx-a"><button type="button" class="linkish" data-mx="${esc(a.id)}|"><span class="mono">${esc(a.id)}</span> ${esc(titleOf(a))}</button></td>${bs.map(b => { if (!a.behaviors.includes(b.id)) return '<td></td>'; const J = (a.hire_links || {})[b.code] || {}; const add = (a.link_origin || {})[b.code]; return `<td class="on${a.configuration ? '' : ' ng'}${J.level && J.level !== 'justifié' ? ' ind' : ''}${add ? ' add' : ''}"><button type="button" data-mx="${esc(a.id)}|${esc(b.id)}" title="${esc(b.name)} · HIRE : ${esc(J.level || '?')} (${J.n ?? 0} lignes)${add ? ' · ' + esc(add) : ''}">${a.configuration ? L[intentFor(a, b)] || '•' : '2'}</button></td>`; }).join('')}<td class="num">${a.behaviors.filter(id => bs.find(b => b.id === id)).length}</td></tr>`;
  }
  $('#matrix').innerHTML = h + `</tbody></table></div>`;
}
function renderAll(){
  $('#modeWork').setAttribute('aria-pressed', state.mode === 'work'); $('#modeMatrix').setAttribute('aria-pressed', state.mode === 'matrix'); $('#modeGaps')?.setAttribute('aria-pressed', state.mode === 'gaps');
  $('main.work').hidden = state.mode !== 'work'; $('#matrix').hidden = state.mode === 'work';
  renderBehaviors();
  if (state.mode === 'matrix') { renderMatrix(); return; }
  if (state.mode === 'gaps') { renderGaps(); return; }
  renderAbstractList(); renderDetail(); renderGen();
}
runGen(); renderAll();
