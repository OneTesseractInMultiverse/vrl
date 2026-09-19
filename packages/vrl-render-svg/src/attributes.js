import { assertFiniteNumber } from "@subvertic/core";
import { validatePaint } from "./paint.js";
import { escapeXml } from "./xml.js";

/** Encode one value inside a double-quoted XML attribute, exactly once. */
export function svgAttribute(value) {
  if (typeof value === "number") assertFiniteNumber(value, "SVG attribute");
  else if (typeof value !== "string") throw new TypeError("SVG attributes must be strings or finite numbers.");
  const text = String(value);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ud800-\udfff\ufffe\uffff]/u.test(text)) {
    throw new TypeError("SVG attributes must contain valid XML characters.");
  }
  return escapeXml(text).replaceAll("\t", "&#9;").replaceAll("\n", "&#10;").replaceAll("\r", "&#13;");
}

export function svgPaint(value) {
  return svgAttribute(validatePaint(value));
}
