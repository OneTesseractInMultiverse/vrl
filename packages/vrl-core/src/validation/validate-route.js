import { metadataSource, sourceReference } from "../domain/source-references.js";
import { hasRouteName } from "../domain/route-input.js";
import { appendDiagnostics, codedDiagnostic } from "../domain/diagnostics.js";
import { validateFields } from "./validate-fields.js";
import { validateFieldRelationships } from "./validate-field-relationships.js";
import { validateElementIdentifiers } from "./validate-identifiers.js";

export function validateRoute(ast) {
  const diagnostics = [];
  if (!hasRouteName(ast.name)) {
    diagnostics.push(codedDiagnostic("VRL_ROUTE_NAME_REQUIRED", "validation", "error", "A route name is required.", sourceReference(ast.sourceMap?.route?.nameSpan ?? ast.sourceMap?.route?.span), 'Start with route "Name".'));
  }
  const metadata = { attributes: ast.metadata, sourceLocation: { line: 1, column: 1 }, source: metadataSource(ast.sourceMap) };
  appendDiagnostics(diagnostics, validateFields(metadata, "metadata", "Metadata field"));
  appendDiagnostics(diagnostics, validateFieldRelationships(metadata));
  appendDiagnostics(diagnostics, validateElementIdentifiers(ast.elements, ast.sourceMap?.elements));
  ast.elements.forEach((element, index) => appendDiagnostics(diagnostics, validateElementAttributes(element, ast.sourceMap?.elements?.[index])));
  return diagnostics;
}

export function validateElement(element, source) {
  return [...validateElementIdentifiers([element], [source]), ...validateElementAttributes(element, source)];
}

function validateElementAttributes(element, source) {
  const context = { ...element, source };
  return [...validateFields(context, element.type), ...validateFieldRelationships(context)];
}
