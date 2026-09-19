import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import * as core from "@subvertic/core";
import { renderTopoSvg } from "@subvertic/render-svg";
import { createVrlReactDiagramState } from "@subvertic/react";
import { createVrlSvelteDiagramState } from "@subvertic/svelte";

const OVERFLOW = "9".repeat(400);
const MEASUREMENTS = ["distance", "height", "rope", "traverse", "total_distance", "total_descent", "entrance_elevation", "exit_elevation", "vertical_gain", "descent"];
const LENGTHS = MEASUREMENTS.filter((field) => !field.endsWith("_elevation"));
const ELEVATION_SOURCE = 'route "Numeric"\nmetadata entrance_elevation=0m exit_elevation=-10m\nstart\nrappel height=10m rope=20m\nexit';

function failedCompilation(source) {
  const result = core.compileRoute(source);
  return { ok: result.ok, hasError: result.diagnostics.some((diagnostic) => diagnostic.kind === "validation" && diagnostic.severity === "error"), model: result.model, layout: result.layout, json: result.json };
}

const FAILED = { ok: false, hasError: true, model: null, layout: null, json: null };

for (const token of [OVERFLOW + "m", "-" + OVERFLOW + "m", "1000000001m", "1000000000.000001m", "0.0000001m", "1.0000000m", "0." + "0".repeat(400) + "1m", "1e3m", "Infinitym", "NaNm"]) {
  test("measurement parsing rejects unsupported token " + token.slice(0, 24), () => {
    assert.equal(core.parseMeasurementToken(token).ok, false);
  });
}

for (const [token, meters] of [["0m", 0], ["-0m", 0], ["-0.000000m", 0], ["0.000001m", 0.000001], ["-0.000001m", -0.000001], ["4.5m", 4.5], ["999999999.999999m", 999999999.999999], ["1000000000m", 1e9], ["-1000000000m", -1e9]]) {
  test("measurement parsing preserves supported boundary " + token, () => {
    assert.deepEqual(core.parseMeasurementToken(token), { ok: true, value: { value: meters, meters, unit: "m" } });
  });
}

test("numeric range failures explain the magnitude and precision contract", () => {
  assert.equal(core.parseMeasurementToken(OVERFLOW + "m").reason, "expected a finite measurement within ±1000000000m with at most 6 fractional digits");
});

for (const statement of ["metadata", "walk"]) {
  for (const field of MEASUREMENTS) {
    test(statement + " rejects overflowing " + field + " before normalization", () => {
      assert.deepEqual(failedCompilation('route "Numeric"\n' + statement + " " + field + "=" + OVERFLOW + "m"), FAILED);
    });
  }
  for (const field of LENGTHS) {
    for (const value of ["0m", "-1m"]) {
      test(statement + " rejects nonpositive " + field + "=" + value, () => {
        assert.deepEqual(failedCompilation('route "Numeric"\n' + statement + " " + field + "=" + value), FAILED);
      });
    }
  }
  for (const field of ["entrance_elevation", "exit_elevation"]) {
    for (const value of ["0m", "-1m"]) {
      test(statement + " permits signed elevation " + field + "=" + value, () => {
        assert.equal(core.compileRoute('route "Numeric"\n' + statement + " " + field + "=" + value).ok, true);
      });
    }
  }
}

for (const token of [OVERFLOW, "1000000001", "0.0000001", "80.0000000"]) {
  test("inclination parsing rejects unsupported numeric token " + token.slice(0, 24), () => {
    assert.equal(core.parseInclinationToken(token + "%").ok, false);
  });
}

for (const statement of ["metadata", "walk", "rappel height=10m rope=20m"]) {
  for (const attribute of [
    "inclination=" + OVERFLOW + "%", "inclination=100.000001%", "inclination=0%", "inclination=-1%",
    "stages=" + OVERFLOW + "m+1m", "redirection=" + OVERFLOW + "m:left", "redirections=1m:left," + OVERFLOW + "m:right",
    'anchor_count=""', "anchor_count=0", "anchor_count=-1", "anchor_count=1.5", "anchor_count=1e2", "anchor_count=01",
    "anchor_count=9007199254740992", "anchor_count=9007199254740993", "anchor_count=" + OVERFLOW
  ]) {
    test(statement + " rejects numeric detail " + attribute.slice(0, 45), () => {
      assert.deepEqual(failedCompilation('route "Numeric"\n' + statement + " " + attribute), FAILED);
    });
  }
}

