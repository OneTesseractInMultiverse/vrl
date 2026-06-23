import { compileRoute, formatDiagnostic } from "@subvertic/core";
import { escapeXml, renderTopoSvg } from "@subvertic/render-svg";

const DEFAULT_CLASS_NAME = "vrl-diagram";
const DEFAULT_DIAGNOSTICS_CLASS_NAME = "vrl-diagram__diagnostics";
const DEFAULT_ROLE = "img";

export function createVrlSvelteDiagramState(source, options = {}) {
  const result = compileRoute(source, options);
  const diagnosticsText = result.diagnostics.map(formatDiagnostic).join("\n");

  if (result.ok === false) {
    return {
      ok: false,
      ast: result.ast,
      diagnostics: result.diagnostics,
      diagnosticsText,
      model: null,
      layout: null,
      json: null,
      svg: ""
    };
  }

  return {
    ok: true,
    ast: result.ast,
    diagnostics: result.diagnostics,
    diagnosticsText,
    model: result.model,
    layout: result.layout,
    json: result.json,
    svg: renderTopoSvg(result.model, result.layout, options)
  };
}

export function renderVrlSvelteMarkup(source, options = {}, renderOptions = {}) {
  const state = renderOptions.diagram ?? createVrlSvelteDiagramState(source, options);
  const className = renderOptions.className ?? DEFAULT_CLASS_NAME;
  const diagnosticsClassName = renderOptions.diagnosticsClassName ?? DEFAULT_DIAGNOSTICS_CLASS_NAME;
  const role = renderOptions.role ?? DEFAULT_ROLE;

  if (state.ok === false) {
    return `<pre class="${escapeXml(diagnosticsClassName)}">${escapeXml(state.diagnosticsText)}</pre>`;
  }

  return `<div class="${escapeXml(className)}" role="${escapeXml(role)}">${state.svg}</div>`;
}
