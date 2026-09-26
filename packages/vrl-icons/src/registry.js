import { categories, icons, semanticMappings } from "./catalog.js";

/**
 * Recursively freeze the trusted, acyclic, non-null authoring records and arrays in place.
 * @responsibility computation
 * @param {unknown} value - Trusted authoring value; nested objects must be acyclic and non-null.
 * @returns {unknown} The original now deeply immutable value; primitives are returned unchanged.
 */
function freeze(value) {
  if (typeof value === "object") {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}

export const iconManifest = freeze({
  schemaVersion: 1,
  license: "MIT",
  provenance: "Original VRL vector artwork based on the canyoning poster taxonomy; not federation-certified symbols.",
  viewBox: "0 0 32 32",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  categories,
  icons,
  semanticMappings
});

export const iconRegistry = Object.freeze(Object.fromEntries(icons.map(/**
 * Associate a canonical ID with its immutable definition.
 * @responsibility computation
 * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
 * @returns {Array} Canonical ID and shared frozen definition pair for registry construction.
 */ (icon) => [icon.id, icon])));
export const iconIds = Object.freeze(icons.map(/**
 * Project the canonical ID of an immutable definition.
 * @responsibility computation
 * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
 * @returns {string} Canonical icon identifier.
 */ (icon) => icon.id));

/**
 * Resolve an exact registry ID without exposing inherited properties.
 * @responsibility computation
 * @param {string} id - Exact canonical icon registry identifier.
 * @returns {Object|null} Shared frozen definition, or null for an unknown ID.
 */
export function getIcon(id) {
  return Object.hasOwn(iconRegistry, id) ? iconRegistry[id] : null;
}

/**
 * Select immutable definitions into a new caller-owned collection.
 * @responsibility computation
 * @param {string|undefined} category - Exact category ID; omission selects all icons.
 * @returns {Object[]} All icons when category is absent; matching definitions or an empty array otherwise.
 */
export function listIcons(category) {
  return icons.filter(/**
   * Select only the requested category, or all definitions when no category is supplied.
   * @responsibility computation
   * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
   * @returns {boolean} Whether this definition belongs in the requested collection.
   */ (icon) => category === undefined || icon.category === category);
}

/**
 * Read reusable line parameters without interpreting route safety or availability.
 * @responsibility computation
 * @param {string} id - Exact canonical icon registry identifier.
 * @returns {Object|null} Frozen line style or null for unknown IDs and ordinary pictograms.
 */
export function getLineStyle(id) {
  return getIcon(id)?.lineStyle ?? null;
}
