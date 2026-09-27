/** Every test file has one primary home; cross-layer regressions stay together. */
export const TEST_SUITES = {
  domain: ["domain-model", "element-identifiers", "known-fields", "numeric-integrity", "invariants-domain", "summary-semantics"],
  parsing: ["lexer", "document-grammar", "source-diagnostics", "invariants-parsing"],
  compilation: ["compiler-ports", "processing-limits", "public-contracts", "documentation-contracts", "documentation-assets", "vrl"],
  layout: ["technical-segments", "route-boundaries", "invariants-layout"],
  serialization: ["row-layout", "icons", "annotation-icons", "anchor-counts", "soft-terrain", "svg-identifiers", "renderer-configuration", "renderer-scene", "scene-fitting", "technical-annotations", "xml-text", "render-defaults", "invariants-serialization"],
  adapters: ["diagram-package", "diagram-state", "warning-presentation"],
  tooling: ["dependency-boundaries", "test-policy", "seeded-cases", "mutation-tooling", "consumer-lock", "documentation-tooling", "function-documentation", "release-tooling"]
};

/**
 * Validate a complete, duplicate-free test-suite inventory and return sorted paths for the requested suite.
 * @responsibility computation
 * @param {unknown} available - Discovered test paths to compare against the suite inventory.
 * @param {unknown} suite - Requested named test suite or all; defaults to "all".
 * @param {unknown} registry - Named suite-to-test inventory; defaults to the repository registry; defaults to TEST_SUITES.
 * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function selectTestFiles(available, suite = "all", registry = TEST_SUITES) {
  const registered = Object.values(registry).flat().map(/**
   * Format the current entry as the text required by Object.values(registry).flat().map, preserving supplied
   * values.
   * @responsibility computation
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ name => `tests/${name}.test.js`);
  const duplicates = registered.filter(/**
   * Evaluate the selection condition registered.indexOf(file) !== index.
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (file, index) => registered.indexOf(file) !== index);
  const missing = registered.filter(/**
   * Evaluate the selection condition !available.includes(file).
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ file => !available.includes(file));
  const unassigned = available.filter(/**
   * Evaluate the selection condition !registered.includes(file).
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ file => !registered.includes(file));
  if (duplicates.length || missing.length || unassigned.length) {
    throw new Error(`Test suite inventory mismatch: ${JSON.stringify({ duplicates, missing, unassigned })}`);
  }
  if (suite === "all") return registered.sort();
  if (!Object.hasOwn(registry, suite)) throw new Error(`Unknown test suite: ${suite}`);
  return registry[suite].map(/**
   * Format the current entry as the text required by registry.suite.map, preserving supplied values.
   * @responsibility computation
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ name => `tests/${name}.test.js`).sort();
}
