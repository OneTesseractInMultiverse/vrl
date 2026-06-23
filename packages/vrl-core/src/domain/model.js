import { normalizeInclinationValue } from "./inclinations.js";
import { normalizeAttributeValue } from "./measurements.js";
import { normalizeRappelDetailValue } from "./rappel-details.js";

const ID_PREFIXES = {
  start: "S",
  exit: "E",
  walk: "W",
  rappel: "R",
  downclimb: "D",
  climb: "C",
  pool: "P",
  hazard: "H",
  note: "N"
};

export function createEmptyRoute(source = "") {
  return {
    name: null,
    metadata: {},
    elements: [],
    source
  };
}

export function createRouteElement(type, attributes, sourceLocation, id = null, label = null) {
  return {
    type,
    id,
    label,
    attributes,
    sourceLocation
  };
}

export function normalizeRoute(ast) {
  const counters = {};
  const metadata = normalizeAttributes(ast.metadata);
  const elements = ast.elements.map((element) => normalizeElement(element, counters));

  return {
    name: ast.name,
    metadata,
    elements,
    summary: summarizeRoute(elements, metadata)
  };
}

export function normalizeElement(element, counters) {
  const sequence = (counters[element.type] ?? 0) + 1;
  counters[element.type] = sequence;

  return {
    ...element,
    id: element.id ?? `${ID_PREFIXES[element.type]}${sequence}`,
    attributes: normalizeAttributes(element.attributes)
  };
}

export function normalizeAttributes(attributes) {
  return Object.fromEntries(
    Object.entries(attributes).map(([fieldName, value]) => [
      fieldName,
      normalizeKnownAttributeValue(fieldName, value)
    ])
  );
}

function normalizeKnownAttributeValue(fieldName, value) {
  return normalizeRappelDetailValue(fieldName, normalizeInclinationValue(fieldName, normalizeAttributeValue(fieldName, value)));
}

export function summarizeRoute(elements, metadata = {}) {
  const rappels = elements.filter((element) => element.type === "rappel");
  const walks = elements.filter((element) => element.type === "walk");
  const hazards = elements.filter((element) => element.type === "hazard");
  const entranceElevationMeters = metadataElevationMeters(metadata, "entrance_elevation");
  const exitElevationMeters = metadataElevationMeters(metadata, "exit_elevation");

  return {
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
  };
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
