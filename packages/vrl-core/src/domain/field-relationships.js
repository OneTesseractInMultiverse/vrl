import { hasAttributeValue } from "./attribute-contract.js";
import { parseMeasurementToken } from "./measurements.js";
import { parseRappelStagesToken, parseRedirectionsToken } from "./rappel-details.js";
import { stageTotalMatchesHeight } from "./stage-totals.js";

/**
 * Compare valid declared heights with rope, redirection and stage fields; malformed tokens are left to field
 * validation. Explicit unknown rappel heights retain independent rope warnings but reject measured details
 * whose positions require a known height.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @returns {Array} The ordered records or values assembled above.
 */
export function attributeRelationshipProblems(attributes, scope) {
  if (!hasAttributeValue(attributes, "height")) return [];
  if (scope === "rappel" && attributes.height === "unknown") {
    return [...ropeProblems(attributes, scope, null), ...unplaceableDetailProblems(attributes)];
  }
  const height = parseMeasurementToken(attributes.height);
  if (!height.ok) return [];
  return [...ropeProblems(attributes, scope, height.value.meters), ...redirectionProblems(attributes, height.value.meters), ...stageProblems(attributes)];
}

/**
 * Report an explicitly unknown rappel rope or a numeric declaration shorter than its valid height;
 * preserve uncertainty without inferring equipment requirements from height or stage lengths.
 * @responsibility computation
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {string} scope - Metadata or element-type scope that determines applicability and requiredness.
 * @param {number|null} height - Validated height in meters, or null for an explicitly unknown rappel height.
 * @returns {unknown} The ordered records or values assembled above. The selected result, including the documented absent-value fallback.
 */
function ropeProblems(attributes, scope, height) {
  if (scope !== "rappel" || !hasAttributeValue(attributes, "rope")) return [];
  if (attributes.rope === "unknown") return [{ kind: "unknownRope", name: "rope", severity: "warning" }];
  const rope = parseMeasurementToken(attributes.rope);
  return height !== null && rope.ok && rope.value.meters < height ? [{ kind: "rope", name: "rope", severity: "warning" }] : [];
}

/**
 * Identify supplied measured details that cannot be positioned against an explicitly unknown rappel height.
 * @responsibility computation
 * @param {Object} attributes - Raw attribute record already identified as an unknown-height rappel.
 * @returns {Object[]} One blocking field problem per supplied stage/redirection field, in stable field order.
 */
function unplaceableDetailProblems(attributes) {
  const problems = [];
  for (const name of ["stages", "redirection", "redirections"]) {
    if (hasAttributeValue(attributes, name)) problems.push({ kind: "unplaceableDetail", name, severity: "error" });
  }
  return problems;
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
