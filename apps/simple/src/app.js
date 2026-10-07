/* ---------- Scenario Studio, version simple : behavior + liste de scénarios -> liens -> concrets ---------- */
const DATA = JSON.parse(document.getElementById('seed').textContent);
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const toast = msg => { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 3400); };
const absOf = id => DATA.abstracts.find(a => a.id === id);
const behOf = code => DATA.behaviors.find(b => b.code === code);
const SIDE = {left: 'gauche', right: 'droite'};
const ROAD_EXTRAS = {laneWidthM: ['Largeur de voie', 'm'], shoulderWidthM: ['Largeur d’accotement', 'm'], distanceToMandatoryM: ['Distance au point obligatoire', 'm'], curvature: ['Courbure', '1/m'], grade: ['Pente', '%'], speedLimitMps: ['Limite de vitesse', 'm/s'], windGustMps: ['Rafale de vent', 'm/s'], markingQuality: ['État du marquage', ''], mapMismatch: ['Écart carte / réalité', ''], degradation: ['Dégradation système', '']};
const INTENT = {keep_lane: 'rester dans la voie', lane_change: 'changer de voie', move_over: 'se décaler', stop_on_shoulder: 's’arrêter sur l’accotement', stop_in_lane: 's’arrêter dans la voie', emergency_lateral: 'évitement latéral'};

const EXAMPLE = `Lane Change\tSDT passes a vehicle stopped on the shoulder
Lane Change\tFast vehicle approaching from behind in the target lane
Lane Change\tLane change into a gap between two vehicles
Lane Change\tMotorcycle in the blind spot during the lane change
Cut-in\tVehicle cuts in from the left lane with a short gap
Lead vehicle\tLead vehicle brakes hard
Lead vehicle\tStopped vehicle ahead in the ego lane
Merge\tVehicle merging from the on-ramp
Road\tLane drop ahead
Road\tWork zone with lane closure
Object\tTire debris in the lane
VRU\tPedestrian walking near the travel lane
EMV\tPolice car stopped on the shoulder with lights on
Weather\tHeavy rain with standing water`;

const state = { beh: 'HW-LC', rows: [], results: null, open: null, sel: null, shown: 30 };

