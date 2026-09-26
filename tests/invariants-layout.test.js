import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute, createRouteCompiler } from "@subvertic/vrl-core";
import { routeCases, parseSeed, caseName } from "./helpers/seeded-cases.js";
import { BLOCKED, failureState, progressionFacts } from "./helpers/invariant-observations.js";

for (const item of routeCases(parseSeed(process.env.VRL_TEST_SEED))) {
  test(`exact route endpoints and technical deltas: ${caseName(item)}`, /**
   * Verify exact route endpoints and technical deltas: ${caseName(item)}; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(item.source, item.options);
    assert.deepEqual([result.layout.points[0].elevationMeters, result.layout.points.at(-1).elevationMeters,
      result.layout.segments.filter(/**
       * Evaluate the selection condition segment.kind === "technical".
       * @responsibility computation
       * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
       * @returns {boolean} The result of the documented comparison or calculation.
       */ segment => segment.kind === "technical").map(/**
       * Compute segment.end.elevationMeters - segment.start.elevationMeters.
       * @responsibility computation
       * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
       * @returns {number} The result of the documented comparison or calculation.
       */ segment => segment.end.elevationMeters - segment.start.elevationMeters)],
      [item.entrance, item.exit, item.events.map(/**
       * Project event.delta from the current record.
       * @responsibility computation
       * @param {unknown} event - SvelteKit request event or independently specified technical event.
       * @returns {unknown} The event.delta value selected or validated above.
       */ event => event.delta)], item.source);
  });
  test(`annotations cannot move physical progression: ${caseName(item)}`, /**
   * Verify annotations cannot move physical progression: ${caseName(item)}; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(progressionFacts(compileRoute(item.source, item.options)), progressionFacts(compileRoute(item.plainSource, item.options)), item.source);
  });
  test(`supplied annotations survive model and layout: ${caseName(item)}`, /**
   * Verify supplied annotations survive model and layout: ${caseName(item)}; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(item.source, item.options);
    const modelNotes = result.model.traversal.annotations.map(/**
     * Project result.model.elements.annotation.elementIndex from the current record.
     * @responsibility computation
     * @param {unknown} annotation - Standalone note or hazard reference attached to its reached boundary.
     * @returns {unknown} The result.model.elements.annotation.elementIndex value selected or validated above.
     */ annotation => result.model.elements[annotation.elementIndex]).filter(/**
     * Evaluate the selection condition element.type === "note".
     * @responsibility computation
     * @param {Object} element - Owning route element with its type, identity and declared attributes.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ element => element.type === "note");
    const layoutNotes = result.layout.nodes.filter(/**
     * Evaluate the selection condition node.element.type === "note".
     * @responsibility computation
     * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ node => node.element.type === "note");
    assert.deepEqual([modelNotes.map(/**
     * Project element.extensions.text from the current record.
     * @responsibility computation
     * @param {Object} element - Owning route element with its type, identity and declared attributes.
     * @returns {unknown} The element.extensions.text value selected or validated above.
     */ element => element.extensions.text), layoutNotes.map(/**
     * Project node.element.extensions.text from the current record.
     * @responsibility computation
     * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
     * @returns {unknown} The node.element.extensions.text value selected or validated above.
     */ node => node.element.extensions.text)], [item.notes, item.notes], item.source);
  });
}

for (const delta of [0, 0.000001, 100]) {
  test(`inconsistent endpoints block layout and export: ${delta}`, /**
   * Verify inconsistent endpoints block layout and export: ${delta}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const source = `route "Conflict"\nmetadata entrance_elevation=100m exit_elevation=${100 + delta}m\nrappel height=0.000001m rope=1m`;
    const calls = [];
    const compile = createRouteCompiler({ /**
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
    const result = compile(source);
    assert.deepEqual([failureState(result), result.diagnostics.map(/**
     * Project the current entry into an ordered tuple for result.diagnostics.map.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {string} input1.code - Stable diagnostic identifier, or selected symbol code for presentation.
     * @param {string} input1.severity - Diagnostic severity, error or warning.
     * @returns {Array} The ordered records or values assembled above.
     */ ({ code, severity }) => [code, severity]), calls], [BLOCKED, [["VRL_GEOMETRY_ELEVATIONS_INCONSISTENT", "error"]], []], source);
  });
}
