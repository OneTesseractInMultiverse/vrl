/**
 * Construct a diagnostic record with stable severity, location, suggestion and optional related locations,
 * code and span.
 * @responsibility computation
 * @param {unknown} kind - Discriminator selecting the supported record or diagnostic category.
 * @param {string} severity - Diagnostic severity, error or warning.
 * @param {string} message - Human-readable explanation retained in the diagnostic.
 * @param {Object} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @param {string} suggestion - Actionable correction text retained in the diagnostic; defaults to "".
 * @param {Array} relatedLocations - Ordered related diagnostic source references; defaults to [].
 * @param {Object} input7 - Input record destructured into the separately documented members below.
 * @param {string} input7.code - Stable diagnostic code or selected symbol code owned by this record.
 * @param {Object} input7.span - Optional end-exclusive source range.
 * @returns {Object} A record containing kind, severity, message, location, suggestion, the supplied fields, the supplied fields, the supplied fields.
 */
export function createDiagnostic(kind, severity, message, location, suggestion = "", relatedLocations = [], { code, span } = {}) {
  return {
    kind,
    severity,
    message,
    location,
    suggestion,
    ...(relatedLocations.length === 0 ? {} : { relatedLocations }),
    ...(code === undefined ? {} : { code }),
    ...(span === undefined ? {} : { span })
  };
}

/**
 * Project a source reference into a coded diagnostic while retaining optional range and related-location
 * information.
 * @responsibility computation
 * @param {string} code - Stable diagnostic code or selected symbol code owned by this record.
 * @param {unknown} kind - Discriminator selecting the supported record or diagnostic category.
 * @param {string} severity - Diagnostic severity, error or warning.
 * @param {string} message - Human-readable explanation retained in the diagnostic.
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @param {string} suggestion - Actionable correction text retained in the diagnostic; defaults to "".
 * @param {Array} relatedLocations - Ordered related diagnostic source references; defaults to [].
 * @returns {unknown} The result returned by createDiagnostic.
 */
export function codedDiagnostic(code, kind, severity, message, source, suggestion = "", relatedLocations = []) {
  return createDiagnostic(kind, severity, message, source.location, suggestion, relatedLocations, { code, span: source.span });
}

/**
 * Report whether any diagnostic has error severity; warnings alone remain nonblocking.
 * @responsibility computation
 * @param {Array} diagnostics - Ordered diagnostic records; append helpers mutate the supplied destination list.
 * @returns {boolean} The result returned by diagnostics.some.
 */
export function hasBlockingDiagnostics(diagnostics) {
  return diagnostics.some(/**
   * Evaluate the selection condition diagnostic.severity === "error".
   * @responsibility computation
   * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (diagnostic) => diagnostic.severity === "error");
}

/**
 * Format a diagnostic and its related locations as readable plain text without changing its source data.
 * @responsibility computation
 * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
export function formatDiagnostic(diagnostic) {
  const suffix = diagnostic.suggestion === "" ? "" : ` Suggestion: ${diagnostic.suggestion}`;
  const related = formatRelatedLocations(diagnostic.relatedLocations ?? []);
  return `${diagnostic.severity.toUpperCase()} ${diagnostic.kind} at ${diagnostic.location.line}:${diagnostic.location.column}: ${diagnostic.message}${suffix}${related}`;
}

/**
 * Append related source positions and messages in their declared order.
 * @responsibility computation
 * @param {unknown} locations - Ordered related source locations.
 * @returns {string} The result returned by locations.map(({ message, location }) => ` Related: ${message} at ${location.line}:${location.column}.`).join.
 */
function formatRelatedLocations(locations) {
  return locations.map(/**
   * Format one related diagnostic message with its one-based line and column.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {string} input1.message - Human-readable explanation retained in the diagnostic.
   * @param {Object} input1.location - One-based line and UTF-16 column used as the diagnostic origin.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ ({ message, location }) => ` Related: ${message} at ${location.line}:${location.column}.`).join("");
}

/**
 * Append diagnostics iteratively to a caller-owned list, avoiding argument-count limits from spread calls.
 * Append arbitrary diagnostic counts without expanding function arguments.
 * @responsibility computation
 * @param {Array} target - Caller-owned diagnostic destination; appended to in place.
 * @param {Array} diagnostics - Ordered diagnostic records; append helpers mutate the supplied destination list.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */

export function appendDiagnostics(target, diagnostics) {
  for (const diagnostic of diagnostics) target.push(diagnostic);
}

/**
 * Translate a processing-budget problem into a located blocking diagnostic naming the configured maximum.
 * @responsibility computation
 * @param {unknown} problem - Classified domain or budget problem to translate.
 * @returns {unknown} The result returned by codedDiagnostic.
 */
export function limitDiagnostic(problem) {
  return codedDiagnostic(`VRL_LIMIT_${problem.name.replace(/[A-Z]/g, /**
   * Compute "_" + letter.
   * @responsibility computation
   * @param {unknown} letter - Current test character or lexical symbol.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (letter) => "_" + letter).toUpperCase()}`, "limit", "error", `Document exceeds ${problem.name} limit of ${problem.maximum}.`, { location: problem.location },
    `Reduce the document or explicitly increase options.limits.${problem.name} for a trusted workload.`);
}
