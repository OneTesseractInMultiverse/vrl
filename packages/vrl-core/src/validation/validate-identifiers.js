import { codedDiagnostic } from "../domain/diagnostics.js";
import { elementIdentifierProblems } from "../domain/element-identifiers.js";
import { identifierReference } from "../domain/source-references.js";

export function validateElementIdentifiers(elements, sources = []) {
  const sourceByElement = new Map(sources.map((source, index) => [elements[index], source]));
  return elementIdentifierProblems(elements).map((problem) => identifierDiagnostic(problem, sourceByElement));
}

function identifierDiagnostic({ element, first, message }, sources) {
  return codedDiagnostic(first === null ? "VRL_IDENTIFIER_INVALID" : "VRL_IDENTIFIER_DUPLICATE", "validation", "error", message,
    identifierReference(sources.get(element), element.sourceLocation),
    "Choose a non-blank identifier unique within this route, or omit it for automatic numbering.",
    first === null ? [] : [{ message: "First declaration of this identifier", ...identifierReference(sources.get(first), first.sourceLocation) }]);
}
