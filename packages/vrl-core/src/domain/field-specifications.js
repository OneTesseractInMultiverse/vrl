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
  depth: { ...METRIC, applicability: ["pool"], acceptsUnknown: true,
    range: { minimum: 0, exclusiveMinimum: false, maximum: MAX_SOURCE_MAGNITUDE } },
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

const SPECIFICATIONS = Object.fromEntries(Object.entries(DEFINITIONS).map(/**
 * Pair a field name with its recursively frozen specification.
 * @responsibility computation
 * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
 * @param {unknown} input1[0] - Tuple member bound as name: selected field or entry name.
 * @param {unknown} input1[1] - Tuple member bound as definition: Field specification before its nested records are frozen.
 * @returns {Array} The ordered records or values assembled above.
 */ ([name, definition]) => [name, freezeSpecification(definition)]));

const RAPPEL_ROPE = freezeSpecification({ ...DEFINITIONS.rope, acceptsUnknown: true });
const RAPPEL_HEIGHT = freezeSpecification({ ...DEFINITIONS.height, acceptsUnknown: true });

/**
 * Freeze a field specification and its nested rule collections so callers cannot mutate shared domain policy.
 * @responsibility computation
 * @param {unknown} definition - Field specification before its nested records are frozen.
 * @returns {unknown} The result returned by Object.freeze.
 */
function freezeSpecification(definition) {
  const specification = { requiredOn: [], ...definition };
  Object.values(specification).forEach(Object.freeze);
  return Object.freeze(specification);
}

/**
 * Look up a known field by its own name, returning null for names outside the domain specification.
 * @responsibility computation
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function fieldSpecification(fieldName) {
  return Object.hasOwn(SPECIFICATIONS, fieldName) ? SPECIFICATIONS[fieldName] : null;
}

/**
 * Resolve a field's specification for its declared scope while retaining globally recognized numeric
 * validation. Rappel rope/height and pool depth permit explicit unknown; depth is a known field only on pools.
 * @responsibility computation
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @returns {unknown} Null when no matching value or problem exists. The selected result, including the documented absent-value fallback.
 */
export function applicableFieldSpecification(fieldName, scope) {
  const specification = fieldSpecification(fieldName);
  if (specification === null) return null;
  if (fieldName === "rope" && scope === "rappel") return RAPPEL_ROPE;
  if (fieldName === "height" && scope === "rappel") return RAPPEL_HEIGHT;
  const { applicability } = specification;
  const applies = applicability === "all" || (applicability === "elements" ? scope !== "metadata" : applicability.includes(scope));
  return applies ? specification : null;
}

/**
 * Select the specification names required in the supplied metadata or element scope.
 * @responsibility computation
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
export function requiredFields(scope) {
  return Object.entries(SPECIFICATIONS).filter(/**
   * Project the required field name from a specification entry.
   * @responsibility computation
   * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
   * @param {unknown} input1[1] - Tuple member bound as specification: the ordered input consumed below.
   * @returns {boolean} The result returned by specification.requiredOn.includes.
   */ ([, specification]) => specification.requiredOn.includes(scope)).map(/**
    * Project the required field name from a specification entry.
    * @responsibility computation
    * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
    * @param {unknown} input1[0] - Tuple member bound as name: selected field or entry name.
    * @returns {unknown} The name value selected or validated above.
    */ ([name]) => name);
}
