import { assertFiniteNumber } from "@subvertic/vrl-core";
import { validatePaint } from "./paint.js";
import { escapeXml } from "./xml.js";

/**
 * Convert, validate and XML-escape an attribute value before SVG interpolation. Encode one value inside a
 * double-quoted XML attribute, exactly once.
 * @responsibility coordinator
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {string} XML-safe attribute text; invalid XML characters throw before output is emitted.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */

export function svgAttribute(value) {
  if (typeof value === "number") assertFiniteNumber(value, "SVG attribute");
  else if (typeof value !== "string") throw new TypeError("SVG attributes must be strings or finite numbers.");
  return escapeXml(value).replaceAll("\t", "&#9;").replaceAll("\n", "&#10;");
}

/**
 * Validate supported paint syntax and serialize it as an escaped SVG attribute.
 * @responsibility coordinator
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {string} Escaped supported paint text; unsafe or unsupported paints throw.
 */
export function svgPaint(value) {
  return svgAttribute(validatePaint(value));
}
