import { requireNumericData, requireSupportedNumber } from "./numeric-policy.js";

/**
 * Compute observed normalized measurements separately from declared totals and unknown values.
 * Results are independently owned; inputs and legacy model summaries remain unchanged.
 * Rope maxima are declarations, not equipment requirements, and walk sums remain partial distances.
 * @responsibility computation
 * @param {readonly Object[]} elements - Compatible normalized elements; rappel ropes and walk distances contribute only to their respective aggregates.
 * @param {Object} [metadata] - Normalized metric metadata, defaulting to {}; absent measurements remain unknown.
 * @returns {Object} Nullable declared/observed meter values and observation counts; endpoint change is entrance minus exit.
 * @throws {TypeError} A present measurement is null or a primitive instead of a normalized record.
 * @throws {RangeError} A measurement or computed aggregate is nonfinite or exceeds the supported numeric magnitude.
 */
export function summarizeRouteMeasurements(elements, metadata = {}) {
  const rappels = elements.filter(/**
   * Select rappel owners for rope observations and rappel counts.
   * @responsibility computation
   * @param {Object} element - Compatible normalized route element.
   * @returns {boolean} Whether the element is a rappel.
   */ element => element.type === "rappel");
  const walks = elements.filter(/**
   * Select walk owners for distance observations and walk counts.
   * @responsibility computation
   * @param {Object} element - Compatible normalized route element.
   * @returns {boolean} Whether the element is a walk.
   */ element => element.type === "walk");
  const ropes = recordedMeasurements(rappels, "rope");
  const distances = recordedMeasurements(walks, "distance");
  const entrance = optionalMeters(metadata.entrance_elevation);
  const exit = optionalMeters(metadata.exit_elevation);
  return requireNumericData({
    maximumDeclaredRopeMeters: ropes.length === 0 ? null : ropes.reduce(/**
     * Retain the largest supplied rope declaration without deriving equipment requirements.
     * @responsibility computation
     * @param {number} maximum - Largest declaration so far in meters, initially zero.
     * @param {number} meters - Next validated normalized rope measurement.
     * @returns {number} The larger of the accumulated and current declarations.
     */ (maximum, meters) => Math.max(maximum, meters), 0),
    declaredRopeCount: ropes.length,
    rappelCount: rappels.length,
    summedWalkDistanceMeters: distances.length === 0 ? null : distances.reduce(/**
     * Add a recorded walk distance with ordinary normalized-number arithmetic.
     * @responsibility computation
     * @param {number} sum - Recorded walk sum so far in meters, initially zero.
     * @param {number} meters - Next validated normalized walk distance.
     * @returns {number} Partial sum retaining normal floating-point behavior; the enclosing summary checks overflow.
     */ (sum, meters) => sum + meters, 0),
    measuredWalkCount: distances.length,
    walkCount: walks.length,
    declaredTotalDistanceMeters: optionalMeters(metadata.total_distance),
    declaredTotalDescentMeters: optionalMeters(metadata.total_descent),
    endpointElevationChangeMeters: entrance === null || exit === null ? null : entrance - exit
  }, "Route measurement summary");
}

/**
 * Project present meter measurements from an already selected collection of element owners.
 * @responsibility computation
 * @param {readonly Object[]} elements - Compatible normalized elements with attribute records.
 * @param {string} field - Measurement attribute to inspect, such as rope or distance.
 * @returns {number[]} New ordered array of supported meter values; absent observations are omitted.
 * @throws {TypeError} A present attribute is not a normalized record.
 * @throws {RangeError} A present record contains an unsupported meter value.
 */
function recordedMeasurements(elements, field) {
  return elements.map(/**
   * Read the selected measurement on one owner without modifying its attributes.
   * @responsibility computation
   * @param {Object} element - Compatible normalized element with attributes.
   * @returns {number|null} Supported meters or null for absence; malformed measurement errors propagate.
   */ element => optionalMeters(element.attributes[field])).filter(/**
   * Retain known observations while excluding only the missing-value sentinel.
   * @responsibility computation
   * @param {number|null} meters - Projected measurement or null for absence.
   * @returns {boolean} True for every recorded numeric observation, including zero.
   */ meters => meters !== null);
}

/**
 * Extract a supported normalized meter value while distinguishing absence from malformed data.
 * @responsibility computation
 * @param {unknown} value - Undefined for absence or a normalized record containing a numeric meters field.
 * @returns {number|null} The original supported meter value, or null only when the input is undefined.
 * @throws {TypeError} A supplied value is null or is not an object.
 * @throws {RangeError} The meters field is nonnumeric, nonfinite or outside the supported magnitude.
 */
function optionalMeters(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") throw new TypeError("Summary measurements must be normalized metric records.");
  return requireSupportedNumber(value.meters, "Summary measurement");
}
