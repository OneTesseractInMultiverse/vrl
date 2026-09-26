import { assembleDiagramState } from "./diagram-state.js";

/**
 * Compile through the supplied port, skip rendering on blocking diagnostics, and assemble shared state;
 * dependency exceptions propagate.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Values are forwarded to the owning compiler/render or framework boundary.
 * @param {Object<string, Function>} ports - Application-owned port implementations supplied by composition or a test harness.
 * @returns {Object} Shared state; blocking compiler diagnostics prevent the render port from being called.
 */

export function createDiagramStateWithPorts(source, options, ports) {
  const result = ports.compile(source, options);
  const svg = result.ok === false ? "" : ports.render(result.model, result.layout, options);
  return assembleDiagramState(result, svg);
}
