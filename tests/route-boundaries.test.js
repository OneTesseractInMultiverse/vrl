import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { compileRoute, computeVerticalLayout, createRouteCompiler, createTraversal, elevationSegmentDeltas, normalizeRoute, parseVrl, residualDistributionWeights } from "@subvertic/core";
import { renderTopoSvg, renderRouteSegments, resolveTheme } from "@subvertic/render-svg";

function source(lines, entrance = 100, exit = 0) {
  return ['route "Boundaries"', `metadata entrance_elevation=${entrance}m exit_elevation=${exit}m`, ...lines].join("\n");
}

function progressionFacts(result) {
  return result.layout.points.map((point) => [point.element?.type ?? null, point.x, point.y, point.elevationMeters]);
}

for (const annotation of ['note "Conditions"', 'hazard type=swift_water severity=high']) {
  for (let insertion = 0; insertion <= 3; insertion += 1) {
    test(`${annotation} at position ${insertion} leaves explicit exit at 0 m`, () => {
      const lines = ["start", "walk distance=10m", "exit"];
      lines.splice(insertion, 0, annotation);
      assert.equal(compileRoute(source(lines)).layout.nodes.find((node) => node.element.type === "exit").elevationMeters, 0);
    });
    test(`${annotation} at position ${insertion} leaves the full physical profile unchanged`, () => {
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
    test(`${annotation} between ${first} and ${second} preserves both technical events`, () => {
      const result = compileRoute(source([first, annotation, second], entrance, exit));
      assert.deepEqual(result.layout.segments.map((segment) => segment.end.elevationMeters - segment.start.elevationMeters), changes);
    });
    test(`${annotation} between ${first} and ${second} does not create residual capacity`, () => {
      const result = compileRoute(source([first, annotation, second], entrance, exit + 1));
      assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.map((d) => d.severity)], [false, null, null, null, ["error"]]);
    });
  }
}

for (const lines of [
  ['rappel height=30m rope=60m', 'exit', 'note "After exit"'],
  ['note "Before"', 'rappel height=30m rope=60m', 'note "At base"'],
  ['rappel height=30m rope=60m', 'hazard type=swift_water', 'exit']
]) {
  test(`${lines.join(" / ")} rejects a contradictory rising profile`, () => {
    assert.equal(compileRoute(source(lines, 100, 110)).diagnostics[0].message, "Declared technical motion is inconsistent with entrance and exit elevations.");
  });
}

test("annotations attach to reached boundaries, including leading and trailing implicit endpoints", () => {
  const result = compileRoute(source(['note "Entry"', 'climb height=5m', 'note "Above climb"', 'rappel height=30m rope=60m', 'hazard type=swift_water', 'note "Base"'], 100, 75));
  assert.deepEqual(result.model.traversal.annotations, [
    { elementIndex: 0, pointIndex: 0 }, { elementIndex: 2, pointIndex: 1 },
    { elementIndex: 4, pointIndex: 3 }, { elementIndex: 5, pointIndex: 3 }
  ]);
});

test("notes between a descent and climb attach to their shared lower boundary", () => {
  const result = compileRoute(source(['rappel height=30m rope=60m', 'note "Lower station"', 'climb height=5m'], 100, 75));
  assert.deepEqual([result.model.traversal.annotations[0].pointIndex, result.layout.nodes[1].elevationMeters], [1, 70]);
});

test("an annotation after exit inherits its physical elevation without another segment", () => {
  const result = compileRoute(source(['start', 'walk distance=10m', 'exit', 'note "Exit conditions"']));
  assert.deepEqual([result.layout.nodes.at(-1).elevationMeters, result.layout.nodes.at(-1).anchorPointIndex, result.layout.segments.length], [0, 2, 2]);
});

test("multiple annotations retain source order and have distinct symbol positions", () => {
  const result = compileRoute(source(['start', 'walk distance=10m', 'exit', 'note "First"', 'hazard type=swift_water', 'note "Last"']));
  assert.deepEqual(result.layout.nodes.slice(-3).map((node) => [node.element.type, node.x - result.layout.points.at(-1).x, node.y - result.layout.points.at(-1).y, node.elevationMeters]), [["note", -32, 0, 0], ["hazard", -32, 36, 0], ["note", -32, 72, 0]]);
});

