import { MAX_DECIMAL_PLACES } from "./numeric-policy.js";

/**
 * Convert validated meter text into exact integer millionths for source comparisons.
 * These temporary units never enter normalized models or JSON.
 * @responsibility computation
 * @param {string} token - Validated decimal meter token ending in m, with at most MAX_DECIMAL_PLACES fractional digits.
 * @returns {bigint} Signed distance scaled by 10 ** MAX_DECIMAL_PLACES without floating-point rounding.
 * @throws {SyntaxError} BigInt rejects invalid integer text if the validated-token precondition is violated.
 */
export function metricSourceUnits(token) {
  const [whole, fraction = ""] = token.trim().slice(0, -1).split(".");
  return BigInt(whole + fraction.padEnd(MAX_DECIMAL_PLACES, "0"));
}
