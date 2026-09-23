import { declarationReference } from "../domain/source-references.js";
import { codedDiagnostic } from "../domain/diagnostics.js";
import { isAnnotation } from "../domain/traversal.js";

/** Boundaries constrain physical progression; annotations may surround them. */
export function validateBoundaries(elements, sources = []) {
  const sourceByElement = new Map(sources.map((source, index) => [elements[index], source]));
  const progression = elements.filter((element) => !isAnnotation(element));
  return ["start", "exit"].flatMap((type) => validateBoundary(progression, type, sourceByElement));
}

function validateBoundary(progression, type, sources) {
  const declarations = progression.filter((element) => element.type === type);
  if (declarations.length > 1) {
    return declarations.slice(1).map((element) => boundaryDiagnostic("VRL_BOUNDARY_DUPLICATE", element, sources,
      `A route may declare only one ${type}.`, `Remove the extra ${type} declaration.`, [{ message: "First boundary declaration", ...declarationReference(sources.get(declarations[0]), declarations[0].sourceLocation) }]));
  }
  const boundary = declarations[0];
  const expected = type === "start" ? progression[0] : progression.at(-1);
  if (boundary === undefined || boundary === expected) return [];
  return [boundaryDiagnostic("VRL_BOUNDARY_ORDER", boundary, sources,
    `The ${type} must be the ${type === "start" ? "first" : "last"} progression element.`,
    "Move route progression inside the boundaries; notes and hazards may appear outside them.")];
}

function boundaryDiagnostic(code, element, sources, message, suggestion, related = []) {
  return codedDiagnostic(code, "geometry", "error", message, declarationReference(sources.get(element), element.sourceLocation), suggestion, related);
}
