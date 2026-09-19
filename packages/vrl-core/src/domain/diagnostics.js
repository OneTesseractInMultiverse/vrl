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
