import type { DiagramOptions, DiagramState, WarningDisplayOptions } from "@subvertic/vrl-diagram";
export type { DiagramOptions, DiagramState } from "@subvertic/vrl-diagram";

export interface VrlDiagramProps extends WarningDisplayOptions {
  source?: string | undefined; options?: DiagramOptions | undefined;
  diagram?: DiagramState | null | undefined;
  className?: string | undefined; diagnosticsClassName?: string | undefined; role?: string | undefined;
  containerProps?: Record<string, unknown> | undefined; diagnosticsProps?: Record<string, unknown> | undefined;
}
export type VrlDiagramDefaults = Pick<VrlDiagramProps, "source" | "options" | "className" | "diagnosticsClassName" | "role"> & WarningDisplayOptions;
/** Structural factory port keeps the adapter independent of React's runtime and type packages. */
export interface ReactFactory<E> {
  createElement(type: "div" | "pre", props: Record<string, unknown>, ...children: (string | E)[]): E;
}
export function createVrlReactDiagramState(source: string, options?: DiagramOptions): DiagramState;
export interface VrlDiagramComponent<E> { (): E; (props: VrlDiagramProps): E }
export function createVrlDiagramComponent<E>(React: ReactFactory<E>, defaults?: VrlDiagramDefaults): VrlDiagramComponent<E>;
