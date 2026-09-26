import { appendDiagnostics, limitDiagnostic, hasBlockingDiagnostics } from "../domain/diagnostics.js";
import { createEmptyRoute } from "./route-ast.js";
import { requireNumericData } from "../domain/numeric-policy.js";
import { astLimitProblem, resolveProcessingLimits, sourceLimitProblem } from "../domain/processing-limits.js";
import { requireDiagnostics, requireExportText, requireParsedRoute, requirePortRecord } from "./compiler-ports.js";

/**
 * Run source budgets, parsing, AST budgets, validation, normalization, geometry, layout and export in order.
 * Blocking diagnostics stop later stages; port and configuration exceptions propagate unchanged.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Contains optional layout and processing-limit overrides.
 * @param {Object<string, Function>} dependencies - Caller-supplied synchronous compiler port implementations.
 * @returns {Object} Compilation result with ok, AST and ordered diagnostics; model, layout and JSON are null on blocking failure.
 */

export function compileRouteWithPorts(source, options, dependencies) {
  const limits = resolveProcessingLimits(options.limits);
  const sourceProblem = sourceLimitProblem(source, limits);
  if (sourceProblem !== null) return failedCompilation(createEmptyRoute(source), [limitDiagnostic(sourceProblem)]);
  const parsed = requireParsedRoute(dependencies.parse(source, { limits }));
  if (parsed.diagnostics.some(/**
   * Evaluate the selection condition diagnostic.kind === "limit" && diagnostic.severity === "error".
   * @responsibility computation
   * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (diagnostic) => diagnostic.kind === "limit" && diagnostic.severity === "error")) return failedCompilation(parsed.ast, parsed.diagnostics);
  const astProblem = astLimitProblem(parsed.ast, limits);
  if (astProblem !== null) return failedCompilation(parsed.ast, [...parsed.diagnostics, limitDiagnostic(astProblem)]);
  const validationDiagnostics = requireDiagnostics(dependencies.validate(parsed.ast), "validate");
  const diagnostics = [...parsed.diagnostics, ...validationDiagnostics];

  if (hasBlockingDiagnostics(diagnostics)) {
    return failedCompilation(parsed.ast, diagnostics);
  }

  const model = requirePortRecord(dependencies.normalize(parsed.ast), "normalize");
  appendDiagnostics(diagnostics, requireDiagnostics(dependencies.validateGeometry(model, parsed.ast.sourceMap), "validateGeometry"));
  if (hasBlockingDiagnostics(diagnostics)) {
    return failedCompilation(parsed.ast, diagnostics);
  }
  requireNumericData(model, "Normalized model");
  const layout = requireNumericData(requirePortRecord(dependencies.layout(model, options.layout), "layout"), "Layout");

  return {
    ok: true,
    ast: parsed.ast,
    diagnostics,
    model,
    layout,
    json: requireExportText(dependencies.exportJson(model))
  };
}

/**
 * Build a failed compilation record retaining the recovery AST and ordered diagnostics while clearing all
 * derived outputs.
 * @responsibility computation
 * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @param {Array} diagnostics - Ordered diagnostic records; append helpers mutate the supplied destination list.
 * @returns {Object} A record containing ok, ast, diagnostics, model, layout, json.
 */
function failedCompilation(ast, diagnostics) {
  return { ok: false, ast, diagnostics, model: null, layout: null, json: null };
}
