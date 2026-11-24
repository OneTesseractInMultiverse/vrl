import { parseInclinationToken } from "./inclinations.js";
import { parseMeasurementToken } from "./measurements.js";
import { parseRappelStagesToken, parseRedirectionsToken } from "./rappel-details.js";

const PARSERS = {
  measurement: parseMeasurementToken,
  inclination: parseInclinationToken,
  redirections: parseRedirectionsToken,
  stages: parseRappelStagesToken,
  integerText: parseIntegerText,
  reference: parseReference,
  enum: parseEnum
};

/**
 * Dispatch raw field text to its domain parser, preserving an explicit unknown sentinel only when the
 * resolved scoped specification permits it. Generic metric token parsing remains strict.
 * @responsibility coordinator
 * @param {Object} specification - Immutable field contract defining parser, allowed range, vocabulary and applicability.
 * @param {string} raw - Unconverted field text exactly as supplied by the caller.
 * @returns {Object} Successful typed value or the exact unknown string; otherwise a failed token result.
 */
export function parseFieldValue(specification, raw) {
  if (specification.acceptsUnknown && raw === "unknown") return { ok: true, value: "unknown" };
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
 * @returns {string[]} Distinct failure reasons for this field, in order of first occurrence.
 */
export function fieldValueProblems(specification, value) {
  if (specification.acceptsUnknown && value === "unknown") return [];
  switch (specification.parser) {
    case "measurement": return outsideRange(value.meters, specification.range) ? ["range"] : [];
    case "inclination": return outsideRange(value.percent, specification.range) ? ["range"] : [];
    case "integerText": return outsideRange(Number(value), specification.range) ? ["range"] : [];
    case "stages": return value.some(/**
     * Identify a stage outside its declared metric range.
     * @responsibility computation
     * @param {Object} stage - Typed stage measurement.
     * @returns {boolean} Whether the stage violates the specification.
     */ stage => outsideRange(stage.meters, specification.range)) ? ["stage"] : [];
    case "redirections": {
      const problems = new Set();
      for (const entry of value) {
        for (const reason of redirectionProblems(specification, entry)) problems.add(reason);
      }
      return Array.from(problems);
    }
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

/**
 * Accept a nonblank identifier without trimming, translating or resolving its exact spelling.
 * @responsibility computation
 * @param {unknown} raw - Raw attribute value; nonstrings are rejected by this permissive token boundary.
 * @returns {Object} Successful unchanged string or failed token result; route-wide target checks are separate.
 */
function parseReference(raw) {
  return typeof raw === "string" && raw.trim() !== "" ? { ok: true, value: raw } : { ok: false };
}
