import assert from "node:assert/strict";
import test from "node:test";
import * as core from "@subvertic/core";
import { createVrlReactDiagramState } from "@subvertic/react";
import { createVrlSvelteDiagramState } from "@subvertic/svelte";

const SOURCE = 'route "Limits"\nwalk distance=1m';
const LIMITS = { maxSourceBytes: 1048576, maxLines: 20000, maxLineBytes: 16384, maxElements: 10000, maxListEntries: 1024 };

function outcome(result) {
  return { ok: result.ok, kinds: result.diagnostics.map(({ kind }) => kind), model: result.model, layout: result.layout, json: result.json };
}
const LIMITED = { ok: false, kinds: ["limit"], model: null, layout: null, json: null };

function ast(attributes = {}) {
  return { ...core.createEmptyRoute(), name: "Limits", elements: [core.createRouteElement("walk", attributes, { line: 2, column: 1 })] };
}

for (const [name, source, size] of [
  ["maxSourceBytes", SOURCE, Buffer.byteLength(SOURCE)],
  ["maxLines", SOURCE + "\n", 3],
  ["maxLineBytes", SOURCE, Buffer.byteLength("walk distance=1m")],
  ["maxElements", 'route "Limits"\nwalk\nnote text\nhazard type=snake', 3],
  ["maxListEntries", 'route "Limits"\nrappel height=3m rope=6m stages=1m+1m+1m', 3]
]) {
  for (const offset of [-1, 0, 1]) {
    test(`${name} accepts only documents within a budget of ${size + offset}`, () => {
      const result = core.compileRoute(source, { limits: { [name]: size + offset } });
      assert.deepEqual({ ok: result.ok, limited: result.diagnostics.some(({ kind }) => kind === "limit") }, { ok: offset >= 0, limited: offset < 0 });
    });
    test(`standalone parser honors ${name} at budget ${size + offset}`, () => {
      assert.equal(core.parseVrl(source, { limits: { [name]: size + offset } }).diagnostics.some(({ kind }) => kind === "limit"), offset < 0);
    });
  }
}

