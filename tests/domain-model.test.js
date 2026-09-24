import assert from "node:assert/strict";
import test from "node:test";
import * as core from "@subvertic/core";
import { renderTopoSvg, formatElementDetail, isSnakeHazard } from "@subvertic/render-svg";

const metric = (meters) => ({ value: meters, unit: "m", meters });
const SOURCE = 'route "Survey"\nmetadata entrance_elevation=10m exit_elevation=6m region="Costa Rica" survey_team="A"\nstart "Entry"\nwalk distance=3m note="Approach"\nhazard type=snake severity=high note="Look carefully"\nnote "height=unknown"\nrappel drop height=5m rope=10m stages=2m+3m redirections=2m:left shape=direct survey_id="old 1"\nclimb rise height=2m inclination=50% exposure=low\nexit "End"';

function ast(attributes = {}, type = "walk") {
  return { name: "Input", metadata: {}, elements: [{ type, id: null, label: null, attributes, sourceLocation: { line: 2, column: 1 } }] };
}

function deepFreeze(value) {
  if (value !== null && typeof value === "object") Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

test("normalization keeps raw syntax and classified route metadata distinct", () => {
  const parsed = core.parseVrl(SOURCE).ast;
  const model = core.normalizeRoute(parsed);
  assert.deepEqual([parsed.metadata, model.metadata, model.extensions, Object.hasOwn(model, "source"), Object.hasOwn(model, "sourceMap")], [{ entrance_elevation: "10m", exit_elevation: "6m", region: "Costa Rica", survey_team: "A" }, { entrance_elevation: metric(10), exit_elevation: metric(6) }, { region: "Costa Rica", survey_team: "A" }, false, false]);
});

test("known technical values retain their types independently of extension text", () => {
  const element = core.normalizeRoute(core.parseVrl(SOURCE).ast).elements[4];
  assert.deepEqual([element.id, element.attributes, element.extensions], ["drop", { height: metric(5), rope: metric(10), stages: [metric(2), metric(3)], redirections: [{ distance: metric(2), side: "left" }], shape: "direct" }, { survey_id: "old 1" }]);
});

test("normalization conserves annotation order, text, and technical ownership", () => {
  const model = core.normalizeRoute(core.parseVrl(SOURCE).ast);
  assert.deepEqual([model.elements.map(({ type, id }) => [type, id]), model.elements[2].extensions, model.elements[3].extensions, model.traversal.annotations, model.traversal.segments.filter(({ kind }) => kind === "technical").map(({ elementIndex, direction, verticalDeltaMeters }) => [elementIndex, direction, verticalDeltaMeters])], [[ ["start", "S1"], ["walk", "W1"], ["hazard", "H1"], ["note", "N1"], ["rappel", "drop"], ["climb", "rise"], ["exit", "E1"] ], { type: "snake", note: "Look carefully" }, { text: "height=unknown" }, [{ elementIndex: 2, pointIndex: 1 }, { elementIndex: 3, pointIndex: 1 }], [[4, "down", -5], [5, "up", 1]]]);
});

test("drawing shape does not change the domain traversal", () => {
  assert.deepEqual(core.compileRoute(SOURCE.replace("shape=direct", "shape=ladder")).model.traversal, core.compileRoute(SOURCE).model.traversal);
});

test("validated known fields and extensions survive model-to-JSON round trips", () => {
  const result = core.compileRoute(SOURCE);
  assert.deepEqual(JSON.parse(result.json), result.model);
});

test("summaries use validated physical values and ignore similarly named extensions", () => {
  const model = core.compileRoute(SOURCE.replace('survey_team="A"', 'survey_team="A" requiredRopeMeters=9999')).model;
  assert.deepEqual(model.summary, { numberOfRappels: 1, numberOfHazards: 1, highestRappelMeters: 5, requiredRopeMeters: 10, totalDistanceMeters: 3, entranceElevationMeters: 10, exitElevationMeters: 6, totalElevationChangeMeters: 4 });
});

for (const type of ["start", "exit", "walk", "rappel", "downclimb", "climb", "pool", "hazard", "note"]) {
  test(`${type} separates extension keys without losing own-property names`, () => {
    const attributes = Object.fromEntries([["__proto__", "A"], ["constructor", "B"], ["toString", "C"], ["distance", "2m"]]);
    if (type === "rappel" || type === "climb") attributes.height = "3m";
    if (type === "rappel") attributes.rope = "5m";
    const element = core.normalizeElement(ast(attributes, type).elements[0], {});
    assert.deepEqual([Object.keys(element.extensions), Object.keys(element.attributes).filter((name) => ["__proto__", "constructor", "toString"].includes(name)), element.extensions.__proto__, element.attributes.distance], [["__proto__", "constructor", "toString"], [], "A", metric(2)]);
  });
}

for (const [type, field] of [["walk", "shape"], ["hazard", "type"], ["note", "exposure"], ["pool", "anchor"]]) {
  test(`out-of-scope ${field} on ${type} is never promoted to a validated field`, () => {
    const element = core.normalizeElement(ast({ [field]: "custom" }, type).elements[0], {});
    assert.deepEqual([element.attributes, element.extensions], [{}, { [field]: "custom" }]);
  });
}

for (const body of [
  'metadata height=-1m', 'metadata entrance_elevation=far', 'metadata anchor_count=0',
  'walk distance=0m', 'walk distance=NaNm', 'walk distance=1000000001m', 'walk distance=0.0000001m',
  'rappel height=5m', 'rappel rope=10m', 'rappel height="" rope=10m', 'climb',
  'rappel height=5m rope=10m stages=0m+5m', 'rappel height=5m rope=10m stages=2m++3m',
  'rappel height=5m rope=10m redirections=0m:left', 'rappel height=5m rope=10m redirections=2m:moon',
  'rappel height=5m rope=10m redirection=5m:left', 'walk height=3m redirections=4m',
  'rappel height=5m rope=10m shape=custom', 'rappel height=5m rope=10m anchor=custom',
  'climb height=1m exposure=wild', 'pool type=custom', 'hazard severity=custom',
  'walk flow=custom', 'walk inclination=0%', 'walk inclination=101%', 'walk anchor_count=9007199254740992'
]) {
  test(`direct normalization rejects invalid known fields: ${body}`, () => {
    assert.throws(() => core.normalizeRoute(core.parseVrl(`route Input\n${body}`).ast), RangeError);
  });
}

for (const attrs of [{ distance: "-1m" }, { stages: "1m++2m" }, { height: "1m", redirections: "1m:left" }]) {
  test(`standalone normalization rejects invalid fields without advancing counters: ${JSON.stringify(attrs)}`, () => {
    const counters = { walk: 4 };
    let failure;
    try { core.normalizeElement(ast(attrs).elements[0], counters); } catch (error) { failure = error; }
    assert.deepEqual([failure instanceof RangeError, counters], [true, { walk: 4 }]);
  });
}

for (const [label, input] of [
  ["null route", null], ["array route", []], ["date route", new Date(0)],
  ["null metadata", { ...ast(), metadata: null }], ["numeric metadata", { ...ast(), metadata: { region: 3 } }],
  ["object extension", ast({ extension: {} })], ["normalized metric", ast({ distance: metric(1) })],
  ["missing elements", { ...ast(), elements: undefined }], ["sparse elements", { ...ast(), elements: Array(1) }],
  ["unknown element", ast({}, "teleport")], ["non-string element type", ast({}, 1)],
  ["numeric label", { ...ast(), elements: [{ ...ast().elements[0], label: 42 }] }],
  ["missing attributes", { ...ast(), elements: [{ type: "walk" }] }],
  ...[null, {}, { line: 0, column: 1 }, { line: 1.5, column: 1 }, { line: 1, column: 0 }, { line: 1, column: Infinity }].map((sourceLocation) => [`location ${JSON.stringify(sourceLocation)}`, { ...ast(), elements: [{ ...ast().elements[0], sourceLocation }] }])
]) {
  test(`normalization rejects malformed raw input: ${label}`, () => {
    assert.throws(() => core.normalizeRoute(input), TypeError);
  });
}

for (const name of [undefined, null, "", 42]) {
  test(`normalization requires a nonempty string name: ${JSON.stringify(name)}`, () => {
    assert.throws(() => core.normalizeRoute({ ...ast(), name }), RangeError);
  });
  test(`semantic validation uses the same route-name invariant: ${JSON.stringify(name)}`, () => {
    assert.equal(core.validateRoute({ ...ast(), name })[0].code, "VRL_ROUTE_NAME_REQUIRED");
  });
}

test("raw records with null prototypes remain valid inputs", () => {
  const input = Object.assign(Object.create(null), { ...ast(), metadata: Object.create(null) });
  assert.equal(core.normalizeRoute(input).elements[0].id, "W1");
});

test("optional label and source point remain optional for programmatic elements", () => {
  const element = { type: "walk", attributes: {} };
  assert.deepEqual(core.normalizeElement(element), { type: "walk", id: "W1", label: null, attributes: {}, extensions: {}, sourceLocation: undefined });
});

test("syntax-only extra properties cannot leak into normalized elements", () => {
  const input = ast();
  input.elements[0].raw = "walk";
  input.elements[0].sourceMap = { offset: 1 };
  input.elements[0].sourceLocation.extra = {};
  assert.deepEqual(core.normalizeRoute(input).elements[0], { type: "walk", id: "W1", label: null, attributes: {}, extensions: {}, sourceLocation: { line: 2, column: 1 } });
});

test("normalization accepts frozen input without mutating syntax or provenance", () => {
  const input = core.parseVrl(SOURCE).ast;
  const before = structuredClone(input);
  core.normalizeRoute(deepFreeze(input));
  assert.deepEqual(input, before);
});

test("normalized value mutations cannot change the source or a subsequent result", () => {
  const input = core.parseVrl(SOURCE).ast;
  const before = structuredClone(input);
  const expected = core.normalizeRoute(input);
  const result = core.normalizeRoute(input);
  result.elements[4].attributes.stages[0].meters = 900;
  result.elements[4].attributes.redirections[0].side = "right";
  result.elements[4].extensions.survey_id = "changed";
  result.elements[4].sourceLocation.line = 99;
  result.extensions.region = "changed";
  assert.deepEqual([input, core.normalizeRoute(input)], [before, expected]);
});

test("failed normalization leaves input records untouched", () => {
  const input = ast({ height: "3m", rope: "4m", redirections: "3m" }, "rappel");
  const before = structuredClone(input);
  try { core.normalizeRoute(input); } catch { /* Inspect caller-owned input after rejection. */ }
  assert.deepEqual(input, before);
});

test("nonblocking rope and exact stage warnings still permit normalization", () => {
  const source = 'route Warnings\nrappel height=4m rope=2m stages=1m+2m';
  const result = core.compileRoute(source);
  assert.deepEqual([core.normalizeRoute(result.ast), result.diagnostics.map(({ severity }) => severity)], [result.model, ["warning", "warning"]]);
});

test("optional unmeasured downclimbs remain explicitly undetermined in the traversal", () => {
  assert.equal(core.normalizeRoute(core.parseVrl('route X\ndownclimb').ast).traversal.segments[0].verticalDeltaMeters, null);
});

test("legacy loose token conversion is distinct from invariant-bearing normalization", () => {
  assert.deepEqual(core.normalizeAttributes({ height: "-1m", note: "free text" }), { height: metric(-1), note: "free text" });
});

test("extension text cannot bypass normal known-field validation", () => {
  const compile = core.createRouteCompiler({ validate: () => [] });
  assert.throws(() => compile('route X\nrappel height=-1m rope=5m'), RangeError);
});

test("rendered notes, hazard symbols, and metadata retain separated descriptions", () => {
  const result = core.compileRoute(SOURCE);
  const svg = renderTopoSvg(result.model, result.layout);
  assert.deepEqual([formatElementDetail(result.model.elements[3]), isSnakeHazard(result.model.elements[2]), svg.includes("Costa Rica"), svg.includes("Look carefully")], ["height=unknown", true, true, true]);
});