test("annotation rows are included in the layout extent", () => {
  const result = compileRoute(source(['start', 'exit', 'note "1"', 'note "2"', 'note "3"']));
  assert.equal(result.layout.height, result.layout.nodes.at(-1).y + 64);
});

test("annotations remain visible in SVG without extending the route path", () => {
  const result = compileRoute(source(['start', 'exit', 'note "After exit"', 'hazard type=swift_water severity=high']));
  const document = new DOMParser({ onError: onErrorStopParsing }).parseFromString(renderTopoSvg(result.model, result.layout), "image/svg+xml");
  const classes = [...document.getElementsByTagName("g")].map((element) => element.getAttribute("class"));
  assert.deepEqual([classes.filter((value) => value === "vrl-node vrl-node-note").length, classes.filter((value) => value === "vrl-node vrl-node-hazard").length, document.documentElement.textContent.includes("After exit"), result.layout.points.length], [1, 1, true, 2]);
});

test("annotation insertion leaves rendered technical paths unchanged", () => {
  const plain = compileRoute(source(['rappel height=30m rope=60m', 'climb height=5m'], 100, 75));
  const annotated = compileRoute(source(['note "Before"', 'rappel height=30m rope=60m', 'note "Station"', 'climb height=5m', 'hazard type=swift_water'], 100, 75));
  assert.equal(renderRouteSegments(annotated.layout, resolveTheme()), renderRouteSegments(plain.layout, resolveTheme()));
});

test("residual elevation is allocated only to physical connections with a diagnostic", () => {
  const result = compileRoute(source(['start', 'note "Entry"', 'walk distance=10m', 'rappel height=30m rope=60m', 'note "Base"', 'climb height=5m', 'exit', 'note "Exit"'], 100, 0));
  assert.deepEqual([result.layout.nodes.find((node) => node.element.type === "exit").elevationMeters, result.layout.segments.filter((segment) => segment.kind === "technical").map((segment) => segment.end.elevationMeters - segment.start.elevationMeters), result.diagnostics.map((d) => d.severity)], [0, [-30, 5], ["warning"]]);
});

test("consistent technical-only profiles with annotations need no residual warning", () => {
  const result = compileRoute(source(['rappel height=30m rope=60m', 'note "At base"', 'climb height=5m', 'note "Exit"'], 100, 75));
  assert.deepEqual(result.diagnostics, []);
});

test("multiple notes cannot hide missing technical measurements", () => {
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
  test(`${lines.join(" / ")} reports a located boundary error`, () => {
    const result = compileRoute(source(lines));
    assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics[0].message, result.diagnostics[0].location], [false, null, null, null, message, { line, column: 1 }]);
  });
  test(`${lines.join(" / ")} also fails without elevation metadata`, () => {
    assert.equal(compileRoute(['route "Schematic"', ...lines].join("\n")).ok, false);
  });
}

test("all extra boundary declarations receive deterministic source diagnostics", () => {
  const result = compileRoute('route "Duplicates"\nstart\nstart\nstart\nexit\nexit');
  assert.deepEqual(result.diagnostics.map((d) => [d.message, d.location.line]), [["A route may declare only one start.", 3], ["A route may declare only one start.", 4], ["A route may declare only one exit.", 6]]);
});

test("invalid boundaries stop layout and export ports", () => {
  const calls = [];
  const compiler = createRouteCompiler({ layout: () => calls.push("layout"), exportJson: () => calls.push("export") });
  compiler('route "Invalid"\nexit\nwalk distance=1m');
  assert.deepEqual(calls, []);
});

for (const metadata of ["", "metadata entrance_elevation=100m exit_elevation=0m\n"]) {
  test(`direct layout rejects invalid boundaries with metadata ${metadata !== ""}`, () => {
    const model = normalizeRoute(parseVrl(`route "Invalid"\n${metadata}exit\nwalk distance=1m`).ast);
    assert.throws(() => computeVerticalLayout(model), /exit must be the last progression element/);
  });
}

