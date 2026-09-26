import { parseMeasurementToken } from "./measurements.js";
import { fieldSpecification } from "./field-specifications.js";

/**
 * Recognize singular and plural redirection field names.
 * @responsibility computation
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function isRedirectionField(fieldName) {
  return fieldSpecification(fieldName)?.parser === "redirections";
}

/**
 * Recognize the stages field name.
 * @responsibility computation
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function isRappelStagesField(fieldName) {
  return fieldSpecification(fieldName)?.parser === "stages";
}

/**
 * Parse one metric redirection and side suffix without applying field-level distance or side vocabulary
 * restrictions.
 * @responsibility computation
 * @param {string} token - Raw field text before metric/list/percentage decoding.
 * @returns {Object} Discriminated token result: ok=true with the parsed value, or ok=false with the syntax/range reason.
 */
export function parseRedirectionToken(token) {
  const parts = token.split(":");

  if (parts.length > 2) {
    return {
      ok: false,
      reason: "expected redirection distance such as 12m:left"
    };
  }

  const [rawDistance, rawSide = "unknown"] = parts;
  const distance = parseMeasurementToken(rawDistance);

  if (distance.ok === false) {
    return {
      ok: false,
      reason: "expected redirection distance such as 12m:left"
    };
  }

  return {
    ok: true,
    value: {
      distance: distance.value,
      side: rawSide.trim().toLowerCase()
    }
  };
}

/**
 * Parse an ordered comma-separated redirection list, returning a failed result for an invalid entry.
 * @responsibility computation
 * @param {string} token - Raw field text before metric/list/percentage decoding.
 * @returns {Object} Discriminated token result: ok=true with the parsed value, or ok=false with the syntax/range reason.
 */
export function parseRedirectionsToken(token) {
  const tokens = splitList(token, fieldSpecification("redirections").separator);
  const parsed = tokens.map(parseRedirectionToken);
  const failed = parsed.find(/**
   * Evaluate the selection condition entry.ok === false.
   * @responsibility computation
   * @param {unknown} entry - Current collection entry before projection or validation.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (entry) => entry.ok === false);

  if (tokens.length < fieldSpecification("redirections").minimumEntries || failed !== undefined) {
    return {
      ok: false,
      reason: "expected redirections such as 12m:left,27m:right"
    };
  }

  return {
    ok: true,
    value: parsed.map(/**
     * Project entry.value from the current record.
     * @responsibility computation
     * @param {unknown} entry - Current collection entry before projection or validation.
     * @returns {unknown} The entry.value value selected or validated above.
     */ (entry) => entry.value)
  };
}

/**
 * Parse an ordered plus-separated list of at least two metric stages, preserving individual measurements.
 * @responsibility computation
 * @param {string} token - Raw field text before metric/list/percentage decoding.
 * @returns {Object} Discriminated token result: ok=true with the parsed value, or ok=false with the syntax/range reason.
 */
export function parseRappelStagesToken(token) {
  const tokens = splitList(token, fieldSpecification("stages").separator);
  const parsed = tokens.map(parseMeasurementToken);
  const failed = parsed.find(/**
   * Evaluate the selection condition entry.ok === false.
   * @responsibility computation
   * @param {unknown} entry - Current collection entry before projection or validation.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (entry) => entry.ok === false);

  if (tokens.length < fieldSpecification("stages").minimumEntries || failed !== undefined) {
    return {
      ok: false,
      reason: "expected at least two stage lengths such as 20m+15m"
    };
  }

  return {
    ok: true,
    value: parsed.map(/**
     * Project entry.value from the current record.
     * @responsibility computation
     * @param {unknown} entry - Current collection entry before projection or validation.
     * @returns {unknown} The entry.value value selected or validated above.
     */ (entry) => entry.value)
  };
}

/**
 * Convert recognized stage or redirection attributes and preserve raw text when legacy token conversion
 * fails.
 * @responsibility computation
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @param {string} value - Raw attribute text; unsupported or invalid conversion retains this exact value.
 * @returns {string|Object|Array} Converted typed value for recognized valid text, otherwise the original string.
 */
export function normalizeRappelDetailValue(fieldName, value) {
  if (isRedirectionField(fieldName)) {
    const parsed = parseRedirectionsToken(value);
    return parsed.ok ? parsed.value : value;
  }

  if (isRappelStagesField(fieldName)) {
    const parsed = parseRappelStagesToken(value);
    return parsed.ok ? parsed.value : value;
  }

  return value;
}

/**
 * Split and trim a delimited field value for the owning token parser.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} separator - Literal delimiter selected by this list grammar.
 * @returns {Array} The ordered records or values assembled above. The result returned by value.split(separator).map.
 */
function splitList(value, separator) {
  if (value === "") {
    return [];
  }

  return value.split(separator).map(/**
   * Apply entry.trim to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} entry - Current collection entry before projection or validation.
   * @returns {string} The result returned by entry.trim.
   */ (entry) => entry.trim());
}
