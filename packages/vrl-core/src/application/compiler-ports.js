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

/**
 * Enforce the plain-object precondition and reject unsupported object shapes before downstream property
 * access.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {unknown} description - Human-readable subject included in a contract failure.
 * @returns {Object} The original plain synchronous record after shape validation.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function requireRecord(value, description) {
  if (value === null || typeof value !== "object" || (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null) || typeof value.then === "function") {
    throw new TypeError(`${description} must be a synchronous plain object.`);
  }
  return value;
}

/**
 * Validate the six synchronous port functions and freeze an owned shallow snapshot so later caller edits
 * cannot rewire the compiler. Capture functions once so later edits to the caller's wiring cannot change a
 * compiler.
 * @responsibility computation
 * @param {Object<string, Function>} dependencies - Caller-supplied synchronous compiler port implementations.
 * @returns {Object} Frozen shallow snapshot containing each validated port function.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */

export function compilerPorts(dependencies) {
  const ports = { ...requireRecord(dependencies, "Compiler ports") };
  for (const name of PORT_NAMES) {
    if (typeof ports[name] !== "function") throw new TypeError(`Compiler port "${name}" must be a function.`);
  }
  return Object.freeze(ports);
}

/**
 * Apply the synchronous plain-record guard to one named compiler port result.
 * @responsibility coordinator
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} port - Compiler port name included in a shape-contract error.
 * @returns {Object} The original synchronous plain port result.
 */
export function requirePortRecord(value, port) {
  return requireRecord(value, `Compiler port "${port}" result`);
}

/**
 * Check the parser result, AST, metadata, element records and diagnostics against application-owned port
 * contracts.
 * @responsibility coordinator
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {Object} The original parser result with validated AST container and diagnostics shapes.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
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

/**
 * Require a synchronous array of structured diagnostics with valid severity and positive one-based source
 * locations.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} port - Compiler port name included in a shape-contract error.
 * @returns {Array} The original validated diagnostic list in its existing order.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
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

/**
 * Recognize non-null location records with positive safe-integer line and column values.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
function isLocation(value) {
  return value !== null && typeof value === "object" && Number.isSafeInteger(value.line) && value.line > 0 && Number.isSafeInteger(value.column) && value.column > 0;
}

/**
 * Require the export port to return a primitive string synchronously.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {string} The original primitive export string.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function requireExportText(value) {
  if (typeof value !== "string") throw new TypeError('Compiler port "exportJson" must return a string synchronously.');
  return value;
}
