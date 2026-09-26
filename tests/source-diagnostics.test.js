import assert from "node:assert/strict";
import test from "node:test";
import * as core from "@subvertic/vrl-core";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitData } from "@subvertic/vrl-sveltekit";

function span(line, start, end) {
  return { start: { line, column: start }, end: { line, column: end } };
}

function markedSpan(source, line, text) {
  const start = source.split(/\r?\n/)[line - 1].indexOf(text) + 1;
  return span(line, start, start + text.length);
}

function primary(diagnostic) {
  return { code: diagnostic.code, severity: diagnostic.severity, location: diagnostic.location, span: diagnostic.span };
}

const METADATA = '# Survey\r\n  route "🧗"\r\nmetadata region=CR\r\n\tmetadata entrance_elevation="high" exit_elevation=-5m';

test("invalid metadata on line four reports the original quoted value span", () => {
  assert.deepEqual(primary(core.compileRoute(METADATA).diagnostics[0]), { code: "VRL_FIELD_MEASUREMENT_SYNTAX", severity: "error", location: { line: 4, column: 30 }, span: span(4, 30, 36) });
});

test("metadata keeps the full declaration and each key/value span", () => {
  assert.deepEqual(core.parseVrl(METADATA).ast.sourceMap.metadata[1], {
    span: span(4, 2, 55), keywordSpan: span(4, 2, 10), attributeSpans: {
      entrance_elevation: { span: span(4, 11, 36), keySpan: span(4, 11, 29), valueSpan: span(4, 30, 36) },
      exit_elevation: { span: span(4, 37, 55), keySpan: span(4, 37, 51), valueSpan: span(4, 52, 55) }
    }
  });
});

test("route names retain original Unicode coordinates", () => {
  assert.deepEqual(core.parseVrl(METADATA).ast.sourceMap.route, { span: span(2, 3, 13), keywordSpan: span(2, 3, 8), attributeSpans: {}, nameSpan: span(2, 9, 13) });
});

for (const newline of ["\n", "\r\n"]) {
  for (const indentation of ["", "  ", "\t"]) {
    const source = ['# Header', `${indentation}route "Cañón 🧗"`, `${indentation}metadata note="A\\\"B"`, `${indentation}metadata entrance_elevation=banana exit_elevation=bad`, `${indentation}climb "🧗" height=2m exposure="wild"`].join(newline);
    test(`independent errors preserve UTF-16 locations with ${JSON.stringify(newline)} and ${JSON.stringify(indentation)}`, () => {
      assert.deepEqual(core.compileRoute(source).diagnostics.map(primary), [
        { code: "VRL_FIELD_MEASUREMENT_SYNTAX", severity: "error", location: markedSpan(source, 4, "banana").start, span: markedSpan(source, 4, "banana") },
        { code: "VRL_FIELD_MEASUREMENT_SYNTAX", severity: "error", location: markedSpan(source, 4, "bad").start, span: markedSpan(source, 4, "bad") },
        { code: "VRL_FIELD_UNSUPPORTED_VALUE", severity: "error", location: markedSpan(source, 5, '"wild"').start, span: markedSpan(source, 5, '"wild"') }
      ]);
    });
  }
}

test("escaped attribute values retain raw spans independently of decoded values", () => {
  const source = 'route X\nclimb height=2m exposure="A\\\"B"';
  const result = core.compileRoute(source);
  assert.deepEqual([result.ast.elements[0].attributes.exposure, result.diagnostics[0].span], ['A"B', markedSpan(source, 2, '"A\\\"B"')]);
});

test("repeated metadata lines preserve each declaration and the first value's provenance", () => {
  const source = 'route X\n metadata total_distance=banana\n\tmetadata total_distance=5m region=CR';
  const result = core.compileRoute(source);
  assert.deepEqual([result.ast.sourceMap.metadata.length, result.ast.sourceMap.metadata[1].attributeSpans, result.diagnostics.map(({ code, span: range, relatedLocations }) => [code, range, relatedLocations?.[0].span])], [2,
    { region: { span: markedSpan(source, 3, "region=CR"), keySpan: markedSpan(source, 3, "region"), valueSpan: markedSpan(source, 3, "CR") } },
    [["VRL_SYNTAX_DUPLICATE_ATTRIBUTE", markedSpan(source, 3, "total_distance"), markedSpan(source, 2, "total_distance")], ["VRL_FIELD_MEASUREMENT_SYNTAX", markedSpan(source, 2, "banana"), undefined]]
  ]);
});

