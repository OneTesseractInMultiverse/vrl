import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectFunctionDocumentation } from "../scripts/documentation/function-contracts.mjs";
import { readFunctionSources, svelteScripts, typeScriptDocumentationSource } from "../scripts/documentation/source-files.mjs";

/**
 * Construct a small independently specified documentation fixture for checker acceptance/failure tests.
 * @responsibility computation
 * @param {string} parameters - Exact parameter-tag text, including optional destructured paths.
 * @param {string} role - Responsibility vocabulary value deliberately varied by each case.
 * @returns {string} A complete JSDoc block ready to precede the fixture's function.
 */
function documentation(parameters = "", role = "computation") {
  return `/**\n * Compute the independently specified fixture result.\n * @responsibility ${role}\n${parameters} * @returns {number} The supplied fixture value.\n */\n`;
}

const parameter = " * @param {number} value - Numeric fixture value.\n";
const valid = documentation(parameter) + "export function identity(value) { return value; }";
const cases = [
  ["complete exported declaration", valid, []],
  ["missing JSDoc", "function missing() {}", ["missing function JSDoc"]],
  ["plain block is not JSDoc", "/* description */ function missing() {}", ["missing function JSDoc"]],
  ["unrelated earlier docblock", documentation() + "const other = 1; function missing() {}", ["missing function JSDoc"]],
  ["invalid role", valid.replace("@responsibility computation", "@responsibility mixed"), ["expected exactly one @responsibility coordinator or computation"]],
  ["duplicate role", valid.replace("@responsibility computation", "@responsibility computation\n * @responsibility coordinator"), ["expected exactly one @responsibility coordinator or computation"]],
  ["missing role", valid.replace(" * @responsibility computation\n", ""), ["expected exactly one @responsibility coordinator or computation"]],
  ["stale parameter", valid.replace("value -", "oldName -"), ["@param paths must match (value); found (oldName)"]],
  ["missing parameter", valid.replace(parameter, ""), ["@param paths must match (value); found ()"]],
  ["duplicate parameter", valid.replace(parameter, parameter + parameter), ["@param paths must match (value); found (value, value)"]],
  ["missing parameter type", valid.replace("@param {number}", "@param"), ["@param requires a type and description", "@param paths must match (value); found ()"]],
  ["missing parameter description", valid.replace("value - Numeric fixture value.", "value"), ["@param requires a name and description separated by ' - '", "@param paths must match (value); found ()"]],
  ["missing returns", valid.replace(" * @returns {number} The supplied fixture value.\n", ""), ["expected exactly one @returns contract"]],
  ["empty returns type", valid.replace("@returns {number}", "@returns {}"), ["@returns requires a type and description"]],
  ["empty returns description", valid.replace("{number} The supplied fixture value.", "{number}"), ["@returns requires a type and description"]],
  ["missing summary", valid.replace("Compute the independently specified fixture result.", ""), ["describe the function's responsibility before its tags"]],
  ["callback cannot inherit caller docs", documentation() + "function outer() { return [1].map(value => value); }", ["missing function JSDoc"]],
  ["variable arrow", documentation(parameter) + "const identity = value => value;", []],
  ["object method", "const object = {" + documentation(parameter) + "identity(value) { return value; }};", []],
  ["class method", "class Example {" + documentation(parameter) + "identity(value) { return value; }}", []],
  ["export default", documentation(parameter) + "export default function(value) { return value; }", []],
  ["returned closure", documentation() + "function make() {" + documentation(parameter) + "return value => value; }", []],
  ["type failure directive keeps adjacent documentation", documentation(parameter) + "// @ts-expect-error Intentional fixture failure.\nconst identity = value => value;", []],
  ["ordinary line comment interrupts documentation", documentation(parameter) + "// unrelated comment\nconst identity = value => value;", ["missing function JSDoc"]],
  ["default parameter", documentation(parameter.replace("value -", "[value=1] -")) + "function identity(value = 1) { return value; }", []],
  ["rest parameter", documentation(" * @param {number[]} values - Remaining fixture values.\n") + "const rest = (...values) => values;", []],
  ["nested destructuring and array holes", documentation(" * @param {Object} input1 - Fixture record.\n * @param {Object} input1.options - Nested settings.\n * @param {number} input1.options.size - Requested size.\n * @param {Array} input2 - Fixture tuple.\n * @param {number} input2[1] - Second tuple value.\n") + "function nested({ options: { size = 1 } }, [, value]) { return size + value; }", []],
  ["destructured alias uses public key", documentation(" * @param {Object} input1 - Fixture record.\n * @param {number} input1.original - Public input key.\n") + "function alias({original: renamed}) { return renamed; }", []],
  ["nested record type", documentation(parameter.replace("{number}", "{{ nested: { value: number } }}")) + "const record = value => value;", []],
  ["fake function inside text", "const text = 'function notCode() {}';", []]
];

for (const [name, source, expected] of cases) {
  test(`function documentation: ${name}`, /**
   * Compare the complete ordered diagnostic set against the independently specified case.
   * @responsibility coordinator
   * @returns {void} A single assertion succeeds or reports the checker contract mismatch.
   */ () => {
    const actual = inspectFunctionDocumentation(source, "fixture.js").violations.map(/**
     * Remove only the location prefix so parser line shifts do not weaken problem assertions.
     * @responsibility computation
     * @param {string} message - Located checker diagnostic.
     * @returns {string} Exact contract problem text.
     */ message => message.replace(/^fixture\.js:\d+: /, ""));
    assert.deepEqual(actual, expected);
  });
}