/* ---------- 1. Reconnaître un scénario : règles par mots clés, puis ressemblance ---------- */
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’']/g, ' ');
const has = (t, re) => re.test(t);
const MATCH_RULES = [
  [/(shoulder|accotement|bas.cote)/, /(police|ambulance|fire|pompier|emv|tow|depanneuse|gyro|emergency lights|lights on)/, ['LC-OOD-01'], 'accotement + véhicule d’urgence arrêté'],
  [/(shoulder|accotement|bas.cote)/, /(stopped|stationary|disabled|broken|parked|arrete|panne|immobil)/, ['LC-REF-01', 'OBJ-03'], 'véhicule arrêté sur l’accotement'],
  [/(emv|emergency vehicle|ambulance|police|fire truck|pompier|vehicule d urgence)/, /(approach|behind|siren|arriv|derriere|sirene)/, ['LC-OOD-02', 'EMV-03'], 'véhicule d’urgence qui arrive'],
  [/(emv|emergency vehicle|ambulance|police|fire truck|pompier|urgence)/, /(stopped|block|in lane|arrete|bloque)/, ['EMV-05'], 'véhicule d’urgence dans la voie'],
  [/(police|leo|trooper)/, /(follow|pull over|suit|interpell)/, ['EMV-04'], 'policier qui suit le SDT'],
  [/brake.?check/, null, ['CI-07'], 'brake-check'],
  [/(cut.?in|cuts in|rabat|se rabat|insere devant)/, /(two|deux|succes|platoon|convoy)/, ['CI-08'], 'double cut-in'],
  [/(cut.?in|cuts in|rabat|se rabat|insere devant)/, /(right|droite)/, ['CI-03'], 'cut-in par la droite'],
  [/(cut.?in|cuts in|rabat|se rabat|insere devant)/, /(truck|semi|tractor|trailer|camion)/, ['CI-05'], 'cut-in d’un semi'],
  [/(cut.?in|cuts in|rabat|se rabat|insere devant)/, /(short|tight|close|serre|court|proche)/, ['CI-02', 'CI-01'], 'cut-in serré'],
  [/(cut.?in|cuts in|rabat|se rabat|insere devant)/, /(slow|lent)/, ['CI-04'], 'cut-in lent'],
  [/(cut.?in|cuts in|rabat|se rabat|insere devant)/, null, ['CI-01', 'CI-02'], 'cut-in'],
  [/(cut.?out|cuts out|quitte la voie|libere la voie)/, /(reveal|expos|stopped|obstacle|revele|arrete)/, ['LC-CUR-02'], 'cut-out qui révèle un obstacle'],
  [/(cut.?out|cuts out|quitte la voie|libere la voie)/, /(exit|sortie|off.?ramp)/, ['RMP-11'], 'leader qui prend la sortie'],
  [/(cut.?out|cuts out|quitte la voie|libere la voie)/, null, ['LV-11', 'LC-CUR-02'], 'cut-out'],
  [/(marking|marquage|lane line)/, /(degrad|faded|missing|absent|efface|worn)/, ['LC-RD-06'], 'marquage dégradé'],
  [/(wrong.?way|contresens|sens inverse)/, null, ['AB-01'], 'contresens'],
  [/(crash|accident|collision scene)/, null, ['LC-OOD-04'], 'scène d’accident'],
  [/(animal|deer|cerf|cow|cattle|livestock|betail|vache)/, null, ['OBJ-04'], 'animal'],
  [/(pedestrian|pieton|person|worker|ouvrier|people)/, null, ['OBJ-05'], 'piéton'],
  [/(cyclist|cycliste|bike|velo|bicycle)/, null, ['URB-10'], 'cycliste'],
  [/(debris|tire|pneu|lost cargo|chargement|object|objet|ladder)/, /(target|cible|adjacent|next lane)/, ['LC-OOD-03'], 'objet dans la voie cible'],
  [/(debris|tire|pneu|lost cargo|chargement|object|objet|ladder)/, /(sudden|soudain|fall|tombe|late)/, ['OBJ-06'], 'objet soudain'],
  [/(debris|tire|pneu|small|petit)/, null, ['OBJ-01', 'LC-OOD-03', 'OBJ-02'], 'débris dans la voie'],
  [/(lost cargo|chargement|object|objet|ladder|obstacle)/, null, ['OBJ-02', 'LC-OOD-03'], 'objet dans la voie'],
  [/(lane drop|lane end|lane ends|ends ahead|fin de voie|voie se termine|reduction de voie|merge at lane end)/, null, ['LC-RD-01'], 'fin de voie'],
  [/(work zone|construction|cone|travaux|chantier|closure|fermeture)/, null, ['LC-RD-02'], 'zone de travaux'],
  [/(weav|entrecroisement)/, null, ['LC-RD-03', 'RMP-13'], 'entrecroisement'],
  [/(sdt|ego|truck|camion)/, /(merge|merges|merging|s insere|insertion)/, ['RMP-01', 'RMP-02', 'RMP-03', 'RMP-13'], 'insertion du SDT'],
  [/(on.?ramp|merg|insertion|bretelle d acces|entrance ramp|acceleration lane)/, /(convoy|several|multiple|plusieurs|platoon|file)/, ['RMP-12'], 'convoi qui s’insère'],
  [/(on.?ramp|merg|insertion|bretelle d acces|entrance ramp|acceleration lane)/, null, ['LC-RD-05', 'CI-06', 'RMP-01'], 'véhicule qui s’insère'],
  [/(off.?ramp|exit|sortie)/, null, ['LC-RD-04', 'RMP-11', 'RMP-07', 'RMP-06', 'RMP-08'], 'sortie'],
  [/(blind spot|angle mort)/, null, ['LC-TGT-06', 'LC-TGT-05'], 'angle mort'],
  [/(motorcycle|moto|motorbike)/, /(split|filter|remonte|between)/, ['ADJ-03'], 'moto entre les files'],
  [/(motorcycle|moto|motorbike)/, null, ['LC-TGT-06', 'LV-09', 'ADJ-03'], 'moto'],
  [/(fast|rapid|speeding|rapide|high speed)/, /(behind|rear|arriere|derriere|approach)/, ['LC-TGT-01', 'ADJ-04'], 'véhicule rapide derrière'],
  [/(tailgat|colle|too close behind|following too close|suiveur)/, null, ['LC-CUR-03', 'AB-02'], 'suiveur trop proche'],
  [/(abort|annul|cancel)/, null, ['LC-ABT-01', 'LC-ABT-02'], 'annulation'],
  [/(return|retour|back to)/, /(lane|voie)/, ['LC-NOM-04'], 'retour dans la voie'],
  [/(overtak|pass|depass|doubl)/, /(slow|lent)/, ['LC-NOM-03'], 'dépassement d’un lent'],
  [/(gap|creneau|trou)/, /(clos|ferme|shrink)/, ['LC-TGT-03'], 'gap qui se ferme'],
  [/(gap|creneau|between two|entre deux)/, null, ['LC-NOM-02', 'LC-TGT-03'], 'gap entre deux véhicules'],
  [/(hug|close to the line|serre la ligne|near the marking|edge of lane)/, null, ['ADJ-06'], 'lane hugger'],
  [/(slow|lent)/, /(adjacent|neighbo|voisin|next lane|voie voisine)/, ['ADJ-05'], 'convoi lent à côté'],
  [/(stopped|queue|file|arrete)/, /(adjacent|neighbo|voisin|next lane|voie voisine)/, ['ADJ-07'], 'file arrêtée à côté'],
  [/(drift|deriv|swerv|sway|louvoie|weaving vehicle)/, null, ['ADJ-01', 'ADJ-02'], 'véhicule qui dérive'],
  [/(wide load|oversize|convoi exceptionnel|large vehicle|truck next|semi adjacent|next to a truck)/, null, ['LC-TGT-07'], 'gros véhicule à côté'],
  [/(lead|leader|vehicle ahead|vehicule devant|front vehicle)/, /(hard|sudden|emergency|fort|brutal|panic)/, ['LV-04'], 'leader qui freine fort'],
  [/(lead|leader|vehicle ahead|vehicule devant|front vehicle)/, /(brak|decel|frein|ralenti|slows)/, ['LV-03', 'LC-CUR-01'], 'leader qui ralentit'],
  [/(lead|leader|vehicle ahead|vehicule devant|front vehicle)/, /(accel|speeds up|accelere)/, ['LV-06'], 'leader qui accélère'],
  [/(lead|leader|vehicle ahead|vehicule devant)/, /(erratic|erratique)/, ['LV-08'], 'leader erratique'],
  [/(occlu|hidden|masque|blocks the view|cache)/, null, ['LV-10'], 'leader qui masque'],
  [/(stopped|stationary|arrete|immobile|stalled)/, /(ahead|in lane|ego lane|devant|dans la voie|in the lane)/, ['LV-05', 'EMV-05'], 'véhicule arrêté devant'],
  [/(slow|lent)/, /(lead|ahead|devant|leader)/, ['LV-02', 'LC-NOM-03'], 'leader lent'],
  [/(stop.?and.?go|accordeon|traffic jam|congestion|bouchon|dense traffic)/, null, ['LV-07'], 'trafic en accordéon'],
  [/(no shoulder|bridge|pont|viaduc|sans accotement)/, null, ['RD-11'], 'pas d’accotement'],
  [/(curve|courbe|virage|bend)/, null, ['LC-RD-07', 'RD-14', 'RMP-08'], 'courbe'],
  [/(grade|slope|downhill|uphill|descente|pente|montee)/, null, ['RD-13', 'LC-RD-07'], 'pente'],
  [/(wind|vent|gust|rafale)/, null, ['RD-12'], 'vent'],
  [/(narrow|etroite|lane width|largeur)/, null, ['RD-09'], 'voie étroite'],
  [/(speed limit|limite de vitesse|speed zone)/, null, ['RD-10'], 'limite de vitesse'],
  [/(map|carte|hd map)/, null, ['LC-RD-08'], 'écart carte'],
  [/(sensor|fault|failure|degrad|defaillance|panne systeme|loss of)/, null, ['FB-01', 'FB-02', 'LC-ABT-02'], 'dégradation système'],
  [/(mrm|minimal risk|pull over|arret d urgence|emergency stop)/, null, ['FB-01', 'FB-04', 'FB-02'], 'manœuvre de repli'],
  [/(free road|empty road|no traffic|route libre|open road|cruise)/, null, ['LV-01'], 'route libre'],
  [/(lane change|changement de voie|change lane|changes lane)/, null, ['LC-NOM-01', 'LC-NOM-02'], 'changement de voie'],
];
const OUT_OF_SCOPE = [/(rain|pluie|fog|brouillard|snow|neige|glare|sun|soleil|night|nuit|ice|verglas|wet|mouill|weather|meteo|dust|poussiere|smoke)/, 'condition météo ou de perception : hors jalon 1 (perception parfaite, adhérence non modélisée)'];
const SYN = {vehicule: 'vehicle', voie: 'lane', arrete: 'stopped', accotement: 'shoulder', freine: 'brake', leader: 'lead', pieton: 'pedestrian', debris: 'debris', travaux: 'work', camion: 'truck', moto: 'motorcycle', lent: 'slow', rapide: 'fast', sortie: 'exit', insertion: 'merge', courbe: 'curve', pente: 'grade', changement: 'change', derriere: 'behind', devant: 'ahead', gauche: 'left', droite: 'right', vent: 'wind', objet: 'object', urgence: 'emergency'};
const STOP = new Set('a an the in on of to with and or for from at by is le la les un une des du de en au aux et ou dans sur avec par pour sdt ego vehicle lane'.split(' '));
const toks = s => new Set(norm(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).map(w => SYN[w] || w).map(w => w.replace(/(ing|ed|es|s)$/, '')).filter(w => w.length > 2 && !STOP.has(w)));
const ABS_TOK = DATA.abstracts.map(a => [a.id, toks(`${a.title} ${a.name} ${a.description} ${DATA.families[a.family] || ''}`)]);

