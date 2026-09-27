import { fieldReference } from "../domain/source-references.js";
import { codedDiagnostic } from "../domain/diagnostics.js";
import { attributeRelationshipProblems } from "../domain/field-relationships.js";

const MESSAGES = {
  unknownRope: { code: "VRL_ROPE_LENGTH_UNKNOWN", message: "Rappel rope length is explicitly unknown.", suggestion: "Retain unknown until a rope length is supplied; do not derive it from height or stages." },
  rope: { code: "VRL_ROPE_SHORTER_THAN_HEIGHT", message: "Rope length is shorter than rappel height.", suggestion: "Check route rigging assumptions before publishing." },
  redirection: { code: "VRL_REDIRECTION_OUTSIDE_HEIGHT", message: 'Field "redirections" must be inside the rappel height.', suggestion: "Use distances greater than 0m and shorter than the rappel height." },
  stages: { code: "VRL_STAGE_TOTAL_MISMATCH", message: 'Field "stages" total does not match rappel height.', suggestion: "Adjust stages or height if these are meant to describe the same rappel." }
};

/**
 * Convert domain relationship problems into diagnostics located on the offending field.
 * @responsibility coordinator
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {Array} Located rope/stage warnings and invalid-redirection errors.
 */
export function validateFieldRelationships(element) {
  return attributeRelationshipProblems(element.attributes, element.type).map(/**
   * Apply relationshipDiagnostic to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} problem - Classified domain or budget problem to translate.
   * @returns {unknown} The result returned by relationshipDiagnostic.
   */ (problem) => relationshipDiagnostic(element, problem));
}

/**
 * Translate rope, stage and redirection relationship problems into stable diagnostic codes and suggestions.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {Object} input2 - Input record destructured into the separately documented members below.
 * @param {unknown} input2.kind - Discriminator selecting the supported record or diagnostic category.
 * @param {unknown} input2.name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @param {string} input2.severity - Diagnostic severity, error or warning.
 * @returns {unknown} The result returned by codedDiagnostic.
 */
function relationshipDiagnostic(element, { kind, name, severity }) {
  const { code, message, suggestion } = MESSAGES[kind];
  return codedDiagnostic(code, "validation", severity, message, fieldReference(element.source, name, element.sourceLocation), suggestion);
}
