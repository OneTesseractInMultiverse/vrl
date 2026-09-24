import { assembleDiagramState } from "./diagram-state.js";

/** Coordinate synchronous compiler/render ports; composition supplies implementations. */
export function createDiagramStateWithPorts(source, options, ports) {
  const result = ports.compile(source, options);
  const svg = result.ok === false ? "" : ports.render(result.model, result.layout, options);
  return assembleDiagramState(result, svg);
}
