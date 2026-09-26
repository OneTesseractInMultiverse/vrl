import assert from "node:assert/strict";
import test from "node:test";
import { applyMutation, escapePattern, probeOutcome } from "../scripts/testing/mutations.mjs";

const mutation = { name: "fixture", before: "return true;", after: "return false;" };
test("a mutation changes exactly its reviewed target", /**
 * Verify a mutation changes exactly its reviewed target; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(applyMutation('function value() { return true; }', mutation), 'function value() { return false; }');
});
for (const source of ["return false;", "return true; return true;"]) {
  test(`stale or ambiguous mutation targets fail: ${source}`, /**
   * Verify stale or ambiguous mutation targets fail: ${source}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise applyMutation so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by applyMutation.
     */ () => applyMutation(source, mutation), /must occur exactly once/);
  });
}
test("test names are escaped before selecting a probe", /**
 * Verify test names are escaped before selecting a probe; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(new RegExp(`^${escapePattern("finite (x) [y].")}$`).test("finite (x) [y]."), true);
});
const pass = "ok 1 - witness\n# tests 1\n# pass 1\n# fail 0\n";
const detection = "not ok 1 - witness\n  code: 'ERR_ASSERTION'\n# tests 1\n# pass 0\n# fail 1\n";
test("a passing unmodified witness is recognized", /**
 * Verify a passing unmodified witness is recognized; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(probeOutcome({ status: 0, stdout: pass }, "witness"), "passed");
});
test("the intended failing assertion detects a fault", /**
 * Verify the intended failing assertion detects a fault; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
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
  test(`${name} does not count as a detected fault`, /**
   * Verify ${name} does not count as a detected fault; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(probeOutcome(result, "witness"), name === "surviving mutant" ? "passed" : "invalid");
  });
}
