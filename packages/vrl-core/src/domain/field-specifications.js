import { MAX_DECIMAL_PLACES, MAX_SOURCE_MAGNITUDE } from "./numeric-policy.js";

const TECHNICAL = Object.freeze(["rappel", "downclimb", "climb"]);
const LENGTH_RANGE = Object.freeze({ minimum: 0, exclusiveMinimum: true, maximum: MAX_SOURCE_MAGNITUDE });
const ELEVATION_RANGE = Object.freeze({ minimum: -MAX_SOURCE_MAGNITUDE, exclusiveMinimum: false, maximum: MAX_SOURCE_MAGNITUDE });
const METRIC = { parser: "measurement", applicability: "all", unit: "m", fractionalDigits: MAX_DECIMAL_PLACES, range: LENGTH_RANGE };
const REDIRECTIONS = {
  parser: "redirections", applicability: "all", unit: "m", fractionalDigits: MAX_DECIMAL_PLACES,
  range: LENGTH_RANGE, minimumEntries: 1, separator: ",", values: ["left", "right", "center", "unknown"]
};

const DEFINITIONS = {
  distance: METRIC,
  height: { ...METRIC, requiredOn: ["rappel", "climb"] },
  rope: { ...METRIC, requiredOn: ["rappel"] },
  traverse: METRIC,
  total_distance: METRIC,
  total_descent: METRIC,
  entrance_elevation: { ...METRIC, range: ELEVATION_RANGE },
  exit_elevation: { ...METRIC, range: ELEVATION_RANGE },
  vertical_gain: METRIC,
  descent: METRIC,
  inclination: {
    parser: "inclination", applicability: "all", unit: "%", fractionalDigits: MAX_DECIMAL_PLACES,
    range: { minimum: 0, exclusiveMinimum: true, maximum: 100 }
  },
  anchor_count: {
    parser: "integerText", applicability: "all", unit: "count", fractionalDigits: 0,
    range: { minimum: 1, exclusiveMinimum: false, maximum: Number.MAX_SAFE_INTEGER }
  },
  redirection: REDIRECTIONS,
  redirections: REDIRECTIONS,
  stages: {
    parser: "stages", applicability: "all", unit: "m", fractionalDigits: MAX_DECIMAL_PLACES,
    range: LENGTH_RANGE, minimumEntries: 2, separator: "+"
  },
  anchor: { parser: "enum", applicability: ["rappel"], values: ["bolts", "natural", "tree", "thread", "removable", "fixed", "unknown", "mixed"] },
  shape: { parser: "enum", applicability: TECHNICAL, values: ["ladder", "direct", "slab"] },
  station: { parser: "enum", applicability: TECHNICAL, values: ["left", "right", "center", "floor", "tree", "natural", "unknown"] },
  landing: { parser: "enum", applicability: TECHNICAL, values: ["pool", "ledge", "dry", "chaos", "gallery", "trail", "unknown"] },
  exposure: { parser: "enum", applicability: ["downclimb", "climb"], values: ["low", "medium", "high"] },
  flow: { parser: "enum", applicability: "elements", values: ["dry", "low", "medium", "high"] },
  type: { parser: "enum", applicability: ["pool"], values: ["deep", "shallow", "swimmer", "dry", "unknown"] },
  severity: { parser: "enum", applicability: ["hazard"], values: ["low", "medium", "high", "critical"] }
};

const SPECIFICATIONS = Object.fromEntries(Object.entries(DEFINITIONS).map(([name, definition]) => [name, freezeSpecification(definition)]));

function freezeSpecification(definition) {
  const specification = { requiredOn: [], ...definition };
  Object.values(specification).forEach(Object.freeze);
  return Object.freeze(specification);
}

export function fieldSpecification(fieldName) {
  return Object.hasOwn(SPECIFICATIONS, fieldName) ? SPECIFICATIONS[fieldName] : null;
}

export function applicableFieldSpecification(fieldName, scope) {
  const specification = fieldSpecification(fieldName);
  if (specification === null) return null;
  const { applicability } = specification;
  const applies = applicability === "all" || (applicability === "elements" ? scope !== "metadata" : applicability.includes(scope));
  return applies ? specification : null;
}

export function requiredFields(scope) {
  return Object.entries(SPECIFICATIONS).filter(([, specification]) => specification.requiredOn.includes(scope)).map(([name]) => name);
}