for (const name of Object.keys(LIMITS)) {
  for (const value of [null, "100", false, {}, []]) {
    test(`${name} rejects nonnumeric configuration ${JSON.stringify(value)}`, () => {
      assert.throws(() => core.compileRoute(SOURCE, { limits: { [name]: value } }), TypeError);
    });
  }
  for (const value of [0, -1, 1.5, Infinity, -Infinity, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    test(`${name} rejects invalid integer configuration ${String(value)}`, () => {
      assert.throws(() => core.parseVrl(SOURCE, { limits: { [name]: value } }), RangeError);
    });
  }
  test(`${name} accepts the largest safe integer configuration`, () => {
    assert.equal(core.compileRoute(SOURCE, { limits: { [name]: Number.MAX_SAFE_INTEGER } }).ok, true);
  });
  test(`${name} uses its default when undefined`, () => {
    assert.deepEqual(core.compileRoute(SOURCE, { limits: { [name]: undefined } }), core.compileRoute(SOURCE));
  });
}

for (const limits of [null, [], "limits", 3, new Date(0), Object.create({ maxLines: 2 }), { unknown: 1 }, { constructor: 1 }]) {
  test(`reject invalid limits object ${String(limits)}`, () => {
    assert.throws(() => core.compileRoute(SOURCE, { limits }), TypeError);
  });
}
for (const source of [null, undefined, 42, [], {}]) {
  test(`reject invalid source type ${String(source)}`, () => {
    assert.throws(() => core.parseVrl(source), TypeError);
  });
}

test("null-prototype limits are supported without mutating caller configuration", () => {
  const limits = Object.assign(Object.create(null), { maxElements: 1 });
  core.compileRoute(SOURCE, { limits });
  assert.deepEqual(limits, Object.assign(Object.create(null), { maxElements: 1 }));
});

test("parser ports receive an immutable resolved limits snapshot", () => {
  let received;
  const compile = core.createRouteCompiler({ parse: (source, options) => { received = options.limits; return core.parseVrl(source, options); } });
  compile(SOURCE, { limits: { maxElements: 1 } });
  assert.deepEqual({ limits: received, frozen: Object.isFrozen(received) }, { limits: { ...LIMITS, maxElements: 1 }, frozen: true });
});

for (const text of ["é", "漢", "🧗", "\ud800", "\udc00", "a🧗é漢b"]) {
  const source = `route "${text}"`;
  for (const name of ["maxSourceBytes", "maxLineBytes"]) {
    for (const offset of [-1, 0, 1]) {
      test(`${name} counts UTF-8 bytes for ${JSON.stringify(text)} at offset ${offset}`, () => {
        assert.equal(core.compileRoute(source, { limits: { [name]: Buffer.byteLength(source) + offset } }).ok, offset >= 0);
      });
    }
  }
}

test("source-byte overflow reports a UTF-16 column without splitting an astral character", () => {
  assert.deepEqual(core.parseVrl('route "🧗🧗"', { limits: { maxSourceBytes: 12 } }).diagnostics[0].location, { line: 1, column: 10 });
});

test("line-byte overflow reports the correct later-line location", () => {
  assert.deepEqual(core.parseVrl('route X\nnote "🧗🧗"', { limits: { maxLineBytes: 11 } }).diagnostics[0].location, { line: 2, column: 9 });
});

for (const newline of ["\n", "\r\n"]) {
  test(`line limits count a trailing empty line for ${JSON.stringify(newline)}`, () => {
    assert.deepEqual(core.parseVrl("route X" + newline, { limits: { maxLines: 1 } }).diagnostics[0].location, { line: 2, column: 1 });
  });
  test(`line bytes exclude the ${JSON.stringify(newline)} delimiter`, () => {
    assert.equal(core.compileRoute("route X" + newline, { limits: { maxLineBytes: 7 } }).ok, true);
  });
  test(`source bytes include the ${JSON.stringify(newline)} delimiter`, () => {
    assert.equal(core.parseVrl("route X" + newline, { limits: { maxSourceBytes: 7 } }).diagnostics[0].kind, "limit");
  });
}

test("a lone carriage return counts toward line bytes", () => {
  assert.deepEqual(core.parseVrl("route X\r", { limits: { maxLineBytes: 7 } }).diagnostics[0].location, { line: 1, column: 8 });
});

test("empty source remains an ordinary missing-name failure", () => {
  assert.deepEqual(core.compileRoute("", { limits: { maxSourceBytes: 1, maxLines: 1, maxLineBytes: 1 } }).diagnostics.map(({ kind }) => kind), ["validation"]);
});

for (const [name, source] of [
  ["maxSourceBytes", 'route "Large"\n' + ("#" + "x".repeat(1020) + "\n").repeat(1040)],
  ["maxLines", 'route "Lines"' + "\n".repeat(20000)],
  ["maxLineBytes", 'route "' + "x".repeat(16384) + '"'],
  ["maxElements", 'route "Elements"\n' + "walk\n".repeat(10001)],
  ["maxListEntries", 'route "List"\nrappel height=1025m rope=1025m stages=' + Array(1025).fill("1m").join("+")]
]) {
  test(`default ${name} returns a structured bounded failure`, () => {
    assert.deepEqual(outcome(core.compileRoute(source)), LIMITED);
  });
  test(`default ${name} identifies its configured threshold`, () => {
    assert.equal(core.compileRoute(source).diagnostics[0].message, `Document exceeds ${name} limit of ${LIMITS[name]}.`);
  });
}

test("150000 walk lines fail with a limit diagnostic instead of a stack overflow", () => {
  assert.deepEqual(outcome(core.compileRoute('route "Large"\n' + "walk distance=1m\n".repeat(150000))), LIMITED);
});

test("source preflight returns an empty recovery AST with the original source", () => {
  const source = 'route "Long"';
  assert.deepEqual(core.parseVrl(source, { limits: { maxSourceBytes: 1 } }).ast, core.createEmptyRoute(source));
});

test("element overflow stops before storing or parsing subsequent elements", () => {
  const result = core.parseVrl('route X\nwalk\nwalk\nteleport', { limits: { maxElements: 1 } });
  assert.deepEqual({ elements: result.ast.elements.map(({ type }) => type), diagnostics: result.diagnostics.map(({ kind, location }) => ({ kind, location })) }, { elements: ["walk"], diagnostics: [{ kind: "limit", location: { line: 3, column: 1 } }] });
});

test("list overflow stops before storing the offending statement", () => {
  assert.equal(core.parseVrl('route X\nwalk stages=1m+1m+1m\nwalk', { limits: { maxListEntries: 2 } }).ast.elements.length, 0);
});

for (const field of ["stages", "redirection", "redirections"]) {
  const separator = field === "stages" ? "+" : ",";
  for (const scope of ["metadata", "walk"]) {
    test(`${scope} bounds ${field} before semantic list parsing`, () => {
      assert.deepEqual(outcome(core.compileRoute(`route X\n${scope} ${field}="1m${separator}2m${separator}3m"`, { limits: { maxListEntries: 2 } })), LIMITED);
    });
  }
}

for (const statement of ['route "stages=1m+2m+3m"', 'route X\nnote stages=1m+2m+3m', 'route X\nwalk custom="1m+2m+3m"', 'route X\nwalk stages=""']) {
  test(`list budgets distinguish lists from text: ${statement}`, () => {
    assert.equal(core.parseVrl(statement, { limits: { maxListEntries: 1 } }).diagnostics.length, 0);
  });
}

test("empty list positions count toward the budget before grammar validation", () => {
  assert.equal(core.compileRoute('route X\nwalk stages=1m+++2m', { limits: { maxListEntries: 3 } }).diagnostics[0].kind, "limit");
});

test("within-budget malformed lists still produce validation errors", () => {
  assert.equal(core.compileRoute('route X\nwalk stages=1m++2m', { limits: { maxListEntries: 3 } }).diagnostics[0].kind, "validation");
});

test("increasing a list budget admits the same well-formed source", () => {
  assert.equal(core.compileRoute('route X\nrappel height=3m rope=6m stages=1m+1m+1m', { limits: { maxListEntries: 3 } }).ok, true);
});

test("the default list maximum is accepted", () => {
  assert.equal(core.compileRoute('route X\nrappel height=1024m rope=1024m stages=' + Array(1024).fill("1m").join("+")).model.elements[0].attributes.stages.length, 1024);
});

for (const [limits, source, expectedCalls] of [
  [{ maxSourceBytes: 1 }, SOURCE, []],
  [{ maxLines: 1 }, SOURCE, []],
  [{ maxLineBytes: 1 }, SOURCE, []],
  [{ maxElements: 1 }, SOURCE + "\nwalk", ["parse"]],
  [{ maxListEntries: 1 }, 'route X\nwalk redirections=1m,2m', ["parse"]]
]) {
  test(`limits ${JSON.stringify(limits)} stop expensive compiler ports`, () => {
    const calls = [];
    const compile = core.createRouteCompiler({ parse: (...args) => { calls.push("parse"); return core.parseVrl(...args); }, validate: () => calls.push("validate"), normalize: () => calls.push("normalize"), validateGeometry: () => calls.push("geometry"), layout: () => calls.push("layout"), exportJson: () => calls.push("export") });
    compile(source, { limits });
    assert.deepEqual(calls, expectedCalls);
  });
}

for (const [name, parsedAst] of [
  ["maxElements", { ...ast(), elements: [ast().elements[0], ast().elements[0]] }],
  ["maxListEntries", ast({ stages: "1m+2m" })],
  ["maxListEntries", { ...ast(), metadata: { redirections: "1m,2m" } }]
]) {
  test(`parser-port output cannot bypass ${name}: ${JSON.stringify(parsedAst.metadata)}`, () => {
    const calls = [];
    const compile = core.createRouteCompiler({ parse: () => ({ ast: parsedAst, diagnostics: [] }), validate: () => calls.push("validate") });
    const result = compile("", { limits: { [name]: 1 } });
    assert.deepEqual({ result: outcome(result), calls }, { result: LIMITED, calls: [] });
  });
}

test("malformed parser-port values retain their programming errors", () => {
  const compile = core.createRouteCompiler({ parse: () => ({ ast: ast({ stages: 123 }), diagnostics: [] }) });
  assert.throws(() => compile(""), TypeError);
});

test("custom parser warnings remain nonblocking regardless of diagnostic kind", () => {
  const compile = core.createRouteCompiler({ parse: () => ({ ast: ast(), diagnostics: [core.createDiagnostic("limit", "warning", "Caller advisory", { line: 1, column: 1 })] }) });
  const result = compile("");
  assert.deepEqual([result.ok, result.diagnostics[0].severity], [true, "warning"]);
});

test("list budgets apply independently to both aliases", () => {
  assert.equal(core.compileRoute('route X\nrappel height=5m rope=10m redirection=1m redirections=2m', { limits: { maxListEntries: 1 } }).ok, true);
});

test("one compilation's limits cannot affect the next compilation", () => {
  core.compileRoute(SOURCE, { limits: { maxSourceBytes: 1 } });
  assert.equal(core.compileRoute(SOURCE).ok, true);
});

for (const port of ["parse", "validate", "normalize", "validateGeometry", "layout", "exportJson"]) {
  test(`an unrelated ${port} exception propagates unchanged`, () => {
    const error = new RangeError("Internal failure");
    const compile = core.createRouteCompiler({ [port]: () => { throw error; } });
    assert.throws(() => compile(SOURCE), (actual) => actual === error);
  });
}

for (const createState of [createVrlReactDiagramState, createVrlSvelteDiagramState]) {
  test(`${createState.name} displays a limit failure without a diagram`, () => {
    const result = createState(SOURCE, { limits: { maxSourceBytes: 1 } });
    assert.deepEqual([result.ok, result.svg, result.diagnostics[0].kind], [false, "", "limit"]);
  });
  test(`${createState.name} still throws on invalid configuration`, () => {
    assert.throws(() => createState(SOURCE, { limits: { maxSourceBytes: 0 } }), RangeError);
  });
}

test("limit diagnostics have a readable correction", () => {
  assert.equal(core.formatDiagnostic(core.parseVrl(SOURCE, { limits: { maxLines: 1 } }).diagnostics[0]), "ERROR limit at 2:1: Document exceeds maxLines limit of 1. Suggestion: Reduce the document or explicitly increase options.limits.maxLines for a trusted workload.");
});

test("repeated bounded compilations are deterministic", () => {
  assert.deepEqual(core.compileRoute(SOURCE, { limits: { maxLines: 1 } }), core.compileRoute(SOURCE, { limits: { maxLines: 1 } }));
});

test("large geometry diagnostic batches retain order without argument expansion", () => {
  const diagnostics = Array.from({ length: 150000 }, (_, index) => core.createDiagnostic("geometry", "warning", String(index), { line: 1, column: 1 }));
  const result = core.createRouteCompiler({ validateGeometry: () => diagnostics })(SOURCE);
  assert.deepEqual([result.ok, result.diagnostics.length, result.diagnostics[0].message, result.diagnostics.at(-1).message], [true, 150000, "0", "149999"]);
});

test("large direct identifier validation does not overflow diagnostic arguments", () => {
  const element = core.createRouteElement("walk", {}, { line: 1, column: 1 }, "duplicate");
  assert.equal(core.validateRoute({ ...ast(), elements: Array(150000).fill(element) }).length, 149999);
});

function largeRoute(metadata = {}) {
  return { name: "Large layout", metadata, elements: Array.from({ length: 150000 }, (_, index) => core.createRouteElement("walk", {}, { line: index + 2, column: 1 }, `W${index + 1}`)) };
}

test("weighted layout preserves extents for 150000 elements", () => {
  const result = core.computeVerticalLayout(largeRoute());
  const lastY = Math.round(108 + 149999 * 68 * 0.9);
  assert.deepEqual([result.nodes.length, result.nodes.at(-1).x, result.nodes.at(-1).y, result.height], [150000, 96 + 149999 * 58, lastY, lastY + 64]);
});

test("elevation layout preserves endpoint coordinates for 150000 elements", () => {
  const metric = (meters) => ({ value: meters, unit: "m", meters });
  const result = core.computeElevationLayout(largeRoute({ entrance_elevation: metric(0), exit_elevation: metric(-149999) }), { minNodeGap: 0, pixelsPerMeter: 1 });
  assert.deepEqual([result.nodes.length, result.nodes[0].y, result.nodes.at(-1).y, result.nodes.at(-1).elevationMeters, result.height], [150000, 108, 150107, -149999, 150171]);
});

test("minimum-gap shifting handles 150000 ascending points without argument expansion", () => {
  const nodes = Array.from({ length: 150000 }, (_, index) => ({ y: -index, direction: "up" }));
  const result = core.applyMinimumNodeGap(nodes, 2, 10);
  assert.deepEqual([result.length, result[0].y, result.at(-1).y, nodes[0].y, nodes.at(-1).y], [150000, 300008, 10, -0, -149999]);
});

test("large direct redirection validation does not overflow diagnostic arguments", () => {
  const element = core.createRouteElement("rappel", { height: "1m", rope: "2m", redirections: Array(150000).fill("2m").join(",") }, { line: 1, column: 1 });
  assert.equal(core.validateElement(element).length, 150000);
});
