import { normalizeAttributeSet } from "./normalize-attributes.js";
import { createTraversal } from "./traversal.js";
import { allocateElementIdentifiers } from "./element-identifiers.js";
import { requireElementInput, requireRouteInput } from "./route-input.js";
import { summarizeRoute } from "./route-summary.js";

export function normalizeRoute(ast) {
  requireRouteInput(ast);
  const identifiers = allocateElementIdentifiers(ast.elements);
  const metadata = normalizeAttributeSet(ast.metadata, "metadata");
  const elements = ast.elements.map((element, index) => normalizeIdentifiedElement(element, identifiers[index]));
  return { name: ast.name, metadata: metadata.fields, extensions: metadata.extensions, elements,
    traversal: createTraversal(elements), summary: summarizeRoute(elements, metadata.fields) };
}

export function normalizeElement(element, counters) {
  requireElementInput(element);
  const attributes = normalizeAttributeSet(element.attributes, element.type);
  const [id] = allocateElementIdentifiers([element], counters);
  return normalizedElement(element, id, attributes);
}

function normalizeIdentifiedElement(element, id) {
  return normalizedElement(element, id, normalizeAttributeSet(element.attributes, element.type));
}

function normalizedElement(element, id, attributes) {
  return { type: element.type, id, label: element.label ?? null, attributes: attributes.fields, extensions: attributes.extensions,
    sourceLocation: element.sourceLocation === undefined ? undefined : { line: element.sourceLocation.line, column: element.sourceLocation.column } };
}
