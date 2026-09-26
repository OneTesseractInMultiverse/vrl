import { hasAttributeValue } from "./attribute-contract.js";
import { parseMeasurementToken } from "./measurements.js";
import { parseRappelStagesToken, parseRedirectionsToken } from "./rappel-details.js";
import { stageTotalMatchesHeight } from "./stage-totals.js";

/**
 * Compare valid declared heights with rope, redirection and stage fields; malformed tokens are left to field
 * validation.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @returns {Array} The ordered records or values assembled above.
 */
export function attributeRelationshipProblems(attributes, scope) {
  if (!hasAttributeValue(attributes, "height")) return [];
  const height = parseMeasurementToken(attributes.height);
  if (!height.ok) return [];
  return [...ropeProblems(attributes, scope, height.value.meters), ...redirectionProblems(attributes, height.value.meters), ...stageProblems(attributes)];
}

/**
 * Report a warning when a rappel's declared rope is shorter than its valid height; do not infer equipment
 * requirements.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @param {number} height - Validated declared technical height in meters.
 * @returns {unknown} The ordered records or values assembled above. The selected result, including the documented absent-value fallback.
 */
function ropeProblems(attributes, scope, height) {
  if (scope !== "rappel" || !hasAttributeValue(attributes, "rope")) return [];
  const rope = parseMeasurementToken(attributes.rope);
  return rope.ok && rope.value.meters < height ? [{ kind: "rope", name: "rope", severity: "warning" }] : [];
}

/**
 * Assess redirection constraints using the supplied validated range or route height, retaining each offending
 * entry.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {number} height - Validated declared technical height in meters.
 * @returns {unknown} The problems value selected or validated above.
 */
function redirectionProblems(attributes, height) {
  const problems = [];
  for (const name of ["redirection", "redirections"]) {
    if (!hasAttributeValue(attributes, name)) continue;
    const parsed = parseRedirectionsToken(attributes[name]);
    if (parsed.ok) {
      for (const entry of parsed.value) {
        if (entry.distance.meters >= height) problems.push({ kind: "redirection", name, severity: "error" });
      }
    }
  }
  return problems;
}

/**
 * Compare valid stage lengths with the declared height in exact source units and report a mismatch warning.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @returns {unknown} The ordered records or values assembled above. The selected result, including the documented absent-value fallback.
 */
function stageProblems(attributes) {
  if (!hasAttributeValue(attributes, "stages") || !parseRappelStagesToken(attributes.stages).ok) return [];
  return stageTotalMatchesHeight(attributes.stages, attributes.height) ? [] : [{ kind: "stages", name: "stages", severity: "warning" }];
}
