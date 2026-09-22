import { boundedDecimal, MAX_DECIMAL_PLACES, MAX_SOURCE_MAGNITUDE } from "./numeric-policy.js";
import { fieldSpecification } from "./field-specifications.js";

const MEASUREMENT_PATTERN = /^(-?\d+(?:\.\d+)?)m$/;

export function isMeasurementField(fieldName) {
  return fieldSpecification(fieldName)?.parser === "measurement";
}

export function parseMeasurementToken(token) {
  const match = MEASUREMENT_PATTERN.exec(token);

  if (match === null) {
    return {
      ok: false,
      reason: "expected metric measurement such as 35m"
    };
  }

  const meters = boundedDecimal(match[1]);
  if (meters === null) {
    return { ok: false, reason: `expected a finite measurement within ±${MAX_SOURCE_MAGNITUDE}m with at most ${MAX_DECIMAL_PLACES} fractional digits` };
  }

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
