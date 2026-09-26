import type { CompileOptions, CompileResult, Diagnostic } from "@subvertic/vrl-core";
import type { RenderOptions } from "@subvertic/vrl-render-svg";

export interface DiagramOptions extends CompileOptions, RenderOptions {}
/** Mutable state for one compilation. A supplied state is trusted caller markup. */
export type DiagramState =
  (Extract<CompileResult, { ok: true }> & { diagnosticsText: string; svg: string })
  | (Extract<CompileResult, { ok: false }> & { diagnosticsText: string; svg: "" });
/**
 * Contract revision 1. Recomputes without caching or mutating input options.
 * Delegate state creation to the shared application using the fixed default compiler and renderer ports.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {DiagramOptions} [options] - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {DiagramState} Shared success or failure state including formatted diagnostics and SVG only on success.
 */
export function createDiagramState(source: string, options?: DiagramOptions): DiagramState;

/** UI settings; these do not alter compilation, SVG generation, or diagnostic data. */
export interface WarningDisplayOptions {
  showWarnings?: boolean | undefined;
  warningsClassName?: string | undefined;
  warningsLabel?: string | undefined;
}
/**
 * Ordered warning text for successful state; false hides presentation only. Invalid flags throw TypeError.
 * Select warning text only for successful states when enabled; validate the display flag without mutating diagnostics. Select nonblocking presentation text without changing state or diagnostic ownership.
 * @responsibility computation
 * @param {{ ok: boolean; diagnostics?: Diagnostic[] | null | undefined }} diagram - Precomputed trusted diagram state, including renderer-produced SVG.
 * @param {boolean} [showWarnings] - Boolean display preference; suppressing warnings never removes compiler diagnostics; defaults to true.
 * @returns {string} Newline-separated warning text, or empty text for hidden warnings or failed compilation.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function diagramWarningText(diagram: { ok: boolean; diagnostics?: Diagnostic[] | null | undefined }, showWarnings?: boolean): string;