function recognise(row, code){
  const t = norm(`${row.family} ${row.text}`);
  const direct = DATA.abstracts.find(a => new RegExp(`\\b${a.id.toLowerCase()}\\b`).test(t));
  if (direct) return {tpl: direct.id, method: 'ID', why: `ID ${direct.id} dans le texte`};
  for (const [a, b, cands, label] of MATCH_RULES) {
    if (has(t, a) && (!b || has(t, b))) {
      const pick = cands.find(id => absOf(id)?.beh_codes.includes(code)) || cands[0];
      return {tpl: pick, method: 'règle', why: `règle « ${label} »`, cands};
    }
  }
  if (OUT_OF_SCOPE[0].test(t)) return {tpl: null, method: 'hors périmètre', why: OUT_OF_SCOPE[1]};
  const q = toks(row.text); let best = null, bs = 0;
  for (const [id, T] of ABS_TOK) { let inter = 0; q.forEach(w => { if (T.has(w)) inter++; }); const s = inter / (q.size + 2); if (s > bs) { bs = s; best = id; } }
  if (best && bs >= 0.25) return {tpl: best, method: 'ressemblance', why: `mots communs avec ${best} (score ${bs.toFixed(2)}), à confirmer`};
  return {tpl: null, method: 'non reconnu', why: 'aucun modèle reconnu : choisissez-en un'};
}

