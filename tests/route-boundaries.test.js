import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { compileRoute, computeVerticalLayout, createRouteCompiler, createTraversal, elevationSegmentDeltas, normalizeRoute, parseVrl, residualDistributionWeights } from "@subvertic/vrl-core";
import { renderTopoSvg, renderRouteSegments, resolveTheme } from "@subvertic/vrl-render-svg";

/**
 * Build a complete boundary-test document with independently selected endpoint elevations and ordered
 * statements.
 * @responsibility computation
 * @param {unknown} lines - Ordered source or summary text lines.
 * @param {unknown} entrance - Independently declared entrance elevation in meters; defaults to 100.
 * @param {unknown} exit - Independently declared exit elevation in meters; defaults to 0.
 * @returns {string} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function source(lines, entrance = 100, exit = 0) {
  return ['route "Boundaries"', `metadata entrance_elevation=${entrance}m exit_elevation=${exit}m`, ...lines].join("\n");
}

/**
 * Project physical points and segment ownership without display-specific geometry.
 * @responsibility computation
 * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
 * @returns {Array} The result returned by result.layout.points.map.
 */
function progressionFacts(result) {
  return result.layout.points.map(/**
   * Project the current entry into an ordered tuple for result.layout.points.map.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {Array} The ordered records or values assembled above.
   */ (point) => [point.element?.type ?? null, point.x, point.y, point.elevationMeters]);
}

for (const annotation of ['note "Conditions"', 'hazard type=swift_water severity=high']) {
  for (let insertion = 0; insertion <= 3; insertion += 1) {
    test(`${annotation} at position ${insertion} leaves explicit exit at 0 m`, /**
     * Verify ${annotation} at position ${insertion} leaves explicit exit at 0 m; arrange the scenario and make its
     * single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const lines = ["start", "walk distance=10m", "exit"];
      lines.splice(insertion, 0, annotation);
      assert.equal(compileRoute(source(lines)).layout.nodes.find(/**
       * Evaluate the selection condition node.element.type === "exit".
       * @responsibility computation
       * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
       * @returns {boolean} The result of the documented comparison or calculation.
       */ (node) => node.element.type === "exit").elevationMeters, 0);
    });
    test(`${annotation} at position ${insertion} leaves the full physical profile unchanged`, /**
     * Verify ${annotation} at position ${insertion} leaves the full physical profile unchanged; arrange the
     * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const lines = ["start", "walk distance=10m", "exit"];
      const original = compileRoute(source(lines));
      lines.splice(insertion, 0, annotation);
      assert.deepEqual(progressionFacts(compileRoute(source(lines))), progressionFacts(original));
    });
  }
  for (const [first, second, entrance, exit, changes] of [
    ['rappel height=30m rope=60m', 'climb height=5m', 100, 75, [-30, 5]],
    ['downclimb height=30m', 'rappel height=5m rope=10m', 100, 65, [-30, -5]],
    ['climb height=30m', 'climb height=5m', 100, 135, [30, 5]]
  ]) {
    test(`${annotation} between ${first} and ${second} preserves both technical events`, /**
     * Verify ${annotation} between ${first} and ${second} preserves both technical events; arrange the scenario
     * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = compileRoute(source([first, annotation, second], entrance, exit));
      assert.deepEqual(result.layout.segments.map(/**
       * Compute segment.end.elevationMeters - segment.start.elevationMeters.
       * @responsibility computation
       * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
       * @returns {number} The result of the documented comparison or calculation.
       */ (segment) => segment.end.elevationMeters - segment.start.elevationMeters), changes);
    });
    test(`${annotation} between ${first} and ${second} does not create residual capacity`, /**
     * Verify ${annotation} between ${first} and ${second} does not create residual capacity; arrange the scenario
     * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = compileRoute(source([first, annotation, second], entrance, exit + 1));
      assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.map(/**
       * Project d.severity from the current record.
       * @responsibility computation
       * @param {unknown} d - Current diagnostic or drawing record in the projection.
       * @returns {unknown} The d.severity value selected or validated above.
       */ (d) => d.severity)], [false, null, null, null, ["error"]]);
    });
  }
}

