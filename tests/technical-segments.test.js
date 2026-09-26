import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute, computeElevationLayout, computeVerticalLayout, createRouteCompiler, createTraversal, normalizeRoute, parseVrl, technicalSegmentDelta, validateGeometry } from "@subvertic/vrl-core";
import { renderRouteSegments, renderTopoSvg, resolveTheme, segmentTechnicalElement } from "@subvertic/vrl-render-svg";

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

/**
 * Build one technical VRL statement, adding declared rope only for rappels.
 * @responsibility computation
 * @param {unknown} type - Declared element or record discriminator.
 * @param {unknown} id - Explicit or already allocated route element identifier.
 * @param {unknown} height - Declared height or drawing extent in the units described by the owning operation.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
function statement(type, id, height) {
  return `${type} "${id}" height=${height}m${type === "rappel" ? ` rope=${height * 2}m` : ""}`;
}

/**
 * Construct adjacent technical features with optional explicit boundaries and independently supplied exit
 * elevation.
 * @responsibility computation
 * @param {unknown} first - First declaration involved in a duplicate-identity problem, or null.
 * @param {unknown} second - Second element or record in the fixture's pair.
 * @param {unknown} exit - Independently declared exit elevation in meters.
 * @param {unknown} boundaries - Whether the fixture includes explicit start and exit declarations; defaults to true.
 * @returns {string} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function pairSource(first, second, exit, boundaries = true) {
  return ['route "Adjacent features"', ...(exit === null ? [] : [`metadata entrance_elevation=100m exit_elevation=${exit}m`]),
    ...(boundaries ? ['start "Entry"'] : []), statement(first, "T1", 30), statement(second, "T2", 5), ...(boundaries ? ['exit "Finish"'] : [])].join("\n");
}

/**
 * Project technical owner, direction and signed-delta facts for comparison with independently declared events.
 * @responsibility computation
 * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
 * @returns {Array} The result returned by result.layout.segments.filter((segment) => segment.kind === "technical").map.
 */
function technicalFacts(result) {
  return result.layout.segments.filter(/**
   * Evaluate the selection condition segment.kind === "technical".
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (segment) => segment.kind === "technical")
    .map(/**
     * Project the current entry into an ordered tuple for result.layout.segments.filter((segment) => segment.kind
     * === "technical").map.
     * @responsibility computation
     * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
     * @returns {Array} The ordered records or values assembled above.
     */ (segment) => [segment.element.id, segment.direction, segment.verticalDeltaMeters]);
}

/**
 * Read each emitted straight slope's start/end y coordinates and project its signed traversal direction.
 * @responsibility computation
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function slopeDirections(markup) {
  return [...markup.matchAll(/class="vrl-route-segment vrl-drop-slope" d="M [-\d.]+ ([-\d.]+) L [-\d.]+ ([-\d.]+)"/g)]
    .map(/**
     * Apply Math.sign to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} match - Regular-expression match including the capture groups consumed below.
     * @returns {unknown} The result returned by Math.sign.
     */ (match) => Math.sign(Number(match[2]) - Number(match[1])));
}

