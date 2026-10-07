/* ---------- Generate and SOTIF analysis views (loaded after app.js) ---------- */
const SO = DATA.sotif;
const G = {src: 'hire', drafts: [], accepted: [], n: 0, text: '', busy: false, onlyGaps: true, sotab: 'fi', soFilter: 'all', soBlock: 'all', soSel: null, treeMode: 'behavior', treeFi: 'FI-PCP-06'};

/* ---------- shared indexes ---------- */
function tc2scn(){ const m = {}; for (const s of DATA.scenarios) for (const t of s.tcs || []) (m[t] ??= []).push(s); return m; }
function scnTot(s){ const t = {valid: 0, pass: 0, fail: 0, not_run: 0, rej: 0, deferred: 0}; for (const code of Object.keys(s.links)) { const st = state.stats[`${s.id}@${code}`]; if (st) for (const k in t) t[k] += st.tot[k] || 0; } return t; }
function addTot(a, b){ for (const k in a) a[k] += b[k] || 0; return a; }
function worstOfScns(list){ let w = null; for (const s of list) for (const l of Object.values(s.links)) { const r = l.worst ? {...HIRE[l.worst], id: l.worst} : null; if (r && (!w || sevRank(r) > sevRank(w))) w = r; } return w; }
const statusChip = st => ({tested: '<span class="chip ok">tested</span>', partial: '<span class="chip ex">scenario, no test yet</span>', gap: '<span class="chip ko">no scenario</span>', latent: '<span class="chip nr">latent (no world TC)</span>'})[st];

