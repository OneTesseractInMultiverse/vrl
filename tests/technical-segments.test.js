import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute, computeElevationLayout, computeVerticalLayout, createRouteCompiler, createTraversal, normalizeRoute, parseVrl, technicalSegmentDelta, validateGeometry } from "@subvertic/core";
import { renderRouteSegments, renderTopoSvg, resolveTheme, segmentTechnicalElement } from "@subvertic/render-svg";

const PAIRS = [
  ["rappel", "rappel", -30, -5, 65],
  ["rappel", "downclimb", -30, -5, 65],
  ["rappel", "climb", -30, 5, 75],
  ["downclimb", "rappel", -30, -5, 65],
  ["downclimb", "downclimb", -30, -5, 65],
  ["downclimb", "climb", -30, 5, 75],
  ["climb", "rappel", 30, -5, 125],
  ["climb", "downclimb", 30, -5, 125],
  ["climb", "climb", 30, 5, 135]
];

function statement(type, id, height) {
  return `${type} "${id}" height=${height}m${type === "rappel" ? ` rope=${height * 2}m` : ""}`;
}

function pairSource(first, second, exit, boundaries = true) {
  return ['route "Adjacent features"', ...(exit === null ? [] : [`metadata entrance_elevation=100m exit_elevation=${exit}m`]),
    ...(boundaries ? ['start "Entry"'] : []), statement(first, "T1", 30), statement(second, "T2", 5), ...(boundaries ? ['exit "Finish"'] : [])].join("\n");
}

function technicalFacts(result) {
  return result.layout.segments.filter((segment) => segment.kind === "technical")
    .map((segment) => [segment.element.id, segment.direction, segment.verticalDeltaMeters]);
}

function slopeDirections(markup) {
  return [...markup.matchAll(/class="vrl-route-segment vrl-drop-slope" d="M [-\d.]+ ([-\d.]+) L [-\d.]+ ([-\d.]+)"/g)]
    .map((match) => Math.sign(Number(match[2]) - Number(match[1])));
}

for (const [first, second, firstDelta, secondDelta, exit] of PAIRS) {
  const expected = [["T1", firstDelta > 0 ? "up" : "down", firstDelta], ["T2", secondDelta > 0 ? "up" : "down", secondDelta]];
  test(`${first} then ${second}: each technical event retains its owner and signed change`, () => {
    assert.deepEqual(technicalFacts(compileRoute(pairSource(first, second, exit), { layout: { minNodeGap: 0 } })), expected);
  });
  test(`${first} then ${second}: actual boundary elevations conserve the declared motion`, () => {
    const result = compileRoute(pairSource(first, second, exit), { layout: { minNodeGap: 0 } });
    assert.deepEqual(result.layout.segments.filter((segment) => segment.kind === "technical").map((segment) => segment.end.elevationMeters - segment.start.elevationMeters), [firstDelta, secondDelta]);
  });
  test(`${first} then ${second}: elevation SVG draws both slopes in their declared directions`, () => {
    const result = compileRoute(pairSource(first, second, exit));
    assert.deepEqual(slopeDirections(renderTopoSvg(result.model, result.layout)), [-Math.sign(firstDelta), -Math.sign(secondDelta)]);
  });
  test(`${first} then ${second}: schematic SVG retains both directions without metadata`, () => {
    const result = compileRoute(pairSource(first, second, null));
    assert.deepEqual(slopeDirections(renderTopoSvg(result.model, result.layout)), [-Math.sign(firstDelta), -Math.sign(secondDelta)]);
  });
  test(`${first} then ${second}: first and last technical features need no start/exit statements`, () => {
    const result = compileRoute(pairSource(first, second, exit, false), { layout: { minNodeGap: 0 } });
    assert.deepEqual([technicalFacts(result), result.layout.points[0].elevationMeters, result.layout.points.at(-1).elevationMeters], [expected, 100, exit]);
  });
}

