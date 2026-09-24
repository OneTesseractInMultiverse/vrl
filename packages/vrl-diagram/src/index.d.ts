import type { CompileOptions, CompileResult } from "@subvertic/core";
import type { RenderOptions } from "@subvertic/render-svg";

export interface DiagramOptions extends CompileOptions, RenderOptions {}
/** Mutable state for one compilation. A supplied state is trusted caller markup. */
export type DiagramState =
  (Extract<CompileResult, { ok: true }> & { diagnosticsText: string; svg: string })
  | (Extract<CompileResult, { ok: false }> & { diagnosticsText: string; svg: "" });
/** Contract revision 1. Recomputes without caching or mutating input options. */
export function createDiagramState(source: string, options?: DiagramOptions): DiagramState;
