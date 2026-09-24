import { fieldReference } from "../domain/source-references.js";
import { codedDiagnostic } from "../domain/diagnostics.js";
import { attributeRelationshipProblems } from "../domain/field-relationships.js";

const MESSAGES = {
  rope: { code: "VRL_ROPE_SHORTER_THAN_HEIGHT", message: "Rope length is shorter than rappel height.", suggestion: "Check route rigging assumptions before publishing." },
  redirection: { code: "VRL_REDIRECTION_OUTSIDE_HEIGHT", message: 'Field "redirections" must be inside the rappel height.', suggestion: "Use distances greater than 0m and shorter than the rappel height." },
  stages: { code: "VRL_STAGE_TOTAL_MISMATCH", message: 'Field "stages" total does not match rappel height.', suggestion: "Adjust stages or height if these are meant to describe the same rappel." }
};

export function validateFieldRelationships(element) {
  return attributeRelationshipProblems(element.attributes, element.type).map((problem) => relationshipDiagnostic(element, problem));
}

function relationshipDiagnostic(element, { kind, name, severity }) {
  const { code, message, suggestion } = MESSAGES[kind];
  return codedDiagnostic(code, "validation", severity, message, fieldReference(element.source, name, element.sourceLocation), suggestion);
}
