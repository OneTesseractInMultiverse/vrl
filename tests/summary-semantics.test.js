import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { compileRoute, normalizeRoute, parseVrl, summarizeRoute, summarizeRouteMeasurements, validateRoute } from "@subvertic/core";
import { createDiagramState } from "@subvertic/diagram";

const unknown = {
  maximumDeclaredRopeMeters: null, declaredRopeCount: 0, rappelCount: 0,
  summedWalkDistanceMeters: null, measuredWalkCount: 0, walkCount: 0,
  declaredTotalDistanceMeters: null, declaredTotalDescentMeters: null, endpointElevationChangeMeters: null
};
const record = meters => ({ value: meters, unit: "m", meters });
function compile(lines) { return compileRoute(["route Summary", ...lines].join("\n")); }
function measurements(lines) {
  const { model, diagnostics } = compile(lines);
  if (model === null) throw new Error(JSON.stringify(diagnostics));
  return summarizeRouteMeasurements(model.elements, model.metadata);
}

for (const [name, lines, expected] of [
  ["empty route", [], unknown],
  ["declared totals only", ["metadata total_distance=900m total_descent=200m"], { ...unknown, declaredTotalDistanceMeters: 900, declaredTotalDescentMeters: 200 }],
  ["known walk distances only", ["walk distance=3m", "walk distance=4m"], { ...unknown, summedWalkDistanceMeters: 7, measuredWalkCount: 2, walkCount: 2 }],
  ["missing walk distances", ["walk", "walk"], { ...unknown, walkCount: 2 }],
  ["partially recorded walks", ["walk distance=3m", "walk"], { ...unknown, summedWalkDistanceMeters: 3, measuredWalkCount: 1, walkCount: 2 }],
  ["separate declared total", ["metadata total_distance=100m", "walk distance=3m", "walk"], { ...unknown, declaredTotalDistanceMeters: 100, summedWalkDistanceMeters: 3, measuredWalkCount: 1, walkCount: 2 }],
  ["declared rope maximum", ["rappel height=4m rope=12m", "rappel height=7m rope=10m"], { ...unknown, maximumDeclaredRopeMeters: 12, declaredRopeCount: 2, rappelCount: 2 }],
  ["rope warning preserves smaller declaration", ["rappel height=20m rope=5m"], { ...unknown, maximumDeclaredRopeMeters: 5, declaredRopeCount: 1, rappelCount: 1 }],
  ["mixed progression excludes other lengths", ["metadata total_distance=100m", "walk distance=8m traverse=20m", "rappel height=10m rope=20m distance=30m traverse=40m stages=4m+6m", "pool distance=3m", "climb height=2m distance=5m"], { ...unknown, maximumDeclaredRopeMeters: 20, declaredRopeCount: 1, rappelCount: 1, summedWalkDistanceMeters: 8, measuredWalkCount: 1, walkCount: 1, declaredTotalDistanceMeters: 100 }],
  ["rope on other contexts is excluded", ["metadata rope=100m", "walk rope=200m", "hazard rope=300m"], { ...unknown, walkCount: 1 }],
  ["one endpoint stays unknown", ["metadata entrance_elevation=0m"], unknown],
  ["only exit stays unknown", ["metadata exit_elevation=10m"], unknown],
  ["known level endpoints retain zero", ["metadata entrance_elevation=0m exit_elevation=0m", "start", "exit"], { ...unknown, endpointElevationChangeMeters: 0 }],
  ["net ascent is negative and distinct from descent", ["metadata entrance_elevation=100m exit_elevation=110m total_descent=20m", "start", "climb height=10m", "exit"], { ...unknown, declaredTotalDescentMeters: 20, endpointElevationChangeMeters: -10 }]
]) {
  test(`${name} retains measurement provenance and unknown states`, () => {
    assert.deepEqual(measurements(lines), expected);
  });
}