for (const lines of [
  ['rappel height=30m rope=60m', 'exit', 'note "After exit"'],
  ['note "Before"', 'rappel height=30m rope=60m', 'note "At base"'],
  ['rappel height=30m rope=60m', 'hazard type=swift_water', 'exit']
]) {
  test(`${lines.join(" / ")} rejects a contradictory rising profile`, /**
   * Verify ${lines.join(" / ")} rejects a contradictory rising profile; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(compileRoute(source(lines, 100, 110)).diagnostics[0].message, "Declared technical motion is inconsistent with entrance and exit elevations.");
  });
}

test("annotations attach to reached boundaries, including leading and trailing implicit endpoints", /**
 * Verify annotations attach to reached boundaries, including leading and trailing implicit endpoints; arrange
 * the scenario and make its single direct assertion. Assertion and setup failures propagate to the test
 * runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['note "Entry"', 'climb height=5m', 'note "Above climb"', 'rappel height=30m rope=60m', 'hazard type=swift_water', 'note "Base"'], 100, 75));
  assert.deepEqual(result.model.traversal.annotations, [
    { elementIndex: 0, pointIndex: 0 }, { elementIndex: 2, pointIndex: 1 },
    { elementIndex: 4, pointIndex: 3 }, { elementIndex: 5, pointIndex: 3 }
  ]);
});

test("notes between a descent and climb attach to their shared lower boundary", /**
 * Verify notes between a descent and climb attach to their shared lower boundary; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['rappel height=30m rope=60m', 'note "Lower station"', 'climb height=5m'], 100, 75));
  assert.deepEqual([result.model.traversal.annotations[0].pointIndex, result.layout.nodes[1].elevationMeters], [1, 70]);
});

test("an annotation after exit inherits its physical elevation without another segment", /**
 * Verify an annotation after exit inherits its physical elevation without another segment; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['start', 'walk distance=10m', 'exit', 'note "Exit conditions"']));
  assert.deepEqual([result.layout.nodes.at(-1).elevationMeters, result.layout.nodes.at(-1).anchorPointIndex, result.layout.segments.length], [0, 2, 2]);
});

test("multiple annotations retain source order and have distinct symbol positions", /**
 * Verify multiple annotations retain source order and have distinct symbol positions; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['start', 'walk distance=10m', 'exit', 'note "First"', 'hazard type=swift_water', 'note "Last"']));
  assert.deepEqual(result.layout.nodes.slice(-3).map(/**
   * Project the current entry into an ordered tuple for result.layout.nodes.slice(-3).map.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {Array} The ordered records or values assembled above.
   */ (node) => [node.element.type, node.x - result.layout.points.at(-1).x, node.y - result.layout.points.at(-1).y, node.elevationMeters]), [["note", -32, 0, 0], ["hazard", -32, 36, 0], ["note", -32, 72, 0]]);
});

