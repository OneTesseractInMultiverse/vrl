import { compileRouteWithPorts } from "../application/compile-route.js";
import { compilerPorts, requireRecord } from "../application/compiler-ports.js";
import { exportRouteJson } from "../adapters/json/export-route-json.js";
import { normalizeRoute } from "../domain/model.js";
import { computeVerticalLayout } from "../layout/vertical-layout.js";
import { parseVrl } from "../parser/line-parser.js";
import { validateRoute } from "../validation/validate-route.js";
import { validateGeometry } from "../validation/validate-geometry.js";

/**
 * Validate overrides, bind default adapters and capture immutable application ports in a reusable synchronous
 * compiler closure.
 * @responsibility coordinator
 * @param {unknown} overrides - Caller-supplied values replacing the corresponding defaults; defaults to {}.
 * @returns {Function} Reusable synchronous compiler bound to the captured port snapshot.
 */
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
  /**
   * Invoke the application compilation workflow with the ports captured when this compiler was constructed.
   * @responsibility coordinator
   * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
   * @param {Object} options - Operation-specific option record; defaults to an empty record. Contains optional layout and processing-limit overrides.
   * @returns {Object} Compilation result with ok, AST and ordered diagnostics; model, layout and JSON are null on blocking failure.
   */
  return function configuredCompileRoute(source, options = {}) {
    return compileRouteWithPorts(source, options, dependencies);
  };
}

/**
 * Validate caller-owned ports, supply the legacy geometry-validation default, and delegate the complete
 * compilation workflow. Preserve the public helper's legacy geometry default; all other ports are
 * caller-owned.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Contains optional layout and processing-limit overrides.
 * @param {Object<string, Function>} dependencies - Caller-supplied synchronous compiler port implementations.
 * @returns {Object} Compilation result with ok, AST and ordered diagnostics; model, layout and JSON are null on blocking failure.
 */

export function compileRouteWithDependencies(source, options = {}, dependencies) {
  const supplied = requireRecord(dependencies, "Compiler ports");
  const ports = compilerPorts({ ...supplied, validateGeometry: supplied.validateGeometry ?? validateGeometry });
  return compileRouteWithPorts(source, options, ports);
}

/**
 * Compile through the default captured adapters, returning diagnostics for invalid source and propagating
 * programming or configuration exceptions.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Contains optional layout and processing-limit overrides.
 * @returns {Object} Compilation result with ok, AST and ordered diagnostics; model, layout and JSON are null on blocking failure.
 */
export function compileRoute(source, options = {}) {
  return defaultRouteCompiler(source, options);
}

const defaultRouteCompiler = createRouteCompiler();
