import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute, createRouteCompiler } from "@subvertic/vrl-core";
import { routeCases, parseSeed, caseName } from "./helpers/seeded-cases.js";
import { nonfinitePaths, technicalFacts } from "./helpers/invariant-observations.js";

for (const item of routeCases(parseSeed(process.env.VRL_TEST_SEED))) {
  test(`unique identifiers: ${caseName(item)}`, /**
   * Verify unique identifiers: ${caseName(item)}; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(item.source);
    const ids = result.model.elements.map(/**
     * Project element.id from the current record.
     * @responsibility computation
     * @param {Object} element - Owning route element with its type, identity and declared attributes.
     * @returns {unknown} The element.id value selected or validated above.
     */ element => element.id);
    const duplicates = ids.filter(/**
     * Evaluate the selection condition ids.indexOf(id) !== index.
     * @responsibility computation
     * @param {unknown} id - Explicit or already allocated route element identifier.
     * @param {number} index - Zero-based position in the current ordered collection.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ (id, index) => ids.indexOf(id) !== index);
    assert.deepEqual([duplicates, technicalFacts(result).map(/**
     * Return the selected id binding unchanged.
     * @responsibility computation
     * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
     * @param {unknown} input1[0] - Tuple member bound as id: the ordered input consumed below.
     * @returns {unknown} The id value selected or validated above.
     */ ([id]) => id), result.model.elements.find(/**
     * Evaluate the selection condition element.type === "walk".
     * @responsibility computation
     * @param {Object} element - Owning route element with its type, identity and declared attributes.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ element => element.type === "walk").id],
      [[], item.events.map(/**
       * Project event.id from the current record.
       * @responsibility computation
       * @param {unknown} event - SvelteKit request event or independently specified technical event.
       * @returns {unknown} The event.id value selected or validated above.
       */ event => event.id), "R1"], item.source);
  });
  test(`technical event conservation: ${caseName(item)}`, /**
   * Verify technical event conservation: ${caseName(item)}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(technicalFacts(compileRoute(item.source)), item.events.map(/**
     * Project the current entry into an ordered tuple for item.events.map.
     * @responsibility computation
     * @param {unknown} event - SvelteKit request event or independently specified technical event.
     * @returns {Array} The ordered records or values assembled above.
     */ event => [event.id, event.delta > 0 ? "up" : "down", event.delta]), item.source);
  });
  test(`finite public data and lossless JSON: ${caseName(item)}`, /**
   * Verify finite public data and lossless JSON: ${caseName(item)}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(item.source, item.options);
    assert.deepEqual([result.ok, nonfinitePaths(result), JSON.parse(result.json)], [true, [], result.model], item.source);
  });
}

for (const value of [NaN, Infinity, -Infinity]) {
  test(`nonfinite custom layout blocks export: ${String(value)}`, /**
   * Verify nonfinite custom layout blocks export: ${String(value)}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const calls = [];
    const compile = createRouteCompiler({ /**
     * Supply the layout test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing point.
     */ layout: () => ({ point: { x: value } }), /**
      * Supply the exportJson test double and record its invocation in caller-owned fixture state; return the
      * scenario's deliberately selected value. No production I/O is performed by this fixture.
      * @responsibility computation
      * @returns {string} The literal "{}" for this branch.
      */ exportJson: () => { calls.push("export"); return "{}"; } });
    let failure;
    try { compile('route "Boundary"'); } catch (error) { failure = error; }
    assert.deepEqual([failure?.name, failure?.message, calls], ["RangeError", "Layout.point.x must be finite with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.", []]);
  });
}

for (const meters of [0.000001, 1000000000]) {
  test(`supported source magnitude boundary: ${meters}`, /**
   * Verify supported source magnitude boundary: ${meters}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const source = `route "Boundary"\nrappel height=${meters.toFixed(6)}m rope=${meters.toFixed(6)}m`;
    const result = compileRoute(source);
    assert.deepEqual([result.ok, nonfinitePaths(result), result.model.elements[0].attributes.height.meters], [true, [], meters], source);
  });
}
