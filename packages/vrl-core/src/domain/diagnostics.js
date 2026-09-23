export function createDiagnostic(kind, severity, message, location, suggestion = "", relatedLocations = []) {
  return {
    kind,
    severity,
    message,
    location,
    suggestion,
    ...(relatedLocations.length === 0 ? {} : { relatedLocations })
  };
}

export function hasBlockingDiagnostics(diagnostics) {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

export function formatDiagnostic(diagnostic) {
  const suffix = diagnostic.suggestion === "" ? "" : ` Suggestion: ${diagnostic.suggestion}`;
  const related = formatRelatedLocations(diagnostic.relatedLocations ?? []);
  return `${diagnostic.severity.toUpperCase()} ${diagnostic.kind} at ${diagnostic.location.line}:${diagnostic.location.column}: ${diagnostic.message}${suffix}${related}`;
}

function formatRelatedLocations(locations) {
  return locations.map(({ message, location }) => ` Related: ${message} at ${location.line}:${location.column}.`).join("");
}

/** Append arbitrary diagnostic counts without expanding function arguments. */
export function appendDiagnostics(target, diagnostics) {
  for (const diagnostic of diagnostics) target.push(diagnostic);
}

export function limitDiagnostic(problem) {
  return createDiagnostic("limit", "error", `Document exceeds ${problem.name} limit of ${problem.maximum}.`, problem.location,
    `Reduce the document or explicitly increase options.limits.${problem.name} for a trusted workload.`);
}
