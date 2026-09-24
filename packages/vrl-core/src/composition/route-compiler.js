import { compileRouteWithPorts } from "../application/compile-route.js";
import { compilerPorts, requireRecord } from "../application/compiler-ports.js";
import { exportRouteJson } from "../adapters/json/export-route-json.js";
import { normalizeRoute } from "../domain/model.js";
import { computeVerticalLayout } from "../layout/vertical-layout.js";
import { parseVrl } from "../parser/line-parser.js";
import { validateRoute } from "../validation/validate-route.js";
import { validateGeometry } from "../validation/validate-geometry.js";

export function createRouteCompiler(overrides = {}) {
  const supplied = requireRecord(overrides, "Compiler overrides");
  const dependencies = compilerPorts({
    parse: parseVrl,
    validate: validateRoute,
    normalize: normalizeRoute,
    layout: computeVerticalLayout,
    exportJson: exportRouteJson,
    ...supplied,
    validateGeometry: supplied.validateGeometry ?? validateGeometry
  });
  return function configuredCompileRoute(source, options = {}) {
    return compileRouteWithPorts(source, options, dependencies);
  };
}

/** Preserve the public helper's legacy geometry default; all other ports are caller-owned. */
export function compileRouteWithDependencies(source, options = {}, dependencies) {
  const supplied = requireRecord(dependencies, "Compiler ports");
  const ports = compilerPorts({ ...supplied, validateGeometry: supplied.validateGeometry ?? validateGeometry });
  return compileRouteWithPorts(source, options, ports);
}

export function compileRoute(source, options = {}) {
  return defaultRouteCompiler(source, options);
}

const defaultRouteCompiler = createRouteCompiler();
