import { createDiagramState } from "@subvertic/diagram";
import { escapeXml } from "@subvertic/render-svg";

const DEFAULT_CLASS_NAME = "vrl-diagram";
const DEFAULT_DIAGNOSTICS_CLASS_NAME = "vrl-diagram__diagnostics";
const DEFAULT_ROLE = "img";

export function createVrlSvelteDiagramState(source, options = {}) {
  return createDiagramState(source, options);
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
