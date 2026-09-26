import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { testSources } from "../scripts/testing/test-files.mjs";
import { inspectTestPolicy } from "../scripts/testing/test-policy.mjs";
import { selectTestFiles } from "../scripts/testing/test-suites.mjs";

const imports = 'import test from "node:test"; import assert from "node:assert/strict";';
for (const body of ['assert.equal(1, 1);', 'await assert.rejects(Promise.reject(new Error()));', 'const text = "assert.ok(false)"; /* assert.fail() */ assert.equal(text.length, 16);']) {
  test(`single direct assertion is accepted: ${body}`, () => {
    assert.deepEqual(inspectTestPolicy(`${imports} test("case", async () => { ${body} });`, "case.test.js"), { tests: 1, violations: [] });
  });
}
for (const [body, count] of [['', 0], ['assert.ok(true); assert.ok(true);', 2], ['assert.throws(() => assert.fail());', 2]]) {
  test(`assertion count violation is detected: ${count}`, () => {
    assert.match(inspectTestPolicy(`${imports} test("case", () => { ${body} });`, "case.test.js").violations[0], new RegExp(`expected exactly one assertion, found ${count}`));
  });
}
for (const body of ['if (false) assert.ok(true);', 'for (const item of []) assert.ok(item);', 'const helper = () => assert.ok(true); helper();']) {
  test(`conditional or delegated assertions are rejected: ${body}`, () => {
    assert.match(inspectTestPolicy(`${imports} test("case", () => { ${body} });`, "case.test.js").violations[0], /must be a direct test-body expression/);
  });
}
test("inline expression callbacks and aliased imports are supported", () => {
  assert.deepEqual(inspectTestPolicy('import {test as check} from "node:test"; import {equal as same} from "node:assert/strict"; check("a", () => same(1, 1));', "case.test.js").violations, []);
});
test("namespace imports and test modifiers cannot hide extra assertions", () => {
  assert.match(inspectTestPolicy('import * as runner from "node:test"; import * as check from "node:assert/strict"; runner.test("a", () => { check.equal(1, 1); check.ok(true); });', "case.test.js").violations[0], /found 2/);
});
test("modified registrations still require one direct assertion", () => {
  assert.match(inspectTestPolicy(`${imports} test.skip("a", () => {});`, "case.test.js").violations[0], /found 0/);
});
test("assertions hidden in helpers outside tests are rejected", () => {
  assert.match(inspectTestPolicy(`${imports} function helper() { assert.ok(true); }`, "helper.js").violations[0], /assertion outside a test/);
});
test("an imported test callback cannot bypass inspection", () => {
  assert.match(inspectTestPolicy(`${imports} test("case", helper);`, "case.test.js").violations[0], /callback must be inline/);
});
test("an empty test file cannot silently pass inspection", () => {
  assert.match(inspectTestPolicy(imports, "case.test.js").violations[0], /no supported node:test registrations/);
});
test("invalid JavaScript produces a policy error", () => {
  assert.match(inspectTestPolicy('test(', "case.test.js").violations[0], /Unexpected token/);
});
test("a suite selects only its registered files", () => {
  assert.deepEqual(selectTestFiles(["tests/a.test.js", "tests/b.test.js"], "domain", { domain: ["a"], parsing: ["b"] }), ["tests/a.test.js"]);
});
for (const [name, available, registry, details] of [
  ["missing", [], { domain: ["a"] }, { duplicates: [], missing: ["tests/a.test.js"], unassigned: [] }],
  ["unassigned", ["tests/a.test.js"], { domain: [] }, { duplicates: [], missing: [], unassigned: ["tests/a.test.js"] }],
  ["duplicate", ["tests/a.test.js"], { domain: ["a"], parsing: ["a"] }, { duplicates: ["tests/a.test.js"], missing: [], unassigned: [] }]
]) {
  test(`suite inventory rejects ${name} tests`, () => {
    assert.throws(() => selectTestFiles(available, "all", registry), { name: "Error", message: `Test suite inventory mismatch: ${JSON.stringify(details)}` });
  });
}
test("unknown suite names fail instead of running zero tests", () => {
  assert.throws(() => selectTestFiles(["tests/a.test.js"], "constructor", { domain: ["a"] }), /Unknown test suite/);
});

test("an empty consumer test module cannot silently pass inspection", () => {
  assert.match(inspectTestPolicy(imports, "consumer.test.mjs").violations[0], /no supported node:test registrations/);
});

test("consumer test discovery includes modules and excludes non-JavaScript assets", t => {
  const root = mkdtempSync(join(tmpdir(), "vrl-test-policy-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const name of ["browser.test.mjs", "fixture.js", "index.html"]) writeFileSync(join(root, name), "");
  assert.deepEqual(testSources(root, root), ["browser.test.mjs", "fixture.js"]);
});
