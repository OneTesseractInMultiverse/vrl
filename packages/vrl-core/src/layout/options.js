const POSITIVE_OPTIONS = new Set(["width", "baseSpacing", "horizontalScale", "pixelsPerMeter"]);
const NONNEGATIVE_OPTIONS = new Set(["spineX", "marginY", "marginBottom", "minNodeGap"]);

export function assertOptionsRecord(value, name) {
  if (value === null || typeof value !== "object" || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)) {
    throw new TypeError(`${name} must be a plain object.`);
  }
}

export function assertFiniteNumber(value, name) {
  if (typeof value !== "number") throw new TypeError(`${name} must be a number.`);
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite.`);
}

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
