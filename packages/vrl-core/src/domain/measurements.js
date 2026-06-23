const MEASUREMENT_FIELDS = new Set([
  "distance",
  "height",
  "rope",
  "total_distance",
  "total_descent",
  "vertical_gain",
  "descent"
]);

const MEASUREMENT_PATTERN = /^(-?\d+(?:\.\d+)?)m$/;

export function isMeasurementField(fieldName) {
  return MEASUREMENT_FIELDS.has(fieldName);
}

export function parseMeasurementToken(token) {
  const match = MEASUREMENT_PATTERN.exec(token);

  if (match === null) {
    return {
      ok: false,
      reason: "expected metric measurement such as 35m"
    };
  }

  const meters = Number(match[1]);

  return {
    ok: true,
    value: {
      value: meters,
      unit: "m",
      meters
    }
  };
}

export function normalizeAttributeValue(fieldName, value) {
  if (isMeasurementField(fieldName) === false) {
    return value;
  }

  const parsed = parseMeasurementToken(value);
  return parsed.ok ? parsed.value : value;
}
