import type { DiagramOptions, DiagramState } from "@subvertic/diagram";
export type { DiagramOptions, DiagramState } from "@subvertic/diagram";

export interface VrlMarkupOptions {
  diagram?: DiagramState | null | undefined;
  className?: string | undefined; diagnosticsClassName?: string | undefined; role?: string | undefined;
}
export interface VrlDiagramProps extends VrlMarkupOptions {
  source?: string | undefined; options?: DiagramOptions | undefined;
}
export function createVrlSvelteDiagramState(source: string, options?: DiagramOptions): DiagramState;
export function renderVrlSvelteMarkup(source: string, options?: DiagramOptions, renderOptions?: VrlMarkupOptions): string;
