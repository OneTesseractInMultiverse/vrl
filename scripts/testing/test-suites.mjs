/** Every test file has one primary home; cross-layer regressions stay together. */
export const TEST_SUITES = {
  domain: ["domain-model", "element-identifiers", "known-fields", "numeric-integrity", "invariants-domain"],
  parsing: ["lexer", "document-grammar", "source-diagnostics", "invariants-parsing"],
  compilation: ["compiler-ports", "processing-limits", "public-contracts", "vrl"],
  layout: ["technical-segments", "route-boundaries", "invariants-layout"],
  serialization: ["anchor-counts", "renderer-configuration", "renderer-scene", "scene-fitting", "technical-annotations", "xml-text", "render-defaults", "invariants-serialization"],
  adapters: ["diagram-package", "diagram-state", "warning-presentation"],
  tooling: ["dependency-boundaries", "test-policy", "seeded-cases", "mutation-tooling", "consumer-lock"]
};

export function selectTestFiles(available, suite = "all", registry = TEST_SUITES) {
  const registered = Object.values(registry).flat().map(name => `tests/${name}.test.js`);
  const duplicates = registered.filter((file, index) => registered.indexOf(file) !== index);
  const missing = registered.filter(file => !available.includes(file));
  const unassigned = available.filter(file => !registered.includes(file));
  if (duplicates.length || missing.length || unassigned.length) {
    throw new Error(`Test suite inventory mismatch: ${JSON.stringify({ duplicates, missing, unassigned })}`);
  }
  if (suite === "all") return registered.sort();
  if (!Object.hasOwn(registry, suite)) throw new Error(`Unknown test suite: ${suite}`);
  return registry[suite].map(name => `tests/${name}.test.js`).sort();
}