test("both redirection aliases are checked when present together", () => {
  assert.deepEqual(failedCompilation('route "Numeric"\nrappel height=10m rope=20m redirections=1m:left redirection=' + OVERFLOW + "m:right"), FAILED);
});

for (const count of ["1", "9007199254740991"]) {
  test("safe anchor count boundary is preserved as declared text: " + count, () => {
    const result = core.compileRoute('route "Numeric"\nrappel height=10m rope=20m anchor_count=' + count);
    assert.deepEqual([result.ok, result.model.elements[0].attributes.anchor_count, JSON.parse(result.json).elements[0].attributes.anchor_count], [true, count, count]);
  });
}

for (const percent of ["0.000001", "80.123456", "100"]) {
  test("valid inclination precision is preserved: " + percent, () => {
    const result = core.compileRoute('route "Numeric"\nrappel height=10m rope=20m inclination=' + percent + "%");
    assert.equal(result.model.elements[0].attributes.inclination.percent, Number(percent));
  });
}

test("unrecognized free-text metadata remains text", () => {
  const result = core.compileRoute('route "Numeric"\nmetadata rope_inventory="1x60m" description="Infinity NaN"');
  assert.deepEqual(result.model.metadata, { rope_inventory: "1x60m", description: "Infinity NaN" });
});

test("invalid numeric source never invokes downstream compiler ports", () => {
  const calls = [];
  const compile = core.createRouteCompiler({
    normalize: () => calls.push("normalize"),
    validateGeometry: () => calls.push("geometry"),
    layout: () => calls.push("layout"),
    exportJson: () => calls.push("export")
  });
  compile('route "Numeric"\nrappel height=' + OVERFLOW + "m rope=20m");
  assert.deepEqual(calls, []);
});

for (const value of [NaN, Infinity, -Infinity, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER + 1]) {
  test("JSON export rejects unsupported numbers: " + String(value), () => {
    assert.throws(() => core.exportRouteJson({ metadata: { number: value } }), RangeError);
  });
}

test("JSON export validates values produced by serialization hooks", () => {
  assert.throws(() => core.exportRouteJson({ metadata: { toJSON: () => ({ number: Infinity }) } }), RangeError);
});

test("JSON export preserves intentional nulls and safe numeric boundaries", () => {
  assert.deepEqual(JSON.parse(core.exportRouteJson({ unknown: null, positive: Number.MAX_SAFE_INTEGER, negative: -Number.MAX_SAFE_INTEGER })), {
    unknown: null, positive: Number.MAX_SAFE_INTEGER, negative: -Number.MAX_SAFE_INTEGER
  });
});

test("summary rejects overflowing aggregate lengths", () => {
  const elements = [1, 2].map(() => ({ type: "walk", attributes: { distance: { meters: Number.MAX_VALUE } } }));
  assert.throws(() => core.summarizeRoute(elements), RangeError);
});

test("summary rejects overflowing elevation differences", () => {
  assert.throws(() => core.summarizeRoute([], { entrance_elevation: { meters: Number.MAX_VALUE }, exit_elevation: { meters: -Number.MAX_VALUE } }), RangeError);
});

test("technical arithmetic rejects multiplication overflow", () => {
  assert.throws(() => core.technicalVerticalMeters({ attributes: { height: { meters: Number.MAX_VALUE }, inclination: { percent: 200 } } }), RangeError);
});

test("combined technical motion rejects excessive derived magnitude", () => {
  const element = { type: "rappel", attributes: { height: { meters: Number.MAX_SAFE_INTEGER } } };
  const climb = { type: "climb", attributes: { height: { meters: -Number.MAX_SAFE_INTEGER } } };
  assert.throws(() => core.technicalSegmentDelta(element, climb), RangeError);
});

test("elevation profiles reject overflowing endpoint subtraction", () => {
  assert.throws(() => core.routeElevationProfile({ metadata: { entrance_elevation: { meters: Number.MAX_VALUE }, exit_elevation: { meters: -Number.MAX_VALUE } } }), RangeError);
});

test("custom normalized models with nonfinite numbers fail geometry validation", () => {
  const calls = [];
  const model = { elements: [], metadata: {}, summary: { totalDistanceMeters: Infinity } };
  const compile = core.createRouteCompiler({
    normalize: () => model,
    layout: () => calls.push("layout"),
    exportJson: () => calls.push("export")
  });
  const result = compile('route "Numeric"');
  assert.deepEqual({ ok: result.ok, message: result.diagnostics[0].message, outputs: [result.model, result.layout, result.json], calls }, {
    ok: false, message: "Route.summary.totalDistanceMeters is outside the supported numeric range.", outputs: [null, null, null], calls: []
  });
});