for (const key of ["__proto__", "constructor", "toString"]) {
  test(`source-map keys preserve extension ${key} as own data`, () => {
    const source = `route X\nmetadata ${key}=first\nmetadata ${key}=second`;
    const result = core.parseVrl(source);
    assert.deepEqual([Object.hasOwn(result.ast.sourceMap.metadata[0].attributeSpans, key), result.ast.sourceMap.metadata[0].attributeSpans[key].valueSpan, result.diagnostics[0].relatedLocations[0].span], [true, markedSpan(source, 2, "first"), markedSpan(source, 2, key)]);
  });
}

for (const [line, field, value, code, severity] of [
  ['walk distance=far', 'distance', 'far', 'VRL_FIELD_MEASUREMENT_SYNTAX', 'error'],
  ['walk distance=0m', 'distance', '0m', 'VRL_FIELD_MEASUREMENT_RANGE', 'error'],
  ['climb height=1m inclination=steep', 'inclination', 'steep', 'VRL_FIELD_INCLINATION_SYNTAX', 'error'],
  ['climb height=1m inclination=101%', 'inclination', '101%', 'VRL_FIELD_INCLINATION_RANGE', 'error'],
  ['climb height=1m exposure=wild', 'exposure', 'wild', 'VRL_FIELD_UNSUPPORTED_VALUE', 'error'],
  ['rappel height=3m rope=5m stages=1m++2m', 'stages', '1m++2m', 'VRL_FIELD_STAGES_SYNTAX', 'error'],
  ['rappel height=3m rope=5m redirections=,1m,,', 'redirections', ',1m,,', 'VRL_FIELD_REDIRECTIONS_SYNTAX', 'error'],
  ['rappel height=3m rope=5m redirection=3m:left', 'redirection', '3m:left', 'VRL_REDIRECTION_OUTSIDE_HEIGHT', 'error'],
  ['rappel height=3m rope=5m redirections=3m:right', 'redirections', '3m:right', 'VRL_REDIRECTION_OUTSIDE_HEIGHT', 'error'],
  ['rappel height=3m rope=1m', 'rope', '1m', 'VRL_ROPE_SHORTER_THAN_HEIGHT', 'warning'],
  ['rappel height=4m rope=5m stages=1m+2m', 'stages', '1m+2m', 'VRL_STAGE_TOTAL_MISMATCH', 'warning']
]) {
  test(`semantic ${code} locates ${field} rather than the statement`, () => {
    const source = `route X\n  ${line}`;
    const range = markedSpan(source, 2, value);
    assert.deepEqual(primary(core.compileRoute(source).diagnostics[0]), { code, severity, location: range.start, span: range });
  });
}

for (const [source, code, expected] of [
  ['# comment\n  route ""', 'VRL_ROUTE_NAME_REQUIRED', span(2, 9, 11)],
  ['# comment\n  route', 'VRL_SYNTAX_MISSING_ROUTE_NAME', span(2, 3, 8)],
  ['route X\n  rappel height=3m', 'VRL_FIELD_REQUIRED', span(2, 3, 19)],
  ['route X\n  climb', 'VRL_FIELD_REQUIRED', span(2, 3, 8)],
  ['route X\n  walk ""', 'VRL_IDENTIFIER_INVALID', span(2, 8, 10)]
]) {
  test(`${code} uses the smallest available declaration or identity span`, () => {
    assert.deepEqual(core.compileRoute(source).diagnostics.find((item) => item.code === code).span, expected);
  });
}

