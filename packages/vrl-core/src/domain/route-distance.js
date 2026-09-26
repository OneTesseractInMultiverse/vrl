import { metricSourceUnits } from "./metric-source-units.js";

/**
 * Compare a declared total against recorded walk distances using exact source units.
 * A partial sum can disprove a smaller total but cannot establish route completeness.
 * @responsibility computation
 * @param {Object[]} elements - Field-validated raw elements; only own distance attributes on walks contribute.
 * @param {Object} metadata - Field-validated raw metadata; an absent own total_distance disables comparison.
 * @returns {boolean} True only when the recorded walk sum exceeds the declared total; inputs remain unchanged.
 */
export function declaredDistanceBelowWalkSum(elements, metadata) {
  if (!Object.hasOwn(metadata, "total_distance")) return false;
  const sum = elements.reduce(/**
   * Add an own walk-distance declaration to the exact partial-distance accumulator.
   * @responsibility computation
   * @param {bigint} total - Sum so far in integer millionths of a meter.
   * @param {Object} element - Field-validated raw route element with string attributes.
   * @returns {bigint} Updated sum, or the unchanged accumulator for other elements or absent distances.
   */ (total, element) => element.type === "walk" && Object.hasOwn(element.attributes, "distance")
    ? total + metricSourceUnits(element.attributes.distance) : total, 0n);
  return sum > metricSourceUnits(metadata.total_distance);
}
