import { createDiagramState, diagramWarningText } from "@subvertic/vrl-diagram";
import { escapeXml } from "@subvertic/vrl-render-svg";

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
  const warnings = diagramWarningText(state, renderOptions.showWarnings);

  if (state.ok === false) {
    return `<pre class="${escapeXml(diagnosticsClassName)}">${escapeXml(state.diagnosticsText)}</pre>`;
  }

  const image = `<div class="${escapeXml(className)}" role="${escapeXml(role)}">${state.svg}</div>`;
  return warnings === "" ? image : `<div>${image}${warningPanel(warnings, renderOptions)}</div>`;
}

function warningPanel(text, options) {
  const className = escapeXml(options.warningsClassName ?? "vrl-diagram__warnings");
  const label = escapeXml(options.warningsLabel ?? "Route warnings");
  return `<pre class="${className}" role="status" aria-live="polite" aria-atomic="true" aria-label="${label}" style="white-space: pre-wrap; overflow-wrap: anywhere;">${escapeXml(text)}</pre>`;
}
