import { getIcon, iconManifest } from "./registry.js";

/**
 * Encode ampersands, markup delimiters and quotes for SVG text and attributes.
 * @responsibility computation
 * @param {unknown} value - Text or attribute value to coerce and escape before serialization.
 * @returns {string} String-coerced input with XML metacharacters escaped.
 */
function escapeXml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");
}

/**
 * Require a canonical registry definition before rendering its trusted paths.
 * @responsibility computation
 * @param {string} id - Exact canonical icon registry identifier.
 * @returns {Object} Frozen icon definition.
 * @throws {RangeError} No canonical icon matches the supplied ID.
 */
function requireIcon(id) {
  const icon = getIcon(id);
  if (icon === null) {
    throw new RangeError(`Unknown VRL icon: ${String(id)}`);
  }
  return icon;
}

/**
 * Serialize original frozen paths and shared stroke tokens without introducing placement or accessibility policy.
 * @responsibility computation
 * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
 * @returns {string} Geometry-only group inheriting currentColor; line definitions retain their dash patterns.
 */
function geometry(icon) {
  const style = icon.lineStyle;
  const dash = style === undefined ? "" : ` stroke-dasharray="${style.strokeDasharray}"`;
  const cap = style?.strokeLinecap ?? iconManifest.strokeLinecap;
  return `<g fill="none" stroke="currentColor" stroke-width="${style?.strokeWidth ?? iconManifest.strokeWidth}" stroke-linecap="${cap}" stroke-linejoin="${iconManifest.strokeLinejoin}"${dash}>${icon.paths.map(/**
   * Serialize one trusted registry path exactly as authored.
   * @responsibility computation
   * @param {Object} input1 - Trusted path record from the frozen icon definition.
   * @param {string} input1.d - Original trusted SVG path data.
   * @returns {string} One exact path element from trusted registry geometry.
   */ ({ d }) => `<path d="${d}"/>`).join("")}</g>`;
}

/**
 * Require a known icon and serialize its exact geometry for a parent SVG that owns accessibility.
 * @responsibility coordinator
 * @param {string} id - Exact canonical icon registry identifier.
 * @returns {string} ID-free path group inheriting currentColor.
 * @throws {RangeError} No canonical icon matches the supplied ID.
 */
export function renderIconGeometry(id) {
  return geometry(requireIcon(id));
}

/**
 * Validate standalone sizing and accessibility settings, then serialize the known definition with escaped labels.
 * @responsibility coordinator
 * @param {string} id - Exact canonical icon registry identifier.
 * @param {Object} options - Optional explicit configuration; omitted fields retain documented defaults.
 * @returns {string} Complete SVG with named or decorative semantics and no generated IDs.
 * @throws {TypeError} Size is nonpositive/nonfinite, decorative is not boolean, title is blank/nontext, or description is nontext.
 * @throws {RangeError} No canonical icon matches the supplied ID.
 */
export function renderIcon(id, options = {}) {
  const icon = requireIcon(id);
  const { size = 32, color = "currentColor", title = icon.label, description = icon.description, decorative = false } = options;
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) {
    throw new TypeError("Icon size must be a positive finite number.");
  }
  if (typeof decorative !== "boolean") {
    throw new TypeError("Icon decorative must be a boolean.");
  }
  if (typeof title !== "string" || title.trim() === "" || typeof description !== "string") {
    throw new TypeError("Icon title must be non-empty text and description must be text.");
  }
  const accessibility = decorative
    ? 'aria-hidden="true"'
    : `role="img" aria-label="${escapeXml(title)}" aria-description="${escapeXml(description)}"`;
  const text = decorative ? "" : `<title>${escapeXml(title)}</title><desc>${escapeXml(description)}</desc>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${iconManifest.viewBox}" width="${size}" height="${size}" color="${escapeXml(color)}" focusable="false" ${accessibility} data-vrl-icon="${icon.id}">${text}${geometry(icon)}</svg>`;
}