for (const [first, second, firstDelta, secondDelta, exit] of PAIRS) {
  const expected = [["T1", firstDelta > 0 ? "up" : "down", firstDelta], ["T2", secondDelta > 0 ? "up" : "down", secondDelta]];
  test(`${first} then ${second}: each technical event retains its owner and signed change`, /**
   * Verify ${first} then ${second}: each technical event retains its owner and signed change; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(technicalFacts(compileRoute(pairSource(first, second, exit), { layout: { minNodeGap: 0 } })), expected);
  });
  test(`${first} then ${second}: actual boundary elevations conserve the declared motion`, /**
   * Verify ${first} then ${second}: actual boundary elevations conserve the declared motion; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(pairSource(first, second, exit), { layout: { minNodeGap: 0 } });
    assert.deepEqual(result.layout.segments.filter(/**
     * Evaluate the selection condition segment.kind === "technical".
     * @responsibility computation
     * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ (segment) => segment.kind === "technical").map(/**
     * Compute segment.end.elevationMeters - segment.start.elevationMeters.
     * @responsibility computation
     * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
     * @returns {number} The result of the documented comparison or calculation.
     */ (segment) => segment.end.elevationMeters - segment.start.elevationMeters), [firstDelta, secondDelta]);
  });
  test(`${first} then ${second}: elevation SVG draws both slopes in their declared directions`, /**
   * Verify ${first} then ${second}: elevation SVG draws both slopes in their declared directions; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(pairSource(first, second, exit));
    assert.deepEqual(slopeDirections(renderTopoSvg(result.model, result.layout)), [-Math.sign(firstDelta), -Math.sign(secondDelta)]);
  });
  test(`${first} then ${second}: schematic SVG retains both directions without metadata`, /**
   * Verify ${first} then ${second}: schematic SVG retains both directions without metadata; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(pairSource(first, second, null));
    assert.deepEqual(slopeDirections(renderTopoSvg(result.model, result.layout)), [-Math.sign(firstDelta), -Math.sign(secondDelta)]);
  });
  test(`${first} then ${second}: first and last technical features need no start/exit statements`, /**
   * Verify ${first} then ${second}: first and last technical features need no start/exit statements; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(pairSource(first, second, exit, false), { layout: { minNodeGap: 0 } });
    assert.deepEqual([technicalFacts(result), result.layout.points[0].elevationMeters, result.layout.points.at(-1).elevationMeters], [expected, 100, exit]);
  });
}

test("30 m rappel then 5 m climb has an explicit intermediate boundary at 70 m", /**
 * Verify 30 m rappel then 5 m climb has an explicit intermediate boundary at 70 m; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(pairSource("rappel", "climb", 75), { layout: { minNodeGap: 0 } });
  assert.deepEqual(result.layout.points.map(/**
   * Project the current entry into an ordered tuple for result.layout.points.map.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {Array} The ordered records or values assembled above.
   */ (point) => [point.element?.type ?? "boundary", point.elevationMeters]), [["start", 100], ["rappel", 100], ["boundary", 70], ["climb", 75], ["exit", 75]]);
});

test("normalization records technical endpoints and ownership without coordinates", /**
 * Verify normalization records technical endpoints and ownership without coordinates; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
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

test("boundaries do not invent extra route elements or labels", /**
 * Verify boundaries do not invent extra route elements or labels; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(pairSource("rappel", "climb", 75));
  assert.deepEqual(result.layout.nodes.map(/**
   * Project node.element.id from the current record.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {unknown} The node.element.id value selected or validated above.
   */ (node) => node.element.id), result.model.elements.map(/**
   * Project element.id from the current record.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The element.id value selected or validated above.
   */ (element) => element.id));
});

for (const type of ["rappel", "downclimb", "climb"]) {
  test(`standalone ${type} has a complete schematic segment and two distinct endpoints`, /**
   * Verify standalone ${type} has a complete schematic segment and two distinct endpoints; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(`route "One"\n${statement(type, "T1", 10)}`);
    const segment = result.layout.segments[0];
    assert.deepEqual([result.layout.nodes.length, result.layout.segments.length, segment.from, segment.to, Math.sign(segment.end.y - segment.start.y)], [1, 1, 0, 1, type === "climb" ? -1 : 1]);
  });
}

test("inclined adjacent features preserve independent vertical components", /**
 * Verify inclined adjacent features preserve independent vertical components; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Inclined"\nmetadata entrance_elevation=100m exit_elevation=86.5m\nrappel height=30m rope=60m inclination=50%\nclimb height=5m inclination=30%', { layout: { minNodeGap: 0, pixelsPerMeter: 10 } });
  assert.deepEqual(result.layout.segments.map(/**
   * Project the current entry into an ordered tuple for result.layout.segments.map.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {Array} The ordered records or values assembled above.
   */ (segment) => [segment.verticalDeltaMeters, segment.technicalDeltaY]), [[-15, 150], [1.5, -15]]);
});

test("minimum spacing cannot reverse a climb smaller than one pixel", /**
 * Verify minimum spacing cannot reverse a climb smaller than one pixel; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Small"\nmetadata entrance_elevation=0m exit_elevation=0.0001m\nclimb height=0.0001m', { layout: { pixelsPerMeter: 1, minNodeGap: 68 } });
  assert.deepEqual([result.layout.segments[0].technicalDeltaY, Math.sign(result.layout.points[1].y - result.layout.points[0].y)], [-1, -1]);
});

test("readable spacing does not change physical technical measurements", /**
 * Verify readable spacing does not change physical technical measurements; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Short"\nmetadata entrance_elevation=20m exit_elevation=18m\nrappel height=3m rope=6m\nclimb height=1m', { layout: { pixelsPerMeter: 1, minNodeGap: 68 } });
  assert.deepEqual(result.layout.segments.map(/**
   * Project the current entry into an ordered tuple for result.layout.segments.map.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {Array} The ordered records or values assembled above.
   */ (segment) => [segment.verticalDeltaMeters, segment.technicalDeltaY, Math.abs(segment.end.y - segment.start.y)]), [[-3, 3, 68], [1, -1, 68]]);
});