test("partial compatible records disclose missing rope observations without inventing equipment", () => {
  const elements = [{ type: "rappel", attributes: {} }, { type: "rappel", attributes: { rope: record(10) } }];
  assert.deepEqual(summarizeRouteMeasurements(elements), { ...unknown, maximumDeclaredRopeMeters: 10, declaredRopeCount: 1, rappelCount: 2 });
});
test("a rappel without any supplied rope observation remains unknown", () => {
  assert.deepEqual(summarizeRouteMeasurements([{ type: "rappel", attributes: {} }]), { ...unknown, rappelCount: 1 });
});
test("summary helpers preserve legacy zero sentinels and existing keys", () => {
  assert.deepEqual(summarizeRoute([]), { numberOfRappels: 0, numberOfHazards: 0, highestRappelMeters: 0, requiredRopeMeters: 0, totalDistanceMeters: 0, entranceElevationMeters: null, exitElevationMeters: null, totalElevationChangeMeters: 0 });
});
test("saved revision 1 model serialization is unchanged", () => {
  const fixture = JSON.parse(readFileSync(new URL("./fixtures/model-v1.json", import.meta.url), "utf8"));
  assert.deepEqual(JSON.parse(compileRoute(fixture.source).json), fixture.model);
});
test("legacy distance and rope fields retain their historical partial-data meaning", () => {
  const result = compile(["metadata total_distance=100m", "walk distance=3m", "rappel height=7m rope=5m traverse=9m"]);
  assert.deepEqual([result.model.summary.requiredRopeMeters, result.model.summary.totalDistanceMeters, JSON.parse(result.json).summary], [5, 3, result.model.summary]);
});
test("the new helper does not alter serialized models or frozen input records", () => {
  const model = compile(["walk distance=3m", "rappel height=5m rope=10m"]).model;
  const before = JSON.stringify(model);
  for (const element of model.elements) { Object.values(element.attributes).forEach(Object.freeze); Object.freeze(element.attributes); Object.freeze(element); }
  Object.freeze(model.elements); Object.freeze(model.metadata);
  summarizeRouteMeasurements(model.elements, model.metadata);
  assert.equal(JSON.stringify(model), before);
});
test("summaries are independently owned and deterministic across interleaved calls", () => {
  const first = measurements(["walk distance=3m"]); first.summedWalkDistanceMeters = 999;
  measurements(["walk distance=7m"]);
  assert.deepEqual(measurements(["walk distance=3m"]), { ...unknown, summedWalkDistanceMeters: 3, measuredWalkCount: 1, walkCount: 1 });
});
test("recorded walk arithmetic retains ordinary floating-point JSON fidelity", () => {
  const result = measurements(["walk distance=0.1m", "walk distance=0.2m"]);
  assert.deepEqual([result.summedWalkDistanceMeters, JSON.parse(JSON.stringify(result)).summedWalkDistanceMeters], [0.30000000000000004, 0.30000000000000004]);
});

