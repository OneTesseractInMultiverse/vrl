import { hasBlockingDiagnostics } from "../domain/diagnostics.js";
import { normalizeRoute } from "../domain/model.js";
import { computeVerticalLayout } from "../layout/vertical-layout.js";
import { parseVrl } from "../parser/line-parser.js";
import { validateRoute } from "../validation/validate-route.js";

export function createRouteCompiler(overrides = {}) {
  const dependencies = {
    parse: parseVrl,
    validate: validateRoute,
    normalize: normalizeRoute,
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
  const layout = dependencies.layout(model, options.layout);

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
  return JSON.stringify(model, null, 2);
}

const defaultRouteCompiler = createRouteCompiler();
