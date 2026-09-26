import { formatDiagnostic } from "@subvertic/vrl-core";

/**
 * Project compiler output and markup into framework-neutral state, formatting diagnostics and clearing derived
 * values for failure.
 * @responsibility computation
 * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
 * @param {unknown} svg - Renderer-produced SVG string; precomputed consumer markup is trusted.
 * @returns {Object} A record containing ok, ast, diagnostics, diagnosticsText, model, layout, json, svg.
 */

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
