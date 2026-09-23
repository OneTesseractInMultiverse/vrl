import { fieldSpecification } from "./field-specifications.js";

const DEFAULT_LIMITS = Object.freeze({
  maxSourceBytes: 1_048_576,
  maxLines: 20_000,
  maxLineBytes: 16_384,
  maxElements: 10_000,
  maxListEntries: 1_024
});

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

/** Scan without splitting lines or allocating an encoded copy of the document. */
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

function utf8Width(code) {
  if (code <= 0x7f) return 1;
  if (code <= 0x7ff) return 2;
  return code <= 0xffff ? 3 : 4;
}

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

/** Recheck parser-port outputs before semantic validation or normalization. */
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

function attributesLimitProblem(attributes, limits, location) {
  for (const [name, value] of Object.entries(attributes)) {
    const problem = listLimitProblem(name, value, limits, location);
    if (problem !== null) return problem;
  }
  return null;
}

export function limitProblem(name, limits, location) {
  return { name, maximum: limits[name], location };
}
