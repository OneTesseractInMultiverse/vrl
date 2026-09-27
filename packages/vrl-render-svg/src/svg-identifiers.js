/**
 * Validate the caller's namespace and derive stable SVG IDs for markers and accessible title/description
 * links. Resolve document-scoped SVG identifiers without global state or markup encoding.
 * @responsibility computation
 * @param {string} idPrefix - Caller-owned unique SVG namespace; defaults retain standalone-document compatibility; defaults to "vrl".
 * @returns {Object} Owned arrow, title, description and adjacent-text IDs within the caller namespace.
 */

export function resolveSvgIdentifiers(idPrefix = "vrl") {
  validateIdPrefix(idPrefix);
  return { arrow: `${idPrefix}-arrow`, title: `${idPrefix}-title`, description: `${idPrefix}-description`, text: `${idPrefix}-text` };
}

/**
 * Require a supported nonempty SVG namespace string to prevent unsafe IDs and references.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
function validateIdPrefix(value) {
  if (typeof value !== "string") throw new TypeError("Renderer idPrefix must be a string.");
  if (value.length === 0 || value.length > 64 || !/^[A-Za-z]/.test(value) || /[^A-Za-z0-9_-]/.test(value)) {
    throw new RangeError("Renderer idPrefix must contain 1 to 64 ASCII letters, digits, underscores or hyphens, starting with a letter.");
  }
}
