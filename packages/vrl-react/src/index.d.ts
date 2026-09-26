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
  /**
   * Adapt an element description into the framework's element value.
   * @responsibility coordinator
   * @param {"div"|"pre"} type - Wrapper tag requested by the adapter.
   * @param {Record<string, unknown>} props - Framework properties and trusted SVG payload where present.
   * @param {(string|E)[]} children - Ordered text or framework-element children.
   * @returns {E} Framework-owned element value; the adapter does not mount it.
   */
  createElement(type: "div" | "pre", props: Record<string, unknown>, ...children: (string | E)[]): E;
}
/**
 * Delegate compilation and rendering to the framework-neutral diagram state service.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {DiagramOptions} [options] - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {DiagramState} Shared diagram state suitable for the React adapter.
 */
export function createVrlReactDiagramState(source: string, options?: DiagramOptions): DiagramState;
export interface VrlDiagramComponent<E> {
  /**
   * Render using the defaults captured by the component factory.
   * @responsibility coordinator
   * @returns {E} Framework-owned SVG, warning or diagnostic wrapper elements.
   */
  (): E;
  /**
   * Resolve caller props against captured defaults and render their shared state.
   * @responsibility coordinator
   * @param {VrlDiagramProps} props - Source/options or explicitly trusted precomputed diagram state.
   * @returns {E} Framework-owned SVG, warning or diagnostic wrapper elements.
   */
  (props: VrlDiagramProps): E;
}
/**
 * Validate the React factory and capture defaults in a reusable component; caller-owned precomputed markup is trusted.
 * @responsibility coordinator
 * @param {ReactFactory<E>} React - React-compatible object exposing createElement.
 * @param {VrlDiagramDefaults} [defaults] - Captured component default props; defaults to {}.
 * @returns {VrlDiagramComponent<E>} React-compatible diagram component with captured default props.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function createVrlDiagramComponent<E>(React: ReactFactory<E>, defaults?: VrlDiagramDefaults): VrlDiagramComponent<E>;
