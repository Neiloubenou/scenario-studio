// Stage 1 chain: behavior -> abstract (+HIRE) -> concrete variants -> OSC templates.
// Uses the existing Scenario Studio combination engine unchanged.
// Usage: node scripts/run-chain.mjs <engine.mjs> <behavior.json> <abstract.json> <outDir>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';

const [enginePath, behPath, absPath, outDir] = process.argv.slice(2);
const { generateCases } = await import(pathToFileURL(resolve(enginePath)).href);
const behavior = JSON.parse(readFileSync(behPath, 'utf8'));
const abstract = JSON.parse(readFileSync(absPath, 'utf8'));

export function configFromAbstract(abs) {
  // The engine still expects a "requirement" block. For a behavior-driven abstract we pass the
  // abstract itself as the source, flagged as such, so IDs stay deterministic and traceable.
  return {
    ...structuredClone(abs.configuration),
    requirement: {
      id: abs.id,
      revision: `v${abs.version}`,
      text: abs.description,
      provenance: 'abstract_scenario',
      source: { kind: 'abstract', behaviors: abs.behaviors, catalogue_refs: abs.catalogue_refs ?? {} },
      constraints: { roadTypes: abs.configuration.road.types }
    }
  };
}

const flat = (o, p = '', out = {}) => { for (const [k, v] of Object.entries(o ?? {})) { const key = p ? `${p}.${k}` : k; if (v && typeof v === 'object' && !Array.isArray(v)) flat(v, key, out); else out[key] = v; } return out; };

function oscTemplate(v, abs, beh) {
  const p = v.parameters, a = p.actors, ego = p.ego;
  const lines = [
    '# ASAM OpenSCENARIO DSL 2.0.0 authoring template, NOT executable or parser-validated.',
    `# behavior : ${beh.id} | ${beh.name} (${beh.use_case})`,
    `# abstract : ${abs.id} v${abs.version} | ${abs.name}`,
    `# concrete : ${v.id} | engine status ${v.status}`,
    `# hire     : ${abs.hire.map(h => h.id).join(' ; ')}`,
    `# expected : ${abs.expected_behavior}`,
    '# The SDT response is observed by the ADS in the loop. It is never scripted below.',
    'import <BASIC_OSC_PATH>',
    'import <MAP_VERSION_OSC_PATH>',
    '',
    `scenario ${abs.name}_${v.id.toLowerCase().replace(/-/g, '_')}:`,
    '    map: Map',
    '    map.set_map_file(map_version)',
    '    ego_vehicle: Truck',
    `    # road: ${p.road.type}, ${p.road.laneCount} lanes, ego starts ${p.road.egoStartLane}`,
  ];
  if (a.shoulder.present) lines.push('    shoulder_vehicle: Vehicle');
  if (a.front.present) lines.push('    front_vehicle: Vehicle');
  if (a.rear.present) lines.push('    rear_vehicle: Vehicle');
  lines.push('    do serial:', '        initialization: parallel(duration: 2s):',
    '            ego_vehicle.drive() with:',
    '                position(at_point: geodetic_position_2d(latitude: <EGO_LAT> deg, longitude: <EGO_LON> deg), at: start, project_on_route: true)',
    `                speed(${ego.speedMps} mps, at: start)`);
  if (a.shoulder.present) lines.push('            shoulder_vehicle.remain_stationary() with:',
    `                position(${a.shoulder.distanceM} m, ahead_of: ego_vehicle, at: start)`,
    `                # fully on right shoulder, inner-edge offset ${a.shoulder.offsetM} m, width ${a.shoulder.widthM} m, shoulder ${p.road.shoulderWidthM} m`);
  if (a.front.present) lines.push('            front_vehicle.drive() with:', `                position(${a.front.distanceM} m, ahead_of: ego_vehicle, at: start)`, `                speed(${p.otherSpeedMps} mps)`, '                lane(same_as: ego_vehicle, at: start)');
  if (a.rear.present) lines.push('            rear_vehicle.drive() with:', `                position(${a.rear.distanceM} m, behind: ego_vehicle, at: start)`, `                speed(${p.otherSpeedMps} mps)`, '                lane(same_as: ego_vehicle, at: start)');
  lines.push('        observation: parallel(duration: <OBSERVATION_S> s):', '            # <ADS_CLOSED_LOOP_OBSERVATION_BINDING>', '');
  return lines.join('\n');
}

const set = generateCases(configFromAbstract(abstract));
const trace = { behavior: behavior.id, abstract: abstract.id, abstract_version: abstract.version, hire: abstract.hire.map(h => h.id), catalogue_refs: abstract.catalogue_refs };
for (const v of set.variants) v.trace = trace;
for (const r of set.rejected) r.trace = trace;
set.chain = { behavior, abstract: { ...abstract, configuration: undefined }, generated_with: 'combination-engine.mjs (unchanged)' };
mkdirSync(join(outDir, 'osc'), { recursive: true });
writeFileSync(join(outDir, 'set.json'), JSON.stringify(set, null, 2));
for (const v of set.variants) writeFileSync(join(outDir, 'osc', `${v.id}.osc`), oscTemplate(v, abstract, behavior));
console.log(JSON.stringify({ status: set.status, counts: set.counts, osc_files: set.variants.length, configurationId: set.configurationId }));
