import { normalizeAttributeValue } from "./measurements.js";

const ID_PREFIXES = {
  start: "S",
  exit: "E",
  walk: "W",
  rappel: "R",
  downclimb: "D",
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
    summary: summarizeRoute(elements)
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
      normalizeAttributeValue(fieldName, value)
    ])
  );
}

export function summarizeRoute(elements) {
  const rappels = elements.filter((element) => element.type === "rappel");
  const walks = elements.filter((element) => element.type === "walk");
  const hazards = elements.filter((element) => element.type === "hazard");

  return {
    numberOfRappels: rappels.length,
    numberOfHazards: hazards.length,
    highestRappelMeters: highestMeasurement(rappels, "height"),
    requiredRopeMeters: highestMeasurement(rappels, "rope"),
    totalDistanceMeters: sumMeasurements(walks, "distance")
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