test("duplicate identifiers highlight quoted identity text and its original declaration", () => {
  const source = 'route X\n  walk "🧗"\n\tpool "🧗"';
  const result = core.compileRoute(source);
  assert.deepEqual([result.diagnostics[0].code, result.diagnostics[0].span, result.diagnostics[0].relatedLocations[0].span], ["VRL_IDENTIFIER_DUPLICATE", span(3, 7, 11), span(2, 8, 12)]);
});

test("start labels and note text retain spans without becoming identifiers or attributes", () => {
  const result = core.parseVrl('route X\n start "Entry"\n note "height=banana"');
  assert.deepEqual([result.ast.sourceMap.elements[0].labelSpan, result.ast.sourceMap.elements[0].idSpan, result.ast.sourceMap.elements[1].textSpan, result.ast.sourceMap.elements[1].attributeSpans], [span(2, 8, 15), null, span(3, 7, 22), {}]);
});

test("comments and cosmetic braces are excluded from declaration spans", () => {
  assert.deepEqual(core.parseVrl('  route "X" { # comment\n}').ast.sourceMap.route.span, span(1, 3, 12));
});

test("rejected declarations do not enter the recovery source map", () => {
  const result = core.parseVrl('route X\nroute Y\nmetadata bad="open\nwalk distance=1m\nmetadata height=banana');
  assert.deepEqual([result.ast.sourceMap.route.span, result.ast.sourceMap.metadata.length, result.ast.sourceMap.elements.map(({ span: range }) => range)], [span(1, 1, 8), 0, [span(4, 1, 17)]]);
});

test("a processing limit retains only source spans in the accepted prefix", () => {
  const result = core.parseVrl('route X\nwalk\npool', { limits: { maxElements: 1 } });
  assert.deepEqual([result.diagnostics[0].code, result.ast.sourceMap.elements.map(({ span: range }) => range)], ["VRL_LIMIT_MAX_ELEMENTS", [span(2, 1, 5)]]);
});

test("geometry errors use metadata provenance without adding it to the model", () => {
  const source = '# title\nroute X\nmetadata entrance_elevation=10m\n metadata exit_elevation=1m\nrappel height=5m rope=10m';
  const result = core.compileRoute(source);
  assert.deepEqual(primary(result.diagnostics[0]), { code: "VRL_GEOMETRY_ELEVATIONS_INCONSISTENT", severity: "error", location: markedSpan(source, 4, "1m").start, span: markedSpan(source, 4, "1m") });
});

test("estimated elevation warnings use the supplied exit elevation span", () => {
  const source = 'route X\nmetadata entrance_elevation=10m\nmetadata exit_elevation=1m\nwalk distance=1m\nwalk distance=1m';
  assert.deepEqual(core.compileRoute(source).diagnostics.map(({ code, span: range }) => [code, range]), [["VRL_GEOMETRY_ELEVATIONS_ESTIMATED", markedSpan(source, 3, "1m")]]);
});

test("missing technical height uses its declaration span", () => {
  assert.deepEqual(core.compileRoute('route X\n  downclimb').diagnostics.map(({ code, span: range }) => [code, range]), [["VRL_GEOMETRY_HEIGHT_REQUIRED", span(2, 3, 12)]]);
});

test("duplicate boundary diagnostics retain both declaration spans", () => {
  const source = 'route X\nstart "One"\n  start "Two"';
  const [diagnostic] = core.compileRoute(source).diagnostics;
  assert.deepEqual([diagnostic.code, diagnostic.span, diagnostic.relatedLocations[0].span], ["VRL_BOUNDARY_DUPLICATE", span(3, 3, 14), span(2, 1, 12)]);
});

test("boundary ordering errors use their original declaration span", () => {
  assert.deepEqual(core.compileRoute('route X\nwalk\n  start').diagnostics.map(({ code, span: range }) => [code, range]), [["VRL_BOUNDARY_ORDER", span(3, 3, 8)]]);
});

for (const sourceMap of [undefined, {}, { route: null, metadata: [{ span: span(4, 2, 10) }], elements: [] }]) {
  test(`programmatic ASTs tolerate missing attribute provenance ${JSON.stringify(sourceMap)}`, () => {
    const ast = { name: "X", metadata: { height: "bad" }, elements: [], sourceMap };
    assert.deepEqual(core.validateRoute(ast).map(({ code, location }) => [code, location]), [["VRL_FIELD_MEASUREMENT_SYNTAX", sourceMap?.metadata ? { line: 4, column: 2 } : { line: 1, column: 1 }]]);
  });
}