test("30 m rappel then 5 m climb has an explicit intermediate boundary at 70 m", () => {
  const result = compileRoute(pairSource("rappel", "climb", 75), { layout: { minNodeGap: 0 } });
  assert.deepEqual(result.layout.points.map((point) => [point.element?.type ?? "boundary", point.elevationMeters]), [["start", 100], ["rappel", 100], ["boundary", 70], ["climb", 75], ["exit", 75]]);
});

test("normalization records technical endpoints and ownership without coordinates", () => {
  const model = normalizeRoute(parseVrl('route "A"\nrappel "R1" height=30m rope=60m\nclimb "C1" height=5m').ast);
  assert.deepEqual(model.traversal, {
    points: [{ elementIndex: 0 }, { elementIndex: null }, { elementIndex: 1 }],
    annotations: [],
    segments: [
      { from: 0, to: 1, elementIndex: 0, kind: "technical", direction: "down", verticalDeltaMeters: -30 },
      { from: 1, to: 2, elementIndex: 1, kind: "technical", direction: "up", verticalDeltaMeters: 5 }
    ]
  });
});

test("boundaries do not invent extra route elements or labels", () => {
  const result = compileRoute(pairSource("rappel", "climb", 75));
  assert.deepEqual(result.layout.nodes.map((node) => node.element.id), result.model.elements.map((element) => element.id));
});

for (const type of ["rappel", "downclimb", "climb"]) {
  test(`standalone ${type} has a complete schematic segment and two distinct endpoints`, () => {
    const result = compileRoute(`route "One"\n${statement(type, "T1", 10)}`);
    const segment = result.layout.segments[0];
    assert.deepEqual([result.layout.nodes.length, result.layout.segments.length, segment.from, segment.to, Math.sign(segment.end.y - segment.start.y)], [1, 1, 0, 1, type === "climb" ? -1 : 1]);
  });
}

test("inclined adjacent features preserve independent vertical components", () => {
  const result = compileRoute('route "Inclined"\nmetadata entrance_elevation=100m exit_elevation=86.5m\nrappel height=30m rope=60m inclination=50%\nclimb height=5m inclination=30%', { layout: { minNodeGap: 0, pixelsPerMeter: 10 } });
  assert.deepEqual(result.layout.segments.map((segment) => [segment.verticalDeltaMeters, segment.technicalDeltaY]), [[-15, 150], [1.5, -15]]);
});

test("minimum spacing cannot reverse a climb smaller than one pixel", () => {
  const result = compileRoute('route "Small"\nmetadata entrance_elevation=0m exit_elevation=0.0001m\nclimb height=0.0001m', { layout: { pixelsPerMeter: 1, minNodeGap: 68 } });
  assert.deepEqual([result.layout.segments[0].technicalDeltaY, Math.sign(result.layout.points[1].y - result.layout.points[0].y)], [-1, -1]);
});

test("readable spacing does not change physical technical measurements", () => {
  const result = compileRoute('route "Short"\nmetadata entrance_elevation=20m exit_elevation=18m\nrappel height=3m rope=6m\nclimb height=1m', { layout: { pixelsPerMeter: 1, minNodeGap: 68 } });
  assert.deepEqual(result.layout.segments.map((segment) => [segment.verticalDeltaMeters, segment.technicalDeltaY, Math.abs(segment.end.y - segment.start.y)]), [[-3, 3, 68], [1, -1, 68]]);
});

test("contradictory technical-only elevations fail without usable output", () => {
  const result = compileRoute('route "Conflict"\nmetadata entrance_elevation=100m exit_elevation=80m\nrappel height=30m rope=60m\nclimb height=5m');
  assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.map((d) => [d.kind, d.severity, d.message])], [false, null, null, null, [["geometry", "error", "Declared technical motion is inconsistent with entrance and exit elevations."]]]);
});

test("inconsistent geometry prevents layout and export ports from running", () => {
  const calls = [];
  const compile = createRouteCompiler({ layout: () => calls.push("layout"), exportJson: () => calls.push("export") });
  compile('route "Conflict"\nmetadata entrance_elevation=100m exit_elevation=99m\nrappel height=10m rope=20m');
  assert.deepEqual(calls, []);
});

