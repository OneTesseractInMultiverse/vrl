import { createDiagnostic } from "../domain/diagnostics.js";

export function initialDocumentOrder() {
  return { firstStatement: null, route: null, firstElement: null };
}

/** Advance recognized statements even when rejected, so recovery cannot reset document order. */
export function advanceDocumentOrder(state, keyword, location) {
  const diagnostic = documentOrderDiagnostic(state, keyword, location);
  return {
    state: {
      firstStatement: state.firstStatement ?? location,
      route: state.route ?? (keyword === "route" ? location : null),
      firstElement: state.firstElement ?? (keyword === "route" || keyword === "metadata" ? null : location)
    },
    diagnostics: diagnostic === null ? [] : [diagnostic]
  };
}

function documentOrderDiagnostic(state, keyword, location) {
  if (keyword === "route") return routeOrderDiagnostic(state, location);
  if (state.route === null) {
    return createDiagnostic("syntax", "error", `A route declaration is required before "${keyword}".`, location, 'Start the document with route "Name".');
  }
  if (keyword === "metadata" && state.firstElement !== null) {
    return createDiagnostic("syntax", "error", "Metadata must precede all route elements.", location,
      "Move metadata lines between the route declaration and the first element.",
      [{ message: "First route element", location: state.firstElement }]);
  }
  return null;
}

function routeOrderDiagnostic(state, location) {
  if (state.route !== null) {
    return createDiagnostic("syntax", "error", "Only one route declaration is allowed.", location,
      "Keep one route declaration at the start of the document.",
      [{ message: "First route declaration", location: state.route }]);
  }
  if (state.firstStatement !== null) {
    return createDiagnostic("syntax", "error", "The route declaration must be the first statement.", location,
      "Move the route declaration before metadata and elements.",
      [{ message: "First statement", location: state.firstStatement }]);
  }
  return null;
}
