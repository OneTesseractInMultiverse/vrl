import { iconManifest } from "./registry.js";

/**
 * Read only an own mapping key, rejecting prototype names as absent.
 * @responsibility computation
 * @param {Object} table - Trusted immutable semantic lookup table.
 * @param {string|undefined} key - Exact requested mapping key, possibly absent.
 * @returns {unknown} Stored mapping value or null when no own entry exists.
 */
function lookup(table, key) {
  return Object.hasOwn(table, key) ? table[key] : null;
}

/**
 * Resolve explicit element/subtype values through the immutable registry, preserving primary pool and hazard fallbacks.
 * @responsibility computation
 * @param {Object|null|undefined} element - Optional presentation record with type and explicit attribute values.
 * @returns {string|null} Mapped icon ID or null for missing/unknown elements; notes are never interpreted.
 */
export function resolveElementIconId(element) {
  const mappings = iconManifest.semanticMappings;
  const subtypes = lookup(mappings.subtypes, element?.type);
  return (subtypes === null ? null : lookup(subtypes, element?.attributes?.type))
    ?? lookup(mappings.elements, element?.type);
}

/**
 * Map exact structured attribute values without guessing from free text or localized labels.
 * @responsibility computation
 * @param {string} field - Structured attribute name whose mapping is requested.
 * @param {unknown} value - Explicit attribute value to match against the field mapping; unsupported values return null.
 * @returns {string|null} Supported icon ID, otherwise null.
 */
export function resolveAttributeIconId(field, value) {
  const values = lookup(iconManifest.semanticMappings.attributes, field);
  return values === null ? null : lookup(values, value);
}