test("annotation rows are included in the layout extent", /**
 * Verify annotation rows are included in the layout extent; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['start', 'exit', 'note "1"', 'note "2"', 'note "3"']));
  assert.equal(result.layout.height, result.layout.nodes.at(-1).y + 64);
});

test("annotations remain visible in SVG without extending the route path", /**
 * Verify annotations remain visible in SVG without extending the route path; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['start', 'exit', 'note "After exit"', 'hazard type=swift_water severity=high']));
  const document = new DOMParser({ onError: onErrorStopParsing }).parseFromString(renderTopoSvg(result.model, result.layout), "image/svg+xml");
  const classes = [...document.getElementsByTagName("g")].map(/**
   * Apply element.getAttribute to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {unknown} The result returned by element.getAttribute.
   */ (element) => element.getAttribute("class"));
  assert.deepEqual([classes.filter(/**
   * Evaluate the selection condition value === "vrl-node vrl-node-note".
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (value) => value === "vrl-node vrl-node-note").length, classes.filter(/**
   * Evaluate the selection condition value === "vrl-node vrl-node-hazard".
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (value) => value === "vrl-node vrl-node-hazard").length, document.documentElement.textContent.includes("After exit"), result.layout.points.length], [1, 1, true, 2]);
});

test("annotation insertion leaves rendered technical paths unchanged", /**
 * Verify annotation insertion leaves rendered technical paths unchanged; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const plain = compileRoute(source(['rappel height=30m rope=60m', 'climb height=5m'], 100, 75));
  const annotated = compileRoute(source(['note "Before"', 'rappel height=30m rope=60m', 'note "Station"', 'climb height=5m', 'hazard type=swift_water'], 100, 75));
  assert.equal(renderRouteSegments(annotated.layout, resolveTheme()), renderRouteSegments(plain.layout, resolveTheme()));
});

test("residual elevation is allocated only to physical connections with a diagnostic", /**
 * Verify residual elevation is allocated only to physical connections with a diagnostic; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['start', 'note "Entry"', 'walk distance=10m', 'rappel height=30m rope=60m', 'note "Base"', 'climb height=5m', 'exit', 'note "Exit"'], 100, 0));
  assert.deepEqual([result.layout.nodes.find(/**
   * Evaluate the selection condition node.element.type === "exit".
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (node) => node.element.type === "exit").elevationMeters, result.layout.segments.filter(/**
   * Evaluate the selection condition segment.kind === "technical".
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (segment) => segment.kind === "technical").map(/**
   * Compute segment.end.elevationMeters - segment.start.elevationMeters.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {number} The result of the documented comparison or calculation.
   */ (segment) => segment.end.elevationMeters - segment.start.elevationMeters), result.diagnostics.map(/**
   * Project d.severity from the current record.
   * @responsibility computation
   * @param {unknown} d - Current diagnostic or drawing record in the projection.
   * @returns {unknown} The d.severity value selected or validated above.
   */ (d) => d.severity)], [0, [-30, 5], ["warning"]]);
});

test("consistent technical-only profiles with annotations need no residual warning", /**
 * Verify consistent technical-only profiles with annotations need no residual warning; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['rappel height=30m rope=60m', 'note "At base"', 'climb height=5m', 'note "Exit"'], 100, 75));
  assert.deepEqual(result.diagnostics, []);
});

test("multiple notes cannot hide missing technical measurements", /**
 * Verify multiple notes cannot hide missing technical measurements; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(compileRoute(source(['note "Entry"', 'downclimb', 'note "Exit"'])).diagnostics[0].message, "Technical elevation is undetermined because height is missing.");
});

for (const [lines, message, line] of [
  [["start", "walk distance=1m", "start", "exit"], "A route may declare only one start.", 5],
  [["start", "exit", 'note "Between"', "exit"], "A route may declare only one exit.", 6],
  [["walk distance=1m", "start", "exit"], "The start must be the first progression element.", 4],
  [["start", "exit", "walk distance=1m"], "The exit must be the last progression element.", 4],
  [["exit", "start"], "The start must be the first progression element.", 4],
  [["climb height=1m", "start", "exit"], "The start must be the first progression element.", 4],
  [["start", "exit", "rappel height=1m rope=2m"], "The exit must be the last progression element.", 4]
]) {
  test(`${lines.join(" / ")} reports a located boundary error`, /**
   * Verify ${lines.join(" / ")} reports a located boundary error; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source(lines));
    assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics[0].message, result.diagnostics[0].location], [false, null, null, null, message, { line, column: 1 }]);
  });
  test(`${lines.join(" / ")} also fails without elevation metadata`, /**
   * Verify ${lines.join(" / ")} also fails without elevation metadata; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(compileRoute(['route "Schematic"', ...lines].join("\n")).ok, false);
  });
}

test("all extra boundary declarations receive deterministic source diagnostics", /**
 * Verify all extra boundary declarations receive deterministic source diagnostics; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Duplicates"\nstart\nstart\nstart\nexit\nexit');
  assert.deepEqual(result.diagnostics.map(/**
   * Project the current entry into an ordered tuple for result.diagnostics.map.
   * @responsibility computation
   * @param {unknown} d - Current diagnostic or drawing record in the projection.
   * @returns {Array} The ordered records or values assembled above.
   */ (d) => [d.message, d.location.line]), [["A route may declare only one start.", 3], ["A route may declare only one start.", 4], ["A route may declare only one exit.", 6]]);
});

