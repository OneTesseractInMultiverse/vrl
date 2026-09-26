import { boundedDecimal, MAX_DECIMAL_PLACES, MAX_SOURCE_MAGNITUDE } from "./numeric-policy.js";
import { fieldSpecification } from "./field-specifications.js";

const MEASUREMENT_PATTERN = /^(-?\d+(?:\.\d+)?)m$/;

/**
 * Recognize metric field names in the shared specification.
 * @responsibility computation
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function isMeasurementField(fieldName) {
  return fieldSpecification(fieldName)?.parser === "measurement";
}

/**
 * Parse signed decimal meter text within the source precision and magnitude budget; malformed input returns
 * a
 * failed token result.
 * @responsibility computation
 * @param {string} token - Raw field text before metric/list/percentage decoding.
 * @returns {Object} Discriminated token result: ok=true with the parsed value, or ok=false with the syntax/range reason.
 */
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

/**
 * Convert recognized metric text and retain the original text when the compatibility conversion cannot parse
 * it.
 * @responsibility computation
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @param {string} value - Raw attribute text; unsupported or invalid conversion retains this exact value.
 * @returns {string|Object|Array} Converted typed value for recognized valid text, otherwise the original string.
 */
export function normalizeAttributeValue(fieldName, value) {
  if (isMeasurementField(fieldName) === false) {
    return value;
  }

  const parsed = parseMeasurementToken(value);
  return parsed.ok ? parsed.value : value;
}
