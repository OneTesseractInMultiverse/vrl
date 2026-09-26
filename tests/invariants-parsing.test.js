import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute, createRouteCompiler } from "@subvertic/vrl-core";
import { malformedCases, routeCases, parseSeed, caseName } from "./helpers/seeded-cases.js";
import { BLOCKED, failureState } from "./helpers/invariant-observations.js";

const seed = parseSeed(process.env.VRL_TEST_SEED);
for (const item of malformedCases(seed)) {
  test(`malformed input blocks downstream: ${caseName(item)}`, () => {
    const calls = [];
    const compile = createRouteCompiler({ normalize: () => { calls.push("normalize"); return {}; }, validateGeometry: () => { calls.push("geometry"); return []; }, layout: () => { calls.push("layout"); return {}; }, exportJson: () => { calls.push("export"); return "{}"; } });
    const result = compile(item.source);
    const errors = result.diagnostics.filter(diagnostic => diagnostic.severity === "error").map(({ code }) => code);
    assert.deepEqual([failureState(result), errors, calls], [BLOCKED, [item.code], []], item.source);
  });
}

for (const item of routeCases(seed, 12)) {
  test(`whitespace and comments preserve semantic route facts: ${caseName(item)}`, () => {
    const decorated = item.plainSource.split("\n").map(line => `\t ${line} # outside quoted text`).join("\r\n");
    const project = result => ({ ...result.model, elements: result.model.elements.map(({ sourceLocation, ...element }) => element) });
    assert.deepEqual(project(compileRoute(decorated)), project(compileRoute(item.plainSource)), decorated);
  });
}