/* ---------- 2. Lien behavior <-> scénario ---------- */
function decide(row){
  const code = state.beh, tpl = row.tpl ? absOf(row.tpl) : null;
  if (!tpl) return {auto: false, why: row.match.why};
  const linked = tpl.beh_codes.includes(code), J = (tpl.hire_links || {})[code];
  if (!tpl.configuration) return {auto: linked, why: `${tpl.id} ${linked ? 'est lié' : 'n’est pas lié'} à ${code} ; génération prévue au jalon 2`};
  return linked ? {auto: true, why: `${tpl.id} est lié à ${code} dans le catalogue · HIRE : ${J ? `${J.level}, ${J.n} ligne(s)` : 'aucune ligne'}`}
                : {auto: false, why: `${tpl.id} n’est pas lié à ${code} (il sert à ${tpl.beh_codes.join(', ')})`};
}
function parseList(txt){
  const out = [];
  for (const line of txt.split(/\r?\n/)) {
    const l = line.trim(); if (!l) continue;
    let parts = l.includes('\t') ? l.split('\t') : l.includes(';') ? l.split(';') : l.includes(' | ') ? l.split(' | ') : [l];
    parts = parts.map(x => x.trim()).filter(Boolean);
    if (!parts.length) continue;
    const [family, text] = parts.length > 1 ? [parts[0], parts.slice(1).join(' · ')] : ['', parts[0]];
    if (/^(famille|family|abstract|scenario|scénario)s?$/i.test(text) && out.length === 0) continue;
    out.push({family, text});
  }
  return out;
}
function loadRows(list){
  state.rows = list.map((r, i) => { const row = {id: `S-${String(i + 1).padStart(3, '0')}`, family: r.family, text: r.text}; row.match = recognise(row, state.beh); row.tpl = r.tpl !== undefined ? r.tpl : row.match.tpl; if (r.tpl !== undefined && r.tpl !== row.match.tpl) row.match = {...row.match, method: 'manuel', why: 'modèle choisi à la main'}; row.manual = r.linked !== undefined ? r.linked : null; return row; });
  state.results = null; state.open = null; state.sel = null;
  render();
}
const isLinked = row => row.manual !== null ? row.manual : decide(row).auto;
function relink(){ for (const r of state.rows) { if (r.match.method !== 'manuel') { r.match = recognise(r, state.beh); r.tpl = r.match.tpl; } } state.results = null; state.open = null; render(); }

