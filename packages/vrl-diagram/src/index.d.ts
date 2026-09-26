import type { CompileOptions, CompileResult, Diagnostic } from "@subvertic/vrl-core";
import type { RenderOptions } from "@subvertic/vrl-render-svg";

export interface DiagramOptions extends CompileOptions, RenderOptions {}
/** Mutable state for one compilation. A supplied state is trusted caller markup. */
export type DiagramState =
  (Extract<CompileResult, { ok: true }> & { diagnosticsText: string; svg: string })
  | (Extract<CompileResult, { ok: false }> & { diagnosticsText: string; svg: "" });
/** Contract revision 1. Recomputes without caching or mutating input options. */
export function createDiagramState(source: string, options?: DiagramOptions): DiagramState;

/** UI settings; these do not alter compilation, SVG generation, or diagnostic data. */
export interface WarningDisplayOptions {
  showWarnings?: boolean | undefined;
  warningsClassName?: string | undefined;
  warningsLabel?: string | undefined;
}
/** Ordered warning text for successful state; false hides presentation only. Invalid flags throw TypeError. */
export function diagramWarningText(diagram: { ok: boolean; diagnostics?: Diagnostic[] | null | undefined }, showWarnings?: boolean): string;