for (const option of ["horizontalScale", "baseSpacing", "spineX", "marginY", "marginBottom"]) {
  test("weighted layout rejects excessive derived coordinates from " + option, () => {
    assert.throws(() => core.compileRoute('route "Numeric"\nstart\nwalk distance=1m\nexit', { layout: { [option]: Number.MAX_SAFE_INTEGER } }), RangeError);
  });
}

for (const option of ["pixelsPerMeter", "minNodeGap"]) {
  test("elevation layout rejects excessive derived coordinates from " + option, () => {
    assert.throws(() => core.compileRoute(ELEVATION_SOURCE, { layout: { [option]: Number.MAX_SAFE_INTEGER } }), RangeError);
  });
}

test("minimum-gap helper rejects arithmetic overflow", () => {
  assert.throws(() => core.applyMinimumNodeGap([{ y: Number.MAX_VALUE }, { y: Number.MAX_VALUE }], Number.MAX_VALUE), RangeError);
});

for (const [name, source] of [
  ["maximum height", 'route "Numeric"\nmetadata entrance_elevation=1000000000m exit_elevation=0m\nrappel height=1000000000m rope=1000000000m'],
  ["minimum decimal", 'route "Numeric"\nmetadata entrance_elevation=0m exit_elevation=-0.000001m\nrappel height=0.000001m rope=0.000002m'],
  ["negative endpoints", 'route "Numeric"\nmetadata entrance_elevation=0m exit_elevation=-1000000000m\nrappel height=1000000000m rope=1000000000m'],
  ["fractional totals", 'route "Numeric"\nwalk distance=0.1m\nwalk distance=0.2m'],
  ["negative zero", 'route "Numeric"\nmetadata entrance_elevation=-0m exit_elevation=0m\nstart\nexit']
]) {
  test(name + " has a lossless model-to-JSON numeric round trip", () => {
    const result = core.compileRoute(source);
    assert.deepEqual({ ok: result.ok, serialized: JSON.parse(result.json) }, { ok: true, serialized: result.model });
  });
  test(name + " produces structurally valid SVG without nonfinite coordinates", () => {
    const result = core.compileRoute(source);
    const markup = renderTopoSvg(result.model, result.layout);
    const document = new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
    const invalid = Array.from(document.getElementsByTagName("*")).flatMap((element) => Array.from(element.attributes).filter((attribute) => /\b(?:NaN|Infinity)\b/.test(attribute.value)));
    assert.deepEqual({ root: document.documentElement.localName, invalid }, { root: "svg", invalid: [] });
  });
}

test("decimal summary arithmetic is retained consistently without silent rounding", () => {
  const result = core.compileRoute('route "Numeric"\nwalk distance=0.1m\nwalk distance=0.2m');
  assert.deepEqual([result.model.summary.totalDistanceMeters, JSON.parse(result.json).summary.totalDistanceMeters], [0.30000000000000004, 0.30000000000000004]);
});

test("custom layout ports cannot return successful nonfinite coordinates", () => {
  const compile = core.createRouteCompiler({ layout: () => ({ width: Infinity }) });
  assert.throws(() => compile('route "Numeric"'), RangeError);
});

test("custom validators and exporters cannot bypass the model numeric contract", () => {
  const compile = core.createRouteCompiler({
    normalize: () => ({ summary: { totalDistanceMeters: Infinity } }),
    validateGeometry: () => [],
    exportJson: () => "{}"
  });
  assert.throws(() => compile('route "Numeric"'), RangeError);
});

test("boundary measurements preserve physical deltas through layout and JSON", () => {
  const result = core.compileRoute('route "Numeric"\nmetadata entrance_elevation=1000000000m exit_elevation=0m\nrappel height=1000000000m rope=1000000000m', { layout: { minNodeGap: 0, pixelsPerMeter: 1 } });
  assert.deepEqual([result.model.traversal.segments[0].verticalDeltaMeters, JSON.parse(result.json).traversal.segments[0].verticalDeltaMeters, result.layout.segments[0].technicalDeltaY, result.layout.points.map((point) => point.elevationMeters)], [-1e9, -1e9, 1e9, [1e9, 0]]);
});

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState]]) {
  test(name + " returns diagnostics and no SVG for numeric overflow", () => {
    const state = create('route "Numeric"\nrappel height=' + OVERFLOW + "m rope=20m");
    assert.deepEqual({ ok: state.ok, svg: state.svg, model: state.model, json: state.json }, { ok: false, svg: "", model: null, json: null });
  });
}
