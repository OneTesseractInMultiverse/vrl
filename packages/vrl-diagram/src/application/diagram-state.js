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
    diagnosticsText: formatDiagramDiagnostics(result.diagnostics),
    model: ok ? result.model : null,
    layout: ok ? result.layout : null,
    json: ok ? result.json : null,
    svg: ok ? svg : ""
  };
}

/**
 * Assemble bounded display text in source order, formatting only records needed for this view.
 * @responsibility computation
 * @param {Array} diagnostics - Ordered structured diagnostics.
 * @param {string} severity - Optional severity to include in the display.
 * @param {number} maximum - UTF-16 budget for the assembled display text.
 * @returns {string} Text within the requested budget, ending in an ellipsis when abbreviated.
 */
export function formatDiagramDiagnostics(diagnostics, severity, maximum = 32768) {
  let text = "";
  for (const diagnostic of diagnostics) {
    if (severity !== undefined && diagnostic.severity !== severity) continue;
    const line = formatDiagnostic(diagnostic);
    text += (text === "" ? "" : "\n") + line;
    if (text.length > maximum) return text.slice(0, maximum - 1).replace(/[\uD800-\uDBFF]$/, "") + "…";
  }
  return text;
}
