import assert from "node:assert/strict";
import test from "node:test";
import * as core from "@subvertic/vrl-core";
import { compileRouteWithPorts } from "../packages/vrl-core/src/application/compile-route.js";

const NAMES = ["parse", "validate", "normalize", "validateGeometry", "layout", "exportJson"];
const SOURCE = '{"name":"Alternate syntax"}';
const NOTICE = { kind: "custom", severity: "warning", message: "Advisory", location: { line: 1, column: 1 } };
const ERROR = { ...NOTICE, severity: "error", message: "Rejected" };

function fixture(overrides = {}) {
  const calls = [];
  const ast = { name: "Alternate syntax", metadata: {}, elements: [], sourceMap: { route: null, metadata: [], elements: [] } };
  const model = { title: "Alternate syntax", count: 0 };
  const layout = { rows: ["Alternate syntax"] };
  const implementations = {
    parse: (source) => ({ ast: { ...ast, name: JSON.parse(source).name }, diagnostics: [] }),
    validate: () => [],
    normalize: (parsed) => ({ ...model, title: parsed.name }),
    validateGeometry: () => [],
    layout: (normalized) => ({ rows: [normalized.title] }),
    exportJson: (normalized) => JSON.stringify(normalized),
    ...overrides
  };
  const ports = Object.fromEntries(NAMES.map((name) => [name, (...args) => { calls.push({ name, args }); return implementations[name](...args); }]));
  return { ports, calls, ast, model, layout };
}

function capture(action) {
  try { return { result: action() }; } catch (error) { return { error }; }
}

test("alternate adapters compose through the coordinator without concrete defaults", () => {
  const { ports, ast, model, layout } = fixture();
  assert.deepEqual(compileRouteWithPorts(SOURCE, {}, ports), { ok: true, ast, diagnostics: [], model, layout, json: '{"title":"Alternate syntax","count":0}' });
});

test("ports run in order with the preceding results and the correct options", () => {
  const { ports, calls } = fixture();
  const options = { limits: { maxSourceBytes: 100 }, layout: { customSpacing: 7 } };
  const result = core.createRouteCompiler(ports)(SOURCE, options);
  assert.deepEqual({ order: calls.map(({ name }) => name), source: calls[0].args[0], limit: calls[0].args[1].limits.maxSourceBytes, frozenLimits: Object.isFrozen(calls[0].args[1].limits), sameInputs: [calls[1].args[0] === result.ast, calls[2].args[0] === result.ast, calls[3].args[0] === result.model, calls[3].args[1] === result.ast.sourceMap, calls[4].args[0] === result.model, calls[4].args[1] === options.layout, calls[5].args[0] === result.model] }, { order: NAMES, source: SOURCE, limit: 100, frozenLimits: true, sameInputs: Array(7).fill(true) });
});

test("warnings from each stage preserve order and adapter-owned arrays", () => {
  const syntax = [{ ...NOTICE, message: "parse" }];
  const semantic = [{ ...NOTICE, message: "validate" }];
  const geometry = [{ ...NOTICE, message: "geometry" }];
  const { ports, ast } = fixture();
  const compile = core.createRouteCompiler({ ...ports, parse: () => ({ ast, diagnostics: syntax }), validate: () => semantic, validateGeometry: () => geometry });
  const result = compile(SOURCE);
  assert.deepEqual([result.ok, result.diagnostics.map(({ message }) => message), syntax, semantic, geometry], [true, ["parse", "validate", "geometry"], [{ ...NOTICE, message: "parse" }], [{ ...NOTICE, message: "validate" }], [{ ...NOTICE, message: "geometry" }]]);
});

for (const [stage, expectedCalls] of [["parse", ["parse", "validate"]], ["validate", ["parse", "validate"]], ["validateGeometry", ["parse", "validate", "normalize", "validateGeometry"]]]) {
  test(`blocking ${stage} diagnostics suppress all subsequent output stages`, () => {
    const { ast } = fixture();
    const { ports, calls } = fixture({ [stage]: () => stage === "parse" ? { ast, diagnostics: [ERROR] } : [ERROR] });
    const result = core.createRouteCompiler(ports)(SOURCE);
    assert.deepEqual([result.ok, result.diagnostics, result.model, result.layout, result.json, calls.map(({ name }) => name)], [false, [ERROR], null, null, null, expectedCalls]);
  });
}