/* ---------- Generate ---------- */
function registerDraft(d){ d.id = `DRAFT-${++G.n}`; SCN[d.id] = d; G.drafts.unshift(d); }
function acceptDraft(id){
  const d = G.drafts.find(x => x.id === id); if (!d || d.errors.length) return;
  const code = Object.keys(d.links)[0], k = G.accepted.filter(x => x.id.startsWith(`GEN-${code}`)).length + 1;
  delete SCN[d.id]; d.id = `GEN-${code}-${String(k).padStart(3, '0')}`; d.status = 'ACCEPTED'; SCN[d.id] = d;
  if (!DATA.families.GEN) DATA.families.GEN = {name: 'Generated', desc: 'Scenarios generated in this session'};
  DATA.scenarios.push(d); G.accepted.push(d); G.drafts = G.drafts.filter(x => x !== d);
  const res = state.results.mode === 'demo' ? null : state.results.mode === 'import' ? state.results.map : new Map();
  state.stats[`${d.id}@${code}`] = linkStats(d, BEH[code], d.links[code], DATA.odd, res);
  toast(`${d.id} added: ${fmt(state.stats[`${d.id}@${code}`].tot.valid)} tests generated.`);
}
function draftCard(d){
  const code = Object.keys(d.links)[0], link = d.links[code];
  return `<div class="card dcard"><div class="dtop"><span class="chip ${d.status === 'ACCEPTED' ? 'ok' : 'df'}">${d.status === 'ACCEPTED' ? esc(d.id) : 'draft'}</span><span class="chip">${esc(d.source.type)}</span>${d.template ? `<span class="chip code">from ${esc(d.template)}</span>` : ''}${d.perception ? '<span class="chip nr">perception</span>' : ''}</div>
    <h4>${esc(d.title)}</h4><p class="note" style="margin:0">${esc(d.desc)}</p>
    <div class="dmeta"><span>${riskBadge(link.worst ? {...HIRE[link.worst], id: link.worst} : null)} HIRE ${link.rows.length} rows</span><span>${link.criteria.length} criteria</span><span>${d.errors.length ? '<b style="color:var(--fail)">invalid</b>' : `≈ ${fmt(d.estimate)} combinations`}</span></div>
    <div class="dact">${cfgActors(d.configuration)}</div>
    ${d.errors.length ? `<div class="note" style="color:var(--fail)">${esc(d.errors.slice(0, 3).join(' · '))}</div>` : ''}
    <div class="dbtn">${d.status === 'ACCEPTED' ? `<button class="btn small" type="button" data-scn="${d.id}">Open</button>` : `<button class="btn small primary" type="button" data-g-accept="${d.id}" ${d.errors.length ? 'disabled' : ''}>Accept</button><button class="btn small" type="button" data-scn="${d.id}">Preview</button><button class="btn small" type="button" data-g-discard="${d.id}">Discard</button>`}</div></div>`;
}
function viewGenerate(){
  const b = BEH[state.beh];
  let list = '';
  if (G.src === 'hire') {
    const cs = hireCombos(b, DATA), shown = G.onlyGaps ? cs.filter(c => !c.covered.length) : cs;
    list = `<div class="filters"><div class="seg" role="group" aria-label="Rows"><button type="button" data-g-gaps="1" aria-pressed="${G.onlyGaps}">Not covered (${cs.filter(c => !c.covered.length).length})</button><button type="button" data-g-gaps="0" aria-pressed="${!G.onlyGaps}">All (${cs.length})</button></div>
      <button class="btn small" type="button" data-g-all="hire" ${shown.length ? '' : 'disabled'}>Draft all ${shown.length} shown</button><span class="note">One row = hazard × SDT command × ODD condition of the ${esc(b.code)} HIRE.</span></div>
      <div class="tablewrap"><table><thead><tr><th>Hazard</th><th>Command</th><th>ODD condition</th><th>Malfunctions</th><th>Worst</th><th>Covered by</th><th></th></tr></thead><tbody>
      ${shown.map((c, i) => `<tr><td><b>${c.hz}</b> <span class="muted">${esc(HZ[c.hz].name)}</span></td><td>${esc(c.man)}</td><td class="muted">${esc(c.odd)}</td><td style="font-size:12px">${esc(c.mals.slice(0, 4).join(', '))}${c.mals.length > 4 ? '…' : ''} <span class="muted">(${c.n})</span></td><td>${riskBadge({...HIRE[c.worst], id: c.worst})}</td>
        <td>${c.covered.length ? c.covered.slice(0, 3).map(x => `<span class="chip code">${x}</span>`).join(' ') + (c.covered.length > 3 ? ` +${c.covered.length - 3}` : '') : '<span class="chip ko">gap</span>'}</td><td><button class="btn small" type="button" data-g-hire="${esc(c.key)}" ${b.code === 'HUB-GEN' || c.hz === 'H6' ? 'disabled' : ''}>Draft</button></td></tr>`).join('') || `<tr><td colspan="7" class="empty">Every HIRE combination of ${esc(b.code)} already has a scenario. Show all rows to draft more.</td></tr>`}</tbody></table></div>`;
  }
  if (G.src === 'tc') {
    const hz = new Set(Object.values(HIRE).filter(r => r.beh === b.code).map(r => r.hz)), t2s = tc2scn();
    const rows = Object.values(SO.tcs).filter(t => t.hazards.some(h => hz.has(h)) && t.status !== 'Inactive');
    const cov = t => (t2s[t.id] || []).filter(s => s.links[b.code]);
    const shown = G.onlyGaps ? rows.filter(t => !cov(t).length) : rows;
    list = `<div class="filters"><div class="seg" role="group" aria-label="Rows"><button type="button" data-g-gaps="1" aria-pressed="${G.onlyGaps}">No scenario for ${esc(b.code)} (${rows.filter(t => !cov(t).length).length})</button><button type="button" data-g-gaps="0" aria-pressed="${!G.onlyGaps}">All (${rows.length})</button></div><span class="note">Triggering conditions of the TC catalogue whose hazards appear in the ${esc(b.code)} HIRE.</span></div>
      <div class="tablewrap"><table><thead><tr><th>TC</th><th>Layer · element</th><th>Triggering condition</th><th>Hazards</th><th>FIs</th><th>Covered by</th><th></th></tr></thead><tbody>
      ${shown.slice(0, 150).map(t => `<tr><td class="mono">${t.id}</td><td class="muted">${esc(t.layer)} · ${esc(t.element)}</td><td>${esc(t.text)}</td><td>${t.hazards.join(', ')}</td><td style="font-size:12px">${t.fis.slice(0, 3).join(', ')}${t.fis.length > 3 ? '…' : ''}</td><td>${cov(t).map(s => `<span class="chip code">${s.id}</span>`).join(' ') || '<span class="chip ko">gap</span>'}</td><td><button class="btn small" type="button" data-g-tc="${t.id}">Draft</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  if (G.src === 'ref') {
    const mine = DATA.scenarios.filter(s => s.links[b.code]);
    const fx = Object.entries(DATA.foretellix).map(([ref, f]) => ({key: 'FX ' + ref, label: `Foretellix §${ref} ${f.title}`, text: `${f.title} ${f.desc}`, note: f.torc, cov: mine.filter(s => (s.foretellix || []).some(x => x.ref === ref))}));
    const nh = Object.entries(DATA.nhtsa).map(([n, name]) => ({key: 'NHTSA ' + n, label: `NHTSA #${n} ${name}`, text: name, note: '', cov: mine.filter(s => (s.nhtsa || []).map(String).includes(String(n)))}));
    const rows = [...fx, ...nh], shown = G.onlyGaps ? rows.filter(r => !r.cov.length) : rows;
    list = `<div class="filters"><div class="seg" role="group" aria-label="Rows"><button type="button" data-g-gaps="1" aria-pressed="${G.onlyGaps}">Not covered for ${esc(b.code)} (${rows.filter(r => !r.cov.length).length})</button><button type="button" data-g-gaps="0" aria-pressed="${!G.onlyGaps}">All (${rows.length})</button></div><span class="note">Public references: Foretellix SAFE library (2020) and NHTSA pre-crash typology (DOT HS 810 767).</span></div>
      <div class="tablewrap"><table><thead><tr><th>Reference</th><th>Note</th><th>Covered by</th><th></th></tr></thead><tbody>
      ${shown.map(r => `<tr><td>${esc(r.label)}</td><td class="muted">${esc(r.note)}</td><td>${r.cov.map(s => `<span class="chip code">${s.id}</span>`).join(' ') || '<span class="chip ko">gap</span>'}</td><td><button class="btn small" type="button" data-g-ref="${esc(r.key)}" data-g-text="${esc(r.text)}" data-g-label="${esc(r.label)}">Draft</button></td></tr>`).join('')}</tbody></table></div>`;
  }
  if (G.src === 'text') {
    list = `<div class="card panel"><label class="eyebrow" for="gText">Describe the situation</label><textarea id="gText" rows="4" placeholder="Example: a semi in the left lane cuts in close in front of the SDT on a downhill curve, a car follows close behind">${esc(G.text)}</textarea>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button class="btn primary" type="button" id="gTpl">Draft from the closest template</button><button class="btn" type="button" id="gAi" ${sampleCap ? '' : 'disabled'}>${G.busy ? 'Claude is drafting…' : 'Draft with Claude'}</button></div>
      <p class="note">${sampleCap ? 'Draft with Claude builds actors, positions, speeds and maneuvers from your text, then the engine checks it.' : 'Draft with Claude is not available in this view; the template match works offline.'}</p></div>`;
  }
  const drafts = G.drafts.filter(d => d.links[b.code]), acc = G.accepted.filter(d => d.links[b.code]);
  return `<div class="bhead">${behaviorSelect('genSel')}<span class="chip">Intent: ${esc(INTENT[b.intent] || b.intent)}</span><span class="chip">${DATA.scenarios.filter(s => s.links[b.code]).length} scenarios today</span></div>
    <h2 style="font-size:22px;font-weight:800;margin-top:10px">Generate scenarios for ${esc(b.name)}</h2>
    <p class="note" style="max-width:100ch">Pick a source, draft scenarios, preview them, accept the good ones. Each draft comes with its HIRE rows and risk, its Jama pass/fail criteria, its ODD variants and its concrete tests. Drafts are PROPOSED until reviewed with Torc.</p>
    <div class="filters section"><div class="seg" role="tablist" aria-label="Source">${[['hire', 'From HIRE'], ['tc', 'From triggering conditions'], ['ref', 'From Foretellix & NHTSA'], ['text', 'Describe it']].map(([k, l]) => `<button type="button" data-g-src="${k}" aria-pressed="${G.src === k}">${l}</button>`).join('')}</div></div>
    <div class="cols"><div style="min-width:0">${list}</div>
    <aside class="side"><div class="card panel"><h3>Drafts for ${esc(b.code)} (${drafts.length})</h3>${drafts.length ? `<div style="display:flex;gap:8px;margin-bottom:10px"><button class="btn small primary" type="button" data-g-acceptall="1">Accept all valid</button><button class="btn small" type="button" data-g-clear="1">Discard all</button></div>` : '<p class="note">No draft yet. Use Draft on a row.</p>'}<div class="dlist">${drafts.map(draftCard).join('')}</div></div>
      <div class="card panel"><h3>Accepted in this session (${acc.length})</h3>${acc.length ? `<div class="dlist">${acc.map(draftCard).join('')}</div><button class="btn small" type="button" data-g-export="1" style="margin-top:10px">Export generated scenarios (.json)</button>` : '<p class="note">Accepted scenarios join the catalogue, the dashboards and the tree.</p>'}</div></aside></div>`;
}
let sampleCap = null;
(async () => { try { sampleCap = await window.claude?.use?.('sample'); } catch (e) { sampleCap = null; } if (state.view === 'generate') render(); })();
async function draftWithClaude(text){
  const b = BEH[state.beh];
  const prompt = `You turn a driving situation into a test scenario for an autonomous semi-truck (the SDT, 22 m long) on a highway. Behavior under test: ${b.code} ${b.name} (SDT intent: ${b.intent}).
Return JSON only: {"title": str, "desc": str, "hazards": ["H1".."H5"], "perception": bool, "road": {optional: "laneWidthM":[m], "curvature":[1/m], "grade":[%], "windGustMps":[m/s], "shoulderWidthM":[m]}, "actors": [ ... ]}.
Hazards: H1 side collision, H2 front collision, H3 rear-end by follower, H4 intent not communicated, H5 loss of stability.
Each actor: {"slot": one of A (lead, SDT lane, ahead), B (lead, target/adjacent lane, ahead), C (follower, SDT lane, behind), D (follower, adjacent lane, behind or alongside), G (other-side lane), S (right shoulder), O (object in a lane), "mode": "required" or "optional", "kinds": [from car, pickup, tractor_trailer, motorcycle, wide_load, police, ambulance, fire, tow, bus, pedestrian, deer, livestock, stopped_vehicle, tire_debris, lost_cargo, cones, crash_scene], then "distanceM": [m] for A B C S O, or "offsetM": [m, front of actor vs front of SDT] for D and G, "speedMps": [m/s] (omit for static kinds), for S "lateralOffsetM": [m], for O "lanes": ["origin" or "target"], "maneuvers": [{"type": "none"} or {"type":"brake","decelMps2":[..],"startS":[..]} or {"type":"cut_in","startS":[..]} or {"type":"cut_out","startS":[..]} or {"type":"drift","startS":[..]} or {"type":"accelerate","accelMps2":[..],"startS":[..]}]}.
Use 2 or 3 values per numeric list. Speeds up to 29 m/s for the SDT traffic. Situation: ${text}`;
  const out = await sampleCap.json(prompt, {modelTier: 'default'});
  const spec = out && out.actors ? out : (out?.json || out);
  return draftFromSpec(b, {...spec, source: {type: 'Claude', ref: text.slice(0, 80)}}, DATA);
}

/* ---------- SOTIF analysis ---------- */
function fiIndex(){
  const t2s = tc2scn(), out = {};
  for (const f of Object.values(SO.fis)) {
    const tcs = Object.values(SO.tcs).filter(t => t.fis.includes(f.id));
    const scns = [...new Map(tcs.flatMap(t => t2s[t.id] || []).map(s => [s.id, s])).values()];
    const tot = scns.reduce((a, s) => addTot(a, scnTot(s)), {valid: 0, pass: 0, fail: 0, not_run: 0, rej: 0, deferred: 0});
    const status = f.latent && !tcs.length ? 'latent' : !scns.length ? 'gap' : tot.pass + tot.fail ? 'tested' : 'partial';
    out[f.id] = {f, tcs, scns, tot, status, risk: worstOfScns(scns)};
  }
  return out;
}
function tcIndex(){ const t2s = tc2scn(), out = {}; for (const t of Object.values(SO.tcs)) { const scns = t2s[t.id] || []; const tot = scns.reduce((a, s) => addTot(a, scnTot(s)), {valid: 0, pass: 0, fail: 0, not_run: 0, rej: 0, deferred: 0}); out[t.id] = {t, scns, tot, status: !scns.length ? 'gap' : tot.pass + tot.fail ? 'tested' : 'partial', risk: worstOfScns(scns)}; } return out; }
function viewSotif(){
  const FI = fiIndex(), TC = tcIndex(), st = SO.stpa.summary;
  const cnt = (idx, s) => Object.values(idx).filter(x => x.status === s).length;
  let h = `<div class="chain section"><b>Functional insufficiency (FI)</b><i>→</i><b>Triggering condition (TC)</b><i>→</i><b>Hazard + HIRE risk</b><i>→</i><b>Scenario</b><i>→</i><b>Concrete tests</b><i>→</i><b>Results</b></div>
    <div class="kpis section">
      <div class="card kpi"><b>${Object.keys(SO.fis).length}</b><span>FIs · ${cnt(FI, 'tested')} tested · ${cnt(FI, 'gap')} without scenario · ${cnt(FI, 'latent')} latent</span></div>
      <div class="card kpi"><b>${Object.keys(SO.tcs).length}</b><span>TCs · ${cnt(TC, 'tested')} tested · ${cnt(TC, 'gap')} without scenario</span></div>
      <div class="card kpi"><b>${st['Active UCAs (working set)'] ?? '—'}</b><span>active STPA UCAs · ${st['UCAs with NO credibly-matched loss scenario (fuzzy, active set)'] ?? '—'} without loss scenario</span></div>
      <div class="card kpi"><b>${st['Loss Scenarios'] ?? '—'}</b><span>STPA loss scenarios · ${SO.stpa.groups.length} context groups</span></div>
      <div class="card kpi"><b>${SO.failure_modes.length}</b><span>hazard failure modes (not seen, seen wrongly, misjudged…)</span></div></div>
    <div class="filters section"><div class="seg" role="tablist" aria-label="Analysis">${[['fi', 'Functional insufficiencies'], ['tc', 'Triggering conditions'], ['stpa', 'STPA'], ['hz', 'Hazard failure modes']].map(([k, l]) => `<button type="button" data-so-tab="${k}" aria-pressed="${G.sotab === k}">${l}</button>`).join('')}</div>
      ${G.sotab === 'fi' || G.sotab === 'tc' ? `<div class="seg" role="group" aria-label="Status">${[['all', 'All'], ['tested', 'Tested'], ['partial', 'Scenario, no test'], ['gap', 'No scenario']].map(([k, l]) => `<button type="button" data-so-f="${k}" aria-pressed="${G.soFilter === k}">${l}</button>`).join('')}</div>` : ''}
      ${G.sotab === 'fi' ? `<select id="soBlock" aria-label="FI block"><option value="all">All blocks</option>${[...new Set(Object.values(SO.fis).map(f => f.block))].map(x => `<option ${x === G.soBlock ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>` : ''}</div>`;
  if (G.sotab === 'fi') {
    const rows = Object.values(FI).filter(x => (G.soFilter === 'all' || x.status === G.soFilter) && (G.soBlock === 'all' || x.f.block === G.soBlock));
    h += `<div class="cols"><div style="min-width:0"><div class="tablewrap"><table><thead><tr><th>FI</th><th>Hazards</th><th class="num">TCs</th><th class="num">Scenarios</th><th class="num">Tests</th><th style="min-width:120px">Results</th><th>Worst HIRE</th><th>Status</th></tr></thead><tbody>
      ${rows.map(x => `<tr class="click ${G.soSel === x.f.id ? 'sel' : ''}" data-so-fi="${x.f.id}"><td><span class="mono">${x.f.id}</span> <span class="muted">${esc(x.f.block)}</span><div style="font-size:12.5px">${esc(x.f.name)}</div></td><td>${x.f.hazards.join(', ') || '—'}</td><td class="num">${x.tcs.length}</td><td class="num">${x.scns.length}</td><td class="num">${fmt(x.tot.valid)}</td><td>${x.tot.valid ? sbar(x.tot) + `<div class="note">${rate(x.tot)} pass</div>` : ''}</td><td>${riskBadge(x.risk)}</td><td>${statusChip(x.status)}${x.f.mrm ? ' <span class="chip df">MRM</span>' : ''}</td></tr>`).join('')}</tbody></table></div></div>
      <aside class="side">${fiPanel(FI[G.soSel] || null)}</aside></div>`;
  }
  if (G.sotab === 'tc') {
    const rows = Object.values(TC).filter(x => G.soFilter === 'all' || x.status === G.soFilter).sort((a, b) => b.tot.fail - a.tot.fail || a.t.id.localeCompare(b.t.id));
    h += `<div class="tablewrap"><table><thead><tr><th>TC</th><th>Layer · element</th><th>Triggering condition</th><th>Hazards</th><th>FIs</th><th>STPA group</th><th>Scenarios</th><th class="num">Tests</th><th style="min-width:110px">Results</th><th>Status</th></tr></thead><tbody>
      ${rows.map(x => `<tr><td class="mono">${x.t.id}</td><td class="muted">${esc(x.t.layer)} · ${esc(x.t.element)}</td><td>${esc(x.t.text)}</td><td>${x.t.hazards.join(', ')}</td><td style="font-size:12px">${x.t.fis.join(', ')}</td><td style="font-size:12px">${esc(x.t.stpa.join(', '))}</td><td>${x.scns.map(s => `<button class="chip code" type="button" data-scn="${s.id}">${s.id}</button>`).join(' ') || '—'}</td><td class="num">${fmt(x.tot.valid)}</td><td>${x.tot.valid ? sbar(x.tot) : ''}</td><td>${statusChip(x.status)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  if (G.sotab === 'stpa') {
    const GW = ['Not providing', 'Providing', 'Too late', 'Too early', 'Duration', 'Unclear'], t2s = tc2scn();
    const miss = {}; for (const u of SO.stpa.missing) miss[u.group] = (miss[u.group] || 0) + 1;
    h += `<div class="section-head"><h2>Context groups</h2><span class="hint">UCAs by STPA guideword (QA review 27 Jul 2026). Red cell = no UCA for that guideword. TCs and scenarios through the Full Mapping.</span></div>
      <div class="tablewrap"><table class="heat"><thead><tr><th>Context group</th>${GW.map(g => `<th>${g}</th>`).join('')}<th>UCAs</th><th>Without loss scenario</th><th>TCs</th><th>Scenarios</th><th>Tests</th></tr></thead><tbody>
      ${SO.stpa.groups.map(g => { const tcs = Object.values(SO.tcs).filter(t => t.stpa.includes(g.name)); const scns = [...new Map(tcs.flatMap(t => t2s[t.id] || []).map(s => [s.id, s])).values()]; const tot = scns.reduce((a, s) => addTot(a, scnTot(s)), {valid: 0, pass: 0, fail: 0, not_run: 0, rej: 0, deferred: 0});
        return `<tr><td><b>${esc(g.name)}</b></td>${GW.map(w => `<td style="background:${g.ucas[w] ? 'var(--surface)' : 'var(--fail-soft)'}">${g.ucas[w]}</td>`).join('')}<td><b>${g.total}</b></td><td style="background:${miss[g.name] ? 'var(--excl-soft)' : 'var(--surface)'}">${miss[g.name] || 0}</td><td>${tcs.length}</td><td>${scns.length}</td><td>${fmt(tot.valid)}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="section-head section"><h2>QA findings</h2></div><div class="tablewrap"><table><thead><tr><th>Severity</th><th>Area</th><th>Finding</th><th>Recommendation</th></tr></thead><tbody>${SO.stpa.findings.map(f => `<tr><td><span class="chip ${f.sev === 'HIGH' ? 'ko' : f.sev === 'MED' ? 'ex' : 'nr'}">${esc(f.sev)}</span></td><td>${esc(f.area)}</td><td style="font-size:12.5px">${esc(f.finding)}</td><td style="font-size:12.5px" class="muted">${esc(f.rec)}</td></tr>`).join('')}</tbody></table></div>
      <details class="section"><summary class="stitle" style="cursor:pointer">${SO.stpa.missing.length} active UCAs without a loss scenario</summary><div class="tablewrap" style="margin-top:8px"><table><thead><tr><th>UCA</th><th>Context group</th><th>Guideword</th><th>Text</th></tr></thead><tbody>${SO.stpa.missing.map(u => `<tr><td class="mono">${esc(u.id)}</td><td>${esc(u.group)}</td><td>${esc(u.gw)}</td><td style="font-size:12.5px">${esc(u.text)}</td></tr>`).join('')}</tbody></table></div></details>`;
  }
  if (G.sotab === 'hz') {
    h += `<div class="tablewrap"><table><thead><tr><th>Hazard</th><th>Failure mode</th><th>Meaning</th><th>FIs</th><th>FIs tested</th></tr></thead><tbody>
      ${SO.failure_modes.map(m => { const t = m.fis.filter(id => FI[id]?.status === 'tested').length; return `<tr><td><b>${m.hazard}</b> <span class="muted">${esc(HZ[m.hazard]?.name || '')}</span></td><td><b>${esc(m.mode)}</b></td><td class="muted" style="font-size:12.5px">${esc(m.meaning)}</td><td>${m.fis.map(id => `<button class="chip code" type="button" data-so-fi="${id}" data-so-go="1">${id}</button>`).join(' ')}</td><td><span class="chip ${t === m.fis.length ? 'ok' : t ? 'ex' : 'ko'}">${t} / ${m.fis.length}</span></td></tr>`; }).join('')}</tbody></table></div>`;
  }
  return h;
}
function fiPanel(x){
  if (!x) return `<div class="card panel"><h3>Select an FI</h3><p class="note">Its causes in the AV3.0 architecture, the triggering conditions that activate it, the scenarios that test it and their results appear here.</p></div>`;
  return `<div class="card panel"><div class="sid">${x.f.id} · ${esc(x.f.block)}</div><h3 style="margin-top:4px">${esc(x.f.name)}</h3>
    <div class="note" style="margin-bottom:8px">Hazards ${x.f.hazards.join(', ') || '—'} · ${statusChip(x.status)} ${x.f.mrm ? '<span class="chip df">MRM</span>' : ''}</div>
    ${x.tot.valid ? sbar(x.tot) + `<div class="note" style="margin:4px 0 10px">${fmt(x.tot.pass)} pass · ${fmt(x.tot.fail)} fail · ${fmt(x.tot.not_run)} not run</div>` : ''}
    <div class="eyebrow">Causes (AV3.0)</div><ul class="note" style="margin:4px 0 10px;padding-left:18px">${x.f.causes.map(c => `<li>${esc(c.component)}${c.note ? ` · ${esc(c.note)}` : ''}</li>`).join('') || '<li>—</li>'}</ul>
    <div class="eyebrow">Triggering conditions (${x.tcs.length})</div><ul class="note" style="margin:4px 0 10px;padding-left:18px;max-height:200px;overflow:auto">${x.tcs.map(t => `<li><span class="mono">${t.id}</span> ${esc(t.text)}</li>`).join('') || '<li>none: latent FI</li>'}</ul>
    <div class="eyebrow">Scenarios (${x.scns.length})</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${x.scns.map(s => `<button class="chip code" type="button" data-scn="${s.id}" title="${esc(s.title)}">${s.id}</button>`).join('') || '<span class="note">No scenario yet: draft one in Generate from its TCs.</span>'}</div>
    <div style="margin-top:10px"><button class="btn small" type="button" data-fi-tree="${x.f.id}">View as tree</button></div></div>`;
}
function fiTcTab(s){
  const tcs = (s.tcs || []).map(id => SO.tcs[id]).filter(Boolean);
  if (!tcs.length) return `<div class="empty">No triggering condition linked to this scenario yet.</div>`;
  const fis = [...new Set(tcs.flatMap(t => t.fis))].map(id => SO.fis[id]).filter(Boolean);
  return `<div class="section-head"><h2>Triggering conditions</h2></div><div class="tablewrap"><table><thead><tr><th>TC</th><th>Layer · element</th><th>Condition</th><th>Hazards</th><th>FIs</th><th>STPA context</th></tr></thead><tbody>
    ${tcs.map(t => `<tr><td class="mono">${t.id}</td><td class="muted">${esc(t.layer)} · ${esc(t.element)}</td><td>${esc(t.text)}</td><td>${t.hazards.join(', ')}</td><td style="font-size:12px">${t.fis.join(', ')}</td><td style="font-size:12px">${esc(t.stpa.join(', '))}</td></tr>`).join('')}</tbody></table></div>
    <div class="section-head section"><h2>Functional insufficiencies reached</h2></div><div class="tablewrap"><table><thead><tr><th>FI</th><th>Block</th><th>Insufficiency</th><th>Causes (AV3.0)</th></tr></thead><tbody>
    ${fis.map(f => `<tr><td class="mono">${f.id}</td><td>${esc(f.block)}</td><td style="font-size:12.5px">${esc(f.name)}</td><td class="muted" style="font-size:12px">${esc(f.causes.map(c => c.component).join(' · '))}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ---------- FI tree ---------- */
function drawFiTree(){
  const FI = fiIndex(), x = FI[G.treeFi]; if (!x) return;
  const NW = 270, NH = 50, GAP = 12, X = [20, 340, 660], nodes = [], links = []; let y = 20; const t2s = tc2scn();
  const root = {x: X[0], label: `${x.f.id} · ${x.f.block}`, sub: x.f.name, t: x.tot, kind: 'fi'};
  for (const t of x.tcs) {
    const scns = t2s[t.id] || []; const tn = {x: X[1], label: `${t.id} · ${t.text}`, sub: `${t.element} · ${t.hazards.join(', ')} · ${scns.length} scenario(s)`, t: scns.reduce((a, s) => addTot(a, scnTot(s)), {valid: 0, pass: 0, fail: 0, not_run: 0, rej: 0, deferred: 0}), kind: 'tc'};
    if (scns.length) { const kids = scns.map(s => { const tot = scnTot(s); const n = {x: X[2], y, label: `${s.id} · ${s.title}`, sub: `${Object.keys(s.links).join(', ')} · ${fmt(tot.valid)} tests · ${rate(tot)} pass`, t: tot, kind: 'scn', id: s.id}; y += NH + GAP; nodes.push(n); return n; }); tn.y = (kids[0].y + kids.at(-1).y) / 2; kids.forEach(k => links.push([tn, k])); }
    else { tn.y = y; y += NH + GAP; tn.gap = true; }
    nodes.push(tn); links.push([root, tn]);
  }
  const tcn = nodes.filter(n => n.kind === 'tc'); root.y = tcn.length ? (tcn[0].y + tcn.at(-1).y) / 2 : 20; nodes.push(root);
  const H = Math.max(y + 10, 120), W = X[2] + NW + 20;
  const color = n => n.gap ? 'var(--fail)' : !n.t || !(n.t.pass + n.t.fail) ? 'var(--notrun)' : n.t.fail / (n.t.pass + n.t.fail) > 0.1 ? 'var(--fail)' : n.t.fail ? 'var(--amber)' : 'var(--pass)';
  const clip = (t, n) => t.length > n ? t.slice(0, n - 1) + '…' : t;
  let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tree of ${esc(x.f.id)}">`;
  for (const [a, c] of links) { const x1 = a.x + NW, y1 = a.y + NH / 2, x2 = c.x, y2 = c.y + NH / 2, mx = (x1 + x2) / 2; s += `<path class="tlink" d="M${x1} ${y1} C${mx} ${y1},${mx} ${y2},${x2} ${y2}"/>`; }
  for (const n of nodes) { const tot = n.t ? n.t.pass + n.t.fail + n.t.not_run : 0;
    s += `<g class="tnode" ${n.kind === 'scn' ? `data-open="${n.id}"` : ''} transform="translate(${n.x},${n.y})"><rect class="box" width="${NW}" height="${NH}" rx="8"/><rect width="5" height="${NH}" rx="2" fill="${color(n)}"/><text class="t1" x="14" y="19">${esc(clip(n.label, 38))}</text><text class="t2" x="14" y="36">${esc(clip(n.gap ? 'no scenario: gap' : n.sub, 46))}</text>`;
    if (tot) { const w = NW - 28; let x0 = 14; for (const [k, c] of [['pass', 'var(--pass)'], ['fail', 'var(--fail)'], ['not_run', 'var(--notrun)']]) { const ww = w * (n.t[k] || 0) / tot; s += `<rect x="${x0}" y="${NH - 7}" width="${ww}" height="3" fill="${c}"/>`; x0 += ww; } }
    s += `</g>`; }
  $('#treeWrap').innerHTML = s + '</svg>';
}

/* ---------- events for these views ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('[data-g-src],[data-g-gaps],[data-g-all],[data-g-hire],[data-g-tc],[data-g-ref],[data-g-accept],[data-g-discard],[data-g-acceptall],[data-g-clear],[data-g-export],#gTpl,#gAi,[data-so-tab],[data-so-f],[data-so-fi],[data-fi-tree],[data-tree-mode]');
  if (!t) return;
  const b = BEH[state.beh];
  if (t.dataset.gSrc) { G.src = t.dataset.gSrc; return render(); }
  if (t.dataset.gGaps) { G.onlyGaps = t.dataset.gGaps === '1'; return render(); }
  if (t.dataset.gHire) { const c = hireCombos(b, DATA).find(x => x.key === t.dataset.gHire); const d = c && draftFromHire(b, c, DATA); if (d) { registerDraft(d); toast('Draft added.'); } else toast('No template for this combination yet.'); return render(); }
  if (t.dataset.gAll) { const cs = hireCombos(b, DATA).filter(c => !G.onlyGaps || !c.covered.length); let n = 0; for (const c of cs) { const d = draftFromHire(b, c, DATA); if (d) { registerDraft(d); n++; } } toast(`${n} drafts added.`); return render(); }
  if (t.dataset.gTc) { const tc = SO.tcs[t.dataset.gTc]; const tpl = matchTemplate(`${tc.element} ${tc.text}`, b, DATA); const d = tpl && draftFromTemplate(b, tpl, {title: `${tc.text} (${tc.id})`, desc: `Generated from ${tc.id} ${tc.layer} ${tc.element}: ${tc.text}. Template ${tpl.id}. FIs ${tc.fis.join(', ')}.`, source: {type: 'TC', ref: tc.id}, tcs: [tc.id]}, DATA); if (d) { registerDraft(d); toast(`Draft added from ${tpl.id}.`); } else toast('No template recognised: describe it in « Describe it ».'); return render(); }
  if (t.dataset.gRef) { const tpl = matchTemplate(t.dataset.gText, b, DATA); const d = tpl && draftFromTemplate(b, tpl, {title: `${t.dataset.gLabel}`, desc: `Generated from ${t.dataset.gLabel}. Template ${tpl.id}.`, source: {type: t.dataset.gRef.split(' ')[0], ref: t.dataset.gRef}}, DATA); if (d) { registerDraft(d); toast(`Draft added from ${tpl.id}.`); } else toast('No template recognised for this reference.'); return render(); }
  if (t.dataset.gAccept) { acceptDraft(t.dataset.gAccept); return render(); }
  if (t.dataset.gDiscard) { const d = G.drafts.find(x => x.id === t.dataset.gDiscard); delete SCN[d.id]; G.drafts = G.drafts.filter(x => x !== d); return render(); }
  if (t.dataset.gAcceptall) { G.drafts.filter(d => d.links[state.beh] && !d.errors.length).map(d => d.id).forEach(acceptDraft); return render(); }
  if (t.dataset.gClear) { G.drafts.filter(d => d.links[state.beh]).forEach(d => delete SCN[d.id]); G.drafts = G.drafts.filter(d => !d.links[state.beh]); return render(); }
  if (t.dataset.gExport) return save('generated_scenarios.json', JSON.stringify({schema: 'scenario-studio/generated@0.1', exported: new Date().toISOString(), scenarios: G.accepted}, null, 1));
  if (t.id === 'gTpl') { G.text = $('#gText').value; const tpl = matchTemplate(G.text, b, DATA); const d = tpl && draftFromTemplate(b, tpl, {title: G.text.slice(0, 70), desc: `Described: ${G.text}. Template ${tpl.id}.`, source: {type: 'Text', ref: G.text.slice(0, 80)}}, DATA); if (d) { registerDraft(d); toast(`Draft added from ${tpl.id}.`); } else toast('No close template: try Draft with Claude.'); return render(); }
  if (t.id === 'gAi' && sampleCap && !G.busy) { G.text = $('#gText').value; if (!G.text.trim()) return toast('Describe the situation first.'); G.busy = true; render(); try { const d = await draftWithClaude(G.text); registerDraft(d); toast(d.errors.length ? 'Draft added, the engine found values to fix.' : 'Draft added.'); } catch (err) { toast(err && err.code === 'not_granted' ? 'Claude is not allowed on this page.' : 'Claude could not draft this one.'); } G.busy = false; return render(); }
  if (t.dataset.soTab) { G.sotab = t.dataset.soTab; return render(); }
  if (t.dataset.soF) { G.soFilter = t.dataset.soF; return render(); }
  if (t.dataset.soFi) { G.soSel = t.dataset.soFi; if (t.dataset.soGo) G.sotab = 'fi'; return render(); }
  if (t.dataset.fiTree) { G.treeMode = 'fi'; G.treeFi = t.dataset.fiTree; return setView('tree'); }
  if (t.dataset.treeMode) { G.treeMode = t.dataset.treeMode; return render(); }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'genSel') { state.beh = t.value; return render(); }
  if (t.id === 'soBlock') { G.soBlock = t.value; return render(); }
  if (t.id === 'fiSel') { G.treeFi = t.value; return render(); }
});

const start = (location.hash || '').replace('#', '');
setView(['overview', 'behavior', 'generate', 'sotif', 'tree', 'odd', 'data'].includes(start) ? start : 'overview');
