import { requireNumericData } from "./numeric-policy.js";

/**
 * Compute element counts, maxima, walk-distance sums and endpoint elevations. Missing measurements contribute
 * zero to legacy aggregates; these are documentation facts, not equipment calculations.
 * @responsibility computation
 * @param {Array} elements - Route elements in source order.
 * @param {Object} metadata - Route-level metadata; absent endpoint measurements remain unknown; defaults to {}.
 * @returns {Object} Counts, declared maxima, walk-distance sum and endpoint elevation fields; legacy missing aggregates are zero and missing endpoints are null.
 */
export function summarizeRoute(elements, metadata = {}) {
  const rappels = elements.filter(/**
   * Evaluate the selection condition element.type === "rappel".
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (element) => element.type === "rappel");
  const walks = elements.filter(/**
   * Evaluate the selection condition element.type === "walk".
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (element) => element.type === "walk");
  const hazards = elements.filter(/**
   * Evaluate the selection condition element.type === "hazard".
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (element) => element.type === "hazard");
  const entranceElevationMeters = metadataElevationMeters(metadata, "entrance_elevation");
  const exitElevationMeters = metadataElevationMeters(metadata, "exit_elevation");

  return requireNumericData({
    numberOfRappels: rappels.length,
    numberOfHazards: hazards.length,
    highestRappelMeters: highestMeasurement(rappels, "height"),
    requiredRopeMeters: highestMeasurement(rappels, "rope"),
    totalDistanceMeters: sumMeasurements(walks, "distance"),
    entranceElevationMeters,
    exitElevationMeters,
    totalElevationChangeMeters: entranceElevationMeters === null || exitElevationMeters === null
      ? 0
      : entranceElevationMeters - exitElevationMeters
  }, "Route summary");
}

/**
 * Find the greatest declared measurement in meters, treating nonmeasurement values as zero.
 * @responsibility computation
 * @param {Array} elements - Route elements in source order.
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @returns {number} Aggregate meters, or zero when no supplied measurement contributes.
 */
function highestMeasurement(elements, fieldName) {
  return elements.reduce(/**
   * Accumulate the maximum typed meter value; absent or nonmeasurement values contribute zero.
   * @responsibility computation
   * @param {number} highest - Greatest measurement seen so far, in meters.
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The result returned by Math.max.
   */ (highest, element) => {
    const measurement = element.attributes[fieldName];
    const meters = typeof measurement === "object" ? measurement.meters : 0;
    return Math.max(highest, meters);
  }, 0);
}

/**
 * Sum supplied measurement values in meters, treating nonmeasurement values as zero.
 * @responsibility computation
 * @param {Array} elements - Route elements in source order.
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @returns {number} Aggregate meters, or zero when no supplied measurement contributes.
 */
function sumMeasurements(elements, fieldName) {
  return elements.reduce(/**
   * Add the current typed meter value to the running sum; absent or nonmeasurement values contribute zero.
   * @responsibility computation
   * @param {number} total - Accumulated numeric total before processing the current entry.
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (total, element) => {
    const measurement = element.attributes[fieldName];
    const meters = typeof measurement === "object" ? measurement.meters : 0;
    return total + meters;
  }, 0);
}

/**
 * Read a numeric meter value from metadata, returning null when the typed measurement is absent.
 * @responsibility computation
 * @param {Object} metadata - Route-level metadata; absent endpoint measurements remain unknown.
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @returns {number|null} Declared elevation in meters, or null when absent.
 */
function metadataElevationMeters(metadata, fieldName) {
  const measurement = metadata[fieldName];
  return typeof measurement === "object" && measurement !== null && typeof measurement.meters === "number"
    ? measurement.meters
    : null;
}