test("blocking parser budgets suppress even semantic validation", () => {
  const { ast } = fixture();
  const { ports, calls } = fixture({ parse: () => ({ ast, diagnostics: [{ ...ERROR, kind: "limit" }] }) });
  const result = core.createRouteCompiler(ports)(SOURCE);
  assert.deepEqual([result.ok, calls.map(({ name }) => name)], [false, ["parse"]]);
});

test("source preflight rejects excess input before any alternate adapter runs", () => {
  const { ports, calls } = fixture();
  const result = core.createRouteCompiler(ports)(SOURCE, { limits: { maxSourceBytes: 1 } });
  assert.deepEqual([result.ok, result.diagnostics[0].code, calls], [false, "VRL_LIMIT_MAX_SOURCE_BYTES", []]);
});

for (const port of NAMES) {
  test(`${port} exceptions propagate by identity and stop later calls`, () => {
    const failure = new Error("Adapter failed");
    const { ports, calls } = fixture({ [port]: () => { throw failure; } });
    const outcome = capture(() => core.createRouteCompiler(ports)(SOURCE));
    assert.deepEqual([outcome.error === failure, calls.map(({ name }) => name)], [true, NAMES.slice(0, NAMES.indexOf(port) + 1)]);
  });
  test(`${port} rejects asynchronous results before the next port`, () => {
    const { ports, calls } = fixture({ [port]: () => Promise.resolve({}) });
    const outcome = capture(() => core.createRouteCompiler(ports)(SOURCE));
    assert.deepEqual([outcome.error instanceof TypeError, outcome.error.message.includes(port), calls.map(({ name }) => name)], [true, true, NAMES.slice(0, NAMES.indexOf(port) + 1)]);
  });
  test(`${port} must be a function when configuring a compiler`, () => {
    assert.throws(() => core.createRouteCompiler({ [port]: 123 }), { name: "TypeError", message: `Compiler port "${port}" must be a function.` });
  });
}

for (const [name, value] of [["null", null], ["number", 1], ["array", []], ["date", new Date(0)], ["thenable", { then() {} }]]) {
  test(`compiler configuration rejects ${name}`, () => {
    assert.throws(() => core.createRouteCompiler(value), TypeError);
  });
  for (const port of ["parse", "normalize", "layout"]) {
    test(`${port} rejects a ${name} record result without running later stages`, () => {
      const { ports, calls } = fixture({ [port]: () => value });
      const outcome = capture(() => core.createRouteCompiler(ports)(SOURCE));
      assert.deepEqual([outcome.error instanceof TypeError, outcome.error.message.includes(port), calls.map(({ name }) => name)], [true, true, NAMES.slice(0, NAMES.indexOf(port) + 1)]);
    });
  }
}

for (const [name, parsed] of [
  ["missing AST", { diagnostics: [] }],
  ["missing metadata", { ast: { elements: [] }, diagnostics: [] }],
  ["non-array elements", { ast: { metadata: {}, elements: {} }, diagnostics: [] }],
  ["sparse elements", { ast: { metadata: {}, elements: Array(1) }, diagnostics: [] }],
  ["missing attributes", { ast: { metadata: {}, elements: [{}] }, diagnostics: [] }],
  ["missing diagnostics", { ast: { metadata: {}, elements: [] } }]
]) {
  test(`parse rejects ${name} before validation`, () => {
    const { ports, calls } = fixture({ parse: () => parsed });
    const outcome = capture(() => core.createRouteCompiler(ports)(SOURCE));
    assert.deepEqual([outcome.error instanceof TypeError, calls.map(({ name }) => name)], [true, ["parse"]]);
  });
}

