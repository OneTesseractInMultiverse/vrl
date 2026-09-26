import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { compileRoute } from "@subvertic/vrl-core";
import { readDocumentation } from "../scripts/documentation/documentation-files.mjs";
import { extractVrlExamples, exampleInventoryProblems } from "../scripts/documentation/markdown-examples.mjs";
import { sourceFingerprint, exampleSource, exampleFacts } from "../scripts/documentation/example-facts.mjs";
import { contractTable } from "../scripts/documentation/contract-tables.mjs";
import { ID_PREFIXES } from "../packages/vrl-core/src/domain/element-types.js";
import { fieldSpecification } from "../packages/vrl-core/src/domain/field-specifications.js";
import { MAX_DECIMAL_PLACES } from "../packages/vrl-core/src/domain/numeric-policy.js";
import { resolveProcessingLimits } from "../packages/vrl-core/src/domain/processing-limits.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const files = readDocumentation(root);
const examples = files.flatMap(/**
 * Apply extractVrlExamples to the supplied arguments; retain the callee's return and failure behavior.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {string} input1.file - Repository-relative source path used in discovery or diagnostics.
 * @param {string} input1.markdown - Repository Markdown text to inspect without executing its contents.
 * @returns {unknown} The result returned by extractVrlExamples.
 */ ({ file, markdown }) => extractVrlExamples(markdown, file));
const cases = JSON.parse(readFileSync(new URL("./fixtures/documentation-examples.json", import.meta.url), "utf8"));
const reference = files.find(/**
 * Evaluate the selection condition file === "docs/language-reference.md".
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {string} input1.file - Repository-relative source path used in discovery or diagnostics.
 * @returns {boolean} The result of the documented comparison or calculation.
 */ ({ file }) => file === "docs/language-reference.md").markdown;

test("every documented VRL example has exactly one complete, correctly classified expectation", /**
 * Verify every documented VRL example has exactly one complete, correctly classified expectation; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(exampleInventoryProblems(examples, cases), []);
});
for (const example of examples.filter(/**
 * Evaluate the selection condition Object.hasOwn(cases, example.id).
 * @responsibility computation
 * @param {Object} example - Extracted Markdown example with stable ID, kind and source.
 * @returns {unknown} The result returned by Object.hasOwn.
 */ example => Object.hasOwn(cases, example.id))) {
  const contract = cases[example.id];
  const location = `${example.file}:${example.line} (${example.id})`;
  test(`${location} source matches its reviewed contract`, /**
   * Verify ${location} source matches its reviewed contract; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(sourceFingerprint(example.source), contract.sha256, `Review changed source and expected facts before updating its fingerprint:\n${example.source}`);
  });
  test(`${location} produces the documented model, diagnostics and physical geometry`, /**
   * Verify ${location} produces the documented model, diagnostics and physical geometry; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(exampleSource(example, contract), contract.options);
    assert.deepEqual(exampleFacts(result, Object.keys(contract.expected.facts)), contract.expected);
  });
}

test("documented processing defaults agree with the domain-owned policy", /**
 * Verify documented processing defaults agree with the domain-owned policy; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(contractTable(reference, "processing-limits"), Object.entries(resolveProcessingLimits()).map(/**
   * Project the current entry into an ordered tuple for Object.entries(resolveProcessingLimits()).map.
   * @responsibility computation
   * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
   * @param {unknown} input1[0] - Tuple member bound as key: Own-property key, metadata key or configured loader result key.
   * @param {unknown} input1[1] - Tuple member bound as value: value paired with its own key.
   * @returns {Array} The ordered records or values assembled above.
   */ ([key, value]) => [key, String(value)]));
});
test("documented identifier prefixes agree with the supported element types", /**
 * Verify documented identifier prefixes agree with the supported element types; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(contractTable(reference, "id-prefixes"), Object.entries(ID_PREFIXES).map(/**
   * Project the current entry into an ordered tuple for Object.entries(ID_PREFIXES).map.
   * @responsibility computation
   * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
   * @param {unknown} input1[0] - Tuple member bound as type: Declared element or record discriminator.
   * @param {unknown} input1[1] - Tuple member bound as prefix: the ordered input consumed below.
   * @returns {Array} The ordered records or values assembled above.
   */ ([type, prefix]) => [`\`${type}\``, `\`${prefix}\``]));
});
test("documented enum contexts and vocabularies agree with their domain owner", /**
 * Verify documented enum contexts and vocabularies agree with their domain owner; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const fields = ["anchor", "shape", "station", "landing", "exposure", "flow", "type", "severity"];
  const rows = fields.map(/**
   * Format a known enum field's applicability and vocabulary as the normative table row expected by the
   * documentation assertion.
   * @responsibility computation
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {Array} The ordered records or values assembled above.
   */ name => {
    const specification = fieldSpecification(name);
    const scope = specification.applicability === "elements" ? "Every element" : specification.applicability.join(", ").replace(/^./, /**
     * Apply char.toUpperCase to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} char - Current source character being inspected.
     * @returns {unknown} The result returned by char.toUpperCase.
     */ char => char.toUpperCase());
    return [`\`${name}\``, scope, specification.values.map(/**
     * Format the current entry as the text required by specification.values.map, preserving supplied values.
     * @responsibility computation
     * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
     * @returns {string} Formatted text retaining the supplied values and ordering.
     */ value => `\`${value}\``).join(", ")];
  });
  assert.deepEqual(contractTable(reference, "field-vocabularies"), rows);
});
test("documented numeric ranges retain exact bounds and source precision", /**
 * Verify documented numeric ranges retain exact bounds and source precision; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const length = fieldSpecification("height").range;
  const elevation = fieldSpecification("entrance_elevation").range;
  const inclination = fieldSpecification("inclination").range;
  const count = fieldSpecification("anchor_count").range;
  assert.deepEqual(contractTable(reference, "numeric-ranges"), [
    ["`entrance_elevation`, `exit_elevation`", `From \`${elevation.minimum}m\` to \`${elevation.maximum}m\`, including zero`],
    ["`distance`, `height`, `rope`, `traverse`, `total_distance`, `total_descent`, `vertical_gain`, `descent`", `${length.exclusiveMinimum ? "Greater than" : "At least"} ${length.minimum === 0 ? "zero" : length.minimum}, up to \`${length.maximum}m\``],
    ["`inclination`", `${inclination.exclusiveMinimum ? "Greater than" : "At least"} \`${inclination.minimum}%\` and at most \`${inclination.maximum}%\`, with up to ${MAX_DECIMAL_PLACES} fractional digits; \`%\` may be omitted`],
    ["`anchor_count`", `Decimal integer from \`${count.minimum}\` to \`${count.maximum}\`, without leading zeros`],
    ["`stages`, `redirection`, `redirections`", "Each contained measurement follows the same magnitude, precision, and positive-length rules"]
  ]);
});
