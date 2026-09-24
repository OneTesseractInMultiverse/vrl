/**
 * Synchronous application-owned contracts. See docs/compiler-ports.md for values and failures.
 * @typedef {Object} CompilerPorts
 * @property {(source: string, options: {limits: Object}) => {ast: Object, diagnostics: Object[]}} parse
 * @property {(ast: Object) => Object[]} validate
 * @property {(ast: Object) => Object} normalize
 * @property {(model: Object, sourceMap?: Object) => Object[]} validateGeometry
 * @property {(model: Object, options?: Object) => Object} layout
 * @property {(model: Object) => string} exportJson
 */

const PORT_NAMES = ["parse", "validate", "normalize", "validateGeometry", "layout", "exportJson"];

export function requireRecord(value, description) {
  if (value === null || typeof value !== "object" || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) || typeof value.then === "function") {
    throw new TypeError(`${description} must be a synchronous plain object.`);
  }
  return value;
}

/** Capture functions once so later edits to the caller's wiring cannot change a compiler. */
export function compilerPorts(dependencies) {
  const ports = { ...requireRecord(dependencies, "Compiler ports") };
  for (const name of PORT_NAMES) {
    if (typeof ports[name] !== "function") throw new TypeError(`Compiler port "${name}" must be a function.`);
  }
  return Object.freeze(ports);
}

export function requirePortRecord(value, port) {
  return requireRecord(value, `Compiler port "${port}" result`);
}

export function requireParsedRoute(value) {
  const parsed = requirePortRecord(value, "parse");
  requireRecord(parsed.ast, 'Compiler port "parse" AST');
  requireRecord(parsed.ast.metadata, 'Compiler port "parse" AST metadata');
  if (!Array.isArray(parsed.ast.elements)) throw new TypeError('Compiler port "parse" AST elements must be an array.');
  for (const element of parsed.ast.elements) {
    requireRecord(element, 'Compiler port "parse" AST element');
    requireRecord(element.attributes, 'Compiler port "parse" AST element attributes');
  }
  requireDiagnostics(parsed.diagnostics, "parse");
  return parsed;
}

export function requireDiagnostics(value, port) {
  if (!Array.isArray(value) || typeof value.then === "function") throw new TypeError(`Compiler port "${port}" diagnostics must be a synchronous array.`);
  for (const diagnostic of value) {
    requireRecord(diagnostic, `Compiler port "${port}" diagnostic`);
    if (typeof diagnostic.kind !== "string" || typeof diagnostic.message !== "string" || !["error", "warning"].includes(diagnostic.severity) || !isLocation(diagnostic.location)) {
      throw new TypeError(`Compiler port "${port}" diagnostic requires kind, message, error/warning severity, and a positive integer location.`);
    }
  }
  return value;
}

function isLocation(value) {
  return value !== null && typeof value === "object" && Number.isSafeInteger(value.line) && value.line > 0 && Number.isSafeInteger(value.column) && value.column > 0;
}

export function requireExportText(value) {
  if (typeof value !== "string") throw new TypeError('Compiler port "exportJson" must return a string synchronously.');
  return value;
}