for (const [name, diagnostics] of [
  ["record", {}], ["null", null], ["thenable array", Object.assign([], { then() {} })],
  ["sparse array", Array(1)], ["null item", [null]],
  ["missing kind", [{ ...NOTICE, kind: undefined }]],
  ["missing message", [{ ...NOTICE, message: undefined }]],
  ["unknown severity", [{ ...NOTICE, severity: "fatal" }]],
  ...[undefined, null, 1, {}, { line: 0, column: 1 }, { line: 1.5, column: 1 }, { line: 1, column: 0 }, { line: 1, column: 1.5 }].map((location) => [JSON.stringify(location), [{ ...NOTICE, location }]])
]) {
  for (const port of ["parse", "validate", "validateGeometry"]) {
    test(`${port} rejects malformed diagnostics: ${name}`, () => {
      const { ast } = fixture();
      const { ports, calls } = fixture({ [port]: () => port === "parse" ? { ast, diagnostics } : diagnostics });
      const outcome = capture(() => core.createRouteCompiler(ports)(SOURCE));
      assert.deepEqual([outcome.error instanceof TypeError, outcome.error.message.includes(port), calls.map(({ name }) => name)], [true, true, NAMES.slice(0, NAMES.indexOf(port) + 1)]);
    });
  }
}

for (const value of [undefined, null, 123, {}, []]) {
  test(`exportJson rejects non-string ${JSON.stringify(value)}`, () => {
    const { ports } = fixture({ exportJson: () => value });
    assert.throws(() => core.createRouteCompiler(ports)(SOURCE), { name: "TypeError", message: 'Compiler port "exportJson" must return a string synchronously.' });
  });
}

test("null-prototype records are supported at compiler boundaries", () => {
  const ast = Object.assign(Object.create(null), { metadata: Object.create(null), elements: [] });
  const { ports } = fixture({ parse: () => ({ ast, diagnostics: [] }), normalize: () => Object.create(null), layout: () => Object.create(null) });
  assert.equal(core.createRouteCompiler(Object.assign(Object.create(null), ports))(SOURCE).json, "{}");
});

test("compiler captures wiring without freezing or mutating caller configuration", () => {
  const { ports } = fixture();
  const before = { ...ports };
  const compile = core.createRouteCompiler(ports);
  const unchanged = NAMES.every((name) => before[name] === ports[name]);
  ports.exportJson = () => "replacement";
  assert.deepEqual([unchanged, Object.isFrozen(ports), compile(SOURCE).json], [true, false, '{"title":"Alternate syntax","count":0}']);
});

test("fully injected public helper preserves alternate output composition", () => {
  const { ports } = fixture();
  assert.deepEqual(core.compileRouteWithDependencies(SOURCE, undefined, ports), core.createRouteCompiler(ports)(SOURCE));
});

test("public helper requires explicit non-geometry ports", () => {
  assert.throws(() => core.compileRouteWithDependencies("route X", {}, {}), { name: "TypeError", message: 'Compiler port "parse" must be a function.' });
});

test("public helper rejects a missing dependencies record", () => {
  assert.throws(() => core.compileRouteWithDependencies("route X"), TypeError);
});

for (const validateGeometry of [undefined, null]) {
  test(`public helper preserves its ${validateGeometry} geometry fallback`, () => {
    assert.equal(core.compileRouteWithDependencies("route X", {}, { parse: core.parseVrl, validate: core.validateRoute, normalize: core.normalizeRoute, validateGeometry, layout: core.computeVerticalLayout, exportJson: core.exportRouteJson }).ok, true);
  });
  test(`factory preserves its ${validateGeometry} geometry fallback`, () => {
    assert.equal(core.createRouteCompiler({ validateGeometry })("route X\ndownclimb").diagnostics[0].code, "VRL_GEOMETRY_HEIGHT_REQUIRED");
  });
}

test("configured adapters do not change the default compiler", () => {
  core.createRouteCompiler(fixture().ports)(SOURCE);
  assert.equal(core.compileRoute("route Standard").model.name, "Standard");
});

test("standalone JSON adapter retains indentation and numeric fidelity", () => {
  assert.equal(core.exportRouteJson({ name: "Cañón", value: 0.1 + 0.2, unknown: null }), '{\n  "name": "Cañón",\n  "value": 0.30000000000000004,\n  "unknown": null\n}');
});

test("JSON adapter preserves native cycle failures", () => {
  const model = {};
  model.self = model;
  assert.throws(() => core.exportRouteJson(model), TypeError);
});

test("JSON adapter preserves native unsupported bigint failures", () => {
  assert.throws(() => core.exportRouteJson({ value: 1n }), TypeError);
});
