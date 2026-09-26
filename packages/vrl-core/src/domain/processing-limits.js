import { fieldSpecification } from "./field-specifications.js";

const DEFAULT_LIMITS = Object.freeze({
  maxSourceBytes: 1_048_576,
  maxLines: 20_000,
  maxLineBytes: 16_384,
  maxElements: 10_000,
  maxListEntries: 1_024
});

/**
 * Merge immutable positive safe-integer source budgets with validated per-call overrides; reject unknown names
 * and malformed values.
 * @responsibility computation
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Contains optional layout and processing-limit overrides.
 * @returns {unknown} The result returned by Object.freeze.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function resolveProcessingLimits(options = {}) {
  if (options === null || typeof options !== "object" || (Object.getPrototypeOf(options) !== Object.prototype && Object.getPrototypeOf(options) !== null)) {
    throw new TypeError("Processing limits must be a plain object.");
  }
  const limits = { ...DEFAULT_LIMITS };
  for (const [name, value] of Object.entries(options)) {
    if (!Object.hasOwn(DEFAULT_LIMITS, name)) throw new TypeError(`Unknown processing limit "${name}".`);
    if (value === undefined) continue;
    if (typeof value !== "number") throw new TypeError(`Processing limit "${name}" must be a number.`);
    if (!Number.isSafeInteger(value) || value <= 0) throw new RangeError(`Processing limit "${name}" must be a positive safe integer.`);
    limits[name] = value;
  }
  return Object.freeze(limits);
}

/**
 * Scan UTF-8 byte widths, physical lines and per-line bytes without copying the document; return the first
 * exceeded budget with UTF-16 location. Scan without splitting lines or allocating an encoded copy of the
 * document.
 * @responsibility computation
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @param {unknown} limits - Resolved immutable positive processing budgets for this invocation.
 * @returns {unknown} The result returned by limitProblem. Null when no matching value or problem exists.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */

export function sourceLimitProblem(source, limits) {
  if (typeof source !== "string") throw new TypeError("VRL source must be a string.");
  let bytes = 0;
  let lineBytes = 0;
  let line = 1;
  let lineStart = 0;
  for (let index = 0; index < source.length;) {
    const code = source.codePointAt(index);
    const width = utf8Width(code);
    bytes += width;
    if (bytes > limits.maxSourceBytes) return limitProblem("maxSourceBytes", limits, { line, column: index - lineStart + 1 });
    if (code === 10) {
      line += 1;
      lineStart = index + 1;
      lineBytes = 0;
      if (line > limits.maxLines) return limitProblem("maxLines", limits, { line, column: 1 });
    } else if (!(code === 13 && source[index + 1] === "\n")) {
      lineBytes += width;
      if (lineBytes > limits.maxLineBytes) return limitProblem("maxLineBytes", limits, { line, column: index - lineStart + 1 });
    }
    index += code > 0xffff ? 2 : 1;
  }
  return null;
}

/**
 * Compute the UTF-8 byte width of one code point, treating an isolated surrogate as a three-byte replacement.
 * @responsibility computation
 * @param {number} code - Unicode code point whose encoded width is counted.
 * @returns {unknown} The literal 1 for this branch. The literal 2 for this branch. The selected result, including the documented absent-value fallback.
 */
function utf8Width(code) {
  if (code <= 0x7f) return 1;
  if (code <= 0x7ff) return 2;
  return code <= 0xffff ? 3 : 4;
}

/**
 * Count known list separators without allocating entries; return the first list-budget problem or null.
 * @responsibility computation
 * @param {string} name - Own attribute name whose value or source range is selected.
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {unknown} limits - Resolved immutable positive processing budgets for this invocation.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {unknown} Null when no matching value or problem exists. The result returned by limitProblem.
 */
export function listLimitProblem(name, value, limits, location) {
  const separator = fieldSpecification(name)?.separator;
  if (separator === undefined || typeof value !== "string" || value === "") return null;
  let entries = 1;
  for (const character of value) {
    if (character === separator) entries += 1;
    if (entries > limits.maxListEntries) return limitProblem("maxListEntries", limits, location);
  }
  return null;
}

/**
 * Recheck element and attribute-list budgets on a parser-provided AST before semantic processing. Recheck
 * parser-port outputs before semantic validation or normalization.
 * @responsibility coordinator
 * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @param {unknown} limits - Resolved immutable positive processing budgets for this invocation.
 * @returns {unknown} The result returned by limitProblem. The metadataProblem value selected or validated above. The problem value selected or validated above. Null when no matching value or problem exists.
 */

export function astLimitProblem(ast, limits) {
  if (ast.elements.length > limits.maxElements) {
    return limitProblem("maxElements", limits, ast.elements[limits.maxElements].sourceLocation);
  }
  const metadataProblem = attributesLimitProblem(ast.metadata, limits, { line: 1, column: 1 });
  if (metadataProblem !== null) return metadataProblem;
  for (const element of ast.elements) {
    const problem = attributesLimitProblem(element.attributes, limits, element.sourceLocation);
    if (problem !== null) return problem;
  }
  return null;
}

/**
 * Check each raw attribute against list budgets and stop at the first violation.
 * @responsibility coordinator
 * @param {unknown} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {unknown} limits - Resolved immutable positive processing budgets for this invocation.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {unknown} The problem value selected or validated above. Null when no matching value or problem exists.
 */
function attributesLimitProblem(attributes, limits, location) {
  for (const [name, value] of Object.entries(attributes)) {
    const problem = listLimitProblem(name, value, limits, location);
    if (problem !== null) return problem;
  }
  return null;
}

/**
 * Construct a budget problem with its name, configured maximum and original source location.
 * @responsibility computation
 * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @param {unknown} limits - Resolved immutable positive processing budgets for this invocation.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {Object} A record containing name, maximum, location.
 */
export function limitProblem(name, limits, location) {
  return { name, maximum: limits[name], location };
}
