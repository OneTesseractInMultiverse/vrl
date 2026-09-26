import { assertFiniteNumber } from "@subvertic/vrl-core";

/**
 * Interpolate finite numeric coordinates into fixed trusted SVG path commands before attribute encoding. Build
 * path data from fixed commands and numeric coordinates before encoding.
 * @responsibility computation
 * @param {TemplateStringsArray} parts - Fixed trusted SVG command strings from the tagged template.
 * @param {number[]} coordinates - Finite numeric substitutions for the trusted path commands.
 * @returns {string} SVG path data constructed from trusted commands and validated finite coordinates.
 */

export function scenePath(parts, ...coordinates) {
  coordinates.forEach(/**
   * Apply assertFiniteNumber to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {unknown} The result returned by assertFiniteNumber.
   */ (value) => assertFiniteNumber(value, "Scene path coordinate"));
  return parts.reduce(/**
   * Compute path + coordinates[index - 1] + part.
   * @responsibility computation
   * @param {string|null} path - Prepared SVG path data; optional leader paths may be null.
   * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (path, part, index) => path + coordinates[index - 1] + part);
}
