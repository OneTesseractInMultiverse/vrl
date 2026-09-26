import { parseInclinationToken } from "./inclinations.js";
import { parseMeasurementToken } from "./measurements.js";
import { parseRappelStagesToken, parseRedirectionsToken } from "./rappel-details.js";

const PARSERS = {
  measurement: parseMeasurementToken,
  inclination: parseInclinationToken,
  redirections: parseRedirectionsToken,
  stages: parseRappelStagesToken,
  integerText: parseIntegerText,
  enum: parseEnum
};

/**
 * Dispatch raw field text to the parser selected by its domain specification.
 * @responsibility coordinator
 * @param {Object} specification - Immutable field contract defining parser, allowed range, vocabulary and applicability.
 * @param {string} raw - Unconverted field text exactly as supplied by the caller.
 * @returns {unknown} The result returned by PARSERS.specification.parser.
 */
export function parseFieldValue(specification, raw) {
  return PARSERS[specification.parser](raw, specification);
}

/**
 * Accept positive decimal integer spelling while retaining text; magnitude validation is a separate step.
 * @responsibility computation
 * @param {string} raw - Unconverted field text exactly as supplied by the caller.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function parseIntegerText(raw) {
  return /^[1-9]\d*$/.test(raw) ? { ok: true, value: raw } : { ok: false };
}

/**
 * Accept only a spelling listed in the field's immutable vocabulary.
 * @responsibility computation
 * @param {string} raw - Unconverted field text exactly as supplied by the caller.
 * @param {Object} specification - Immutable field contract defining parser, allowed range, vocabulary and applicability.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function parseEnum(raw, specification) {
  return specification.values.includes(raw) ? { ok: true, value: raw } : { ok: false };
}

/**
 * Classify already-parsed values against inclusive or exclusive numeric bounds and list-entry rules.
 * @responsibility computation
 * @param {Object} specification - Immutable field contract defining parser, allowed range, vocabulary and applicability.
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {unknown} The selected result, including the documented absent-value fallback. The result returned by value.filter((stage) => outsideRange(stage.meters, specification.range)).map. The result returned by value.flatMap. The ordered records or values assembled above.
 */
export function fieldValueProblems(specification, value) {
  switch (specification.parser) {
    case "measurement": return outsideRange(value.meters, specification.range) ? ["range"] : [];
    case "inclination": return outsideRange(value.percent, specification.range) ? ["range"] : [];
    case "integerText": return outsideRange(Number(value), specification.range) ? ["range"] : [];
    case "stages": return value.filter(/**
     * Evaluate the selection condition outsideRange(stage.meters, specification.range).
     * @responsibility computation
     * @param {unknown} stage - One declared metric stage in source order.
     * @returns {unknown} The result returned by outsideRange.
     */ (stage) => outsideRange(stage.meters, specification.range)).map(/**
     * Supply the fixed "stage" value.
     * @responsibility computation
     * @returns {string} The literal "stage" for this branch.
     */ () => "stage");
    case "redirections": return value.flatMap(/**
     * Apply redirectionProblems to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {Object} entry - Parsed redirection with typed distance.meters and side text.
     * @returns {unknown} The result returned by redirectionProblems.
     */ (entry) => redirectionProblems(specification, entry));
    default: return [];
  }
}

/**
 * Evaluate the specification's minimum inclusivity and inclusive maximum against a numeric value.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {Object} range - Numeric bounds and minimum-inclusivity flag.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
function outsideRange(value, range) {
  return (range.exclusiveMinimum ? value <= range.minimum : value < range.minimum) || value > range.maximum;
}

/**
 * Assess redirection constraints using the supplied validated range or route height, retaining each offending
 * entry.
 * @responsibility computation
 * @param {Object} specification - Immutable field contract defining parser, allowed range, vocabulary and applicability.
 * @param {Object} entry - Parsed redirection with typed distance.meters and side text.
 * @returns {unknown} The ordered records or values assembled above. The selected result, including the documented absent-value fallback.
 */
function redirectionProblems(specification, entry) {
  if (outsideRange(entry.distance.meters, specification.range)) return ["distance"];
  return specification.values.includes(entry.side) ? [] : ["side"];
}
