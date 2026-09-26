/**
 * Allocate an empty recovery AST with source text and source-map collections; no domain validity is implied.
 * Raw syntax records for parsers and recovery; these do not establish domain validity.
 * @responsibility computation
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics; defaults to "".
 * @returns {Object} A record containing name, metadata, elements, source, sourceMap.
 */

export function createEmptyRoute(source = "") {
  return {
    name: null,
    metadata: {},
    elements: [],
    source,
    sourceMap: { route: null, metadata: [], elements: [] }
  };
}

/**
 * Construct an unvalidated syntax element from raw attributes and optional identity, label and location.
 * @responsibility computation
 * @param {unknown} type - Declared element or record discriminator.
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {unknown} sourceLocation - Optional one-based source position retained from parsing.
 * @param {unknown} id - Explicit or already allocated route element identifier; defaults to null.
 * @param {string} label - Unescaped display label supplied by the caller; defaults to null.
 * @returns {Object} A record containing type, id, label, attributes, sourceLocation.
 */
export function createRouteElement(type, attributes, sourceLocation, id = null, label = null) {
  return {
    type,
    id,
    label,
    attributes,
    sourceLocation
  };
}

