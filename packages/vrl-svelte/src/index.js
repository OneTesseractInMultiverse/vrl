import { compileRoute, formatDiagnostic } from "@vrl/core";
import { escapeXml, renderTopoSvg } from "@vrl/render-svg";

export function renderVrlSvelteMarkup(source, options = {}) {
  const result = compileRoute(source, options);

  if (result.ok === false) {
    return `<pre class="vrl-diagram__diagnostics">${escapeXml(result.diagnostics.map(formatDiagnostic).join("\n"))}</pre>`;
  }

  return `<div class="vrl-diagram" role="img">${renderTopoSvg(result.model, result.layout, options)}</div>`;
}