test("custom geometry validation can block the pipeline", () => {
  const compile = createRouteCompiler({ validateGeometry: () => [{ kind: "geometry", severity: "error", message: "Rejected", location: { line: 1, column: 1 } }] });
  assert.equal(compile('route "A"').ok, false);
});

test("schematic residual distribution is explicitly reported", () => {
  const result = compileRoute('route "Residual"\nmetadata entrance_elevation=100m exit_elevation=80m\nstart\nrappel height=30m rope=60m\nclimb height=5m\nexit');
  assert.deepEqual(result.diagnostics.map((diagnostic) => [diagnostic.kind, diagnostic.severity, diagnostic.message]), [["geometry", "warning", "Intermediate elevations are underdetermined; remaining elevation is distributed schematically across connections."]]);
});

test("residual distribution leaves both technical deltas unchanged", () => {
  const result = compileRoute('route "Residual"\nmetadata entrance_elevation=100m exit_elevation=80m\nstart\nrappel height=30m rope=60m\nclimb height=5m\nexit', { layout: { minNodeGap: 0 } });
  assert.deepEqual(result.layout.segments.filter((segment) => segment.kind === "technical").map((segment) => segment.end.elevationMeters - segment.start.elevationMeters), [-30, 5]);
});

test("missing downclimb height remains unknown in a schematic model", () => {
  const result = compileRoute('route "Unknown"\ndownclimb');
  assert.deepEqual([result.ok, result.model.traversal.segments[0].verticalDeltaMeters, result.diagnostics[0].severity], [true, null, "warning"]);
});

test("missing technical height blocks an elevation-based profile", () => {
  const result = compileRoute('route "Unknown"\nmetadata entrance_elevation=100m exit_elevation=90m\nstart\ndownclimb\nexit');
  assert.deepEqual([result.ok, result.diagnostics[0].severity, result.diagnostics[0].location], [false, "error", { line: 4, column: 1 }]);
});

test("partial elevation metadata keeps schematic geometry without inventing an endpoint", () => {
  const result = compileRoute('route "Partial"\nmetadata entrance_elevation=100m\nrappel height=30m rope=60m\nclimb height=5m');
  assert.deepEqual([result.layout.elevation, slopeDirections(renderTopoSvg(result.model, result.layout))], [undefined, [1, -1]]);
});

test("decimal roundoff does not reject a consistent technical profile", () => {
  assert.equal(compileRoute('route "Decimal"\nmetadata entrance_elevation=0.3m exit_elevation=0m\nrappel height=0.1m rope=1m\nrappel height=0.2m rope=1m').ok, true);
});

test("physical endpoint elevations retain sub-centimeter technical motion", () => {
  const result = compileRoute('route "Precise"\nmetadata entrance_elevation=0m exit_elevation=0.015m\nclimb height=0.015m');
  assert.equal(result.layout.points[1].elevationMeters - result.layout.points[0].elevationMeters, 0.015);
});

test("floating-point tolerance does not hide a measurable elevation contradiction", () => {
  assert.equal(compileRoute('route "Conflict"\nmetadata entrance_elevation=100000000m exit_elevation=0.01m\nrappel height=100000000m rope=100000000m').ok, false);
});

test("standalone elevation layout rejects missing endpoint metadata", () => {
  assert.throws(() => computeElevationLayout({ elements: [] }), /requires entrance and exit/);
});

test("standalone elevation layout rejects contradictory technical motion", () => {
  const model = normalizeRoute(parseVrl('route "Bad"\nmetadata entrance_elevation=100m exit_elevation=99m\nclimb height=5m').ast);
  assert.throws(() => computeElevationLayout(model), /inconsistent/);
});

test("an empty route can preserve equal entrance and exit elevations", () => {
  assert.equal(compileRoute('route "Empty"\nmetadata entrance_elevation=10m exit_elevation=10m').layout.height, 172);
});