test("contradictory technical-only elevations fail without usable output", /**
 * Verify contradictory technical-only elevations fail without usable output; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Conflict"\nmetadata entrance_elevation=100m exit_elevation=80m\nrappel height=30m rope=60m\nclimb height=5m');
  assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.map(/**
   * Project the current entry into an ordered tuple for result.diagnostics.map.
   * @responsibility computation
   * @param {unknown} d - Current diagnostic or drawing record in the projection.
   * @returns {Array} The ordered records or values assembled above.
   */ (d) => [d.kind, d.severity, d.message])], [false, null, null, null, [["geometry", "error", "Declared technical motion is inconsistent with entrance and exit elevations."]]]);
});

test("inconsistent geometry prevents layout and export ports from running", /**
 * Verify inconsistent geometry prevents layout and export ports from running; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const calls = [];
  const compile = createRouteCompiler({ /**
   * Supply the layout test double and record its invocation in caller-owned fixture state; return the
   * scenario's deliberately selected value. No production I/O is performed by this fixture.
   * @responsibility computation
   * @returns {unknown} The result returned by calls.push.
   */ layout: () => calls.push("layout"), /**
    * Supply the exportJson test double and record its invocation in caller-owned fixture state; return the
    * scenario's deliberately selected value. No production I/O is performed by this fixture.
    * @responsibility computation
    * @returns {unknown} The result returned by calls.push.
    */ exportJson: () => calls.push("export") });
  compile('route "Conflict"\nmetadata entrance_elevation=100m exit_elevation=99m\nrappel height=10m rope=20m');
  assert.deepEqual(calls, []);
});

test("custom geometry validation can block the pipeline", /**
 * Verify custom geometry validation can block the pipeline; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compile = createRouteCompiler({ /**
   * Supply the validateGeometry test double; return the scenario's deliberately selected value. No production
   * I/O is performed by this fixture.
   * @responsibility computation
   * @returns {Array} The ordered records or values assembled above.
   */ validateGeometry: () => [{ kind: "geometry", severity: "error", message: "Rejected", location: { line: 1, column: 1 } }] });
  assert.equal(compile('route "A"').ok, false);
});

test("schematic residual distribution is explicitly reported", /**
 * Verify schematic residual distribution is explicitly reported; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Residual"\nmetadata entrance_elevation=100m exit_elevation=80m\nstart\nrappel height=30m rope=60m\nclimb height=5m\nexit');
  assert.deepEqual(result.diagnostics.map(/**
   * Project the current entry into an ordered tuple for result.diagnostics.map.
   * @responsibility computation
   * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
   * @returns {Array} The ordered records or values assembled above.
   */ (diagnostic) => [diagnostic.kind, diagnostic.severity, diagnostic.message]), [["geometry", "warning", "Intermediate elevations are underdetermined; remaining elevation is distributed schematically across connections."]]);
});

test("residual distribution leaves both technical deltas unchanged", /**
 * Verify residual distribution leaves both technical deltas unchanged; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Residual"\nmetadata entrance_elevation=100m exit_elevation=80m\nstart\nrappel height=30m rope=60m\nclimb height=5m\nexit', { layout: { minNodeGap: 0 } });
  assert.deepEqual(result.layout.segments.filter(/**
   * Evaluate the selection condition segment.kind === "technical".
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (segment) => segment.kind === "technical").map(/**
   * Compute segment.end.elevationMeters - segment.start.elevationMeters.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {number} The result of the documented comparison or calculation.
   */ (segment) => segment.end.elevationMeters - segment.start.elevationMeters), [-30, 5]);
});

