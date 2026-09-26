import { isElementType } from "./element-types.js";

/**
 * Guard raw route shape, name, string metadata and each raw element before domain normalization. Normalization
 * accepts raw text records, never an already-normalized model.
 * @responsibility coordinator
 * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */

export function requireRouteInput(ast) {
  requireRecord(ast, "Route input");
  if (!hasRouteName(ast.name)) throw new RangeError("A route name is required.");
  requireTextAttributes(ast.metadata);
  if (!Array.isArray(ast.elements)) throw new TypeError("Route elements must be an array.");
  for (const element of ast.elements) requireElementInput(element);
}

/**
 * Recognize a nonempty primitive string as a declared route name.
 * @responsibility computation
 * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
export function hasRouteName(name) {
  return typeof name === "string" && name.length > 0;
}

/**
 * Guard element type, optional label, raw string attributes and optional positive source location.
 * @responsibility coordinator
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function requireElementInput(element) {
  requireRecord(element, "Element input");
  if (typeof element.type !== "string" || !isElementType(element.type)) throw new TypeError("Unknown route element type.");
  if (element.label != null && typeof element.label !== "string") throw new TypeError("Element label must be text or null.");
  requireTextAttributes(element.attributes);
  if (element.sourceLocation !== undefined) requireLocation(element.sourceLocation);
}

/**
 * Require a plain record of primitive string values; already-normalized measurements are not raw input.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
function requireTextAttributes(attributes) {
  requireRecord(attributes, "Raw attributes");
  for (const value of Object.values(attributes)) {
    if (typeof value !== "string") throw new TypeError("Raw attribute values must be strings.");
  }
}

/**
 * Enforce the plain-object precondition and reject unsupported object shapes before downstream property
 * access.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} name - Human-readable subject or root path included in a contract failure.
 * @returns {void} Returns normally only for a plain record; otherwise throws TypeError.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
function requireRecord(value, name) {
  if (value === null || typeof value !== "object" || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) throw new TypeError(`${name} must be a plain object.`);
}

/**
 * Require a plain location record containing positive safe-integer line and column values.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
function requireLocation(value) {
  requireRecord(value, "Source location");
  if (!Number.isSafeInteger(value.line) || value.line <= 0 || !Number.isSafeInteger(value.column) || value.column <= 0) throw new TypeError("Source location requires positive safe-integer coordinates.");
}
