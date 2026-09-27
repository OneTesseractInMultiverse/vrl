import { createDiagramState, diagramWarningText } from "@subvertic/vrl-diagram";
import { escapeXml } from "@subvertic/vrl-render-svg";

const DEFAULT_CLASS_NAME = "vrl-diagram";
const DEFAULT_DIAGNOSTICS_CLASS_NAME = "vrl-diagram__diagnostics";
const DEFAULT_ROLE = undefined;

/**
 * Delegate compilation and rendering to the shared diagram state service for Svelte consumers.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {Object} Shared diagram state suitable for the Svelte adapter.
 */
export function createVrlSvelteDiagramState(source, options = {}) {
  return createDiagramState(source, options);
}

/**
 * Create shared state and serialize the Svelte wrapper, escaped diagnostics and optional warnings; successful
 * SVG is already trusted renderer output.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @param {unknown} renderOptions - Wrapper presentation options distinct from compilation/rendering options; defaults to {}.
 * @returns {string} Framework-wrapper markup with SVG or escaped blocking diagnostics and optional warning panel.
 */
export function renderVrlSvelteMarkup(source, options = {}, renderOptions = {}) {
  const state = renderOptions.diagram ?? createVrlSvelteDiagramState(source, options);
  const className = renderOptions.className ?? DEFAULT_CLASS_NAME;
  const diagnosticsClassName = renderOptions.diagnosticsClassName ?? DEFAULT_DIAGNOSTICS_CLASS_NAME;
  const role = renderOptions.role ?? DEFAULT_ROLE;
  const warnings = diagramWarningText(state, renderOptions.showWarnings);

  if (state.ok === false) {
    return `<pre class="${escapeXml(diagnosticsClassName)}">${escapeXml(state.diagnosticsText)}</pre>`;
  }

  const image = `<div class="${escapeXml(className)}"${role === undefined ? "" : ` role="${escapeXml(role)}"`}>${state.svg}</div>`;
  return warnings === "" ? image : `<div>${image}${warningPanel(warnings, renderOptions)}</div>`;
}

/**
 * Serialize nonempty warning text with escaped labels and classes in an accessible status panel.
 * @responsibility computation
 * @param {unknown} text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {string} Accessible escaped warning-panel markup, or empty text when there are no warnings.
 */
function warningPanel(text, options) {
  const className = escapeXml(options.warningsClassName ?? "vrl-diagram__warnings");
  const label = escapeXml(options.warningsLabel ?? "Route warnings");
  return `<pre class="${className}" role="status" aria-live="polite" aria-atomic="true" aria-label="${label}" style="white-space: pre-wrap; overflow-wrap: anywhere;">${escapeXml(text)}</pre>`;
}
