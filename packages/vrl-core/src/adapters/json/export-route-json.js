import { requireSupportedNumber } from "../../domain/numeric-policy.js";

/**
 * Validate numeric data and serialize the route as indented JSON; native cycles, BigInt and custom toJSON
 * failures propagate.
 * @responsibility coordinator
 * @param {Object} model - Normalized route data with typed attributes, traversal and summary.
 * @returns {string} The result returned by JSON.stringify.
 */
export function exportRouteJson(model) {
  return JSON.stringify(model, supportedJsonValue, 2);
}

/**
 * Reject unsupported numeric leaves encountered by JSON serialization, including values returned by custom
 * toJSON methods.
 * @responsibility computation
 * @param {unknown} _key - JSON property name required by the replacer signature; intentionally unused.
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function supportedJsonValue(_key, value) {
  return typeof value === "number" ? requireSupportedNumber(value, "JSON number") : value;
}
