import { inspectAttributes } from "./attribute-contract.js";
import { attributeRelationshipProblems } from "./field-relationships.js";
import { fieldSpecification } from "./field-specifications.js";
import { parseFieldValue } from "./field-values.js";

/**
 * Apply permissive legacy conversions to raw attribute entries without establishing model validity. Legacy
 * token conversion only; strict route normalization uses inspectAttributes.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @returns {Object} New record of permissively converted attribute values; malformed legacy values remain text.
 */

export function normalizeAttributes(attributes) {
  return Object.fromEntries(
    Object.entries(attributes).map(/**
     * Retain the attribute name and apply its permissive legacy value conversion.
     * @responsibility computation
     * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
     * @param {unknown} input1[0] - Tuple member bound as fieldName: the ordered input consumed below.
     * @param {unknown} input1[1] - Tuple member bound as value: value paired with its own key.
     * @returns {Array} The ordered records or values assembled above.
     */ ([fieldName, value]) => [
      fieldName,
      normalizeKnownAttributeValue(fieldName, value)
    ])
  );
}

/**
 * Delegate compatibility conversion to metric, inclination and rappel-detail token helpers.
 * @responsibility coordinator
 * @param {string} fieldName - Own field name selecting the applicable parsing or measurement rule.
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {unknown} The value value selected or validated above. The selected result, including the documented absent-value fallback.
 */
function normalizeKnownAttributeValue(fieldName, value) {
  const specification = fieldSpecification(fieldName);
  if (specification === null) return value;
  const parsed = parseFieldValue(specification, value);
  return parsed.ok ? parsed.value : value;
}

/**
 * Assess a raw scoped attribute set, reject domain problems, and return separated typed attributes and
 * extension strings.
 * @responsibility coordinator
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @returns {Object} Validated typed attributes and separate extension strings; invalid known fields throw.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function normalizeAttributeSet(attributes, scope) {
  const result = inspectAttributes(attributes, scope);
  if (result.problems.length > 0) throw new RangeError(`Invalid ${scope} field "${result.problems[0].name}" (${result.problems[0].kind}).`);
  const relationship = attributeRelationshipProblems(attributes, scope).find(/**
   * Evaluate the selection condition problem.severity === "error".
   * @responsibility computation
   * @param {unknown} problem - Classified domain or budget problem to translate.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (problem) => problem.severity === "error");
  if (relationship !== undefined) throw new RangeError(`Invalid ${scope} field "${relationship.name}" (${relationship.kind}).`);
  return result;
}
