import type { DiagramOptions, DiagramState, WarningDisplayOptions } from "@subvertic/vrl-diagram";
export type { DiagramOptions, DiagramState } from "@subvertic/vrl-diagram";

/**
 * Literal loader input or a request resolver; only the callback branch is callable.
 * @responsibility coordinator
 * @param {E} event - Request context supplied unchanged by the load function.
 * @returns {T|Promise<T>} Literal or asynchronously resolved input; failures propagate.
 */
export type LoadInput<T, E> = T | ((event: E) => T | Promise<T>);
export interface VrlLoadOptions<E, K extends string = "vrl"> {
  source: LoadInput<string, E>; options?: LoadInput<DiagramOptions, E> | undefined; key?: K | undefined;
}
export interface VrlDiagramProps extends WarningDisplayOptions {
  data?: Record<string, unknown> | undefined; diagramKey?: string | undefined;
  source?: string | undefined; options?: DiagramOptions | undefined; diagram?: DiagramState | null | undefined;
  className?: string | undefined; diagnosticsClassName?: string | undefined; role?: string | undefined;
}
/**
 * Create serializable shared diagram state for SvelteKit loaders.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {DiagramOptions} [options] - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {DiagramState} Serializable shared diagram state for the loader data record.
 */
export function createVrlSvelteKitData(source: string, options?: DiagramOptions): DiagramState;
/**
 * Validate loader configuration and capture source/options resolvers and the output data key in an async load function. key must be nonempty. Input callbacks share the event and may resolve asynchronously.
 * @responsibility coordinator
 * @param {VrlLoadOptions<E, K>} config - Loader configuration with source/resolver, optional options/resolver and output key; resolvers receive the request event.
 * @returns {(event: E) => Promise<Record<K, DiagramState>>} Async request loader returning shared diagram state under the configured key.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function createVrlSvelteKitLoad<E = unknown, K extends string = "vrl">(config: VrlLoadOptions<E, K>): (event: E) => Promise<Record<K, DiagramState>>;
