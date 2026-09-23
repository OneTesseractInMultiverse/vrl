import { fieldSpecification } from "./field-specifications.js";
import { parseFieldValue } from "./field-values.js";
import { createTraversal } from "./traversal.js";
import { requireNumericData } from "./numeric-policy.js";
import { allocateElementIdentifiers } from "./element-identifiers.js";

export function createEmptyRoute(source = "") {
  return {
    name: null,
    metadata: {},
    elements: [],
    source,
    sourceMap: { route: null, metadata: [], elements: [] }
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
  const identifiers = allocateElementIdentifiers(ast.elements);
  const metadata = normalizeAttributes(ast.metadata);
  const elements = ast.elements.map((element, index) => normalizeIdentifiedElement(element, identifiers[index]));

  return {
    name: ast.name,
    metadata,
    elements,
    traversal: createTraversal(elements),
    summary: summarizeRoute(elements, metadata)
  };
}

export function normalizeElement(element, counters) {
  const [id] = allocateElementIdentifiers([element], counters);
  return normalizeIdentifiedElement(element, id);
}

function normalizeIdentifiedElement(element, id) {
  return {
    ...element,
    id,
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
  const specification = fieldSpecification(fieldName);
  if (specification === null) return value;
  const parsed = parseFieldValue(specification, value);
  return parsed.ok ? parsed.value : value;
}

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
