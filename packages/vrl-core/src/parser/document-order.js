import { sourceReference } from "../domain/source-references.js";
import { codedDiagnostic } from "../domain/diagnostics.js";

/**
 * Create an empty immutable-by-convention document-order state for a new parse.
 * @responsibility computation
 * @returns {Object} A record containing firstStatement, route, firstElement.
 */
export function initialDocumentOrder() {
  return { firstStatement: null, route: null, firstElement: null };
}

/**
 * Compute the next order state and diagnostics; recognized rejected statements still advance recovery state.
 * Advance recognized statements even when rejected, so recovery cannot reset document order.
 * @responsibility computation
 * @param {unknown} state - Current invocation-local state used to compute the next step.
 * @param {string} keyword - Recognized VRL statement keyword.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @param {Object} span - Optional end-exclusive source range.
 * @returns {Object} A record containing state, diagnostics.
 */

export function advanceDocumentOrder(state, keyword, location, span) {
  const source = sourceReference(span, location);
  const diagnostic = documentOrderDiagnostic(state, keyword, source);
  return {
    state: {
      firstStatement: state.firstStatement ?? source,
      route: state.route ?? (keyword === "route" ? source : null),
      firstElement: state.firstElement ?? (keyword === "route" || keyword === "metadata" ? null : source)
    },
    diagnostics: diagnostic === null ? [] : [diagnostic]
  };
}

/**
 * Reject statements before a route header or metadata after elements, preserving links to the earlier
 * declaration.
 * @responsibility computation
 * @param {unknown} state - Current invocation-local state used to compute the next step.
 * @param {string} keyword - Recognized VRL statement keyword.
 * @param {Object} source - Optional declaration source record with span and attribute ranges.
 * @returns {unknown} The result returned by routeOrderDiagnostic. The result returned by codedDiagnostic. Null when no matching value or problem exists.
 */
function documentOrderDiagnostic(state, keyword, source) {
  if (keyword === "route") return routeOrderDiagnostic(state, source);
  if (state.route === null) {
    return codedDiagnostic("VRL_SYNTAX_ROUTE_REQUIRED", "syntax", "error", `A route declaration is required before "${keyword}".`, source, 'Start the document with route "Name".');
  }
  if (keyword === "metadata" && state.firstElement !== null) {
    return codedDiagnostic("VRL_SYNTAX_METADATA_ORDER", "syntax", "error", "Metadata must precede all route elements.", source,
      "Move metadata lines between the route declaration and the first element.",
      [{ message: "First route element", ...state.firstElement }]);
  }
  return null;
}

/**
 * Diagnose repeated or late route headers using the first recognized statement and route locations.
 * @responsibility computation
 * @param {unknown} state - Current invocation-local state used to compute the next step.
 * @param {Object} source - Optional declaration source record with span and attribute ranges.
 * @returns {unknown} The result returned by codedDiagnostic. Null when no matching value or problem exists.
 */
function routeOrderDiagnostic(state, source) {
  if (state.route !== null) {
    return codedDiagnostic("VRL_SYNTAX_DUPLICATE_ROUTE", "syntax", "error", "Only one route declaration is allowed.", source,
      "Keep one route declaration at the start of the document.",
      [{ message: "First route declaration", ...state.route }]);
  }
  if (state.firstStatement !== null) {
    return codedDiagnostic("VRL_SYNTAX_ROUTE_ORDER", "syntax", "error", "The route declaration must be the first statement.", source,
      "Move the route declaration before metadata and elements.",
      [{ message: "First statement", ...state.firstStatement }]);
  }
  return null;
}
