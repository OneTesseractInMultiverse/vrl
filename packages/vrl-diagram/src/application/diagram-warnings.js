import { formatDiagnostic } from "@subvertic/vrl-core";

/** Select nonblocking presentation text without changing state or diagnostic ownership. */
export function diagramWarningText(diagram, showWarnings = true) {
  if (typeof showWarnings !== "boolean") throw new TypeError("showWarnings must be a boolean.");
  if (!showWarnings || diagram.ok === false) return "";
  return (diagram.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.severity === "warning")
    .map(formatDiagnostic)
    .join("\n");
}