test("syntax failures cannot count as an empty successful inventory", /**
 * Require explicit parse-failure evidence rather than silently accepting unreadable source.
 * @responsibility coordinator
 * @returns {void} One assertion verifies the failed-parse report.
 */ () => {
  const result = inspectFunctionDocumentation("function (", "broken.js");
  assert.deepEqual([result.functions, result.violations.length, result.violations[0].startsWith("broken.js: Unexpected token")], [0, 1, true]);
});

test("Svelte discovery retains both script contexts and original line locations", /**
 * Verify module and instance scripts are both checked at their authored source lines.
 * @responsibility coordinator
 * @returns {void} One assertion compares all discovered function locations.
 */ () => {
  const units = svelteScripts('<script context="module">\nexport function shared() {}\n</script>\n<script>\nconst local = () => 1;\n</script>', "Fixture.svelte");
  assert.deepEqual(units.flatMap(/**
   * Inspect one extracted script unit and retain its complete located failure list.
   * @responsibility coordinator
   * @param {Object} unit - Padded extracted script with its original component path.
   * @returns {string[]} Documentation failures from this script.
   */ unit => inspectFunctionDocumentation(unit.source, unit.file).violations), ["Fixture.svelte:2: missing function JSDoc", "Fixture.svelte:5: missing function JSDoc"]);
});

test("Svelte template functions cannot evade the documentation gate", /**
 * Verify inline template callbacks fail with the actionable named-handler policy.
 * @responsibility coordinator
 * @returns {void} One assertion checks the expected rejection.
 */ () => {
  assert.throws(/**
   * Supply a template callback outside the documented script contexts.
   * @responsibility coordinator
   * @returns {never} Extraction must reject this unsupported handler location.
   */ () => svelteScripts('<button on:click={() => 1}>Action</button>', "Fixture.svelte"), /template functions must be documented named script handlers/);
});

test("source discovery includes new nested files and excludes dependencies and caches", /**
 * Exercise filesystem discovery against an isolated fixture instead of a fixed repository count.
 * @responsibility coordinator
 * @param {Object} t - Test context owning temporary-directory cleanup.
 * @returns {void} One assertion verifies the exact discovered inventory.
 */ t => {
  const root = mkdtempSync(join(tmpdir(), "vrl-function-docs-"));
  t.after(/**
   * Remove only this test's owned temporary directory after success or failure.
   * @responsibility coordinator
   * @returns {void} Cleanup completes or its filesystem error reaches the test runner.
   */ () => rmSync(root, { recursive: true, force: true }));
  for (const path of ["packages/new/deep", "scripts", "tests", "integration/consumer", "packages/new/node_modules", "scripts/.cache"]) mkdirSync(join(root, path), { recursive: true });
  for (const path of ["packages/new/deep/new.js", "scripts/check.mjs", "tests/case.js", "tests/typed.ts", "integration/consumer/View.svelte", "packages/new/node_modules/ignored.js", "scripts/.cache/ignored.js"]) writeFileSync(join(root, path), path.endsWith(".svelte") ? "<script>function local() {}</script>" : "function fixture() {}");
  assert.deepEqual(readFunctionSources(root).map(/**
   * Project repository-relative paths for deterministic discovery comparison.
   * @responsibility computation
   * @param {Object} unit - Discovered source unit.
   * @returns {string} Its repository-relative source path.
   */ unit => unit.file), ["packages/new/deep/new.js", "scripts/check.mjs", "tests/case.js", "tests/typed.ts", "integration/consumer/View.svelte"]);
});


test("TypeScript fixtures retain parameter names and documentation after erasure", /**
 * Verify type erasure leaves a typed implementation visible to the same exact-parameter checker.
 * @responsibility coordinator
 * @returns {void} One assertion compares function count and all documentation problems.
 */ () => {
  const source = documentation(parameter) + "export const identity = (value: number): number => value;";
  assert.deepEqual(inspectFunctionDocumentation(typeScriptDocumentationSource(source, "fixture.ts"), "fixture.ts"), { functions: 1, violations: [] });
});

test("public overloads each retain a separate documentation contract", /**
 * Require every exported declaration overload to be checked despite sharing one public name.
 * @responsibility coordinator
 * @returns {void} One assertion verifies both declaration contracts are discovered and accepted.
 */ () => {
  const source = documentation(parameter) + "export function identity(value: number): number;\n" + documentation(parameter) + "export function identity(value: string): string;";
  assert.deepEqual(inspectFunctionDocumentation(typeScriptDocumentationSource(source, "fixture.d.ts"), "fixture.d.ts"), { functions: 2, violations: [] });
});

test("missing public declaration docs fail after type erasure", /**
 * Prevent ambient exported functions from disappearing before their comments are checked.
 * @responsibility coordinator
 * @returns {void} One assertion requires the exact missing-contract error.
 */ () => {
  assert.deepEqual(inspectFunctionDocumentation(typeScriptDocumentationSource("export function missing(): void;", "fixture.d.ts"), "fixture.d.ts").violations, ["fixture.d.ts:1: missing function JSDoc"]);
});

for (const source of ["export declare function unsupported(): void;", "export function unsupported(\n value: number\n): number;"]) {
  test(`unsupported declaration formatting fails closed: ${source}`, /**
   * Reject a declaration format outside the documented convention instead of silently skipping it.
   * @responsibility coordinator
   * @returns {void} One assertion requires the supported-signature failure.
   */ () => {
    assert.throws(/**
     * Supply an unsupported ambient signature to the extraction boundary.
     * @responsibility coordinator
     * @returns {never} Extraction must throw before type erasure can hide the declaration.
     */ () => typeScriptDocumentationSource(source, "fixture.d.ts"), /single-line signature convention/);
  });
}
