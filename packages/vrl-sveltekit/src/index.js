import { createDiagramState } from "@subvertic/vrl-diagram";

/**
 * Create serializable shared diagram state for SvelteKit loaders.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {Object} Serializable shared diagram state for the loader data record.
 */
export function createVrlSvelteKitData(source, options = {}) {
  return createDiagramState(source, options);
}

/**
 * Validate loader configuration and capture source/options resolvers and the output data key in an async
 * load
 * function.
 * @responsibility coordinator
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {string|Function} input1.source - Literal VRL text or event resolver returning text or a promise.
 * @param {Object|Function} input1.options - Literal diagram options or event resolver; omitted options default to an empty record.
 * @param {string} input1.key - Nonempty result property name; omitted key defaults to vrl.
 * @returns {Function} Async request loader returning shared diagram state under the configured key.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function createVrlSvelteKitLoad({ source, options = {}, key = "vrl" } = {}) {
  if (typeof key !== "string" || key === "") {
    throw new TypeError("createVrlSvelteKitLoad requires a non-empty string key.");
  }

  if (typeof source !== "string" && typeof source !== "function") {
    throw new TypeError("createVrlSvelteKitLoad requires source to be a string or function.");
  }

  /**
   * Resolve source and options for a request and return the configured diagram data; resolver and compilation
   * exceptions propagate.
   * @responsibility coordinator
   * @param {unknown} event - SvelteKit request event passed unchanged to each configured resolver.
   * @returns {Promise<Object>} Resolves with a record containing key. Rejects when the awaited operation fails.
   */
  return async function load(event) {
    const resolvedSource = await resolveInput(source, event);
    const resolvedOptions = await resolveInput(options, event);

    return {
      [key]: createVrlSvelteKitData(resolvedSource, resolvedOptions)
    };
  };
}

/**
 * Invoke a request resolver when the input is a function, otherwise return the literal input for the caller to
 * await.
 * @responsibility coordinator
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {unknown} event - SvelteKit request event passed unchanged to each configured resolver.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function resolveInput(value, event) {
  return typeof value === "function" ? value(event) : value;
}
