import { hasAttributeValue } from "./attribute-contract.js";
import { parseMeasurementToken } from "./measurements.js";
import { parseRappelStagesToken, parseRedirectionsToken } from "./rappel-details.js";
import { stageTotalMatchesHeight } from "./stage-totals.js";

export function attributeRelationshipProblems(attributes, scope) {
  if (!hasAttributeValue(attributes, "height")) return [];
  const height = parseMeasurementToken(attributes.height);
  if (!height.ok) return [];
  return [...ropeProblems(attributes, scope, height.value.meters), ...redirectionProblems(attributes, height.value.meters), ...stageProblems(attributes)];
}

function ropeProblems(attributes, scope, height) {
  if (scope !== "rappel" || !hasAttributeValue(attributes, "rope")) return [];
  const rope = parseMeasurementToken(attributes.rope);
  return rope.ok && rope.value.meters < height ? [{ kind: "rope", name: "rope", severity: "warning" }] : [];
}

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

function stageProblems(attributes) {
  if (!hasAttributeValue(attributes, "stages") || !parseRappelStagesToken(attributes.stages).ok) return [];
  return stageTotalMatchesHeight(attributes.stages, attributes.height) ? [] : [{ kind: "stages", name: "stages", severity: "warning" }];
}
