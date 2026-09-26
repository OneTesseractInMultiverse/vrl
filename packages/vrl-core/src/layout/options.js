const POSITIVE_OPTIONS = new Set(["width", "baseSpacing", "horizontalScale", "pixelsPerMeter"]);
const NONNEGATIVE_OPTIONS = new Set(["spineX", "marginY", "marginBottom", "minNodeGap"]);

/**
 * Require a non-null plain configuration record, accepting ordinary or null prototypes.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} name - Human-readable subject or root path included in a contract failure.
 * @returns {void} Returns normally only for a plain options record; otherwise throws.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function assertOptionsRecord(value, name) {
  if (value === null || typeof value !== "object" || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new TypeError(`${name} must be a plain object.`);
  }
}

/**
 * Reject nonnumbers with TypeError and nonfinite numeric values with RangeError.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} name - Human-readable subject or root path included in a contract failure.
 * @returns {void} Returns normally only for a finite number; otherwise throws with the failed contract.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function assertFiniteNumber(value, name) {
  if (typeof value !== "number") throw new TypeError(`${name} must be a number.`);
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
}

/**
 * Validate recognized layout keys, numeric magnitudes and positive or nonnegative ranges; return an owned
 * shallow snapshot.
 * @responsibility computation
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @returns {Object} Owned shallow snapshot of validated options; defaults are applied by layout computations.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function validateLayoutOptions(options = {}) {
  assertOptionsRecord(options, "Layout options");
  const snapshot = { ...options };
  for (const [name, value] of Object.entries(snapshot)) {
    if (!POSITIVE_OPTIONS.has(name) && !NONNEGATIVE_OPTIONS.has(name)) {
      throw new TypeError(`Unknown layout option "${name}".`);
    }
    if (value === undefined) continue;
    assertFiniteNumber(value, `Layout option "${name}"`);
    if (value > Number.MAX_SAFE_INTEGER) throw new RangeError(`Layout option "${name}" exceeds the supported magnitude.`);
    if (value < 0 || (value === 0 && POSITIVE_OPTIONS.has(name))) {
      throw new RangeError(`Layout option "${name}" must be ${POSITIVE_OPTIONS.has(name) ? "positive" : "nonnegative"}.`);
    }
  }
  return snapshot;
}
