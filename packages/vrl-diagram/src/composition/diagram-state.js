import { compileRoute } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";
import { createDiagramStateWithPorts } from "../application/create-diagram-state.js";

const PORTS = Object.freeze({ compile: compileRoute, render: renderTopoSvg });

export function createDiagramState(source, options = {}) {
  return createDiagramStateWithPorts(source, options, PORTS);
}