test("invalid boundaries stop layout and export ports", /**
 * Verify invalid boundaries stop layout and export ports; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const calls = [];
  const compiler = createRouteCompiler({ /**
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
  compiler('route "Invalid"\nexit\nwalk distance=1m');
  assert.deepEqual(calls, []);
});

for (const metadata of ["", "metadata entrance_elevation=100m exit_elevation=0m\n"]) {
  test(`direct layout rejects invalid boundaries with metadata ${metadata !== ""}`, /**
   * Verify direct layout rejects invalid boundaries with metadata ${metadata !== ""}; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const model = normalizeRoute(parseVrl(`route "Invalid"\n${metadata}exit\nwalk distance=1m`).ast);
    assert.throws(/**
     * Exercise computeVerticalLayout so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by computeVerticalLayout.
     */ () => computeVerticalLayout(model), /exit must be the last progression element/);
  });
}

test("direct elevation delta calculation rejects ambiguous boundaries", /**
 * Verify direct elevation delta calculation rejects ambiguous boundaries; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = normalizeRoute(parseVrl(source(["start", "start", "exit"])).ast);
  assert.throws(/**
   * Exercise elevationSegmentDeltas so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by elevationSegmentDeltas.
   */ () => elevationSegmentDeltas(model), /only one start/);
});

test("annotation-only traversal has no physical points or segments", /**
 * Verify annotation-only traversal has no physical points or segments; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(createTraversal([{ type: "note" }, { type: "hazard" }]), { points: [], segments: [], annotations: [{ elementIndex: 0, pointIndex: null }, { elementIndex: 1, pointIndex: null }] });
});

test("annotation-only documents remain renderable without inventing elevation", /**
 * Verify annotation-only documents remain renderable without inventing elevation; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Notes"\nnote "A"\nhazard type=swift_water');
  assert.deepEqual(result.layout.nodes.map(/**
   * Project the current entry into an ordered tuple for result.layout.nodes.map.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {Array} The ordered records or values assembled above.
   */ (node) => [node.anchorPointIndex, node.elevationMeters, node.x, node.y]), [[null, undefined, 64, 108], [null, undefined, 64, 144]]);
});

