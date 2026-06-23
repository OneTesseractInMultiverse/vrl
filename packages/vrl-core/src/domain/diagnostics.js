export function createDiagnostic(kind, severity, message, location, suggestion = "") {
  return {
    kind,
    severity,
    message,
    location,
    suggestion
  };
}

export function hasBlockingDiagnostics(diagnostics) {
  return diagnostics.some((diagnostic) => diagnostic.severity === "error");
}

export function formatDiagnostic(diagnostic) {
  const suffix = diagnostic.suggestion === "" ? "" : ` Suggestion: ${diagnostic.suggestion}`;
  return `${diagnostic.severity.toUpperCase()} ${diagnostic.kind} at ${diagnostic.location.line}:${diagnostic.location.column}: ${diagnostic.message}${suffix}`;
}
