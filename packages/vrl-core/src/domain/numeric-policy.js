export const MAX_SOURCE_MAGNITUDE = 1_000_000_000;
export const MAX_DECIMAL_PLACES = 6;

/**
 * Validate decimal spelling, fractional precision and magnitude before returning the numeric value or null.
 * Source decimals are bounded before they become normalized numeric values.
 * @responsibility computation
 * @param {unknown} text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */

export function boundedDecimal(text) {
  const fraction = text.split(".")[1] ?? "";
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= MAX_SOURCE_MAGNITUDE && fraction.length <= MAX_DECIMAL_PLACES
    ? value === 0 ? 0 : value
    : null;
}

/**
 * Recognize finite numeric values whose absolute magnitude does not exceed Number.MAX_SAFE_INTEGER.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
export function isSupportedNumber(value) {
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
}

/**
 * Enforce the finite bounded-number contract and return the accepted value unchanged.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} name - Human-readable subject or root path included in a contract failure.
 * @returns {unknown} The value value selected or validated above.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function requireSupportedNumber(value, name) {
  if (!isSupportedNumber(value)) throw new RangeError(`${name} must be finite with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.`);
  return value;
}

/**
 * Traverse nested values cycle-safely and return the first unsupported numeric leaf's path, or null. Check
 * numeric leaves iteratively, including shared references without rescanning them.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} name - Human-readable subject or root path included in a contract failure.
 * @returns {unknown} The entry.path value selected or validated above. Null when no matching value or problem exists.
 */

export function invalidNumberPath(value, name) {
  const pending = [{ value, path: name }];
  const seen = new Set();
  while (pending.length > 0) {
    const entry = pending.pop();
    if (typeof entry.value === "number" && !isSupportedNumber(entry.value)) return entry.path;
    if (entry.value === null || typeof entry.value !== "object" || seen.has(entry.value)) continue;
    seen.add(entry.value);
    for (const [key, child] of Object.entries(entry.value)) pending.push({ value: child, path: `${entry.path}.${key}` });
  }
  return null;
}

/**
 * Check nested numeric leaves and return the original data, throwing with the offending path when a number is
 * unsupported.
 * @responsibility coordinator
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} name - Human-readable subject or root path included in a contract failure.
 * @returns {unknown} The value value selected or validated above.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function requireNumericData(value, name) {
  const invalid = invalidNumberPath(value, name);
  if (invalid !== null) throw new RangeError(`${invalid} must be finite with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.`);
  return value;
}