for (const [name, lines] of [
  ["absent total", ["walk distance=2m"]],
  ["no recorded walks", ["metadata total_distance=1m", "walk"]],
  ["equal total", ["metadata total_distance=3m", "walk distance=1m", "walk distance=2m"]],
  ["larger total is not a contradiction", ["metadata total_distance=4m", "walk distance=3m", "walk"]],
  ["exact decimal equality", ["metadata total_distance=0.3m", "walk distance=0.1m", "walk distance=0.2m"]],
  ["trailing zeros", ["metadata total_distance=0.300000m", "walk distance=0.10m", "walk distance=0.20m"]],
  ["technical lengths not comparable", ["metadata total_distance=1m", "rappel height=20m rope=40m traverse=50m distance=60m"]]
]) {
  test(`${name} produces no false total-distance warning`, () => {
    assert.deepEqual(compile(lines).diagnostics, []);
  });
}
for (const [total, walks] of [["2m", ["1m", "2m"]], ["0.3m", ["0.1m", "0.200001m"]], ["1000000000m", ["1000000000m", "1000000000m"]]]) {
  test(`declared ${total} smaller than recorded ${walks.join("+")} warns without blocking`, () => {
    const result = compile([`metadata total_distance=${total}`, ...walks.map(value => `walk distance=${value}`)]);
    assert.deepEqual([result.ok, result.diagnostics.map(d => [d.kind, d.severity, d.code]), result.model.metadata.total_distance.meters, result.model.elements.map(e => e.attributes.distance.meters), JSON.parse(result.json).metadata], [true, [["validation", "warning", "VRL_TOTAL_DISTANCE_BELOW_WALK_SUM"]], Number(total.slice(0, -1)), walks.map(value => Number(value.slice(0, -1))), result.model.metadata]);
  });
}
test("the conflict points to the original declared total on repeated metadata lines", () => {
  const result = compile(["metadata country=CR", 'metadata total_distance="2m"', "walk distance=3m"]);
  assert.deepEqual([result.diagnostics[0].location, result.diagnostics[0].span], [{ line: 3, column: 25 }, { start: { line: 3, column: 25 }, end: { line: 3, column: 29 } }]);
});
test("programmatic AST conflicts retain the legacy fallback source point", () => {
  const ast = { name: "Conflict", metadata: { total_distance: "2m" }, elements: [{ type: "walk", attributes: { distance: "3m" } }] };
  assert.deepEqual(validateRoute(ast).map(d => [d.code, d.location]), [["VRL_TOTAL_DISTANCE_BELOW_WALK_SUM", { line: 1, column: 1 }]]);
});
test("source validation ignores inherited totals and inherited walk distances", () => {
  const ast = { name: "Own fields", metadata: Object.create({ total_distance: "1m" }), elements: [{ type: "walk", attributes: { distance: "3m" } }] };
  const other = { ...ast, metadata: { total_distance: "1m" }, elements: [{ type: "walk", attributes: Object.create({ distance: "3m" }) }] };
  assert.deepEqual([validateRoute(ast), validateRoute(other)], [[], []]);
});
test("direct normalization preserves conflicting facts without fabricating a corrected total", () => {
  const model = normalizeRoute(parseVrl("route Conflict\nmetadata total_distance=2m\nwalk distance=3m").ast);
  assert.deepEqual(summarizeRouteMeasurements(model.elements, model.metadata), { ...unknown, declaredTotalDistanceMeters: 2, summedWalkDistanceMeters: 3, measuredWalkCount: 1, walkCount: 1 });
});
test("distance warnings flow into shared diagram state while preserving the SVG", () => {
  const result = createDiagramState("route Conflict\nmetadata total_distance=2m\nwalk distance=3m");
  assert.deepEqual([result.ok, result.svg.startsWith("<svg "), result.diagnostics.map(d => d.code)], [true, true, ["VRL_TOTAL_DISTANCE_BELOW_WALK_SUM"]]);
});
for (const lines of [
  ["metadata total_distance=banana", "walk distance=3m"],
  ["metadata total_distance=1m", "walk distance=banana"],
  ["metadata total_distance=1m", "walk distance=-3m"],
  ["metadata total_distance=1m", "rappel height=3m"],
  ["metadata total_distance=0m", "walk distance=3m"]
]) {
  test(`invalid fields suppress aggregate comparison: ${lines.join(" / ")}`, () => {
    const result = compile(lines);
    assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.some(d => d.code === "VRL_TOTAL_DISTANCE_BELOW_WALK_SUM")], [false, null, null, null, false]);
  });
}
for (const value of [null, "1m", 1, false]) {
  test(`new summary rejects a non-record measurement: ${value}`, () => {
    assert.throws(() => summarizeRouteMeasurements([{ type: "walk", attributes: { distance: value } }]), TypeError);
  });
}
for (const meters of [NaN, Infinity, -Infinity, Number.MAX_VALUE, undefined, "1"]) {
  test(`new summary rejects unsupported numeric data: ${meters}`, () => {
    assert.throws(() => summarizeRouteMeasurements([], { total_distance: { meters } }), RangeError);
  });
}
test("a new summary cannot silently overflow its recorded walk sum", () => {
  const walk = { type: "walk", attributes: { distance: record(Number.MAX_SAFE_INTEGER) } };
  assert.throws(() => summarizeRouteMeasurements([walk, walk]), RangeError);
});
test("a new summary cannot silently overflow its endpoint difference", () => {
  assert.throws(() => summarizeRouteMeasurements([], { entrance_elevation: record(Number.MAX_SAFE_INTEGER), exit_elevation: record(-Number.MAX_SAFE_INTEGER) }), RangeError);
});
test("large compatible collections do not expand arguments into the call stack", () => {
  const rappel = { type: "rappel", attributes: { rope: record(10) } };
  assert.deepEqual(summarizeRouteMeasurements(Array(150_000).fill(rappel)), { ...unknown, maximumDeclaredRopeMeters: 10, declaredRopeCount: 150_000, rappelCount: 150_000 });
});
