import { formatDiagnostic } from "@subvertic/vrl-core";

/**
 * Select warning text only for successful states when enabled; validate the display flag without mutating
 * diagnostics. Select nonblocking presentation text without changing state or diagnostic ownership.
 * @responsibility computation
 * @param {unknown} diagram - Precomputed trusted diagram state, including renderer-produced SVG.
 * @param {boolean} showWarnings - Boolean display preference; suppressing warnings never removes compiler diagnostics; defaults to true.
 * @returns {string} Newline-separated warning text, or empty text for hidden warnings or failed compilation.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */

export function diagramWarningText(diagram, showWarnings = true) {
  if (typeof showWarnings !== "boolean") throw new TypeError("showWarnings must be a boolean.");
  if (!showWarnings || diagram.ok === false) return "";
  return (diagram.diagnostics ?? [])
    .filter(/**
     * Evaluate the selection condition diagnostic.severity === "warning".
     * @responsibility computation
     * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ (diagnostic) => diagnostic.severity === "warning")
    .map(formatDiagnostic)
    .join("\n");
}
