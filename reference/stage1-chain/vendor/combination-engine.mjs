/*
 * Stage 1 local scenario combination prototype.
 * Every scenario value comes from configuration supplied by an engineer.
 * These editable rules express only the stated prototype assumptions; a
 * generated variant is not an executable OSC scenario or a safety verdict.
 */

export const RULE_CATALOG = Object.freeze([
  {
    id: 'R_FRONT_CUTIN_SAME_ZONE_TIME',
    configKey: 'frontCutInSameZone',
    description: 'A distinct front actor and cut-in actor cannot occupy the selected front target zone at the same time.',
    scope: 'Prototype occupancy assumption; engineer review required.'
  },
  {
    id: 'R_ADJACENT_ORIGIN_OCCUPIED',
    configKey: 'adjacentOriginConflict',
    description: 'A new cut-in actor cannot originate in an adjacent zone already occupied by a distinct adjacent actor.',
    scope: 'Prototype occupancy assumption; engineer review required.'
  },
  {
    id: 'R_CUTIN_ORIGIN_ACTOR_MISSING',
    configKey: 'cutInOriginActorMissing',
    description: 'A cut-in assigned to the selected adjacent actor requires that actor to be present.',
    scope: 'Prototype actor-link assumption; engineer review required.'
  },
  {
    id: 'R_REQUIREMENT_ROAD_TYPE',
    configKey: 'requirementRoadType',
    description: 'The selected road type must be within the road types explicitly declared applicable to the requirement.',
    scope: 'Prototype applicability check from engineer-supplied requirement constraints; engineer review required.'
  },
  {
    id: 'R_LANE_CHANGE_LANE_COUNT',
    configKey: 'laneChangeMinLanes',
    description: 'A lane change requires at least two lanes in this simple road model.',
    scope: 'Prototype road model; lane direction, legal access and map topology remain unbound.'
  },
  {
    id: 'R_SHOULDER_ENVELOPE',
    configKey: 'fullyOnShoulderGeometry',
    description: 'When fully on shoulder is fixed, the vehicle envelope must fit within the supplied shoulder width.',
    scope: 'Simple lateral envelope check only; map and detailed geometry remain unbound.'
  }
]);

const ACTORS = ['front', 'rear', 'adjacent', 'shoulder'];
const MODES = ['off', 'optional', 'required'];
const NUMBER_FIELDS = {
  otherSpeedMps: { min: 0 },
  frontDistanceM: { min: 0 },
  rearDistanceM: { min: 0 },
  adjacentDistanceM: { min: 0 },
  shoulderDistanceM: { min: 0 },
  shoulderWidthM: { exclusiveMin: 0 },
  shoulderVehicleWidthM: { exclusiveMin: 0 },
  shoulderOffsetM: {},
  cutInDistanceM: { min: 0 }
};
const DEFAULT_OPTIONS = Object.freeze({ includeEmptyBaseline: false, maxExpansion: 10000, maxPreview: 200 });
const MAX_RANGE_POINTS = 1000;

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function cloneJson(value, path, errors, seen = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (!value || typeof value !== 'object' || seen.has(value)) {
    errors.push({ path, message: 'Must be JSON-compatible (no cycles, functions or non-finite numbers).' });
    return null;
  }
  seen.add(value);
  let result;
  if (Array.isArray(value)) result = value.map((item, index) => cloneJson(item, `${path}[${index}]`, errors, seen));
  else if (plainObject(value)) {
    result = Object.fromEntries(Object.keys(value).map(key => [key, cloneJson(value[key], `${path}.${key}`, errors, seen)]));
  } else {
    errors.push({ path, message: 'Must be a plain JSON object or array.' });
    result = null;
  }
  seen.delete(value);
  return result;
}

function finiteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function numberList(value, path, errors, bounds = {}, required = false) {
  if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
    if (required) errors.push({ path, message: 'Supply at least one engineer-selected value or a min/max/step range.' });
    return [];
  }
  let list;
  if (Array.isArray(value)) list = value;
  else if (plainObject(value) && ['min', 'max', 'step'].every(key => Object.hasOwn(value, key))) {
    const { min, max, step } = value;
    if (![min, max, step].every(finiteNumber) || step <= 0 || max < min) {
      errors.push({ path, message: 'Range needs finite min <= max and step > 0.' });
      return [];
    }
    const count = Math.floor((max - min) / step + 1e-9) + 1;
    if (count > MAX_RANGE_POINTS) {
      errors.push({ path, message: `Range exceeds ${MAX_RANGE_POINTS} points; increase step or narrow the range.` });
      return [];
    }
    list = Array.from({ length: count }, (_, index) => Number((min + index * step).toFixed(9)));
  } else {
    errors.push({ path, message: 'Use an array of numbers or {min,max,step}.' });
    return [];
  }
  if (list.length > MAX_RANGE_POINTS) {
    errors.push({ path, message: `List exceeds ${MAX_RANGE_POINTS} values.` });
    return [];
  }
  for (const [index, item] of list.entries()) {
    if (!finiteNumber(item) || (bounds.min !== undefined && item < bounds.min) || (bounds.exclusiveMin !== undefined && item <= bounds.exclusiveMin) || (bounds.integer && !Number.isInteger(item))) {
      errors.push({ path: `${path}[${index}]`, message: 'Value violates the finite number, sign or integer constraint for this field.' });
    }
  }
  return [...new Set(list)].sort((a, b) => a - b);
}

