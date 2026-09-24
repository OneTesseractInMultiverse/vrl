import { formatDiagnostic } from "@subvertic/core";

/** Project compiler output into the shared presentation-state contract. */
export function assembleDiagramState(result, svg) {
  const ok = result.ok !== false;
  return {
    ok,
    ast: result.ast,
    diagnostics: result.diagnostics,
    diagnosticsText: result.diagnostics.map(formatDiagnostic).join("\n"),
    model: ok ? result.model : null,
    layout: ok ? result.layout : null,
    json: ok ? result.json : null,
    svg: ok ? svg : ""
  };
}
