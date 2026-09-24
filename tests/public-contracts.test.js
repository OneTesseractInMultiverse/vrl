import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import * as core from "@subvertic/core";
import { renderTopoSvg } from "@subvertic/render-svg";
import { createDiagramState } from "@subvertic/diagram";

const readJson = (path) => JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8"));
const contract = readJson("../docs/contracts/v1.json");
const fixture = readJson("./fixtures/model-v1.json");

for (const [name, api] of Object.entries(contract.packages)) {
  const runtime = await import(name);
  const directory = `../packages/vrl-${name.slice("@subvertic/".length)}/`;
  const manifest = readJson(`${directory}package.json`);
  test(`${name} preserves every classified runtime export without duplicates`, () => {
    assert.deepEqual([...api.stable, ...api.advanced].sort(), Object.keys(runtime).sort());
  });
  test(`${name} declares exactly its existing runtime values`, () => {
    const declarations = readFileSync(new URL(`${directory}src/index.d.ts`, import.meta.url), "utf8");
    const values = [...new Set([...declarations.matchAll(/export (?:function|const) (\w+)/g)].map((match) => match[1]))].sort();
    assert.deepEqual(values, Object.keys(runtime).sort());
  });
  test(`${name} preserves runtime entry points and publishes type conditions first`, () => {
    const entries = [".", ...api.subpaths].map((entry) => [entry, Object.entries(manifest.exports[entry])]);
    const expected = [".", ...api.subpaths].map((entry) => [entry, [["types", entry === "." ? "./src/index.d.ts" : "./src/VrlDiagram.svelte.d.ts"], ["default", entry === "." ? "./src/index.js" : "./src/VrlDiagram.svelte"]]]);
    assert.deepEqual(entries, expected);
  });
}

test("revision 1 model JSON preserves typed facts, extension strings, ownership and provenance", () => {
  assert.deepEqual(JSON.parse(core.compileRoute(fixture.source).json), fixture.model);
});

test("a persisted revision 1 model can still produce a complete SVG through public facades", () => {
  const model = structuredClone(fixture.model);
  const svg = renderTopoSvg(model, core.computeVerticalLayout(model), { legend: false });
  assert.deepEqual([svg.startsWith('<svg '), svg.includes('pitch, 12m'), svg.includes('24m'), svg.includes('Check conditions'), svg.includes('Sample region')], [true, true, true, true, true]);
});

test("compiler failure retains diagnostics and exposes no derived outputs", () => {
  const result = core.compileRoute("route Contract\nrappel pitch height=12m");
  assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.map(({ code }) => code)], [false, null, null, null, ["VRL_FIELD_REQUIRED"]]);
});

test("diagram failure adds readable diagnostics and an empty SVG", () => {
  const state = createDiagramState("route Contract\nrappel pitch height=12m");
  assert.deepEqual([state.ok, state.svg, state.model, state.layout, state.json, state.diagnosticsText], [false, "", null, null, null, state.diagnostics.map(core.formatDiagnostic).join("\n")]);
});

test("source-only edits retain explicit identities but change provenance in JSON", () => {
  const original = core.compileRoute(fixture.source);
  const shifted = core.compileRoute(`# comment\n${fixture.source}`);
  const withoutLocations = (model) => model.elements.map(({ sourceLocation, ...element }) => element);
  assert.deepEqual([withoutLocations(shifted.model), shifted.json === original.json, shifted.model.elements[0].sourceLocation.line - original.model.elements[0].sourceLocation.line], [withoutLocations(original.model), false, 1]);
});

test("programmatic models omit absent provenance when serialized", () => {
  const ast = { name: "Contract", metadata: {}, elements: [{ type: "walk", attributes: { distance: "12m" } }] };
  const model = core.normalizeRoute(ast);
  assert.deepEqual([Object.hasOwn(model.elements[0], "sourceLocation"), model.elements[0].sourceLocation, Object.hasOwn(JSON.parse(core.exportRouteJson(model)).elements[0], "sourceLocation")], [true, undefined, false]);
});

test("generated identifiers are deterministic within a document, not persistent across insertion", () => {
  const before = core.compileRoute("route Contract\nwalk distance=12m").model;
  const after = core.compileRoute("route Contract\nwalk distance=1m\nwalk distance=12m").model;
  assert.deepEqual([before.elements[0].id, after.elements[1].id], ["W1", "W2"]);
});

test("normalized known facts reject malformed programmatic input instead of coercing it", () => {
  assert.throws(() => core.normalizeRoute({ name: "Contract", metadata: {}, elements: [{ type: "walk", attributes: { distance: 12 } }] }), TypeError);
});

test("layout numerical preconditions remain runtime failures even for correctly typed numbers", () => {
  assert.throws(() => core.computeVerticalLayout(fixture.model, { width: NaN }), RangeError);
});

test("advanced ports can substitute records without inheriting default geometry", () => {
  const ports = {
    parse: () => ({ ast: { name: "Alternate", metadata: {}, elements: [] }, diagnostics: [] }),
    validate: () => [], normalize: (ast) => ({ title: ast.name }), validateGeometry: () => [],
    layout: (model, options) => ({ text: model.title, spacing: options.spacing }), exportJson: (model) => model.title
  };
  const result = core.createRouteCompiler(ports)("custom syntax", { layout: { spacing: 7 } });
  assert.deepEqual([result.ok, result.model, result.layout, result.json], [true, { title: "Alternate" }, { text: "Alternate", spacing: 7 }, "Alternate"]);
});

test("port contract violations throw instead of masquerading as source diagnostics", () => {
  const compiler = core.createRouteCompiler({ normalize: async () => ({}) });
  assert.throws(() => compiler(fixture.source), { name: "TypeError", message: 'Compiler port "normalize" result must be a synchronous plain object.' });
});

test("adapter exceptions retain identity through the public facade", () => {
  const failure = new Error("Storage failure");
  const compiler = core.createRouteCompiler({ exportJson: () => { throw failure; } });
  assert.throws(() => compiler(fixture.source), (error) => error === failure);
});

test("source budget failures use the ordinary recovery AST even with custom parser records", () => {
  const compiler = core.createRouteCompiler({ parse: () => { throw new Error("Must not parse"); } });
  const result = compiler("too long", { limits: { maxSourceBytes: 1 } });
  assert.deepEqual(result.ast, core.createEmptyRoute("too long"));
});
