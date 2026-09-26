/**
 * Read a typed attribute with the compatible extension fallback owned by renderer input adaptation.
 * Descriptive extensions are separate in normalized data; older supplied models remain readable.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} name - Own attribute name whose value or source range is selected.
 * @returns {unknown} The result of the documented comparison or calculation.
 */

export function elementAttribute(element, name) {
  return element.attributes[name] ?? element.extensions?.[name];
}
