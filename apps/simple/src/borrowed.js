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
function actorLine(slot, a){
  if (!a || !a.present) return '';
  const k = KINDS[a.kind]; const pos = a.offsetM !== undefined ? `décalage ${a.offsetM} m` : `${a.distanceM} m`;
  const m = a.maneuver && a.maneuver.type !== 'none' ? `, ${MANEUVERS[a.maneuver.type].label}${a.maneuver.decelMps2 !== undefined ? ' ' + a.maneuver.decelMps2 + ' m/s²' : ''}${a.maneuver.accelMps2 !== undefined ? ' ' + a.maneuver.accelMps2 + ' m/s²' : ''}${a.maneuver.lateralM !== undefined ? ' de ' + a.maneuver.lateralM + ' m' : ''}${a.maneuver.startS !== undefined ? ' à ' + a.maneuver.startS + ' s' : ''}` : '';
  const conv = a.count > 1 ? ` ×${a.count} (écart ${a.gapM} m)` : '';
  return `${slot} ${k.label}${conv} ${pos}${k.vmax ? `, ${a.speedMps} m/s` : ''}${a.lateralOffsetM !== undefined ? `, latéral ${a.lateralOffsetM} m` : ''}${a.lane ? `, voie ${a.lane === 'target' ? 'cible' : 'd’origine'}` : ''}${m}`;
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
