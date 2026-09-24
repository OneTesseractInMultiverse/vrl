import { isElementType } from "./element-types.js";

/** Normalization accepts raw text records, never an already-normalized model. */
export function requireRouteInput(ast) {
  requireRecord(ast, "Route input");
  if (!hasRouteName(ast.name)) throw new RangeError("A route name is required.");
  requireTextAttributes(ast.metadata);
  if (!Array.isArray(ast.elements)) throw new TypeError("Route elements must be an array.");
  for (const element of ast.elements) requireElementInput(element);
}

export function hasRouteName(name) {
  return typeof name === "string" && name.length > 0;
}

export function requireElementInput(element) {
  requireRecord(element, "Element input");
  if (typeof element.type !== "string" || !isElementType(element.type)) throw new TypeError("Unknown route element type.");
  if (element.label != null && typeof element.label !== "string") throw new TypeError("Element label must be text or null.");
  requireTextAttributes(element.attributes);
  if (element.sourceLocation !== undefined) requireLocation(element.sourceLocation);
}

function requireTextAttributes(attributes) {
  requireRecord(attributes, "Raw attributes");
  for (const value of Object.values(attributes)) {
    if (typeof value !== "string") throw new TypeError("Raw attribute values must be strings.");
  }
}

function requireRecord(value, name) {
  if (value === null || typeof value !== "object" || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new TypeError(`${name} must be a plain object.`);
}

function requireLocation(value) {
  requireRecord(value, "Source location");
  if (!Number.isSafeInteger(value.line) || value.line <= 0 || !Number.isSafeInteger(value.column) || value.column <= 0) throw new TypeError("Source location requires positive safe-integer coordinates.");
}
