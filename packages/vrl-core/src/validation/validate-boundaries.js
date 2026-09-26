import { declarationReference } from "../domain/source-references.js";
import { codedDiagnostic } from "../domain/diagnostics.js";
import { isAnnotation } from "../domain/traversal.js";

/**
 * Validate start and exit uniqueness and placement against physical progression, excluding standalone
 * annotations. Boundaries constrain physical progression; annotations may surround them.
 * @responsibility coordinator
 * @param {Array} elements - Route elements in source order.
 * @param {unknown} sources - Declaration source records aligned with their corresponding elements; defaults to [].
 * @returns {Array} Located duplicate or ordering errors for explicit start/exit declarations.
 */

export function validateBoundaries(elements, sources = []) {
  const sourceByElement = new Map(sources.map(/**
   * Associate each source declaration with its original element object for located boundary errors.
   * @responsibility computation
   * @param {Object} source - Optional declaration source record with span and attribute ranges.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Array} The ordered records or values assembled above.
   */ (source, index) => [elements[index], source]));
  const progression = elements.filter(/**
   * Evaluate the selection condition !isAnnotation(element).
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (element) => !isAnnotation(element));
  return ["start", "exit"].flatMap(/**
   * Apply validateBoundary to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} type - Declared element or record discriminator.
   * @returns {unknown} The result returned by validateBoundary.
   */ (type) => validateBoundary(progression, type, sourceByElement));
}

/**
 * Diagnose duplicate or misplaced declarations of one boundary type and link the conflicting source locations.
 * @responsibility computation
 * @param {unknown} progression - Ordered nonannotation entries retaining original element indexes.
 * @param {unknown} type - Declared element or record discriminator.
 * @param {unknown} sources - Declaration source records aligned with their corresponding elements.
 * @returns {Array} Located problems for the selected boundary type, or an empty list.
 */
function validateBoundary(progression, type, sources) {
  const declarations = progression.filter(/**
   * Evaluate the selection condition element.type === type.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (element) => element.type === type);
  if (declarations.length > 1) {
    return declarations.slice(1).map(/**
     * Apply boundaryDiagnostic to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {Object} element - Owning route element with its type, identity and declared attributes.
     * @returns {unknown} The result returned by boundaryDiagnostic.
     */ (element) => boundaryDiagnostic("VRL_BOUNDARY_DUPLICATE", element, sources,
      `A route may declare only one ${type}.`, `Remove the extra ${type} declaration.`, [{ message: "First boundary declaration", ...declarationReference(sources.get(declarations[0]), declarations[0].sourceLocation) }]));
  }
  const boundary = declarations[0];
  const expected = type === "start" ? progression[0] : progression.at(-1);
  if (boundary === undefined || boundary === expected) return [];
  return [boundaryDiagnostic("VRL_BOUNDARY_ORDER", boundary, sources,
    `The ${type} must be the ${type === "start" ? "first" : "last"} progression element.`,
    "Move route progression inside the boundaries; notes and hazards may appear outside them.")];
}

/**
 * Construct a located geometry error for a route boundary with optional related declarations.
 * @responsibility computation
 * @param {string} code - Stable diagnostic code or selected symbol code owned by this record.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} sources - Declaration source records aligned with their corresponding elements.
 * @param {string} message - Human-readable explanation retained in the diagnostic.
 * @param {string} suggestion - Actionable correction text retained in the diagnostic.
 * @param {Array} related - Additional related declarations included in the diagnostic; defaults to [].
 * @returns {unknown} The result returned by codedDiagnostic.
 */
function boundaryDiagnostic(code, element, sources, message, suggestion, related = []) {
  return codedDiagnostic(code, "geometry", "error", message, declarationReference(sources.get(element), element.sourceLocation), suggestion, related);
}
