import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute, createRouteCompiler } from "@subvertic/vrl-core";
import { malformedCases, routeCases, parseSeed, caseName } from "./helpers/seeded-cases.js";
import { BLOCKED, failureState } from "./helpers/invariant-observations.js";

const seed = parseSeed(process.env.VRL_TEST_SEED);
for (const item of malformedCases(seed)) {
  test(`malformed input blocks downstream: ${caseName(item)}`, /**
   * Verify malformed input blocks downstream: ${caseName(item)}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const calls = [];
    const compile = createRouteCompiler({ /**
     * Supply the normalize test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing .
     */ normalize: () => { calls.push("normalize"); return {}; }, /**
      * Supply the validateGeometry test double and record its invocation in caller-owned fixture state; return
      * the scenario's deliberately selected value. No production I/O is performed by this fixture.
      * @responsibility computation
      * @returns {Array} The ordered records or values assembled above.
      */ validateGeometry: () => { calls.push("geometry"); return []; }, /**
      * Supply the layout test double and record its invocation in caller-owned fixture state; return the
      * scenario's deliberately selected value. No production I/O is performed by this fixture.
      * @responsibility computation
      * @returns {Object} A record containing .
      */ layout: () => { calls.push("layout"); return {}; }, /**
      * Supply the exportJson test double and record its invocation in caller-owned fixture state; return the
      * scenario's deliberately selected value. No production I/O is performed by this fixture.
      * @responsibility computation
      * @returns {string} The literal "{}" for this branch.
      */ exportJson: () => { calls.push("export"); return "{}"; } });
    const result = compile(item.source);
    const errors = result.diagnostics.filter(/**
     * Evaluate the selection condition diagnostic.severity === "error".
     * @responsibility computation
     * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ diagnostic => diagnostic.severity === "error").map(/**
      * Return the selected code binding unchanged.
      * @responsibility computation
      * @param {Object} input1 - Input record destructured into the separately documented members below.
      * @param {string} input1.code - Stable diagnostic identifier, or selected symbol code for presentation.
      * @returns {unknown} The code value selected or validated above.
      */ ({ code }) => code);
    assert.deepEqual([failureState(result), errors, calls], [BLOCKED, [item.code], []], item.source);
  });
}

for (const item of routeCases(seed, 12)) {
  test(`whitespace and comments preserve semantic route facts: ${caseName(item)}`, /**
   * Verify whitespace and comments preserve semantic route facts: ${caseName(item)}; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const decorated = item.plainSource.split("\n").map(/**
     * Format the current entry as the text required by item.plainSource.split("\n").map, preserving supplied
     * values.
     * @responsibility computation
     * @param {unknown} line - Physical source line or one-based line number, as used by the enclosing scanner.
     * @returns {string} Formatted text retaining the supplied values and ordering.
     */ line => `\t ${line} # outside quoted text`).join("\r\n");
    /**
     * Project existing fields, elements into the record required by project.
     * @responsibility computation
     * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
     * @returns {Object} A record containing the supplied fields, elements.
     */
    const project = result => ({ ...result.model, elements: result.model.elements.map(/**
     * Return the selected element binding unchanged.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {unknown} input1.sourceLocation - Optional one-based source position retained from parsing.
     * @param {Object} input1.element - Owning route element with its type, identity and declared attributes.
     * @returns {unknown} The element value selected or validated above.
     */ ({ sourceLocation, ...element }) => element) });
    assert.deepEqual(project(compileRoute(decorated)), project(compileRoute(item.plainSource)), decorated);
  });
}
