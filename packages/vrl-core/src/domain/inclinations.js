import { boundedDecimal, MAX_DECIMAL_PLACES, MAX_SOURCE_MAGNITUDE } from "./numeric-policy.js";

const INCLINATION_PATTERN = /^(-?\d+(?:\.\d+)?)%?$/;

export function isInclinationField(fieldName) {
  return fieldName === "inclination";
}

export function parseInclinationToken(token) {
  const match = INCLINATION_PATTERN.exec(token);

  if (match === null) {
    return {
      ok: false,
      reason: "expected inclination percentage such as 75%"
    };
  }

  const percent = boundedDecimal(match[1]);
  if (percent === null) {
    return { ok: false, reason: `expected a finite percentage within ±${MAX_SOURCE_MAGNITUDE} with at most ${MAX_DECIMAL_PLACES} fractional digits` };
  }

  return {
    ok: true,
    value: {
      value: percent,
      unit: "%",
      percent
    }
  };
}

export function normalizeInclinationValue(fieldName, value) {
  if (isInclinationField(fieldName) === false) {
    return value;
  }

  const parsed = parseInclinationToken(value);
  return parsed.ok ? parsed.value : value;
}
