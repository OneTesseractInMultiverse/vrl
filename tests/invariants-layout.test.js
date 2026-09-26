import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute, createRouteCompiler } from "@subvertic/vrl-core";
import { routeCases, parseSeed, caseName } from "./helpers/seeded-cases.js";
import { BLOCKED, failureState, progressionFacts } from "./helpers/invariant-observations.js";

for (const item of routeCases(parseSeed(process.env.VRL_TEST_SEED))) {
  test(`exact route endpoints and technical deltas: ${caseName(item)}`, () => {
    const result = compileRoute(item.source, item.options);
    assert.deepEqual([result.layout.points[0].elevationMeters, result.layout.points.at(-1).elevationMeters,
      result.layout.segments.filter(segment => segment.kind === "technical").map(segment => segment.end.elevationMeters - segment.start.elevationMeters)],
      [item.entrance, item.exit, item.events.map(event => event.delta)], item.source);
  });
  test(`annotations cannot move physical progression: ${caseName(item)}`, () => {
    assert.deepEqual(progressionFacts(compileRoute(item.source, item.options)), progressionFacts(compileRoute(item.plainSource, item.options)), item.source);
  });
  test(`supplied annotations survive model and layout: ${caseName(item)}`, () => {
    const result = compileRoute(item.source, item.options);
    const modelNotes = result.model.traversal.annotations.map(annotation => result.model.elements[annotation.elementIndex]).filter(element => element.type === "note");
    const layoutNotes = result.layout.nodes.filter(node => node.element.type === "note");
    assert.deepEqual([modelNotes.map(element => element.extensions.text), layoutNotes.map(node => node.element.extensions.text)], [item.notes, item.notes], item.source);
  });
}

for (const delta of [0, 0.000001, 100]) {
  test(`inconsistent endpoints block layout and export: ${delta}`, () => {
    const source = `route "Conflict"\nmetadata entrance_elevation=100m exit_elevation=${100 + delta}m\nrappel height=0.000001m rope=1m`;
    const calls = [];
    const compile = createRouteCompiler({ layout: () => { calls.push("layout"); return {}; }, exportJson: () => { calls.push("export"); return "{}"; } });
    const result = compile(source);
    assert.deepEqual([failureState(result), result.diagnostics.map(({ code, severity }) => [code, severity]), calls], [BLOCKED, [["VRL_GEOMETRY_ELEVATIONS_INCONSISTENT", "error"]], []], source);
  });
}
