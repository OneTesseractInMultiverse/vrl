import { compileRoute } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";
import { createDiagramStateWithPorts } from "../application/create-diagram-state.js";

const PORTS = Object.freeze({ compile: compileRoute, render: renderTopoSvg });

/**
 * Delegate state creation to the shared application using the fixed default compiler and renderer ports.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text passed to the shared compiler.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {Object} Shared success or failure state including formatted diagnostics and SVG only on success.
 */
export function createDiagramState(source, options = {}) {
  return createDiagramStateWithPorts(source, options, PORTS);
}