test("missing downclimb height remains unknown in a schematic model", /**
 * Verify missing downclimb height remains unknown in a schematic model; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Unknown"\ndownclimb');
  assert.deepEqual([result.ok, result.model.traversal.segments[0].verticalDeltaMeters, result.diagnostics[0].severity], [true, null, "warning"]);
});

test("missing technical height blocks an elevation-based profile", /**
 * Verify missing technical height blocks an elevation-based profile; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Unknown"\nmetadata entrance_elevation=100m exit_elevation=90m\nstart\ndownclimb\nexit');
  assert.deepEqual([result.ok, result.diagnostics[0].severity, result.diagnostics[0].location], [false, "error", { line: 4, column: 1 }]);
});

test("partial elevation metadata keeps schematic geometry without inventing an endpoint", /**
 * Verify partial elevation metadata keeps schematic geometry without inventing an endpoint; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Partial"\nmetadata entrance_elevation=100m\nrappel height=30m rope=60m\nclimb height=5m');
  assert.deepEqual([result.layout.elevation, slopeDirections(renderTopoSvg(result.model, result.layout))], [undefined, [1, -1]]);
});

test("decimal roundoff does not reject a consistent technical profile", /**
 * Verify decimal roundoff does not reject a consistent technical profile; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(compileRoute('route "Decimal"\nmetadata entrance_elevation=0.3m exit_elevation=0m\nrappel height=0.1m rope=1m\nrappel height=0.2m rope=1m').ok, true);
});

test("physical endpoint elevations retain sub-centimeter technical motion", /**
 * Verify physical endpoint elevations retain sub-centimeter technical motion; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Precise"\nmetadata entrance_elevation=0m exit_elevation=0.015m\nclimb height=0.015m');
  assert.equal(result.layout.points[1].elevationMeters - result.layout.points[0].elevationMeters, 0.015);
});

test("floating-point tolerance does not hide a measurable elevation contradiction", /**
 * Verify floating-point tolerance does not hide a measurable elevation contradiction; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(compileRoute('route "Conflict"\nmetadata entrance_elevation=100000000m exit_elevation=0.01m\nrappel height=100000000m rope=100000000m').ok, false);
});

test("standalone elevation layout rejects missing endpoint metadata", /**
 * Verify standalone elevation layout rejects missing endpoint metadata; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise computeElevationLayout so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by computeElevationLayout.
   */ () => computeElevationLayout({ elements: [] }), /requires entrance and exit/);
});

test("standalone elevation layout rejects contradictory technical motion", /**
 * Verify standalone elevation layout rejects contradictory technical motion; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = normalizeRoute(parseVrl('route "Bad"\nmetadata entrance_elevation=100m exit_elevation=99m\nclimb height=5m').ast);
  assert.throws(/**
   * Exercise computeElevationLayout so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by computeElevationLayout.
   */ () => computeElevationLayout(model), /inconsistent/);
});

test("an empty route can preserve equal entrance and exit elevations", /**
 * Verify an empty route can preserve equal entrance and exit elevations; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(compileRoute('route "Empty"\nmetadata entrance_elevation=10m exit_elevation=10m').layout.height, 172);
});

test("non-elevation empty traversal has no invented endpoints", /**
 * Verify non-elevation empty traversal has no invented endpoints; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(createTraversal([]), { points: [], segments: [], annotations: [] });
});

test("geometry validation handles a manually assembled model without traversal", /**
 * Verify geometry validation handles a manually assembled model without traversal; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(validateGeometry({ elements: [] }), []);
});

test("layout can derive traversal for existing normalized element-only models", /**
 * Verify layout can derive traversal for existing normalized element-only models; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = { elements: [{ type: "rappel", id: "R1", attributes: { height: { meters: 30 } } }, { type: "climb", id: "C1", attributes: { height: { meters: 5 } } }] };
  assert.deepEqual(computeVerticalLayout(model).segments.map(/**
   * Project segment.verticalDeltaMeters from the current record.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {unknown} The segment.verticalDeltaMeters value selected or validated above.
   */ (segment) => segment.verticalDeltaMeters), [-30, 5]);
});

