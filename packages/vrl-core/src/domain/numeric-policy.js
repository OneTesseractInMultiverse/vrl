export const MAX_SOURCE_MAGNITUDE = 1_000_000_000;
export const MAX_DECIMAL_PLACES = 6;

/** Source decimals are bounded before they become normalized numeric values. */
export function boundedDecimal(text) {
  const fraction = text.split(".")[1] ?? "";
  const value = Number(text);
  return Number.isFinite(value) && Math.abs(value) <= MAX_SOURCE_MAGNITUDE && fraction.length <= MAX_DECIMAL_PLACES
    ? value === 0 ? 0 : value
    : null;
}

export function isSupportedNumber(value) {
  return Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER;
}

export function requireSupportedNumber(value, name) {
  if (!isSupportedNumber(value)) throw new RangeError(`${name} must be finite with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.`);
  return value;
}

/** Check numeric leaves iteratively, including shared references without rescanning them. */
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

export function requireNumericData(value, name) {
  const invalid = invalidNumberPath(value, name);
  if (invalid !== null) throw new RangeError(`${invalid} must be finite with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.`);
  return value;
}
