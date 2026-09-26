import { metadataSource, sourceReference } from "../domain/source-references.js";
import { hasRouteName } from "../domain/route-input.js";
import { appendDiagnostics, codedDiagnostic } from "../domain/diagnostics.js";
import { validateFields } from "./validate-fields.js";
import { validateFieldRelationships } from "./validate-field-relationships.js";
import { validateElementIdentifiers } from "./validate-identifiers.js";

/**
 * Validate route name, metadata, relationships, identifiers and each element in deterministic order without
 * normalizing the recovery AST.
 * @responsibility coordinator
 * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @returns {Array} Ordered semantic diagnostics; error severity blocks compilation while warnings preserve success.
 */
export function validateRoute(ast) {
  const diagnostics = [];
  if (!hasRouteName(ast.name)) {
    diagnostics.push(codedDiagnostic("VRL_ROUTE_NAME_REQUIRED", "validation", "error", "A route name is required.", sourceReference(ast.sourceMap?.route?.nameSpan ?? ast.sourceMap?.route?.span), 'Start with route "Name".'));
  }
  const metadata = { attributes: ast.metadata, sourceLocation: { line: 1, column: 1 }, source: metadataSource(ast.sourceMap) };
  appendDiagnostics(diagnostics, validateFields(metadata, "metadata", "Metadata field"));
  appendDiagnostics(diagnostics, validateFieldRelationships(metadata));
  appendDiagnostics(diagnostics, validateElementIdentifiers(ast.elements, ast.sourceMap?.elements));
  ast.elements.forEach(/**
   * Apply appendDiagnostics to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result returned by appendDiagnostics.
   */ (element, index) => appendDiagnostics(diagnostics, validateElementAttributes(element, ast.sourceMap?.elements?.[index])));
  return diagnostics;
}

/**
 * Validate one raw element's identity, fields and relationships; route-wide uniqueness requires whole-route
 * validation.
 * @responsibility coordinator
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {Object} source - Optional declaration source record with span and attribute ranges.
 * @returns {Array} Identity, field and relationship diagnostics for this single element.
 */
export function validateElement(element, source) {
  return [...validateElementIdentifiers([element], [source]), ...validateElementAttributes(element, source)];
}

/**
 * Attach the supplied source context and combine field and relationship diagnostics for one element.
 * @responsibility coordinator
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {Object} source - Optional declaration source record with span and attribute ranges.
 * @returns {Array} Ordered field and relationship diagnostics using the attached source context.
 */
function validateElementAttributes(element, source) {
  const context = { ...element, source };
  return [...validateFields(context, element.type), ...validateFieldRelationships(context)];
}
