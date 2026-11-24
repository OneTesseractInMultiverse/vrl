import { validatePoolReferences } from "./validate-pool-references.js";
import { metadataSource, sourceReference } from "../domain/source-references.js";
import { hasRouteName } from "../domain/route-input.js";
import { appendDiagnostics, codedDiagnostic, hasBlockingDiagnostics } from "../domain/diagnostics.js";
import { validateFields } from "./validate-fields.js";
import { validateFieldRelationships } from "./validate-field-relationships.js";
import { validateElementIdentifiers } from "./validate-identifiers.js";
import { validateRouteDistance } from "./validate-route-distance.js";

/**
 * Validate route name, metadata, relationships, identifiers and each element in deterministic order without
 * normalizing the recovery AST. Compare declared distance with recorded walks only after semantic validation
 * has produced no blocking errors. Resolve pool associations after local checks, avoiding cascading reference
 * or aggregate errors for invalid fields/identities.
 * @responsibility coordinator
 * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @param {number} maximum - Maximum diagnostic records requested, including the first excess record during compilation.
 * @returns {Array} Ordered semantic diagnostics; error severity blocks compilation while warnings preserve success.
 */
export function validateRoute(ast, maximum = Infinity) {
  const diagnostics = [];
  if (!hasRouteName(ast.name)) {
    diagnostics.push(codedDiagnostic("VRL_ROUTE_NAME_REQUIRED", "validation", "error", "A route name is required.", sourceReference(ast.sourceMap?.route?.nameSpan ?? ast.sourceMap?.route?.span), 'Start with route "Name".'));
  }
  const metadata = { attributes: ast.metadata, sourceLocation: { line: 1, column: 1 }, source: metadataSource(ast.sourceMap) };
  appendDiagnostics(diagnostics, validateFields(metadata, "metadata", "Metadata field"), maximum);
  appendDiagnostics(diagnostics, validateFieldRelationships(metadata), maximum);
  appendDiagnostics(diagnostics, validateElementIdentifiers(ast.elements, ast.sourceMap?.elements, maximum - diagnostics.length));
  for (const [index, element] of ast.elements.entries()) {
    if (diagnostics.length >= maximum) break;
    appendDiagnostics(diagnostics, validateElementAttributes(element, ast.sourceMap?.elements?.[index]), maximum);
  }
  if (!hasBlockingDiagnostics(diagnostics)) appendDiagnostics(diagnostics, validatePoolReferences(ast, maximum - diagnostics.length));
  if (!hasBlockingDiagnostics(diagnostics)) appendDiagnostics(diagnostics, validateRouteDistance(ast), maximum);
  return diagnostics;
}

/**
 * Validate one raw element's identity, fields and relationships; route-wide uniqueness and reference
 * resolution require whole-route validation.
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
