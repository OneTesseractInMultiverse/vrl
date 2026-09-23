import { fieldReference } from "../domain/source-references.js";
import { appendDiagnostics, codedDiagnostic } from "../domain/diagnostics.js";
import { parseMeasurementToken } from "../domain/measurements.js";
import { parseRappelStagesToken, parseRedirectionsToken } from "../domain/rappel-details.js";
import { stageTotalMatchesHeight } from "../domain/stage-totals.js";
import { hasFieldValue } from "./validate-fields.js";

export function validateFieldRelationships(element) {
  const diagnostics = [];
  if (element.type === "rappel" && hasFieldValue(element, "height") && hasFieldValue(element, "rope")) {
    appendDiagnostics(diagnostics, validateRopeLength(element));
  }
  if (!hasFieldValue(element, "height")) return diagnostics;
  for (const name of ["redirection", "redirections"]) {
    if (!hasFieldValue(element, name)) continue;
    const parsed = parseRedirectionsToken(element.attributes[name]);
    if (parsed.ok) appendDiagnostics(diagnostics, validateRedirectionDistances(element, parsed.value, name));
  }
  if (hasFieldValue(element, "stages") && parseRappelStagesToken(element.attributes.stages).ok) {
    appendDiagnostics(diagnostics, validateStageSum(element));
  }
  return diagnostics;
}

function validateRopeLength(element) {
  const height = parseMeasurementToken(element.attributes.height);
  const rope = parseMeasurementToken(element.attributes.rope);

  if (height.ok && rope.ok && rope.value.meters < height.value.meters) {
    return [
      codedDiagnostic(
        "VRL_ROPE_SHORTER_THAN_HEIGHT", "validation",
        "warning",
        "Rope length is shorter than rappel height.",
        fieldReference(element.source, "rope", element.sourceLocation),
        "Check route rigging assumptions before publishing."
      )
    ];
  }

  return [];
}

function validateRedirectionDistances(element, redirections, name) {
  const height = parseMeasurementToken(element.attributes.height);

  if (height.ok === false) {
    return [];
  }

  return redirections
    .filter((redirection) => redirection.distance.meters >= height.value.meters)
    .map(() => codedDiagnostic(
      "VRL_REDIRECTION_OUTSIDE_HEIGHT", "validation",
      "error",
      'Field "redirections" must be inside the rappel height.',
      fieldReference(element.source, name, element.sourceLocation),
      "Use distances greater than 0m and shorter than the rappel height."
    ));
}

function validateStageSum(element) {
  const height = parseMeasurementToken(element.attributes.height);

  if (height.ok === false) {
    return [];
  }

  if (stageTotalMatchesHeight(element.attributes.stages, element.attributes.height)) {
    return [];
  }

  return [
    codedDiagnostic(
      "VRL_STAGE_TOTAL_MISMATCH", "validation",
      "warning",
      'Field "stages" total does not match rappel height.',
      fieldReference(element.source, "stages", element.sourceLocation),
      "Adjust stages or height if these are meant to describe the same rappel."
    )
  ];
}
