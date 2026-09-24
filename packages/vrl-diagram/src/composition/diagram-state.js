import { compileRoute } from "@subvertic/core";
import { renderTopoSvg } from "@subvertic/render-svg";
import { createDiagramStateWithPorts } from "../application/create-diagram-state.js";

const PORTS = Object.freeze({ compile: compileRoute, render: renderTopoSvg });

export function createDiagramState(source, options = {}) {
  return createDiagramStateWithPorts(source, options, PORTS);
}