function stringList(value, path, errors, required = true) {
  if (!Array.isArray(value) || (required && value.length === 0)) {
    errors.push({ path, message: 'Supply at least one road type.' });
    return [];
  }
  for (const [index, item] of value.entries()) {
    if (typeof item !== 'string' || !item.trim()) errors.push({ path: `${path}[${index}]`, message: 'Road type must be nonempty text.' });
  }
  return [...new Set(value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim()))].sort();
}

function enumValue(value, allowed, path, errors, required = true) {
  if (value === undefined && !required) return undefined;
  if (!allowed.includes(value)) errors.push({ path, message: `Choose one of: ${allowed.join(', ')}.` });
  return value;
}

function booleanValue(value, path, errors) {
  if (typeof value !== 'boolean') errors.push({ path, message: 'Choose true or false.' });
  return value;
}

function integerOption(value, defaultValue, min, max, path, errors) {
  const chosen = value === undefined ? defaultValue : value;
  if (!Number.isInteger(chosen) || chosen < min || chosen > max) errors.push({ path, message: `Choose an integer from ${min} to ${max}.` });
  return chosen;
}

export function validateConfig(input) {
  const errors = [];
  if (!plainObject(input)) return { valid: false, errors: [{ path: '$', message: 'Configuration must be a plain object.' }], configuration: null };
  const r = input.requirement ?? {};
  const road = input.road ?? {};
  const ego = input.ego ?? {};
  const truck = ego.truck ?? {};
  const actors = input.actors ?? {};
  const maneuvers = input.maneuvers ?? {};
  const cutIn = maneuvers.cutIn ?? {};
  const values = input.values ?? {};
  const shoulder = input.shoulder ?? {};
  const ruleInput = input.rules ?? {};
  const optionInput = input.options ?? {};
  for (const [path, object] of [['requirement', r], ['road', road], ['ego', ego], ['ego.truck', truck], ['actors', actors], ['maneuvers', maneuvers], ['maneuvers.cutIn', cutIn], ['values', values], ['shoulder', shoulder], ['rules', ruleInput], ['options', optionInput]]) {
    if (!plainObject(object)) errors.push({ path, message: 'Must be an object.' });
  }
  if (typeof r.text !== 'string' || !r.text.trim()) errors.push({ path: 'requirement.text', message: 'Supply the exact requirement text.' });
  if (r.id !== undefined && typeof r.id !== 'string') errors.push({ path: 'requirement.id', message: 'ID must be text.' });
  if (r.revision !== undefined && typeof r.revision !== 'string') errors.push({ path: 'requirement.revision', message: 'Revision must be text.' });
  let normalizedConstraints;
  if (r.constraints !== undefined) {
    if (!plainObject(r.constraints)) errors.push({ path: 'requirement.constraints', message: 'Must be an object.' });
    else {
      normalizedConstraints = cloneJson(r.constraints, 'requirement.constraints', errors);
      if (Object.hasOwn(r.constraints, 'roadTypes')) normalizedConstraints.roadTypes = stringList(r.constraints.roadTypes, 'requirement.constraints.roadTypes', errors);
    }
  }
  const req = {
    id: typeof r.id === 'string' ? r.id : '',
    text: typeof r.text === 'string' ? r.text : '',
    ...(r.revision !== undefined ? { revision: r.revision } : {}),
    ...(normalizedConstraints !== undefined ? { constraints: normalizedConstraints } : {}),
    ...(r.source !== undefined ? { source: cloneJson(r.source, 'requirement.source', errors) } : {}),
    ...(r.provenance !== undefined ? { provenance: cloneJson(r.provenance, 'requirement.provenance', errors) } : {})
  };
  const normalizedActors = {};
  for (const actor of ACTORS) normalizedActors[actor] = enumValue(actors[actor], MODES, `actors.${actor}`, errors);
  const cutInMode = enumValue(cutIn.mode, MODES, 'maneuvers.cutIn.mode', errors);
  const cutInActive = cutInMode !== 'off';
  const normalizedCutIn = {
    mode: cutInMode,
    targetZone: cutInActive ? enumValue(cutIn.targetZone, ['front', 'other'], 'maneuvers.cutIn.targetZone', errors) : null,
    targetTiming: cutInActive ? enumValue(cutIn.targetTiming ?? 'simultaneous', ['simultaneous', 'after_front_clears'], 'maneuvers.cutIn.targetTiming', errors) : null,
    origin: cutInActive ? enumValue(cutIn.origin, ['adjacent', 'external'], 'maneuvers.cutIn.origin', errors) : null,
    originActor: cutInActive ? enumValue(cutIn.originActor ?? 'new', ['new', 'adjacent_actor'], 'maneuvers.cutIn.originActor', errors) : null
  };
  const normalizedValues = {};
  const movingActorSelected = ['front', 'rear', 'adjacent'].some(actor => normalizedActors[actor] !== 'off') || cutInActive;
  for (const [key, bounds] of Object.entries(NUMBER_FIELDS)) {
    const required = key === 'otherSpeedMps' ? movingActorSelected :
      key === 'cutInDistanceM' ? cutInActive :
      key.startsWith('front') ? normalizedActors.front !== 'off' :
      key.startsWith('rear') ? normalizedActors.rear !== 'off' :
      key.startsWith('adjacent') ? normalizedActors.adjacent !== 'off' :
      normalizedActors.shoulder !== 'off';
    normalizedValues[key] = numberList(values[key], `values.${key}`, errors, bounds, required);
  }
  const normalizedRules = {};
  for (const { configKey } of RULE_CATALOG) {
    const value = ruleInput[configKey] === undefined ? true : ruleInput[configKey];
    normalizedRules[configKey] = booleanValue(value, `rules.${configKey}`, errors);
  }
  const config = {
    schemaVersion: '1.0',
    requirement: req,
    road: {
      types: stringList(road.types, 'road.types', errors),
      laneCounts: numberList(road.laneCounts, 'road.laneCounts', errors, { exclusiveMin: 0, integer: true }, true),
      ...(road.egoStartLane !== undefined ? { egoStartLane: enumValue(road.egoStartLane, ['rightmost', 'other', 'unspecified'], 'road.egoStartLane', errors) } : {})
    },
    ego: {
      speedMps: numberList(ego.speedMps, 'ego.speedMps', errors, { min: 0 }, true),
      truck: {
        lengthM: numberList(truck.lengthM, 'ego.truck.lengthM', errors, { exclusiveMin: 0 }, true),
        widthM: numberList(truck.widthM, 'ego.truck.widthM', errors, { exclusiveMin: 0 }, true),
        heightM: numberList(truck.heightM, 'ego.truck.heightM', errors, { exclusiveMin: 0 }, true)
      }
    },
    actors: normalizedActors,
    maneuvers: { laneChange: booleanValue(maneuvers.laneChange, 'maneuvers.laneChange', errors), cutIn: normalizedCutIn },
    values: normalizedValues,
    shoulder: {
      condition: normalizedActors.shoulder !== 'off' ? enumValue(shoulder.condition, ['fully_on_shoulder', 'unspecified'], 'shoulder.condition', errors) : null
    },
    rules: normalizedRules,
    options: {
      includeEmptyBaseline: booleanValue(optionInput.includeEmptyBaseline ?? DEFAULT_OPTIONS.includeEmptyBaseline, 'options.includeEmptyBaseline', errors),
      maxExpansion: integerOption(optionInput.maxExpansion, DEFAULT_OPTIONS.maxExpansion, 1, 100000, 'options.maxExpansion', errors),
      maxPreview: integerOption(optionInput.maxPreview, DEFAULT_OPTIONS.maxPreview, 1, 1000, 'options.maxPreview', errors)
    }
  };
  return { valid: errors.length === 0, errors, configuration: errors.length === 0 ? config : null };
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

function hash64(value) {
  let hash = 0xcbf29ce484222325n;
  const bytes = new TextEncoder().encode(canonical(value));
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

function choiceStates(mode) {
  return mode === 'optional' ? [false, true] : mode === 'required' ? [true] : [false];
}

function presencePatterns(c) {
  const dimensions = [...ACTORS, 'cutIn'];
  let patterns = [{}];
  for (const key of dimensions) {
    const mode = key === 'cutIn' ? c.maneuvers.cutIn.mode : c.actors[key];
    patterns = patterns.flatMap(pattern => choiceStates(mode).map(present => ({ ...pattern, [key]: present })));
  }
  const optional = dimensions.filter(key => (key === 'cutIn' ? c.maneuvers.cutIn.mode : c.actors[key]) === 'optional');
  if (!c.options.includeEmptyBaseline && optional.length) patterns = patterns.filter(pattern => optional.some(key => pattern[key]));
  return patterns.sort((a, b) => {
    const ac = dimensions.reduce((sum, key) => sum + Number(a[key]), 0);
    const bc = dimensions.reduce((sum, key) => sum + Number(b[key]), 0);
    if (ac !== bc) return ac - bc;
    for (const key of dimensions) if (a[key] !== b[key]) return Number(b[key]) - Number(a[key]);
    return 0;
  });
}

function axesFor(c, pattern) {
  const axes = [
    ['road.type', c.road.types], ['road.laneCount', c.road.laneCounts],
    ['ego.speedMps', c.ego.speedMps], ['ego.truck.lengthM', c.ego.truck.lengthM],
    ['ego.truck.widthM', c.ego.truck.widthM], ['ego.truck.heightM', c.ego.truck.heightM]
  ];
  if (['front', 'rear', 'adjacent'].some(actor => pattern[actor]) || pattern.cutIn) axes.push(['otherSpeedMps', c.values.otherSpeedMps]);
  if (pattern.front) axes.push(['actors.front.distanceM', c.values.frontDistanceM]);
  if (pattern.rear) axes.push(['actors.rear.distanceM', c.values.rearDistanceM]);
  if (pattern.adjacent) axes.push(['actors.adjacent.distanceM', c.values.adjacentDistanceM]);
  if (pattern.shoulder) axes.push(
    ['actors.shoulder.distanceM', c.values.shoulderDistanceM],
    ['road.shoulderWidthM', c.values.shoulderWidthM],
    ['actors.shoulder.widthM', c.values.shoulderVehicleWidthM],
    ['actors.shoulder.offsetM', c.values.shoulderOffsetM]
  );
  if (pattern.cutIn) axes.push(['maneuvers.cutIn.distanceM', c.values.cutInDistanceM]);
  return axes;
}

function nestedSet(target, path, value) {
  const keys = path.split('.');
  let node = target;
  for (const key of keys.slice(0, -1)) node = node[key] ??= {};
  node[keys.at(-1)] = value;
}

function* expandAxes(axes, index = 0, current = {}) {
  if (index === axes.length) {
    yield current;
    return;
  }
  const [path, values] = axes[index];
  for (const value of values) yield* expandAxes(axes, index + 1, { ...current, [path]: value });
}

function parametersFor(c, pattern, flat) {
  const parameters = {
    road: { ...(c.road.egoStartLane !== undefined ? { egoStartLane: c.road.egoStartLane } : {}) }, ego: { truck: {} },
    actors: Object.fromEntries(ACTORS.map(actor => [actor, { present: pattern[actor] }])),
    maneuvers: { laneChange: c.maneuvers.laneChange, cutIn: { enabled: pattern.cutIn } }
  };
  if (c.requirement.constraints !== undefined) parameters.requirementConstraints = c.requirement.constraints;
  for (const [path, value] of Object.entries(flat)) nestedSet(parameters, path, value);
  if (pattern.cutIn) Object.assign(parameters.maneuvers.cutIn, {
    targetZone: c.maneuvers.cutIn.targetZone,
    targetTiming: c.maneuvers.cutIn.targetTiming,
    origin: c.maneuvers.cutIn.origin,
    originActor: c.maneuvers.cutIn.originActor
  });
  if (pattern.shoulder) parameters.actors.shoulder.condition = c.shoulder.condition;
  return parameters;
}

function rejectionReasons(parameters, c) {
  const p = parameters;
  const reasons = [];
  const reject = (id, reason) => reasons.push({ ruleId: id, reason });
  const applicableRoadTypes = c.requirement.constraints?.roadTypes;
  if (c.rules.requirementRoadType && Array.isArray(applicableRoadTypes) && !applicableRoadTypes.some(type => type.toLowerCase() === p.road.type.toLowerCase()))
    reject('R_REQUIREMENT_ROAD_TYPE', `Road type "${p.road.type}" is outside the requirement's declared applicability: ${applicableRoadTypes.join(', ')}.`);
  if (c.rules.frontCutInSameZone && p.actors.front.present && p.maneuvers.cutIn.enabled && p.maneuvers.cutIn.targetZone === 'front' && p.maneuvers.cutIn.targetTiming === 'simultaneous')
    reject('R_FRONT_CUTIN_SAME_ZONE_TIME', 'Front actor and a distinct cut-in actor are assigned to the same front zone at the same time.');
  if (c.rules.adjacentOriginConflict && p.actors.adjacent.present && p.maneuvers.cutIn.enabled && p.maneuvers.cutIn.origin === 'adjacent' && p.maneuvers.cutIn.originActor === 'new')
    reject('R_ADJACENT_ORIGIN_OCCUPIED', 'The adjacent origin zone is already occupied by a separate actor.');
  if (c.rules.cutInOriginActorMissing && !p.actors.adjacent.present && p.maneuvers.cutIn.enabled && p.maneuvers.cutIn.originActor === 'adjacent_actor')
    reject('R_CUTIN_ORIGIN_ACTOR_MISSING', 'The selected adjacent actor is absent, so it cannot perform the cut-in.');
  if (c.rules.laneChangeMinLanes && p.maneuvers.laneChange && p.road.laneCount < 2)
    reject('R_LANE_CHANGE_LANE_COUNT', 'Lane change is selected with fewer than two lanes in the configured road model.');
  if (c.rules.fullyOnShoulderGeometry && p.actors.shoulder.present && p.actors.shoulder.condition === 'fully_on_shoulder') {
    const { offsetM, widthM } = p.actors.shoulder;
    if (offsetM < -1e-9 || offsetM + widthM > p.road.shoulderWidthM + 1e-9)
      reject('R_SHOULDER_ENVELOPE', 'The supplied offset and vehicle width place part of the vehicle outside the supplied shoulder width.');
  }
  return reasons;
}

function countValue(bigint) {
  return bigint <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(bigint) : bigint.toString();
}

export function generateCases(input) {
  const validation = validateConfig(input);
  if (!validation.valid) return {
    schemaVersion: '1.0', status: 'invalid', errors: validation.errors, configuration: null,
    configurationId: null, counts: { potential: 0, evaluated: 0, valid: 0, rejected: 0, returnedValid: 0, returnedRejected: 0, previewValid: 0, previewRejected: 0, truncated: false },
    variants: [], rejected: [], preview: { variants: [], rejected: [] }, rules: RULE_CATALOG, reviewNeeds: []
  };
  const c = validation.configuration;
  const patterns = presencePatterns(c);
  let potential = 0n;
  for (const pattern of patterns) potential += axesFor(c, pattern).reduce((product, [, values]) => product * BigInt(values.length), 1n);
  const variants = [];
  const rejected = [];
  let evaluated = 0;
  let validCount = 0;
  let rejectedCount = 0;
  outer: for (const pattern of patterns) {
    for (const flat of expandAxes(axesFor(c, pattern))) {
      if (evaluated >= c.options.maxExpansion) break outer;
      evaluated += 1;
      const parameters = parametersFor(c, pattern, flat);
      const id = hash64({ requirement: { id: c.requirement.id, text: c.requirement.text, revision: c.requirement.revision ?? null }, parameters });
      const reasons = rejectionReasons(parameters, c);
      const source = c.requirement;
      if (reasons.length) {
        rejectedCount += 1;
        rejected.push({ id: `REJ-${id}`, parameters, source, ruleIds: reasons.map(reason => reason.ruleId), reasons });
      } else {
        validCount += 1;
        variants.push({ id: `SCN-${id}`, parameters, source, status: 'draft_for_engineering_review' });
      }
    }
  }
  const truncated = potential > BigInt(evaluated);
  return {
    schemaVersion: '1.0', status: truncated ? 'truncated' : 'complete', errors: [],
    configuration: c, configurationId: `CFG-${hash64(c)}`,
    counts: { potential: countValue(potential), evaluated, valid: validCount, rejected: rejectedCount, returnedValid: variants.length, returnedRejected: rejected.length, previewValid: Math.min(variants.length, c.options.maxPreview), previewRejected: Math.min(rejected.length, c.options.maxPreview), truncated },
    variants, rejected,
    preview: { variants: variants.slice(0, c.options.maxPreview), rejected: rejected.slice(0, c.options.maxPreview) },
    rules: RULE_CATALOG.map(rule => ({ ...rule, enabled: c.rules[rule.configKey] })),
    reviewNeeds: [
      'Confirm requirement interpretation and applicability with engineering.',
      'Bind a verified map, route, lane direction and actor geometry before simulation.',
      'Define case-specific expected behaviour and pass/fail metrics separately.'
    ],
    execution: { status: 'not_simulated', simulatorRunId: null }
  };
}
