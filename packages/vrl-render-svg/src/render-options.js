import { assertFiniteNumber, assertOptionsRecord } from "@subvertic/vrl-core";

/**
 * Require a plain options record and supported style and boolean legend settings.
 * @responsibility computation
 * @param {Object} options - Renderer settings: style, theme/tokens, language/locale, symbology, legend and caller-owned idPrefix.
 * @returns {void} Returns normally for supported option shape, style and legend flag; otherwise throws.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function validateRenderOptions(options) {
  assertOptionsRecord(options, "Renderer options");
  if (options.style !== undefined && options.style !== "classic" && options.style !== "soft-terrain") {
    throw new TypeError("Renderer style must be classic or soft-terrain.");
  }
  if (options.legend !== undefined && typeof options.legend !== "boolean") {
    throw new TypeError("Renderer option legend must be a boolean.");
  }
}

/**
 * Guard canvas dimensions and every supplied point, node and segment before renderer geometry is computed.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @returns {void} Returns normally after every supplied canvas, node, point and segment passes its boundary guard.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function validateRenderLayout(layout) {
  assertOptionsRecord(layout, "Renderer layout");
  validateCanvasNumber(layout.width, "Layout width");
  validateCanvasNumber(layout.height, "Layout height");
  if (layout.width <= 0 || layout.height < 0) throw new RangeError("Layout width must be positive and height nonnegative.");
  if (!Array.isArray(layout.nodes) || !Array.isArray(layout.segments)) {
    throw new TypeError("Renderer layout requires nodes and segments arrays.");
  }
  layout.nodes.forEach(validateNode);
  if (layout.points !== undefined) {
    if (!Array.isArray(layout.points)) throw new TypeError("Layout points must be an array.");
    layout.points.forEach(validatePoint);
  }
  layout.segments.forEach(validateSegment);
}

/**
 * Require a point record and bounded finite x/y coordinates.
 * @responsibility coordinator
 * @param {Object} point - Positioned route point in drawing coordinates.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function validatePoint(point) {
  assertOptionsRecord(point, "Layout point");
  validateCanvasNumber(point.x, "Point x");
  validateCanvasNumber(point.y, "Point y");
}

/**
 * Guard segment endpoints, optional owner and required technical pixel delta.
 * @responsibility coordinator
 * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function validateSegment(segment) {
  assertOptionsRecord(segment, "Layout segment");
  validatePoint(segment.start);
  validatePoint(segment.end);
  if (segment.element !== null) validateElementRecord(segment.element);
  if (segment.kind === "technical") validateCanvasNumber(segment.technicalDeltaY, "Technical pixel delta");
}

/**
 * Guard a positioned point and its normalized element record.
 * @responsibility coordinator
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function validateNode(node) {
  validatePoint(node);
  validateElementRecord(node.element);
}

/**
 * Require plain element and attribute records at the renderer boundary.
 * @responsibility coordinator
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function validateElementRecord(element) {
  assertOptionsRecord(element, "Layout element");
  assertOptionsRecord(element.attributes, "Layout element attributes");
}

/**
 * Require a finite numeric canvas value within the safe supported magnitude.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} name - Human-readable subject or root path included in a contract failure.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
function validateCanvasNumber(value, name) {
  assertFiniteNumber(value, name);
  if (Math.abs(value) > Number.MAX_SAFE_INTEGER) throw new RangeError(`${name} exceeds the supported magnitude.`);
}
