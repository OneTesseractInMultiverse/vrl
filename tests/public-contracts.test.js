import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as core from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";

/**
 * Apply JSON.parse to the supplied arguments; retain the callee's return and failure behavior.
 * @responsibility computation
 * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
 * @returns {unknown} The result returned by JSON.parse.
 */
const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const contract = readJson("../docs/contracts/v4.json");
const fixture = readJson("./fixtures/model-v1.json");

for (const [name, api] of Object.entries(contract.packages)) {
  const runtime = await import(name);
  const directory = `../packages/${name.slice("@subvertic/".length)}/`;
  const manifest = readJson(`${directory}package.json`);
  test(`${name} preserves every classified runtime export without duplicates`, /**
   * Verify ${name} preserves every classified runtime export without duplicates; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual([...api.stable, ...api.advanced].sort(), Object.keys(runtime).sort());
  });
  test(`${name} declares exactly its existing runtime values`, /**
   * Verify ${name} declares exactly its existing runtime values; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const declarations = readFileSync(new URL(`${directory}src/index.d.ts`, import.meta.url), "utf8");
    const values = [...new Set([...declarations.matchAll(/export (?:function|const) (\w+)/g)].map(/**
     * Project match.1 from the current record.
     * @responsibility computation
     * @param {unknown} match - Regular-expression match including the capture groups consumed below.
     * @returns {unknown} The match.1 value selected or validated above.
     */ (match) => match[1]))].sort();
    assert.deepEqual(values, Object.keys(runtime).sort());
  });
  test(`${name} preserves runtime entry points and publishes type conditions first`, /**
   * Verify ${name} preserves runtime entry points and publishes type conditions first; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const entries = [".", ...api.subpaths].map(/**
     * Project the current entry into an ordered tuple for [".", ...api.subpaths].map.
     * @responsibility computation
     * @param {unknown} entry - Current collection entry before projection or validation.
     * @returns {Array} The ordered records or values assembled above.
     */ (entry) => [entry, Object.entries(manifest.exports[entry])]);
    const expected = [".", ...api.subpaths].map(/**
     * Project the current entry into an ordered tuple for [".", ...api.subpaths].map.
     * @responsibility computation
     * @param {unknown} entry - Current collection entry before projection or validation.
     * @returns {Array} The ordered records or values assembled above.
     */ (entry) => [entry, [["types", entry === "." ? "./src/index.d.ts" : "./src/VrlDiagram.svelte.d.ts"], ["default", entry === "." ? "./src/index.js" : "./src/VrlDiagram.svelte"]]]);
    assert.deepEqual(entries, expected);
  });
}

test("revision 1 model JSON preserves typed facts, extension strings, ownership and provenance", /**
 * Verify revision 1 model JSON preserves typed facts, extension strings, ownership and provenance; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(JSON.parse(core.compileRoute(fixture.source).json), fixture.model);
});

test("a persisted revision 1 model can still produce a complete SVG through public facades", /**
 * Verify a persisted revision 1 model can still produce a complete SVG through public facades; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = structuredClone(fixture.model);
  const svg = renderTopoSvg(model, core.computeVerticalLayout(model), { legend: false });
  assert.deepEqual([svg.startsWith('<svg '), svg.includes('pitch, 12m'), svg.includes('24m'), svg.includes('Check conditions'), svg.includes('Sample region')], [true, true, true, true, true]);
});

test("revision 2 unknown-rope JSON remains unchanged after unknown-height support", /**
 * Compare current compilation with a saved model produced by the pinned revision-2 implementation.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of every persisted field, technical owner and declaration.
 */ () => {
  const previous = readJson("./fixtures/model-v2.json");
  assert.deepEqual(JSON.parse(core.compileRoute(previous.source).json), previous.model);
});

