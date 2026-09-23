import { appendDiagnostics, limitDiagnostic, hasBlockingDiagnostics } from "../domain/diagnostics.js";
import { createEmptyRoute, normalizeRoute } from "../domain/model.js";
import { computeVerticalLayout } from "../layout/vertical-layout.js";
import { parseVrl } from "../parser/line-parser.js";
import { validateRoute } from "../validation/validate-route.js";
import { validateGeometry } from "../validation/validate-geometry.js";
import { requireNumericData, requireSupportedNumber } from "../domain/numeric-policy.js";
import { astLimitProblem, resolveProcessingLimits, sourceLimitProblem } from "../domain/processing-limits.js";

export function createRouteCompiler(overrides = {}) {
  const dependencies = {
    parse: parseVrl,
    validate: validateRoute,
    normalize: normalizeRoute,
    validateGeometry,
    layout: computeVerticalLayout,
    exportJson: exportRouteJson,
    ...overrides
  };

  return function configuredCompileRoute(source, options = {}) {
    return compileRouteWithDependencies(source, options, dependencies);
  };
}

export function compileRoute(source, options = {}) {
  return defaultRouteCompiler(source, options);
}

export function compileRouteWithDependencies(source, options = {}, dependencies) {
  const limits = resolveProcessingLimits(options.limits);
  const sourceProblem = sourceLimitProblem(source, limits);
  if (sourceProblem !== null) return failedCompilation(createEmptyRoute(source), [limitDiagnostic(sourceProblem)]);
  const parsed = dependencies.parse(source, { limits });
  if (parsed.diagnostics.some((diagnostic) => diagnostic.kind === "limit" && diagnostic.severity === "error")) return failedCompilation(parsed.ast, parsed.diagnostics);
  const astProblem = astLimitProblem(parsed.ast, limits);
  if (astProblem !== null) return failedCompilation(parsed.ast, [...parsed.diagnostics, limitDiagnostic(astProblem)]);
  const validationDiagnostics = dependencies.validate(parsed.ast);
  const diagnostics = [...parsed.diagnostics, ...validationDiagnostics];

  if (hasBlockingDiagnostics(diagnostics)) {
    return failedCompilation(parsed.ast, diagnostics);
  }

  const model = dependencies.normalize(parsed.ast);
  appendDiagnostics(diagnostics, (dependencies.validateGeometry ?? validateGeometry)(model));
  if (hasBlockingDiagnostics(diagnostics)) {
    return failedCompilation(parsed.ast, diagnostics);
  }
  requireNumericData(model, "Normalized model");
  const layout = requireNumericData(dependencies.layout(model, options.layout), "Layout");

  return {
    ok: true,
    ast: parsed.ast,
    diagnostics,
    model,
    layout,
    json: dependencies.exportJson(model)
  };
}

function failedCompilation(ast, diagnostics) {
  return { ok: false, ast, diagnostics, model: null, layout: null, json: null };
}

export function exportRouteJson(model) {
  return JSON.stringify(model, (_key, value) => typeof value === "number" ? requireSupportedNumber(value, "JSON number") : value, 2);
}

const defaultRouteCompiler = createRouteCompiler();
