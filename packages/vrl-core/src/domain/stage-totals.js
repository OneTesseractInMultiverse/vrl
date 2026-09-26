import { MAX_DECIMAL_PLACES } from "./numeric-policy.js";
import { fieldSpecification } from "./field-specifications.js";

// Only validated metric source tokens reach this computation. Keep exact units
// private: normalized models and JSON continue to contain ordinary numbers.
/**
 * Compare validated metric stage text with height using exact integer millionths, avoiding floating-point
 * equality drift.
 * @responsibility computation
 * @param {string} stages - Validated plus-separated metric source tokens, retaining exact decimal spelling.
 * @param {string} height - Validated metric source token ending in m; decimal precision is already bounded.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function stageTotalMatchesHeight(stages, height) {
  const total = stages.split(fieldSpecification("stages").separator).reduce(/**
   * Compute sum + metricSourceUnits(token).
   * @responsibility computation
   * @param {number} sum - Accumulated numeric sum before processing the current entry.
   * @param {string} token - Validated metric source token ending in m; decimal precision is already bounded.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (sum, token) => sum + metricSourceUnits(token), 0n);
  return total === metricSourceUnits(height);
}

/**
 * Convert validated source meter text to signed integer millionths; temporary BigInt values never enter the
 * public model.
 * @responsibility computation
 * @param {string} token - Validated metric source token ending in m; decimal precision is already bounded.
 * @returns {unknown} The result returned by BigInt.
 */
function metricSourceUnits(token) {
  const [whole, fraction = ""] = token.trim().slice(0, -1).split(".");
  return BigInt(whole + fraction.padEnd(MAX_DECIMAL_PLACES, "0"));
}
