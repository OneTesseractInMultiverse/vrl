import { hasBlockingDiagnostics } from "../domain/diagnostics.js";
import { normalizeRoute } from "../domain/model.js";
import { computeVerticalLayout } from "../layout/vertical-layout.js";
import { parseVrl } from "../parser/line-parser.js";
import { validateRoute } from "../validation/validate-route.js";
import { validateGeometry } from "../validation/validate-geometry.js";
import { requireNumericData, requireSupportedNumber } from "../domain/numeric-policy.js";

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
  const parsed = dependencies.parse(source);
  const validationDiagnostics = dependencies.validate(parsed.ast);
  const diagnostics = [...parsed.diagnostics, ...validationDiagnostics];

  if (hasBlockingDiagnostics(diagnostics)) {
    return {
      ok: false,
      ast: parsed.ast,
      diagnostics,
      model: null,
      layout: null,
      json: null
    };
  }

  const model = dependencies.normalize(parsed.ast);
  diagnostics.push(...(dependencies.validateGeometry ?? validateGeometry)(model));
  if (hasBlockingDiagnostics(diagnostics)) {
    return { ok: false, ast: parsed.ast, diagnostics, model: null, layout: null, json: null };
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

export function exportRouteJson(model) {
  return JSON.stringify(model, (_key, value) => typeof value === "number" ? requireSupportedNumber(value, "JSON number") : value, 2);
}

const defaultRouteCompiler = createRouteCompiler();