/* ---------- 3. Générer ---------- */
function cfgFor(tpl, code){
  const b = behOf(code), c = clone(tpl.configuration);
  c.ego.intent = (tpl.intent || {})[code] || b.default?.intent || 'keep_lane';
  if (b.default?.sides) c.ego.sides = b.default.sides;
  if (!c.ego.sides || !c.ego.sides.length) c.ego.sides = ['left'];
  return c;
}
function runAll(){
  const code = state.beh, res = [];
  for (const row of state.rows.filter(isLinked)) {
    const tpl = row.tpl ? absOf(row.tpl) : null;
    if (!tpl || !tpl.configuration) { res.push({row, tpl, skipped: tpl ? 'génération jalon 2' : 'pas de modèle'}); continue; }
    const c = cfgFor(tpl, code);
    const r = generate(c, {id: `${row.id}|${tpl.id}@${code}`, version: tpl.version || 1, applicability: tpl.applicability, fixed: tpl.fixed});
    res.push({row, tpl, cfg: c, r, ref: tpl.id === 'LC-REF-01' && code === 'HW-LC' ? refCheck(r) : null});
  }
  state.results = res; state.open = res.find(x => x.r)?.row.id || null; state.sel = null; state.shown = 30;
  render();
  const n = res.reduce((s, x) => s + (x.r ? x.r.counts.valid : 0), 0);
  toast(`${n.toLocaleString('fr-FR')} scénarios concrets générés.`);
}
function refCheck(r){
  const R = DATA.reference, map = {front: 'A', rear: 'C', shoulder: 'S'};
  const get = (p, k) => { const [a, b, c] = k.split('.'); if (a === 'road') return p.road[b === 'laneCount' ? 'laneCount' : b]; const s = p.actors[map[b]]; if (!s) return undefined; if (c === 'present') return s.present; if (c === 'offsetM') return s.lateralOffsetM; return s[c]; };
  const checks = [
    {label: `${R.expected_counts.potential} combinaisons attendues`, ok: r.counts.potential === R.expected_counts.potential, got: r.counts.potential},
    {label: `${R.expected_counts.valid} retenues attendues`, ok: r.counts.valid === R.expected_counts.valid, got: r.counts.valid},
    {label: `${R.expected_counts.rejected} exclue attendue`, ok: r.counts.rejected === R.expected_counts.rejected, got: r.counts.rejected},
    ...R.must_contain.map(m => ({label: `contient « ${m.label} »`, ok: r.variants.some(v => Object.entries(m.parameters).every(([k, val]) => get(v.parameters, k) === val)), got: ''})),
  ];
  return {checks, ok: checks.every(c => c.ok)};
}

/* ---------- Export / import ---------- */
let downloads = null;
(async () => { try { downloads = await window.claude?.use?.('downloads'); } catch (e) { downloads = null; } render(); })();
async function save(filename, data){
  if (!downloads) { toast('Le téléchargement n’est pas disponible dans cette vue.'); return; }
  try { await downloads.save({filename, data}); toast(`${filename} prêt.`); }
  catch (e) { toast(e && e.code === 'declined' ? 'Téléchargement annulé.' : 'Le téléchargement a échoué.'); }
}
function projectJSON(){
  const b = behOf(state.beh);
  return {
    schema: 'scenario-studio/projet@0.1', exported: new Date().toISOString(),
    behavior: {id: b.id, code: b.code, name: b.name, use_case: b.use_case, jama: b.jama?.id || null},
    scenarios: state.rows.map(r => { const tpl = r.tpl ? absOf(r.tpl) : null, J = tpl ? (tpl.hire_links || {})[state.beh] : null; return {id: r.id, family: r.family, text: r.text, template: r.tpl, match: {method: r.match.method, why: r.match.why}, linked: isLinked(r), link_source: r.manual !== null ? 'manuel' : 'automatique', link_why: decide(r).why, hire: J ? {level: J.level, n: J.n, rows: J.rows, hfs: J.hfs} : null}; }),
    concretes: (state.results || []).filter(x => x.r).flatMap(x => x.r.variants.map(v => ({id: v.id, scenario: x.row.id, template: x.tpl.id, behavior: state.beh, intent: v.parameters.ego.intent, parameters: v.parameters, expected: v.expected}))),
    summary: (state.results || []).map(x => ({scenario: x.row.id, template: x.tpl?.id || null, skipped: x.skipped || null, counts: x.r?.counts || null, rejected_by_rule: x.r ? Object.fromEntries(Object.entries(x.r.rejected.reduce((m, j) => { j.ruleIds.forEach(id => m[id] = (m[id] || 0) + 1); return m; }, {}))) : null, reference: x.ref ? {ok: x.ref.ok, checks: x.ref.checks} : null})),
  };
}
async function exportZip(){
  if (!window.JSZip) { toast('Bibliothèque zip indisponible.'); return; }
  const zip = new JSZip(), b = behOf(state.beh);
  zip.file('projet.json', JSON.stringify(projectJSON(), null, 2));
  for (const x of (state.results || []).filter(x => x.r)) {
    const dir = zip.folder(`${x.row.id}_${x.tpl.id}`);
    for (const v of x.r.variants) dir.file(`${v.id}.osc`, oscText(v, x));
  }
  const blob = await zip.generateAsync({type: 'uint8array'});
  save(`scenarios_${b.code}.zip`, blob);
}
function oscText(v, x){
  const L = oscFor(v, x.tpl, x.cfg).split('\n');
  L.splice(1, 0, `# scenario : ${x.row.id} | ${x.row.family ? x.row.family + ' | ' : ''}${x.row.text}`);
  return L.join('\n');
}
function curBeh(){ const b = behOf(state.beh); return {...b, jama: b.jama ? {id: b.jama.id} : null}; }