test("direct elevation delta calculation rejects ambiguous boundaries", () => {
  const model = normalizeRoute(parseVrl(source(["start", "start", "exit"])).ast);
  assert.throws(() => elevationSegmentDeltas(model), /only one start/);
});

test("annotation-only traversal has no physical points or segments", () => {
  assert.deepEqual(createTraversal([{ type: "note" }, { type: "hazard" }]), { points: [], segments: [], annotations: [{ elementIndex: 0, pointIndex: null }, { elementIndex: 1, pointIndex: null }] });
});

test("annotation-only documents remain renderable without inventing elevation", () => {
  const result = compileRoute('route "Notes"\nnote "A"\nhazard type=swift_water');
  assert.deepEqual(result.layout.nodes.map((node) => [node.anchorPointIndex, node.elevationMeters, node.x, node.y]), [[null, undefined, 64, 108], [null, undefined, 64, 144]]);
});

test("unanchored annotation placement honors custom layout origins", () => {
  const result = compileRoute('route "Notes"\nnote "A"', { layout: { spineX: 20, marginY: 30 } });
  assert.deepEqual([result.layout.nodes[0].x, result.layout.nodes[0].y], [-12, 30]);
});

test("annotation-only documents cannot explain a nonzero elevation change", () => {
  assert.equal(compileRoute(source(['note "A"', 'note "B"'])).ok, false);
});

test("annotations do not invalidate an empty equal-elevation profile", () => {
  assert.equal(compileRoute(source(['note "A"'], 10, 10)).ok, true);
});

test("annotation attachment is retained in exported JSON", () => {
  const result = compileRoute(source(['start', 'exit', 'note "A"']));
  assert.deepEqual(JSON.parse(result.json).traversal.annotations, [{ elementIndex: 2, pointIndex: 1 }]);
});

test("annotation insertion is also neutral for schematic traversal", () => {
  const plain = compileRoute('route "Schematic"\nstart\nrappel height=10m rope=20m\nclimb height=5m\nexit');
  const annotated = compileRoute('route "Schematic"\nnote "Entry"\nstart\nrappel height=10m rope=20m\nnote "Base"\nclimb height=5m\nexit\nhazard type=swift_water');
  assert.deepEqual(progressionFacts(annotated), progressionFacts(plain));
});

test("legacy residual weights exclude zero-delta annotation gaps", () => {
  assert.deepEqual(residualDistributionWeights([{ type: "start" }, { type: "note" }, { type: "walk" }, { type: "hazard" }, { type: "exit" }], [0, 0, 0, 0]), [0, 0, 0, 0]);
});

test("legacy residual weights exclude technical ownership even when the net delta is zero", () => {
  assert.deepEqual(residualDistributionWeights([{ type: "rappel" }, { type: "climb" }], [0]), [0]);
});

test("legacy normalized models without an annotations array remain usable", () => {
  const model = normalizeRoute(parseVrl('route "Old"\nstart\nexit').ast);
  delete model.traversal.annotations;
  assert.deepEqual(computeVerticalLayout(model).nodes.map((node) => node.element.type), ["start", "exit"]);
});

test("repeated annotation layout and rendering are deterministic without model mutation", () => {
  const model = normalizeRoute(parseVrl(source(['note "Entry"', 'start', 'walk distance=1m', 'exit', 'note "Exit"'])).ast);
  const before = JSON.stringify(model);
  const first = computeVerticalLayout(model);
  const second = computeVerticalLayout(model);
  assert.deepEqual([JSON.stringify(model), first, renderTopoSvg(model, first)], [before, second, renderTopoSvg(model, second)]);
});

test("the documented annotated-exit example binds both endpoints and preserves trailing annotations", () => {
  const result = compileRoute(`route "Annotated exit"
metadata entrance_elevation=100m exit_elevation=0m
note "Seasonal conditions"
start "Entry"
walk distance=10m
exit "Finish"
note "Trail continues left"
hazard type=swift_water severity=high`);
  assert.deepEqual(result.layout.nodes.map((node) => [node.element.type, node.elevationMeters]), [["note", 100], ["start", 100], ["walk", 43.75], ["exit", 0], ["note", 0], ["hazard", 0]]);
});