test("a persisted revision 2 model retains unknown rope and positioned details in SVG", /**
 * Render the saved revision-2 artifact without recompilation and check independently selected visible facts.
 * @responsibility coordinator
 * @returns {void} Completes one assertion of uncertainty, measured height, stages and annotation retention.
 */ () => {
  const model = readJson("./fixtures/model-v2.json").model;
  const svg = renderTopoSvg(model, core.computeVerticalLayout(model), { legend: false });
  assert.deepEqual([svg.includes("R1, 12m"), svg.includes("declared rope: unknown"), svg.includes("5m"), svg.includes("7m"), svg.includes("Lower station")], [true,true,true,true,true]);
});

test("compiler failure retains diagnostics and exposes no derived outputs", /**
 * Verify compiler failure retains diagnostics and exposes no derived outputs; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute("route Contract\nrappel pitch height=12m");
  assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.map(/**
   * Return the selected code binding unchanged.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {string} input1.code - Stable diagnostic identifier, or selected symbol code for presentation.
   * @returns {unknown} The code value selected or validated above.
   */ ({ code }) => code)], [false, null, null, null, ["VRL_FIELD_REQUIRED"]]);
});

test("diagram failure adds readable diagnostics and an empty SVG", /**
 * Verify diagram failure adds readable diagnostics and an empty SVG; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const state = createDiagramState("route Contract\nrappel pitch height=12m");
  assert.deepEqual([state.ok, state.svg, state.model, state.layout, state.json, state.diagnosticsText], [false, "", null, null, null, state.diagnostics.map(core.formatDiagnostic).join("\n")]);
});

test("source-only edits retain explicit identities but change provenance in JSON", /**
 * Verify source-only edits retain explicit identities but change provenance in JSON; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const original = core.compileRoute(fixture.source);
  const shifted = core.compileRoute(`# comment\n${fixture.source}`);
  /**
   * Apply model.elements.map to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object} model - Normalized route data with typed attributes, traversal and summary.
   * @returns {Array} The result returned by model.elements.map.
   */
  const withoutLocations = (model) => model.elements.map(/**
   * Return the selected element binding unchanged.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.sourceLocation - Optional one-based source position retained from parsing.
   * @param {Object} input1.element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The element value selected or validated above.
   */ ({ sourceLocation, ...element }) => element);
  assert.deepEqual([withoutLocations(shifted.model), shifted.json === original.json, shifted.model.elements[0].sourceLocation.line - original.model.elements[0].sourceLocation.line], [withoutLocations(original.model), false, 1]);
});

test("programmatic models omit absent provenance when serialized", /**
 * Verify programmatic models omit absent provenance when serialized; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const ast = { name: "Contract", metadata: {}, elements: [{ type: "walk", attributes: { distance: "12m" } }] };
  const model = core.normalizeRoute(ast);
  assert.deepEqual([Object.hasOwn(model.elements[0], "sourceLocation"), model.elements[0].sourceLocation, Object.hasOwn(JSON.parse(core.exportRouteJson(model)).elements[0], "sourceLocation")], [true, undefined, false]);
});

test("generated identifiers are deterministic within a document, not persistent across insertion", /**
 * Verify generated identifiers are deterministic within a document, not persistent across insertion; arrange
 * the scenario and make its single direct assertion. Assertion and setup failures propagate to the test
 * runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const before = core.compileRoute("route Contract\nwalk distance=12m").model;
  const after = core.compileRoute("route Contract\nwalk distance=1m\nwalk distance=12m").model;
  assert.deepEqual([before.elements[0].id, after.elements[1].id], ["W1", "W2"]);
});

test("normalized known facts reject malformed programmatic input instead of coercing it", /**
 * Verify normalized known facts reject malformed programmatic input instead of coercing it; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.normalizeRoute so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.normalizeRoute.
   */ () => core.normalizeRoute({ name: "Contract", metadata: {}, elements: [{ type: "walk", attributes: { distance: 12 } }] }), TypeError);
});

