import { appendDiagnostics, createDiagnostic } from "../domain/diagnostics.js";
import { validateFields } from "./validate-fields.js";
import { validateFieldRelationships } from "./validate-field-relationships.js";
import { validateElementIdentifiers } from "./validate-identifiers.js";

export function validateRoute(ast) {
  const diagnostics = [];
  if (ast.name === null || ast.name === "") {
    diagnostics.push(createDiagnostic("validation", "error", "A route name is required.", { line: 1, column: 1 }, 'Start with route "Name".'));
  }
  const metadata = { attributes: ast.metadata, sourceLocation: { line: 1, column: 1 } };
  appendDiagnostics(diagnostics, validateFields(metadata, "metadata", "Metadata field"));
  appendDiagnostics(diagnostics, validateFieldRelationships(metadata));
  appendDiagnostics(diagnostics, validateElementIdentifiers(ast.elements));
  ast.elements.forEach((element) => appendDiagnostics(diagnostics, validateElementAttributes(element)));
  return diagnostics;
}

export function validateElement(element) {
  return [...validateElementIdentifiers([element]), ...validateElementAttributes(element)];
}

function validateElementAttributes(element) {
  return [...validateFields(element, element.type), ...validateFieldRelationships(element)];
}
