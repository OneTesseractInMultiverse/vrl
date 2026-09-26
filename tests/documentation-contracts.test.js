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
const examples = files.flatMap(({ file, markdown }) => extractVrlExamples(markdown, file));
const cases = JSON.parse(readFileSync(new URL("./fixtures/documentation-examples.json", import.meta.url), "utf8"));
const reference = files.find(({ file }) => file === "docs/language-reference.md").markdown;

test("every documented VRL example has exactly one complete, correctly classified expectation", () => {
  assert.deepEqual(exampleInventoryProblems(examples, cases), []);
});
for (const example of examples.filter(example => Object.hasOwn(cases, example.id))) {
  const contract = cases[example.id];
  const location = `${example.file}:${example.line} (${example.id})`;
  test(`${location} source matches its reviewed contract`, () => {
    assert.equal(sourceFingerprint(example.source), contract.sha256, `Review changed source and expected facts before updating its fingerprint:\n${example.source}`);
  });
  test(`${location} produces the documented model, diagnostics and physical geometry`, () => {
    const result = compileRoute(exampleSource(example, contract), contract.options);
    assert.deepEqual(exampleFacts(result, Object.keys(contract.expected.facts)), contract.expected);
  });
}

test("documented processing defaults agree with the domain-owned policy", () => {
  assert.deepEqual(contractTable(reference, "processing-limits"), Object.entries(resolveProcessingLimits()).map(([key, value]) => [key, String(value)]));
});
test("documented identifier prefixes agree with the supported element types", () => {
  assert.deepEqual(contractTable(reference, "id-prefixes"), Object.entries(ID_PREFIXES).map(([type, prefix]) => [`\`${type}\``, `\`${prefix}\``]));
});
test("documented enum contexts and vocabularies agree with their domain owner", () => {
  const fields = ["anchor", "shape", "station", "landing", "exposure", "flow", "type", "severity"];
  const rows = fields.map(name => {
    const specification = fieldSpecification(name);
    const scope = specification.applicability === "elements" ? "Every element" : specification.applicability.join(", ").replace(/^./, char => char.toUpperCase());
    return [`\`${name}\``, scope, specification.values.map(value => `\`${value}\``).join(", ")];
  });
  assert.deepEqual(contractTable(reference, "field-vocabularies"), rows);
});
test("documented numeric ranges retain exact bounds and source precision", () => {
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