test("annotations stay with their technical owner across a shared gap", /**
 * Verify annotations stay with their technical owner across a shared gap; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Annotations"\nrappel "R1" height=30m rope=60m anchor=bolts anchor_count=2 stages=12m+18m redirection=10m:left\nclimb "C1" height=5m');
  assert.deepEqual(result.layout.segments.map(/**
   * Project the current entry into an ordered tuple for result.layout.segments.map.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {Array} The ordered records or values assembled above.
   */ (segment) => [segment.element.id, segment.element.attributes.anchor_count ?? null, segment.element.attributes.stages?.map(/**
   * Project stage.meters from the current record.
   * @responsibility computation
   * @param {unknown} stage - One declared metric stage in source order.
   * @returns {unknown} The stage.meters value selected or validated above.
   */ (stage) => stage.meters) ?? [], segment.element.attributes.redirection?.map(/**
   * Project the current entry into an ordered tuple for segment.element.attributes.redirection.map.
   * @responsibility computation
   * @param {unknown} anchor - SVG text alignment: start, middle or end.
   * @returns {Array} The ordered records or values assembled above.
   */ (anchor) => [anchor.distance.meters, anchor.side]) ?? []]), [["R1", "2", [12, 18], [[10, "left"]]], ["C1", null, [], []]]);
});

test("adjacent climb does not consume the rappel's stage labels and redirection", /**
 * Verify adjacent climb does not consume the rappel's stage labels and redirection; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Annotations"\nrappel height=30m rope=60m stages=12m+18m redirection=10m:left\nclimb height=5m');
  const markup = renderTopoSvg(result.model, result.layout);
  assert.deepEqual([(markup.match(/class="vrl-rappel-stage-label"/g) ?? []).length, (markup.match(/class="vrl-redirection-anchor"/g) ?? []).length, slopeDirections(markup)], [2, 1, [1, -1]]);
});

for (const shape of ["ladder", "direct", "slab"]) {
  test(`${shape} shapes preserve adjacent descent/ascent direction`, /**
   * Verify ${shape} shapes preserve adjacent descent/ascent direction; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(`route "Shapes"\nrappel height=30m rope=60m shape=${shape}\nclimb height=5m shape=${shape}`);
    assert.deepEqual(slopeDirections(renderTopoSvg(result.model, result.layout)), [1, -1]);
  });
}

test("legacy scalar delta represents the net of both technical events", /**
 * Verify legacy scalar delta represents the net of both technical events; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(technicalSegmentDelta({ type: "rappel", attributes: { height: { meters: 30 } } }, { type: "climb", attributes: { height: { meters: 5 } } }), 25);
});

test("legacy single-owner helper rejects an ambiguous two-event gap", /**
 * Verify legacy single-owner helper rejects an ambiguous two-event gap; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise segmentTechnicalElement so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by segmentTechnicalElement.
   */ () => segmentTechnicalElement({ element: { type: "downclimb" } }, { element: { type: "climb" } }), /two technical elements/);
});

test("renderer rejects old node-only layouts instead of losing technical events", /**
 * Verify renderer rejects old node-only layouts instead of losing technical events; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise renderRouteSegments so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by renderRouteSegments.
   */ () => renderRouteSegments({ nodes: [] }, resolveTheme()), /requires layout.segments/);
});

test("compiled JSON retains both technical events and their endpoints", /**
 * Verify compiled JSON retains both technical events and their endpoints; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(pairSource("rappel", "climb", 75));
  assert.deepEqual(JSON.parse(result.json).traversal.segments.filter(/**
   * Evaluate the selection condition segment.kind === "technical".
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (segment) => segment.kind === "technical").map(/**
   * Project the current entry into an ordered tuple for
   * JSON.parse(result.json).traversal.segments.filter((segment) => segment.kind === "technical").map.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {Array} The ordered records or values assembled above.
   */ (segment) => [segment.from, segment.to, segment.elementIndex, segment.verticalDeltaMeters]), [[1, 2, 1, -30], [2, 3, 2, 5]]);
});

test("repeated compilation and SVG rendering are deterministic", /**
 * Verify repeated compilation and SVG rendering are deterministic; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const source = pairSource("rappel", "climb", 75);
  const first = compileRoute(source);
  const second = compileRoute(source);
  assert.deepEqual([first, renderTopoSvg(first.model, first.layout)], [second, renderTopoSvg(second.model, second.layout)]);
});

test("layout and rendering do not mutate the normalized model", /**
 * Verify layout and rendering do not mutate the normalized model; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = normalizeRoute(parseVrl(pairSource("downclimb", "climb", 75)).ast);
  const before = JSON.stringify(model);
  renderTopoSvg(model, computeVerticalLayout(model));
  assert.equal(JSON.stringify(model), before);
});