test("unanchored annotation placement honors custom layout origins", /**
 * Verify unanchored annotation placement honors custom layout origins; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Notes"\nnote "A"', { layout: { spineX: 20, marginY: 30 } });
  assert.deepEqual([result.layout.nodes[0].x, result.layout.nodes[0].y], [-12, 30]);
});

test("annotation-only documents cannot explain a nonzero elevation change", /**
 * Verify annotation-only documents cannot explain a nonzero elevation change; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(compileRoute(source(['note "A"', 'note "B"'])).ok, false);
});

test("annotations do not invalidate an empty equal-elevation profile", /**
 * Verify annotations do not invalidate an empty equal-elevation profile; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(compileRoute(source(['note "A"'], 10, 10)).ok, true);
});

test("annotation attachment is retained in exported JSON", /**
 * Verify annotation attachment is retained in exported JSON; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['start', 'exit', 'note "A"']));
  assert.deepEqual(JSON.parse(result.json).traversal.annotations, [{ elementIndex: 2, pointIndex: 1 }]);
});

test("annotation insertion is also neutral for schematic traversal", /**
 * Verify annotation insertion is also neutral for schematic traversal; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const plain = compileRoute('route "Schematic"\nstart\nrappel height=10m rope=20m\nclimb height=5m\nexit');
  const annotated = compileRoute('route "Schematic"\nnote "Entry"\nstart\nrappel height=10m rope=20m\nnote "Base"\nclimb height=5m\nexit\nhazard type=swift_water');
  assert.deepEqual(progressionFacts(annotated), progressionFacts(plain));
});

test("legacy residual weights exclude zero-delta annotation gaps", /**
 * Verify legacy residual weights exclude zero-delta annotation gaps; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(residualDistributionWeights([{ type: "start" }, { type: "note" }, { type: "walk" }, { type: "hazard" }, { type: "exit" }], [0, 0, 0, 0]), [0, 0, 0, 0]);
});

test("legacy residual weights exclude technical ownership even when the net delta is zero", /**
 * Verify legacy residual weights exclude technical ownership even when the net delta is zero; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(residualDistributionWeights([{ type: "rappel" }, { type: "climb" }], [0]), [0]);
});

test("legacy normalized models without an annotations array remain usable", /**
 * Verify legacy normalized models without an annotations array remain usable; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = normalizeRoute(parseVrl('route "Old"\nstart\nexit').ast);
  delete model.traversal.annotations;
  assert.deepEqual(computeVerticalLayout(model).nodes.map(/**
   * Project node.element.type from the current record.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {unknown} The node.element.type value selected or validated above.
   */ (node) => node.element.type), ["start", "exit"]);
});

test("repeated annotation layout and rendering are deterministic without model mutation", /**
 * Verify repeated annotation layout and rendering are deterministic without model mutation; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = normalizeRoute(parseVrl(source(['note "Entry"', 'start', 'walk distance=1m', 'exit', 'note "Exit"'])).ast);
  const before = JSON.stringify(model);
  const first = computeVerticalLayout(model);
  const second = computeVerticalLayout(model);
  assert.deepEqual([JSON.stringify(model), first, renderTopoSvg(model, first)], [before, second, renderTopoSvg(model, second)]);
});

test("the documented annotated-exit example binds both endpoints and preserves trailing annotations", /**
 * Verify the documented annotated-exit example binds both endpoints and preserves trailing annotations;
 * arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to the
 * test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(`route "Annotated exit"
metadata entrance_elevation=100m exit_elevation=0m
note "Seasonal conditions"
start "Entry"
walk distance=10m
exit "Finish"
note "Trail continues left"
hazard type=swift_water severity=high`);
  assert.deepEqual(result.layout.nodes.map(/**
   * Project the current entry into an ordered tuple for result.layout.nodes.map.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {Array} The ordered records or values assembled above.
   */ (node) => [node.element.type, node.elevationMeters]), [["note", 100], ["start", 100], ["walk", 43.75], ["exit", 0], ["note", 0], ["hazard", 0]]);
});

test("final decimal boundary labels retain the supplied exit elevation after roundoff", /**
 * Verify final decimal boundary labels retain the supplied exit elevation after roundoff; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['rappel height=0.1m rope=1m', 'rappel height=0.2m rope=1m', 'exit', 'note "At zero"'], 0.3, 0));
  assert.deepEqual(result.layout.nodes.slice(-2).map(/**
   * Project node.elevationMeters from the current record.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {unknown} The node.elevationMeters value selected or validated above.
   */ (node) => node.elevationMeters), [0, 0]);
});