test("layout numerical preconditions remain runtime failures even for correctly typed numbers", /**
 * Verify layout numerical preconditions remain runtime failures even for correctly typed numbers; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.computeVerticalLayout so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.computeVerticalLayout.
   */ () => core.computeVerticalLayout(fixture.model, { width: NaN }), RangeError);
});

test("advanced ports can substitute records without inheriting default geometry", /**
 * Verify advanced ports can substitute records without inheriting default geometry; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const ports = {
    /**
     * Supply the parse test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing ast, diagnostics.
     */
    parse: () => ({ ast: { name: "Alternate", metadata: {}, elements: [] }, diagnostics: [] }),
    /**
     * Supply the validate test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Array} The ordered records or values assembled above.
     */
    validate: () => [], /**
     * Supply the normalize test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @param {Object} ast - Unvalidated route syntax record with raw string metadata and elements.
     * @returns {Object} A record containing title.
     */ normalize: (ast) => ({ title: ast.name }), /**
      * Supply the validateGeometry test double; return the scenario's deliberately selected value. No production
      * I/O is performed by this fixture.
      * @responsibility computation
      * @returns {Array} The ordered records or values assembled above.
      */ validateGeometry: () => [],
    /**
     * Supply the layout test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @param {Object} model - Normalized route data with typed attributes, traversal and summary.
     * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Values are forwarded to the owning compiler/render or framework boundary.
     * @returns {Object} A record containing text, spacing.
     */
    layout: (model, options) => ({ text: model.title, spacing: options.spacing }), /**
     * Supply the exportJson test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @param {Object} model - Normalized route data with typed attributes, traversal and summary.
     * @returns {unknown} The model.title value selected or validated above.
     */ exportJson: (model) => model.title
  };
  const result = core.createRouteCompiler(ports)("custom syntax", { layout: { spacing: 7 } });
  assert.deepEqual([result.ok, result.model, result.layout, result.json], [true, { title: "Alternate" }, { text: "Alternate", spacing: 7 }, "Alternate"]);
});

test("port contract violations throw instead of masquerading as source diagnostics", /**
 * Verify port contract violations throw instead of masquerading as source diagnostics; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compiler = core.createRouteCompiler({ /**
   * Supply the normalize test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Promise<Object>} Resolves with a record containing . Rejects when the awaited operation fails.
   */ normalize: async () => ({}) });
  assert.throws(/**
   * Exercise compiler so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by compiler.
   */ () => compiler(fixture.source), { name: "TypeError", message: 'Compiler port "normalize" result must be a synchronous plain object.' });
});

test("adapter exceptions retain identity through the public facade", /**
 * Verify adapter exceptions retain identity through the public facade; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const failure = new Error("Storage failure");
  const compiler = core.createRouteCompiler({ /**
   * Supply the exportJson test double; throw the selected failure so its propagation or forbidden invocation
   * is observable. No production I/O is performed by this fixture.
   * @responsibility computation
   * @returns {never} Does not return normally; throws the failure being checked.
   * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
   */ exportJson: () => { throw failure; } });
  assert.throws(/**
   * Exercise compiler so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by compiler.
   */ () => compiler(fixture.source), /**
   * Exercise the failing operation so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @param {unknown} error - Failure propagated by the observed operation.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (error) => error === failure);
});

test("source budget failures use the ordinary recovery AST even with custom parser records", /**
 * Verify source budget failures use the ordinary recovery AST even with custom parser records; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compiler = core.createRouteCompiler({ /**
   * Supply the parse test double; throw the selected failure so its propagation or forbidden invocation is
   * observable. No production I/O is performed by this fixture.
   * @responsibility computation
   * @returns {never} Does not return normally; throws the failure being checked.
   * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
   */ parse: () => { throw new Error("Must not parse"); } });
  const result = compiler("too long", { limits: { maxSourceBytes: 1 } });
  assert.deepEqual(result.ast, core.createEmptyRoute("too long"));
});