test("final decimal boundary labels retain the supplied exit elevation after roundoff", () => {
  const result = compileRoute(source(['rappel height=0.1m rope=1m', 'rappel height=0.2m rope=1m', 'exit', 'note "At zero"'], 0.3, 0));
  assert.deepEqual(result.layout.nodes.slice(-2).map((node) => node.elevationMeters), [0, 0]);
});

test("annotation rows do not extend the physical route spine", () => {
  const plain = compileRoute(source(['start', 'exit']));
  const annotated = compileRoute(source(['start', 'exit', 'note "1"', 'note "2"', 'note "3"']));
  assert.deepEqual(annotated.layout.spine, plain.layout.spine);
});

test("element-only models derive the same annotation attachments as normalized models", () => {
  const model = normalizeRoute(parseVrl(source(['start', 'exit', 'note "Exit"'])).ast);
  const withoutTraversal = { ...model };
  delete withoutTraversal.traversal;
  assert.deepEqual(computeVerticalLayout(withoutTraversal), computeVerticalLayout(model));
});

test("leading annotation labels follow boundary labels at the same visual height", () => {
  const result = compileRoute('route "Labels"\nnote "Entry conditions"\nstart "Entry"\nexit "Finish"');
  const document = new DOMParser({ onError: onErrorStopParsing }).parseFromString(renderTopoSvg(result.model, result.layout), "image/svg+xml");
  assert.deepEqual([...document.getElementsByTagName("g")].map((element) => element.getAttribute("class")).filter((value) => value?.startsWith("vrl-node ")), ["vrl-node vrl-node-start", "vrl-node vrl-node-note", "vrl-node vrl-node-exit"]);
});

test("annotation symbols stay clear of the exit's elevation label", () => {
  const result = compileRoute(source(['start', 'exit "Finish"', 'note "Exit conditions"']));
  const document = new DOMParser({ onError: onErrorStopParsing }).parseFromString(renderTopoSvg(result.model, result.layout), "image/svg+xml");
  const texts = [...document.getElementsByTagName("text")];
  const label = texts.find((element) => element.textContent === "0m");
  const note = result.layout.nodes.at(-1);
  assert.equal(note.x + 8 < Number(label.getAttribute("x")), true);
});

test("SVG label ordering leaves the source-order node array unchanged", () => {
  const result = compileRoute(source(['note "Entry"', 'start', 'rappel height=30m rope=60m', 'note "Base"', 'climb height=5m', 'exit'], 100, 75));
  const before = JSON.stringify(result.layout.nodes);
  renderTopoSvg(result.model, result.layout);
  assert.equal(JSON.stringify(result.layout.nodes), before);
});

test("a lone boundary cannot represent two distinct endpoint elevations even within roundoff tolerance", () => {
  assert.equal(compileRoute(source(['exit', 'note "Exit"'], 100000000, 100000000.000001)).ok, false);
});

test("annotations cannot create roundoff tolerance for an otherwise empty profile", () => {
  assert.equal(compileRoute(source(['note "Only annotation"'], 100000000, 100000000.000001)).ok, false);
});

for (const exit of [800000000, 800000000.000001]) {
  test(`roundoff tolerance cannot erase or reverse a measured descent at exit ${exit}`, () => {
    assert.equal(compileRoute(source(['rappel height=0.000001m rope=1m', 'exit', 'note "Boundary"'], 800000000, exit)).ok, false);
  });
}

test("boundary calibration still accepts representational roundoff within a small measured descent", () => {
  const result = compileRoute(source(['rappel height=0.000001m rope=1m', 'exit', 'note "Boundary"'], 800000000, 799999999.999999));
  assert.deepEqual([result.ok, result.layout.segments[0].verticalDeltaMeters, Math.sign(result.layout.segments[0].end.elevationMeters - result.layout.segments[0].start.elevationMeters)], [true, -0.000001, -1]);
});

test("roundoff tolerance cannot flatten a standalone measured climb", () => {
  assert.equal(compileRoute(source(['climb height=0.000001m', 'note "Boundary"'], 800000000, 800000000)).ok, false);
});