test("legacy elements retain their supplied point locations and stable codes", () => {
  assert.deepEqual(primary(core.validateElement(core.createRouteElement("walk", { distance: "bad" }, { line: 9, column: 4 }))[0]), { code: "VRL_FIELD_MEASUREMENT_SYNTAX", severity: "error", location: { line: 9, column: 4 }, span: undefined });
});

test("standalone element validation accepts the corresponding source-map record", () => {
  const { ast } = core.parseVrl('route X\nwalk distance=bad');
  assert.deepEqual(core.validateElement(ast.elements[0], ast.sourceMap.elements[0]), core.validateRoute(ast));
});

test("standalone geometry validation accepts the original source map", () => {
  const { ast } = core.parseVrl('route X\n  downclimb');
  assert.deepEqual(core.validateGeometry(core.normalizeRoute(ast), ast.sourceMap), core.compileRoute(ast.source).diagnostics);
});

test("custom geometry ports receive provenance separately from the normalized model", () => {
  let received;
  const compile = core.createRouteCompiler({ validateGeometry: (model, sourceMap) => { received = { modelHasSourceMap: Object.hasOwn(model, "sourceMap"), range: sourceMap.route.span }; return []; } });
  compile('route X');
  assert.deepEqual(received, { modelHasSourceMap: false, range: span(1, 1, 8) });
});

test("programmatic numeric geometry failures have stable codes and a route span when supplied", () => {
  assert.deepEqual(primary(core.validateGeometry({ metadata: {}, elements: [], invalid: Infinity }, { route: { span: span(3, 2, 10) } })[0]), { code: "VRL_GEOMETRY_NUMERIC_RANGE", severity: "error", location: { line: 3, column: 2 }, span: span(3, 2, 10) });
});

test("valid source gains no diagnostics or normalized syntax fields", () => {
  const result = core.compileRoute('route X\nmetadata country=CR\nwalk distance=1m');
  assert.deepEqual([result.diagnostics, Object.keys(result.model), Object.keys(JSON.parse(result.json).elements[0])], [[], ["name", "metadata", "extensions", "elements", "traversal", "summary"], ["type", "id", "label", "attributes", "extensions", "sourceLocation"]]);
});

test("validation and normalization do not mutate retained provenance", () => {
  const { ast } = core.parseVrl('route X\nmetadata entrance_elevation=10m\nmetadata exit_elevation=0m\nwalk distance=1m\nexit');
  const before = structuredClone(ast);
  core.validateRoute(ast);
  core.validateGeometry(core.normalizeRoute(ast), ast.sourceMap);
  assert.deepEqual(ast, before);
});

test("codes and ranges remain deterministic between calls", () => {
  assert.deepEqual(core.compileRoute(METADATA), core.compileRoute(METADATA));
});

for (const createState of [createVrlReactDiagramState, createVrlSvelteDiagramState, createVrlSvelteKitData]) {
  test(`${createState.name} exposes exact source ranges and codes with no diagram`, () => {
    const result = createState(METADATA);
    assert.deepEqual([result.ok, result.svg, result.diagnostics[0].code, result.diagnostics[0].span, result.diagnosticsText.includes("at 4:30")], [false, "", "VRL_FIELD_MEASUREMENT_SYNTAX", span(4, 30, 36), true]);
  });
}

test("public diagnostic construction supports optional code and range", () => {
  assert.deepEqual(core.createDiagnostic("custom", "error", "Message", { line: 2, column: 3 }, "Hint", [], { code: "APP_CUSTOM", span: span(2, 3, 8) }), { kind: "custom", severity: "error", message: "Message", location: { line: 2, column: 3 }, suggestion: "Hint", code: "APP_CUSTOM", span: span(2, 3, 8) });
});