test("annotation rows do not extend the physical route spine", /**
 * Verify annotation rows do not extend the physical route spine; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const plain = compileRoute(source(['start', 'exit']));
  const annotated = compileRoute(source(['start', 'exit', 'note "1"', 'note "2"', 'note "3"']));
  assert.deepEqual(annotated.layout.spine, plain.layout.spine);
});

test("element-only models derive the same annotation attachments as normalized models", /**
 * Verify element-only models derive the same annotation attachments as normalized models; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = normalizeRoute(parseVrl(source(['start', 'exit', 'note "Exit"'])).ast);
  const withoutTraversal = { ...model };
  delete withoutTraversal.traversal;
  assert.deepEqual(computeVerticalLayout(withoutTraversal), computeVerticalLayout(model));
});

test("leading annotation labels follow boundary labels at the same visual height", /**
 * Verify leading annotation labels follow boundary labels at the same visual height; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Labels"\nnote "Entry conditions"\nstart "Entry"\nexit "Finish"');
  const document = new DOMParser({ onError: onErrorStopParsing }).parseFromString(renderTopoSvg(result.model, result.layout), "image/svg+xml");
  assert.deepEqual([...document.getElementsByTagName("g")].map(/**
   * Apply element.getAttribute to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {unknown} The result returned by element.getAttribute.
   */ (element) => element.getAttribute("class")).filter(/**
   * Evaluate the selection condition value?.startsWith("vrl-node ").
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (value) => value?.startsWith("vrl-node ")), ["vrl-node vrl-node-start", "vrl-node vrl-node-note", "vrl-node vrl-node-exit"]);
});

test("annotation symbols stay clear of the exit's elevation label", /**
 * Verify annotation symbols stay clear of the exit's elevation label; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['start', 'exit "Finish"', 'note "Exit conditions"']));
  const document = new DOMParser({ onError: onErrorStopParsing }).parseFromString(renderTopoSvg(result.model, result.layout), "image/svg+xml");
  const texts = [...document.getElementsByTagName("text")];
  const label = texts.find(/**
   * Evaluate the selection condition element.textContent === "0m".
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (element) => element.textContent === "0m");
  const note = result.layout.nodes.at(-1);
  assert.equal(note.x + 8 < Number(label.getAttribute("x")), true);
});

test("SVG label ordering leaves the source-order node array unchanged", /**
 * Verify SVG label ordering leaves the source-order node array unchanged; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['note "Entry"', 'start', 'rappel height=30m rope=60m', 'note "Base"', 'climb height=5m', 'exit'], 100, 75));
  const before = JSON.stringify(result.layout.nodes);
  renderTopoSvg(result.model, result.layout);
  assert.equal(JSON.stringify(result.layout.nodes), before);
});

test("a lone boundary cannot represent two distinct endpoint elevations even within roundoff tolerance", /**
 * Verify a lone boundary cannot represent two distinct endpoint elevations even within roundoff tolerance;
 * arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to the
 * test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(compileRoute(source(['exit', 'note "Exit"'], 100000000, 100000000.000001)).ok, false);
});

test("annotations cannot create roundoff tolerance for an otherwise empty profile", /**
 * Verify annotations cannot create roundoff tolerance for an otherwise empty profile; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(compileRoute(source(['note "Only annotation"'], 100000000, 100000000.000001)).ok, false);
});

for (const exit of [800000000, 800000000.000001]) {
  test(`roundoff tolerance cannot erase or reverse a measured descent at exit ${exit}`, /**
   * Verify roundoff tolerance cannot erase or reverse a measured descent at exit ${exit}; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(compileRoute(source(['rappel height=0.000001m rope=1m', 'exit', 'note "Boundary"'], 800000000, exit)).ok, false);
  });
}

test("boundary calibration still accepts representational roundoff within a small measured descent", /**
 * Verify boundary calibration still accepts representational roundoff within a small measured descent; arrange
 * the scenario and make its single direct assertion. Assertion and setup failures propagate to the test
 * runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(['rappel height=0.000001m rope=1m', 'exit', 'note "Boundary"'], 800000000, 799999999.999999));
  assert.deepEqual([result.ok, result.layout.segments[0].verticalDeltaMeters, Math.sign(result.layout.segments[0].end.elevationMeters - result.layout.segments[0].start.elevationMeters)], [true, -0.000001, -1]);
});

test("roundoff tolerance cannot flatten a standalone measured climb", /**
 * Verify roundoff tolerance cannot flatten a standalone measured climb; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(compileRoute(source(['climb height=0.000001m', 'note "Boundary"'], 800000000, 800000000)).ok, false);
});
