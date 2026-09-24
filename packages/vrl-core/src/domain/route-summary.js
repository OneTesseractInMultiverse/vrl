import { requireNumericData } from "./numeric-policy.js";

export function summarizeRoute(elements, metadata = {}) {
  const rappels = elements.filter((element) => element.type === "rappel");
  const walks = elements.filter((element) => element.type === "walk");
  const hazards = elements.filter((element) => element.type === "hazard");
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

function highestMeasurement(elements, fieldName) {
  return elements.reduce((highest, element) => {
    const measurement = element.attributes[fieldName];
    const meters = typeof measurement === "object" ? measurement.meters : 0;
    return Math.max(highest, meters);
  }, 0);
}

function sumMeasurements(elements, fieldName) {
  return elements.reduce((total, element) => {
    const measurement = element.attributes[fieldName];
    const meters = typeof measurement === "object" ? measurement.meters : 0;
    return total + meters;
  }, 0);
}

function metadataElevationMeters(metadata, fieldName) {
  const measurement = metadata[fieldName];
  return typeof measurement === "object" && measurement !== null && typeof measurement.meters === "number"
    ? measurement.meters
    : null;
}