for (const [line, code] of [
  ['walk =1m', 'VRL_LEX_MISSING_KEY'], ['walk height=', 'VRL_LEX_MISSING_VALUE'],
  ['note "\\', 'VRL_LEX_UNFINISHED_ESCAPE'], ['note "\\q"', 'VRL_LEX_UNSUPPORTED_ESCAPE'],
  ['note "open', 'VRL_LEX_UNTERMINATED_STRING'], ['note "a"b', 'VRL_LEX_TOKEN_ADJACENCY']
]) {
  test(`lexical code ${code} is independent of readable wording`, () => {
    assert.equal(core.lexVrlLine(line).diagnostics[0].code, code);
  });
}

for (const [source, code] of [
  ['route X\nteleport', 'VRL_SYNTAX_UNKNOWN_STATEMENT'], ['route', 'VRL_SYNTAX_MISSING_ROUTE_NAME'],
  ['walk', 'VRL_SYNTAX_ROUTE_REQUIRED'], ['route X\nwalk\nmetadata country=CR', 'VRL_SYNTAX_METADATA_ORDER'],
  ['route X\nroute Y', 'VRL_SYNTAX_DUPLICATE_ROUTE'], ['walk\nroute X', 'VRL_SYNTAX_ROUTE_ORDER'],
  ['route X\nwalk distance=1m wrong', 'VRL_SYNTAX_EXPECTED_ATTRIBUTE'], ['route X\nwalk distance=1m distance=2m', 'VRL_SYNTAX_DUPLICATE_ATTRIBUTE']
]) {
  test(`document grammar exposes stable code ${code}`, () => {
    assert.equal(core.parseVrl(source).diagnostics.some((diagnostic) => diagnostic.code === code), true);
  });
}

for (const [limits, source, code] of [
  [{ maxSourceBytes: 1 }, 'route X', 'VRL_LIMIT_MAX_SOURCE_BYTES'],
  [{ maxLines: 1 }, 'route X\n', 'VRL_LIMIT_MAX_LINES'],
  [{ maxLineBytes: 1 }, 'route X', 'VRL_LIMIT_MAX_LINE_BYTES'],
  [{ maxElements: 1 }, 'route X\nwalk\nwalk', 'VRL_LIMIT_MAX_ELEMENTS'],
  [{ maxListEntries: 1 }, 'route X\nwalk stages=1m+2m', 'VRL_LIMIT_MAX_LIST_ENTRIES']
]) {
  test(`processing budgets expose ${code}`, () => {
    assert.equal(core.compileRoute(source, { limits }).diagnostics[0].code, code);
  });
}

test("semantic failure with provenance still suppresses downstream compiler ports", () => {
  const calls = [];
  const compile = core.createRouteCompiler(Object.fromEntries(["normalize", "validateGeometry", "layout", "exportJson"].map((name) => [name, () => calls.push(name)])));
  compile(METADATA);
  assert.deepEqual(calls, []);
});

test("programmatic identifier errors fall back to the available declaration span", () => {
  const element = core.createRouteElement("walk", {}, { line: 8, column: 1 }, "");
  assert.deepEqual(primary(core.validateElement(element, { span: span(8, 3, 12) })[0]), { code: "VRL_IDENTIFIER_INVALID", severity: "error", location: { line: 8, column: 3 }, span: span(8, 3, 12) });
});

test("inherited attribute ranges cannot override the declaration fallback", () => {
  const element = core.createRouteElement("walk", { distance: "bad" }, { line: 2, column: 1 });
  const source = { span: span(2, 3, 20), attributeSpans: Object.create({ distance: { valueSpan: span(99, 1, 4) } }) };
  assert.deepEqual(core.validateElement(element, source)[0].span, span(2, 3, 20));
});

test("partial source maps preserve element point fallbacks during geometry validation", () => {
  const element = core.createRouteElement("downclimb", {}, { line: 7, column: 4 });
  assert.deepEqual(primary(core.validateGeometry({ metadata: {}, elements: [element] }, {})[0]), { code: "VRL_GEOMETRY_HEIGHT_REQUIRED", severity: "warning", location: { line: 7, column: 4 }, span: undefined });
});
