import { metricSourceUnits } from "./metric-source-units.js";
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
   * Add one validated stage length to the exact source-unit accumulator.
   * @responsibility computation
   * @param {bigint} sum - Accumulated stage distance in integer millionths of a meter.
   * @param {string} token - Validated metric source token ending in m; decimal precision is already bounded.
   * @returns {bigint} Updated stage total in exact integer millionths of a meter.
   */ (sum, token) => sum + metricSourceUnits(token), 0n);
  return total === metricSourceUnits(height);
}
