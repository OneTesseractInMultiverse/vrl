import { appendDiagnostics, limitDiagnostic, hasBlockingDiagnostics } from "../domain/diagnostics.js";
import { createEmptyRoute } from "../domain/model.js";
import { requireNumericData } from "../domain/numeric-policy.js";
import { astLimitProblem, resolveProcessingLimits, sourceLimitProblem } from "../domain/processing-limits.js";
import { requireDiagnostics, requireExportText, requireParsedRoute, requirePortRecord } from "./compiler-ports.js";

/** Coordinate a complete synchronous CompilerPorts implementation; composition owns defaults. */
export function compileRouteWithPorts(source, options, dependencies) {
  const limits = resolveProcessingLimits(options.limits);
  const sourceProblem = sourceLimitProblem(source, limits);
  if (sourceProblem !== null) return failedCompilation(createEmptyRoute(source), [limitDiagnostic(sourceProblem)]);
  const parsed = requireParsedRoute(dependencies.parse(source, { limits }));
  if (parsed.diagnostics.some((diagnostic) => diagnostic.kind === "limit" && diagnostic.severity === "error")) return failedCompilation(parsed.ast, parsed.diagnostics);
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

function failedCompilation(ast, diagnostics) {
  return { ok: false, ast, diagnostics, model: null, layout: null, json: null };
}
