import { createDiagnostic } from "../domain/diagnostics.js";
import { isAnnotation } from "../domain/traversal.js";

/** Boundaries constrain physical progression; annotations may surround them. */
export function validateBoundaries(elements) {
  const progression = elements.filter((element) => !isAnnotation(element));
  return ["start", "exit"].flatMap((type) => validateBoundary(progression, type));
}

function validateBoundary(progression, type) {
  const declarations = progression.filter((element) => element.type === type);
  if (declarations.length > 1) {
    return declarations.slice(1).map((element) => boundaryDiagnostic(element,
      `A route may declare only one ${type}.`, `Remove the extra ${type} declaration.`));
  }
  const boundary = declarations[0];
  const expected = type === "start" ? progression[0] : progression.at(-1);
  if (boundary === undefined || boundary === expected) return [];
  return [boundaryDiagnostic(boundary,
    `The ${type} must be the ${type === "start" ? "first" : "last"} progression element.`,
    "Move route progression inside the boundaries; notes and hazards may appear outside them.")];
}

function boundaryDiagnostic(element, message, suggestion) {
  return createDiagnostic("geometry", "error", message, element.sourceLocation, suggestion);
}