test("non-elevation empty traversal has no invented endpoints", () => {
  assert.deepEqual(createTraversal([]), { points: [], segments: [], annotations: [] });
});

test("geometry validation handles a manually assembled model without traversal", () => {
  assert.deepEqual(validateGeometry({ elements: [] }), []);
});

test("layout can derive traversal for existing normalized element-only models", () => {
  const model = { elements: [{ type: "rappel", id: "R1", attributes: { height: { meters: 30 } } }, { type: "climb", id: "C1", attributes: { height: { meters: 5 } } }] };
  assert.deepEqual(computeVerticalLayout(model).segments.map((segment) => segment.verticalDeltaMeters), [-30, 5]);
});

test("annotations stay with their technical owner across a shared gap", () => {
  const result = compileRoute('route "Annotations"\nrappel "R1" height=30m rope=60m anchor=bolts anchor_count=2 stages=12m+18m redirection=10m:left\nclimb "C1" height=5m');
  assert.deepEqual(result.layout.segments.map((segment) => [segment.element.id, segment.element.attributes.anchor_count ?? null, segment.element.attributes.stages?.map((stage) => stage.meters) ?? [], segment.element.attributes.redirection?.map((anchor) => [anchor.distance.meters, anchor.side]) ?? []]), [["R1", "2", [12, 18], [[10, "left"]]], ["C1", null, [], []]]);
});

test("adjacent climb does not consume the rappel's stage labels and redirection", () => {
  const result = compileRoute('route "Annotations"\nrappel height=30m rope=60m stages=12m+18m redirection=10m:left\nclimb height=5m');
  const markup = renderTopoSvg(result.model, result.layout);
  assert.deepEqual([(markup.match(/class="vrl-rappel-stage-label"/g) ?? []).length, (markup.match(/class="vrl-redirection-anchor"/g) ?? []).length, slopeDirections(markup)], [2, 1, [1, -1]]);
});

for (const shape of ["ladder", "direct", "slab"]) {
  test(`${shape} shapes preserve adjacent descent/ascent direction`, () => {
    const result = compileRoute(`route "Shapes"\nrappel height=30m rope=60m shape=${shape}\nclimb height=5m shape=${shape}`);
    assert.deepEqual(slopeDirections(renderTopoSvg(result.model, result.layout)), [1, -1]);
  });
}

test("legacy scalar delta represents the net of both technical events", () => {
  assert.equal(technicalSegmentDelta({ type: "rappel", attributes: { height: { meters: 30 } } }, { type: "climb", attributes: { height: { meters: 5 } } }), 25);
});

test("legacy single-owner helper rejects an ambiguous two-event gap", () => {
  assert.throws(() => segmentTechnicalElement({ element: { type: "downclimb" } }, { element: { type: "climb" } }), /two technical elements/);
});

test("renderer rejects old node-only layouts instead of losing technical events", () => {
  assert.throws(() => renderRouteSegments({ nodes: [] }, resolveTheme()), /requires layout.segments/);
});

test("compiled JSON retains both technical events and their endpoints", () => {
  const result = compileRoute(pairSource("rappel", "climb", 75));
  assert.deepEqual(JSON.parse(result.json).traversal.segments.filter((segment) => segment.kind === "technical").map((segment) => [segment.from, segment.to, segment.elementIndex, segment.verticalDeltaMeters]), [[1, 2, 1, -30], [2, 3, 2, 5]]);
});

test("repeated compilation and SVG rendering are deterministic", () => {
  const source = pairSource("rappel", "climb", 75);
  const first = compileRoute(source);
  const second = compileRoute(source);
  assert.deepEqual([first, renderTopoSvg(first.model, first.layout)], [second, renderTopoSvg(second.model, second.layout)]);
});

test("layout and rendering do not mutate the normalized model", () => {
  const model = normalizeRoute(parseVrl(pairSource("downclimb", "climb", 75)).ast);
  const before = JSON.stringify(model);
  renderTopoSvg(model, computeVerticalLayout(model));
  assert.equal(JSON.stringify(model), before);
});
