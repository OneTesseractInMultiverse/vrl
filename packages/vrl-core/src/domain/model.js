import { normalizeAttributeSet } from "./normalize-attributes.js";
import { createTraversal } from "./traversal.js";
import { allocateElementIdentifiers } from "./element-identifiers.js";
import { requireElementInput, requireRouteInput } from "./route-input.js";
import { summarizeRoute } from "./route-summary.js";

/**
 * Validate raw syntax, allocate route-wide identifiers, normalize attributes and elements, then compose
 * traversal and summary into the explicit domain model.
 * @responsibility coordinator
 * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @returns {Object} Explicit normalized model containing metadata/extensions, unique elements, canonical traversal and route summary.
 */
export function normalizeRoute(ast) {
  requireRouteInput(ast);
  const identifiers = allocateElementIdentifiers(ast.elements);
  const metadata = normalizeAttributeSet(ast.metadata, "metadata");
  const elements = ast.elements.map(/**
   * Apply normalizeIdentifiedElement to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result returned by normalizeIdentifiedElement.
   */ (element, index) => normalizeIdentifiedElement(element, identifiers[index]));
  return { name: ast.name, metadata: metadata.fields, extensions: metadata.extensions, elements,
    traversal: createTraversal(elements), summary: summarizeRoute(elements, metadata.fields) };
}

/**
 * Validate and normalize one raw element, updating caller-owned ID counters; collection-wide uniqueness
 * requires normalizeRoute.
 * @responsibility coordinator
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} counters - Caller-owned per-element-type counters, advanced during identifier allocation.
 * @returns {Object} Normalized element with typed attributes, extensions and allocated identity.
 */
export function normalizeElement(element, counters) {
  requireElementInput(element);
  const attributes = normalizeAttributeSet(element.attributes, element.type);
  const [id] = allocateElementIdentifiers([element], counters);
  return normalizedElement(element, id, attributes);
}

/**
 * Normalize an element's scoped attributes and assemble it with an already allocated identifier.
 * @responsibility coordinator
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} id - Explicit or already allocated route element identifier.
 * @returns {unknown} The result returned by normalizedElement.
 */
function normalizeIdentifiedElement(element, id) {
  return normalizedElement(element, id, normalizeAttributeSet(element.attributes, element.type));
}

/**
 * Project syntax into explicit normalized fields, preserving optional source location and excluding parser
 * bookkeeping.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} id - Explicit or already allocated route element identifier.
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @returns {Object} A record containing type, id, label, attributes, extensions, sourceLocation.
 */
function normalizedElement(element, id, attributes) {
  return { type: element.type, id, label: element.label ?? null, attributes: attributes.fields, extensions: attributes.extensions,
    sourceLocation: element.sourceLocation === undefined ? undefined : { line: element.sourceLocation.line, column: element.sourceLocation.column } };
}
