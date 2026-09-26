import { assertFiniteNumber } from "@subvertic/vrl-core";
import { validatePaint } from "./paint.js";
import { escapeXml } from "./xml.js";

/** Encode one value inside a double-quoted XML attribute, exactly once. */
export function svgAttribute(value) {
  if (typeof value === "number") assertFiniteNumber(value, "SVG attribute");
  else if (typeof value !== "string") throw new TypeError("SVG attributes must be strings or finite numbers.");
  return escapeXml(value).replaceAll("\t", "&#9;").replaceAll("\n", "&#10;");
}

export function svgPaint(value) {
  return svgAttribute(validatePaint(value));
}
