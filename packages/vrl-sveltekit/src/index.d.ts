import type { DiagramOptions, DiagramState, WarningDisplayOptions } from "@subvertic/vrl-diagram";
export type { DiagramOptions, DiagramState } from "@subvertic/vrl-diagram";

export type LoadInput<T, E> = T | ((event: E) => T | Promise<T>);
export interface VrlLoadOptions<E, K extends string = "vrl"> {
  source: LoadInput<string, E>; options?: LoadInput<DiagramOptions, E> | undefined; key?: K | undefined;
}
export interface VrlDiagramProps extends WarningDisplayOptions {
  data?: Record<string, unknown> | undefined; diagramKey?: string | undefined;
  source?: string | undefined; options?: DiagramOptions | undefined; diagram?: DiagramState | null | undefined;
  className?: string | undefined; diagnosticsClassName?: string | undefined; role?: string | undefined;
}
export function createVrlSvelteKitData(source: string, options?: DiagramOptions): DiagramState;
/** key must be nonempty. Input callbacks share the event and may resolve asynchronously. */
export function createVrlSvelteKitLoad<E = unknown, K extends string = "vrl">(config: VrlLoadOptions<E, K>): (event: E) => Promise<Record<K, DiagramState>>;
