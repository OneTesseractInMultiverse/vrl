import { boundedDecimal, MAX_DECIMAL_PLACES, MAX_SOURCE_MAGNITUDE } from "./numeric-policy.js";
import { fieldSpecification } from "./field-specifications.js";

const INCLINATION_PATTERN = /^(-?\d+(?:\.\d+)?)%?$/;

/**
 * Recognize the field name owned by inclination parsing.
 * @responsibility computation
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function isInclinationField(fieldName) {
  return fieldSpecification(fieldName)?.parser === "inclination";
}

/**
 * Parse a bounded decimal percentage without applying field-specific positivity or maximum-inclination
 * rules;
 * malformed input returns a failed token result.
 * @responsibility computation
 * @param {string} token - Raw field text before metric/list/percentage decoding.
 * @returns {Object} Discriminated token result: ok=true with the parsed value, or ok=false with the syntax/range reason.
 */
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

/**
 * Convert recognized valid inclination text and preserve legacy text on conversion failure.
 * @responsibility computation
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @param {string} value - Raw attribute text; unsupported or invalid conversion retains this exact value.
 * @returns {string|Object|Array} Converted typed value for recognized valid text, otherwise the original string.
 */
export function normalizeInclinationValue(fieldName, value) {
  if (isInclinationField(fieldName) === false) {
    return value;
  }

  const parsed = parseInclinationToken(value);
  return parsed.ok ? parsed.value : value;
}
