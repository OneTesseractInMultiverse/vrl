import { codedDiagnostic } from "../domain/diagnostics.js";
import { elementIdentifierProblems } from "../domain/element-identifiers.js";
import { identifierReference } from "../domain/source-references.js";

/**
 * Assess route-wide identifier problems and map each affected element to its source reference.
 * @responsibility coordinator
 * @param {Array} elements - Route elements in source order.
 * @param {unknown} sources - Declaration source records aligned with their corresponding elements; defaults to [].
 * @returns {Array} Located invalid/duplicate identity diagnostics with the first duplicate as a related location.
 */
export function validateElementIdentifiers(elements, sources = []) {
  const sourceByElement = new Map(sources.map(/**
   * Associate each source declaration with its original element object for located identity errors.
   * @responsibility computation
   * @param {Object} source - Optional declaration source record with span and attribute ranges.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Array} The ordered records or values assembled above.
   */ (source, index) => [elements[index], source]));
  return elementIdentifierProblems(elements).map(/**
   * Apply identifierDiagnostic to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} problem - Classified domain or budget problem to translate.
   * @returns {unknown} The result returned by identifierDiagnostic.
   */ (problem) => identifierDiagnostic(problem, sourceByElement));
}

/**
 * Translate invalid or repeated identity problems into located errors, retaining the first declaration as a
 * related location.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {Object} input1.element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} input1.first - First declaration involved in a duplicate-identity problem, or null.
 * @param {string} input1.message - Human-readable explanation retained in the diagnostic.
 * @param {unknown} sources - Declaration source records aligned with their corresponding elements.
 * @returns {unknown} The result returned by codedDiagnostic.
 */
function identifierDiagnostic({ element, first, message }, sources) {
  return codedDiagnostic(first === null ? "VRL_IDENTIFIER_INVALID" : "VRL_IDENTIFIER_DUPLICATE", "validation", "error", message,
    identifierReference(sources.get(element), element.sourceLocation),
    "Choose a non-blank identifier unique within this route, or omit it for automatic numbering.",
    first === null ? [] : [{ message: "First declaration of this identifier", ...identifierReference(sources.get(first), first.sourceLocation) }]);
}
