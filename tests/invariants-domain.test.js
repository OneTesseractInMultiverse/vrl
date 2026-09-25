import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute, createRouteCompiler } from "@subvertic/core";
import { routeCases, parseSeed, caseName } from "./helpers/seeded-cases.js";
import { nonfinitePaths, technicalFacts } from "./helpers/invariant-observations.js";

for (const item of routeCases(parseSeed(process.env.VRL_TEST_SEED))) {
  test(`unique identifiers: ${caseName(item)}`, () => {
    const result = compileRoute(item.source);
    const ids = result.model.elements.map(element => element.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    assert.deepEqual([duplicates, technicalFacts(result).map(([id]) => id), result.model.elements.find(element => element.type === "walk").id],
      [[], item.events.map(event => event.id), "R1"], item.source);
  });
  test(`technical event conservation: ${caseName(item)}`, () => {
    assert.deepEqual(technicalFacts(compileRoute(item.source)), item.events.map(event => [event.id, event.delta > 0 ? "up" : "down", event.delta]), item.source);
  });
  test(`finite public data and lossless JSON: ${caseName(item)}`, () => {
    const result = compileRoute(item.source, item.options);
    assert.deepEqual([result.ok, nonfinitePaths(result), JSON.parse(result.json)], [true, [], result.model], item.source);
  });
}

for (const value of [NaN, Infinity, -Infinity]) {
  test(`nonfinite custom layout blocks export: ${String(value)}`, () => {
    const calls = [];
    const compile = createRouteCompiler({ layout: () => ({ point: { x: value } }), exportJson: () => { calls.push("export"); return "{}"; } });
    let failure;
    try { compile('route "Boundary"'); } catch (error) { failure = error; }
    assert.deepEqual([failure?.name, failure?.message, calls], ["RangeError", "Layout.point.x must be finite with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.", []]);
  });
}

for (const meters of [0.000001, 1000000000]) {
  test(`supported source magnitude boundary: ${meters}`, () => {
    const source = `route "Boundary"\nrappel height=${meters.toFixed(6)}m rope=${meters.toFixed(6)}m`;
    const result = compileRoute(source);
    assert.deepEqual([result.ok, nonfinitePaths(result), result.model.elements[0].attributes.height.meters], [true, [], meters], source);
  });
}