/* ---------- Rendu ---------- */
function render(){
  const b = behOf(state.beh);
  // step 1
  $('#behSel').innerHTML = ['Highway', 'Urban', 'Hub'].map(uc => `<optgroup label="${uc}">${DATA.behaviors.filter(x => x.use_case === uc).map(x => `<option value="${x.code}" ${x.code === state.beh ? 'selected' : ''}>${esc(x.code)} · ${esc(x.name)}</option>`).join('')}</optgroup>`).join('');
  const nCat = DATA.abstracts.filter(a => a.beh_codes.includes(state.beh)).length;
  $('#behInfo').innerHTML = `<span class="chip info">${esc(b.jama ? b.jama.id : 'pas de définition Jama exportée')}</span><span>Le camion doit <b>${esc(INTENT[b.default?.intent] || b.default?.intent)}</b>${b.default?.sides ? ' (côté ' + b.default.sides.map(s => SIDE[s]).join(', ') + ')' : ''}.</span><span class="muted">${nCat} modèles du catalogue SERYTI servent déjà ce behavior.</span>`;
  // step 2
  $('#listCount').textContent = state.rows.length ? `${state.rows.length} scénarios chargés` : 'aucune liste';
  // step 3
  const linked = state.rows.filter(isLinked), notRec = state.rows.filter(r => !r.tpl);
  $('#linkSum').innerHTML = state.rows.length ? `<span class="chip ok">${linked.length} liés à ${esc(state.beh)}</span><span class="chip">${state.rows.length - linked.length - notRec.length} reconnus mais non liés</span><span class="chip warn">${notRec.length} sans modèle</span>` : '';
  const opts = cur => `<option value="">pas de modèle</option>` + DATA.abstracts.map(a => `<option value="${a.id}" ${a.id === cur ? 'selected' : ''}>${a.id} · ${esc((a.title || '').slice(0, 60))}</option>`).join('');
  $('#links').innerHTML = state.rows.length ? `<div class="tablewrap"><table class="links"><thead><tr><th>Lié</th><th>#</th><th>Scénario de la liste</th><th>Modèle (abstract SERYTI)</th><th>Pourquoi</th></tr></thead><tbody>${state.rows.map((r, i) => { const d = decide(r), on = isLinked(r); return `<tr class="${on ? 'on' : ''}"><td><input type="checkbox" id="lk-${r.id}" data-link="${i}" ${on ? 'checked' : ''} aria-label="Lier ${esc(r.id)} au behavior"></td><td class="mono">${r.id}</td><td><span class="muted">${esc(r.family)}</span>${r.family ? '<br>' : ''}${esc(r.text)}</td><td><select id="tp-${r.id}" data-tpl="${i}" aria-label="Modèle de ${esc(r.id)}">${opts(r.tpl)}</select><div class="method m-${r.match.method.replace(/\s/g, '-')}">${esc(r.match.method)}</div></td><td class="why">${esc(r.match.method === 'ID' || r.match.method === 'manuel' || !r.tpl ? '' : r.match.why + ' · ')}${esc(d.why)}${r.manual !== null ? ` · <b>${r.manual ? 'lié' : 'délié'} à la main</b>` : ''}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="empty">Chargez une liste à l’étape 2.</div>`;
  // step 4
  $('#btnGen').disabled = !linked.length;
  $('#btnGen').textContent = `Générer les concrets des ${linked.length} scénarios liés`;
  renderResults();
  $('#btnJson').disabled = !state.rows.length || !downloads; $('#btnZip').disabled = !state.results || !downloads;
}
function renderResults(){
  const R = state.results, el = $('#results');
  if (!R) { el.innerHTML = `<div class="empty">Cliquez sur Générer : chaque scénario lié est développé en concrets, les combinaisons absurdes sont exclues avec leur règle.</div>`; return; }
  const tot = R.reduce((s, x) => s + (x.r ? x.r.counts.valid : 0), 0), rej = R.reduce((s, x) => s + (x.r ? x.r.counts.rejected : 0), 0);
  let h = `<div class="summary"><div class="stat"><b>${R.length}</b><span>scénarios liés</span></div><div class="stat"><b>${tot.toLocaleString('fr-FR')}</b><span>concrets retenus</span></div><div class="stat"><b>${rej.toLocaleString('fr-FR')}</b><span>combinaisons exclues</span></div></div>`;
  const ref = R.find(x => x.ref);
  if (ref) h += `<div class="refbox ${ref.ref.ok ? 'ok' : 'ko'}"><b>Comparaison avec la référence manuelle (${esc(DATA.reference.abstract)})</b> <span class="chip ${ref.ref.ok ? 'ok' : 'crit'}">${ref.ref.ok ? 'identique' : 'écart'}</span><ul>${ref.ref.checks.map(c => `<li>${c.ok ? '✓' : '✗'} ${esc(c.label)}${c.got !== '' ? ` · obtenu ${c.got}` : ''}</li>`).join('')}</ul></div>`;
  h += `<div class="tablewrap"><table><thead><tr><th>Scénario</th><th>Modèle</th><th>Intention</th><th class="num">Retenus</th><th class="num">Exclus</th><th>Exclus par</th><th></th></tr></thead><tbody>${R.map(x => { const by = x.r ? Object.entries(x.r.rejected.reduce((m, j) => { j.ruleIds.forEach(id => m[id] = (m[id] || 0) + 1); return m; }, {})) : []; return `<tr class="${state.open === x.row.id ? 'sel' : ''}"><td><span class="mono">${x.row.id}</span> ${esc(x.row.text)}</td><td class="mono">${esc(x.tpl?.id || '—')}</td><td>${x.cfg ? esc(INTENT[x.cfg.ego.intent]) : ''}</td><td class="num">${x.r ? x.r.counts.valid.toLocaleString('fr-FR') : ''}</td><td class="num">${x.r ? x.r.counts.rejected.toLocaleString('fr-FR') : ''}</td><td>${x.skipped ? `<span class="chip warn">${esc(x.skipped)}</span>` : by.map(([k, n]) => `<span class="chip crit">${k} ${n}</span>`).join(' ')}</td><td>${x.r ? `<button class="btn small" type="button" data-open="${x.row.id}">Voir</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
  const x = R.find(y => y.row.id === state.open && y.r);
  if (x) {
    const vs = x.r.variants, sel = vs.find(v => v.id === state.sel) || vs[0];
    h += `<div class="detail"><h3>${esc(x.row.id)} · ${esc(x.row.text)} <span class="muted">→ ${esc(x.tpl.id)} pour ${esc(state.beh)}</span></h3>
      <div class="tablewrap"><table><thead><tr><th>Concret</th><th>Attendu (oracle candidat)</th><th>Route</th><th>SDT</th><th>Acteurs</th></tr></thead><tbody>${vs.slice(0, state.shown).map(v => { const p = v.parameters; return `<tr data-con="${v.id}" class="${sel && v.id === sel.id ? 'sel' : ''}"><td class="mono">${v.id}</td><td><span class="chip ${v.expected.cat === 'go' ? 'ok' : v.expected.cat === 'hold' ? 'warn' : 'info'}">${esc(v.expected.txt)}</span> <span class="muted">${esc(v.expected.why)}</span></td><td class="mono">${p.road.laneCount} v.${Object.keys(ROAD_EXTRAS).filter(k => p.road[k] !== undefined).map(k => ` · ${p.road[k]}${ROAD_EXTRAS[k][1] ? ' ' + ROAD_EXTRAS[k][1] : ''}`).join('')}</td><td class="mono">${p.ego.speedMps} m/s</td><td>${Object.entries(p.actors).filter(([, a]) => a.present).map(([s, a]) => esc(actorLine(s, a))).join('<br>') || '<span class="muted">aucun</span>'}</td></tr>`; }).join('')}</tbody></table></div>
      ${vs.length > state.shown ? `<button class="btn small" type="button" id="btnMore">Afficher 50 de plus (${state.shown} / ${vs.length})</button>` : ''}
      ${sel ? `<div class="con-wrap"><figure class="fig">${sceneSVG(sel.parameters, x.cfg, 'Scène ' + sel.id)}<figcaption>Positions à t = 0, à l’échelle</figcaption></figure><pre class="code">${esc(oscText(sel, x))}</pre></div>` : ''}</div>`;
  }
  el.innerHTML = h;
}

/* ---------- Événements ---------- */
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'behSel') { state.beh = t.value; relink(); return; }
  if (t.dataset.link !== undefined) { const r = state.rows[+t.dataset.link]; r.manual = t.checked === decide(r).auto ? null : t.checked; state.results = null; render(); return; }
  if (t.dataset.tpl !== undefined) { const r = state.rows[+t.dataset.tpl]; r.tpl = t.value || null; r.match = {method: 'manuel', why: 'modèle choisi à la main'}; r.manual = null; state.results = null; render(); return; }
  if (t.id === 'fileIn' && t.files[0]) { readFile(t.files[0]); t.value = ''; return; }
  if (t.id === 'projIn' && t.files[0]) { readProject(t.files[0]); t.value = ''; }
});
document.addEventListener('click', e => {
  const t = e.target.closest('button,[data-con]'); if (!t) return;
  if (t.id === 'btnExample') { $('#listTxt').value = EXAMPLE; loadRows(parseList(EXAMPLE)); return; }
  if (t.id === 'btnCatalog') { const txt = DATA.abstracts.map(a => `${a.family}\t${a.id} ${a.title}`).join('\n'); $('#listTxt').value = txt; loadRows(parseList(txt)); return; }
  if (t.id === 'btnParse') { loadRows(parseList($('#listTxt').value)); toast(`${state.rows.length} scénarios lus.`); return; }
  if (t.id === 'btnFile') { $('#fileIn').click(); return; }
  if (t.id === 'btnProj') { $('#projIn').click(); return; }
  if (t.id === 'btnGen') { runAll(); return; }
  if (t.id === 'btnJson') { save(`projet_${state.beh}.json`, JSON.stringify(projectJSON(), null, 2)); return; }
  if (t.id === 'btnZip') { exportZip(); return; }
  if (t.id === 'btnMore') { state.shown += 50; renderResults(); return; }
  if (t.dataset.open) { state.open = t.dataset.open; state.sel = null; state.shown = 30; renderResults(); return; }
  if (t.dataset.con) { state.sel = t.dataset.con; renderResults(); }
});
document.addEventListener('paste', e => { if (e.target.id === 'listTxt') setTimeout(() => loadRows(parseList($('#listTxt').value)), 0); });
function readFile(f){
  const rd = new FileReader();
  if (/\.xlsx?$/i.test(f.name)) {
    if (!window.XLSX) { toast('Lecture Excel indisponible : copiez les colonnes A et B dans la zone de texte.'); return; }
    rd.onload = () => { const wb = XLSX.read(new Uint8Array(rd.result), {type: 'array'}); const ws = wb.Sheets[wb.SheetNames[0]]; const rows = XLSX.utils.sheet_to_json(ws, {header: 1, blankrows: false}); const txt = rows.filter(r => r.some(v => String(v ?? '').trim())).map(r => r.length > 1 ? `${r[0] ?? ''}\t${r[1] ?? ''}` : `${r[0] ?? ''}`).join('\n'); $('#listTxt').value = txt; loadRows(parseList(txt)); toast(`${state.rows.length} scénarios lus dans ${f.name}.`); };
    rd.readAsArrayBuffer(f);
  } else { rd.onload = () => { $('#listTxt').value = rd.result; loadRows(parseList(rd.result)); toast(`${state.rows.length} scénarios lus dans ${f.name}.`); }; rd.readAsText(f); }
}
function readProject(f){
  const rd = new FileReader();
  rd.onload = () => { try { const p = JSON.parse(rd.result); if (!/^scenario-studio\/projet@/.test(p.schema || '')) throw new Error('schema'); state.beh = p.behavior.code; $('#listTxt').value = p.scenarios.map(s => `${s.family}\t${s.text}`).join('\n'); loadRows(p.scenarios.map(s => ({family: s.family, text: s.text, tpl: s.template, linked: s.link_source === 'manuel' ? s.linked : undefined}))); state.rows.forEach(r => { if (r.manual === undefined) r.manual = null; }); render(); toast('Projet relu.'); } catch (err) { toast('Ce fichier n’est pas un projet Scenario Studio (schema scenario-studio/projet).'); } };
  rd.readAsText(f);
}
$('#listTxt').value = EXAMPLE;
loadRows(parseList(EXAMPLE));
