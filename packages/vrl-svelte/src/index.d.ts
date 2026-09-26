import type { DiagramOptions, DiagramState, WarningDisplayOptions } from "@subvertic/vrl-diagram";
export type { DiagramOptions, DiagramState } from "@subvertic/vrl-diagram";

export interface VrlMarkupOptions extends WarningDisplayOptions {
  diagram?: DiagramState | null | undefined;
  className?: string | undefined; diagnosticsClassName?: string | undefined; role?: string | undefined;
}
export interface VrlDiagramProps extends VrlMarkupOptions {
  source?: string | undefined; options?: DiagramOptions | undefined;
}
/**
 * Delegate compilation and rendering to the shared diagram state service for Svelte consumers.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {DiagramOptions} [options] - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {DiagramState} Shared diagram state suitable for the Svelte adapter.
 */
export function createVrlSvelteDiagramState(source: string, options?: DiagramOptions): DiagramState;
/**
 * Create shared state and serialize the Svelte wrapper, escaped diagnostics and optional warnings; successful SVG is already trusted renderer output.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {DiagramOptions} [options] - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @param {VrlMarkupOptions} [renderOptions] - Wrapper presentation options distinct from compilation/rendering options; defaults to {}.
 * @returns {string} Framework-wrapper markup with SVG or escaped blocking diagnostics and optional warning panel.
 */
export function renderVrlSvelteMarkup(source: string, options?: DiagramOptions, renderOptions?: VrlMarkupOptions): string;
