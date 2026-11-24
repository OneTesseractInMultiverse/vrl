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
 * @returns {string} Up to 2,048 UTF-16 units of formatted text in diagnostic order.
 */
export function formatDiagnostic(diagnostic) {
  const maximum = 2048;
  const kind = diagnosticExcerpt(diagnostic.kind, maximum);
  const message = diagnosticExcerpt(diagnostic.message, maximum);
  let text = `${diagnostic.severity.toUpperCase()} ${kind} at ${diagnostic.location.line}:${diagnostic.location.column}: ${message}`;
  if (diagnostic.suggestion !== "") text += ` Suggestion: ${diagnosticExcerpt(String(diagnostic.suggestion), maximum)}`;
  for (const related of diagnostic.relatedLocations ?? []) {
    if (text.length >= maximum) return diagnosticExcerpt(text + "…", maximum);
    text += ` Related: ${diagnosticExcerpt(related.message, maximum)} at ${related.location.line}:${related.location.column}.`;
  }
  return diagnosticExcerpt(text, maximum);
}

/**
 * Keep a short excerpt of authored text in diagnostic messages and retain the full source in the AST.
 * @responsibility computation
 * @param {string} value - Authored value or diagnostic text.
 * @param {number} maximum - Maximum UTF-16 length including the ellipsis.
 * @returns {string} Original short text or a bounded prefix with an ellipsis.
 */
export function diagnosticExcerpt(value, maximum = 160) {
  return value.length <= maximum ? value : value.slice(0, maximum - 1).replace(/[\uD800-\uDBFF]$/, "") + "…";
}

/**
 * Append ordered records until the destination holds the requested number.
 * @responsibility computation
 * @param {Array} target - Caller-owned diagnostic array.
 * @param {Array} diagnostics - Ordered records from a validation or parsing stage.
 * @param {number} maximum - Maximum total records to retain in the destination.
 * @returns {void} Updates the destination without expanding function arguments.
 */
export function appendDiagnostics(target, diagnostics, maximum = Infinity) {
  for (const diagnostic of diagnostics) {
    if (target.length >= maximum) break;
    target.push(diagnostic);
  }
}

/**
 * Replace excess diagnostics with one blocking limit record at the first omitted location.
 * @responsibility computation
 * @param {Array} diagnostics - Owned records in reporting order, including the first excess record if present.
 * @param {number} maximum - Maximum number of ordinary diagnostics to retain.
 * @returns {boolean} Whether the diagnostic budget stopped processing.
 */
export function enforceDiagnosticLimit(diagnostics, maximum) {
  if (diagnostics.length <= maximum) return false;
  const location = diagnostics[maximum].location;
  diagnostics.length = maximum;
  diagnostics.push(limitDiagnostic({ name: "maxDiagnostics", maximum, location }));
  return true;
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
