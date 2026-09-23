import { sourceReference } from "../domain/source-references.js";
import { codedDiagnostic } from "../domain/diagnostics.js";

export function initialDocumentOrder() {
  return { firstStatement: null, route: null, firstElement: null };
}

/** Advance recognized statements even when rejected, so recovery cannot reset document order. */
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
