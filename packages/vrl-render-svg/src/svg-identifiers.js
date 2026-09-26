/** Resolve document-scoped SVG identifiers without global state or markup encoding. */
export function resolveSvgIdentifiers(idPrefix = "vrl") {
  validateIdPrefix(idPrefix);
  return { arrow: `${idPrefix}-arrow` };
}

function validateIdPrefix(value) {
  if (typeof value !== "string") throw new TypeError("Renderer idPrefix must be a string.");
  if (value.length === 0 || value.length > 64 || !/^[A-Za-z]/.test(value) || /[^A-Za-z0-9_-]/.test(value)) {
    throw new RangeError("Renderer idPrefix must contain 1 to 64 ASCII letters, digits, underscores or hyphens, starting with a letter.");
  }
}
