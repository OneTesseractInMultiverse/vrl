import { createDiagnostic } from "../domain/diagnostics.js";
import { elementIdentifierProblems } from "../domain/element-identifiers.js";

export function validateElementIdentifiers(elements) {
  return elementIdentifierProblems(elements).map(identifierDiagnostic);
}

function identifierDiagnostic({ element, first, message }) {
  return createDiagnostic("validation", "error", message, element.sourceLocation,
    "Choose a non-blank identifier unique within this route, or omit it for automatic numbering.",
    first === null ? [] : [{ message: "First declaration of this identifier", location: first.sourceLocation }]);
}
