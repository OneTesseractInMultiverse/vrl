import assert from "node:assert/strict";
import test from "node:test";
import { applyMutation, escapePattern, probeOutcome } from "../scripts/testing/mutations.mjs";

const mutation = { name: "fixture", before: "return true;", after: "return false;" };
test("a mutation changes exactly its reviewed target", () => {
  assert.equal(applyMutation('function value() { return true; }', mutation), 'function value() { return false; }');
});
for (const source of ["return false;", "return true; return true;"]) {
  test(`stale or ambiguous mutation targets fail: ${source}`, () => {
    assert.throws(() => applyMutation(source, mutation), /must occur exactly once/);
  });
}
test("test names are escaped before selecting a probe", () => {
  assert.equal(new RegExp(`^${escapePattern("finite (x) [y].")}$`).test("finite (x) [y]."), true);
});
const pass = "ok 1 - witness\n# tests 1\n# pass 1\n# fail 0\n";
const detection = "not ok 1 - witness\n  code: 'ERR_ASSERTION'\n# tests 1\n# pass 0\n# fail 1\n";
test("a passing unmodified witness is recognized", () => {
  assert.equal(probeOutcome({ status: 0, stdout: pass }, "witness"), "passed");
});
test("the intended failing assertion detects a fault", () => {
  assert.equal(probeOutcome({ status: 1, stdout: detection }, "witness"), "detected");
});
for (const [name, result] of [
  ["surviving mutant", { status: 0, stdout: pass }],
  ["missing test", { status: 0, stdout: "# tests 0\n# fail 0" }],
  ["import error", { status: 1, stdout: detection.replace("ERR_ASSERTION", "ERR_MODULE_NOT_FOUND") }],
  ["syntax error", { status: 1, stdout: "SyntaxError: invalid code" }],
  ["wrong witness", { status: 1, stdout: detection.replace("witness", "other test") }],
  ["timeout", { status: 1, stdout: detection, error: { code: "ETIMEDOUT" } }],
  ["signal", { status: null, stdout: detection, signal: "SIGTERM" }],
  ["multiple tests", { status: 1, stdout: detection.replace("# tests 1", "# tests 2") }]
]) {
  test(`${name} does not count as a detected fault`, () => {
    assert.equal(probeOutcome(result, "witness"), name === "surviving mutant" ? "passed" : "invalid");
  });
}
