import { createHash } from "node:crypto";

/**
 * Compute the SHA-256 digest of exact example text for explicit change review.
 * @responsibility computation
 * @param {string} source - Exact source text inspected or transformed without execution.
 * @returns {string} The result returned by createHash("sha256").update(source).digest.
 */
export function sourceFingerprint(source) {
  return createHash("sha256").update(source).digest("hex");
}

/**
 * Combine a tagged example with only its declared fragment prefix and optional suffix.
 * @responsibility computation
 * @param {Object} example - Extracted Markdown example with stable ID, kind and source.
 * @param {Object} contract - Reviewed example expectation including facts, diagnostics and optional fragment context.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
export function exampleSource(example, contract) {
  return (example.kind === "fragment" ? contract.prefix : "") + example.source + (contract.suffix ?? "");
}

/**
 * Resolve an escaped JSON pointer through own properties and throw when any required path is missing.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} pointer - Own-property JSON pointer with ~0/~1 escaping.
 * @returns {unknown} The value value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function pointerValue(value, pointer) {
  if (!pointer.startsWith("/")) throw new Error(`Expected JSON pointer: ${pointer}`);
  for (const token of pointer.slice(1).split("/")) {
    const key = token.replaceAll("~1", "/").replaceAll("~0", "~");
    if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) throw new Error(`Missing documented fact: ${pointer}`);
    value = value[key];
  }
  return value;
}

/**
 * Project selected facts, ordered diagnostics, physical traversal and output presence for independent
 * documentation assertions. Observe public results without recomputing domain or layout rules.
 * @responsibility computation
 * @param {Object} result - Observed public compilation result for fact and diagnostic projection.
 * @param {unknown} pointers - Selected JSON pointers into the observable result.
 * @returns {Object} A record containing ok, diagnostics, outputs, facts, geometry.
 */

export function exampleFacts(result, pointers) {
  return {
    ok: result.ok,
    diagnostics: result.diagnostics.map(/**
     * Project the current entry into an ordered tuple for result.diagnostics.map.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
     * @param {string} input1.severity - Diagnostic severity, error or warning.
     * @param {string} input1.code - Stable diagnostic identifier, or selected symbol code for presentation.
     * @param {Object} input1.location - One-based line and UTF-16 column used as the diagnostic origin.
     * @returns {Array} The ordered records or values assembled above.
     */ ({ kind, severity, code, location }) => [kind, severity, code, location.line, location.column]),
    outputs: [result.model !== null, result.layout !== null, result.json !== null],
    facts: Object.fromEntries(pointers.map(/**
     * Project the current entry into an ordered tuple for pointers.map.
     * @responsibility computation
     * @param {string} pointer - Own-property JSON pointer with ~0/~1 escaping.
     * @returns {Array} The ordered records or values assembled above.
     */ pointer => [pointer, pointerValue(result, pointer)])),
    geometry: result.layout === null ? null : {
      points: result.layout.points.map(/**
       * Project point.id from the current record.
       * @responsibility computation
       * @param {Object} point - Positioned route point in drawing coordinates.
       * @returns {unknown} The point.id value selected or validated above.
       */ point => point.id),
      technical: result.layout.segments.filter(/**
       * Evaluate the selection condition segment.kind === "technical".
       * @responsibility computation
       * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
       * @returns {boolean} The result of the documented comparison or calculation.
       */ segment => segment.kind === "technical").map(/**
       * Project the current entry into an ordered tuple for result.layout.segments.filter(segment => segment.kind
       * === "technical").map.
       * @responsibility computation
       * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
       * @returns {Array} The ordered records or values assembled above.
       */ segment => [segment.element.id, segment.direction, segment.verticalDeltaMeters]),
      annotations: result.model.traversal.annotations.map(/**
       * Project the current entry into an ordered tuple for result.model.traversal.annotations.map.
       * @responsibility computation
       * @param {Object} input1 - Input record destructured into the separately documented members below.
       * @param {unknown} input1.elementIndex - Zero-based source element index.
       * @param {unknown} input1.pointIndex - Zero-based reached physical boundary index.
       * @returns {Array} The ordered records or values assembled above.
       */ ({ elementIndex, pointIndex }) => [result.model.elements[elementIndex].id, pointIndex]),
      endpoints: [result.layout.points[0]?.elevationMeters ?? null, result.layout.points.at(-1)?.elevationMeters ?? null]
    }
  };
}
