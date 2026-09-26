import { requireNumericData, requireSupportedNumber } from "./numeric-policy.js";

/** Observed normalized measurements, never equipment requirements or inferred totals. */
export function summarizeRouteMeasurements(elements, metadata = {}) {
  const rappels = elements.filter(element => element.type === "rappel");
  const walks = elements.filter(element => element.type === "walk");
  const ropes = recordedMeasurements(rappels, "rope");
  const distances = recordedMeasurements(walks, "distance");
  const entrance = optionalMeters(metadata.entrance_elevation);
  const exit = optionalMeters(metadata.exit_elevation);
  return requireNumericData({
    maximumDeclaredRopeMeters: ropes.length === 0 ? null : ropes.reduce((maximum, meters) => Math.max(maximum, meters), 0),
    declaredRopeCount: ropes.length,
    rappelCount: rappels.length,
    summedWalkDistanceMeters: distances.length === 0 ? null : distances.reduce((sum, meters) => sum + meters, 0),
    measuredWalkCount: distances.length,
    walkCount: walks.length,
    declaredTotalDistanceMeters: optionalMeters(metadata.total_distance),
    declaredTotalDescentMeters: optionalMeters(metadata.total_descent),
    endpointElevationChangeMeters: entrance === null || exit === null ? null : entrance - exit
  }, "Route measurement summary");
}

function recordedMeasurements(elements, field) {
  return elements.map(element => optionalMeters(element.attributes[field])).filter(meters => meters !== null);
}

function optionalMeters(value) {
  if (value === undefined) return null;
  if (value === null || typeof value !== "object") throw new TypeError("Summary measurements must be normalized metric records.");
  return requireSupportedNumber(value.meters, "Summary measurement");
}
