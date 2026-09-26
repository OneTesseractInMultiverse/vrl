/**
 * Select a span's start or a fallback location while retaining the full optional span. Syntax provenance is
 * optional; legacy/programmatic data keeps point locations.
 * @responsibility computation
 * @param {Object} span - Optional end-exclusive source range.
 * @param {unknown} fallback - Value used when the requested optional field is absent; defaults to { line: 1, column: 1 }.
 * @returns {Object} A record containing location, the supplied fields.
 */

export function sourceReference(span, fallback = { line: 1, column: 1 }) {
  return { location: span?.start ?? fallback, ...(span == null ? {} : { span }) };
}

/**
 * Resolve a declaration's source span to a diagnostic reference with a fallback location.
 * @responsibility computation
 * @param {Object|undefined} source - Optional parser declaration with span, identifier span and attribute ranges.
 * @param {unknown} fallback - Value used when the requested optional field is absent.
 * @returns {unknown} The result returned by sourceReference.
 */
export function declarationReference(source, fallback) {
  return sourceReference(source?.span, fallback);
}

/**
 * Prefer an attribute value's source range and fall back to its declaration for programmatic inputs.
 * @responsibility computation
 * @param {Object|undefined} source - Optional parser declaration with span, identifier span and attribute ranges.
 * @param {string} name - Own attribute name whose value or source range is selected.
 * @param {unknown} fallback - Value used when the requested optional field is absent.
 * @returns {unknown} The result returned by sourceReference.
 */
export function fieldReference(source, name, fallback) {
  const attributes = source?.attributeSpans;
  const span = attributes && Object.hasOwn(attributes, name) ? attributes[name].valueSpan : undefined;
  return sourceReference(span ?? source?.span, fallback);
}

/**
 * Prefer an explicit identifier range and fall back to the element declaration.
 * @responsibility computation
 * @param {Object|undefined} source - Optional parser declaration with span, identifier span and attribute ranges.
 * @param {unknown} fallback - Value used when the requested optional field is absent.
 * @returns {unknown} The result returned by sourceReference.
 */
export function identifierReference(source, fallback) {
  return sourceReference(source?.idSpan ?? source?.span, fallback);
}

/**
 * Combine metadata declaration records into one attribute source map for located validation.
 * @responsibility computation
 * @param {Object} sourceMap - Parser-owned source ranges; may be absent for programmatic input.
 * @returns {Object} A record containing span, attributeSpans.
 */
export function metadataSource(sourceMap) {
  const declarations = sourceMap?.metadata ?? [];
  return { span: declarations[0]?.span, attributeSpans: Object.fromEntries(declarations.flatMap(/**
   * Apply Object.entries to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} declaration - Syntax declaration or source-location record being inspected.
   * @returns {unknown} The result returned by Object.entries.
   */ (declaration) => Object.entries(declaration.attributeSpans ?? {}))) };
}
