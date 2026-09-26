import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import * as core from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";

const OVERFLOW = "9".repeat(400);
const MEASUREMENTS = ["distance", "height", "rope", "traverse", "total_distance", "total_descent", "entrance_elevation", "exit_elevation", "vertical_gain", "descent"];
const LENGTHS = MEASUREMENTS.filter(/**
 * Evaluate the selection condition !field.endsWith("_elevation").
 * @responsibility computation
 * @param {unknown} field - Field name selected from the declared contract.
 * @returns {boolean} The result of the documented comparison or calculation.
 */ (field) => !field.endsWith("_elevation"));
const ELEVATION_SOURCE = 'route "Numeric"\nmetadata entrance_elevation=0m exit_elevation=-10m\nstart\nrappel height=10m rope=20m\nexit';

/**
 * Build a failed compilation record retaining the recovery AST and ordered diagnostics while clearing all
 * derived outputs.
 * @responsibility computation
 * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
 * @returns {Object} A record containing ok, hasError, model, layout, json.
 */
function failedCompilation(source) {
  const result = core.compileRoute(source);
  return { ok: result.ok, hasError: result.diagnostics.some(/**
   * Evaluate the selection condition diagnostic.kind === "validation" && diagnostic.severity === "error".
   * @responsibility computation
   * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (diagnostic) => diagnostic.kind === "validation" && diagnostic.severity === "error"), model: result.model, layout: result.layout, json: result.json };
}

const FAILED = { ok: false, hasError: true, model: null, layout: null, json: null };

for (const token of [OVERFLOW + "m", "-" + OVERFLOW + "m", "1000000001m", "1000000000.000001m", "0.0000001m", "1.0000000m", "0." + "0".repeat(400) + "1m", "1e3m", "Infinitym", "NaNm"]) {
  test("measurement parsing rejects unsupported token " + token.slice(0, 24), /**
   * Verify measurement parsing rejects unsupported token " + token.slice(0, 24); arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.parseMeasurementToken(token).ok, false);
  });
}

for (const [token, meters] of [["0m", 0], ["-0m", 0], ["-0.000000m", 0], ["0.000001m", 0.000001], ["-0.000001m", -0.000001], ["4.5m", 4.5], ["999999999.999999m", 999999999.999999], ["1000000000m", 1e9], ["-1000000000m", -1e9]]) {
  test("measurement parsing preserves supported boundary " + token, /**
   * Verify measurement parsing preserves supported boundary " + token; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(core.parseMeasurementToken(token), { ok: true, value: { value: meters, meters, unit: "m" } });
  });
}

test("numeric range failures explain the magnitude and precision contract", /**
 * Verify numeric range failures explain the magnitude and precision contract; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.parseMeasurementToken(OVERFLOW + "m").reason, "expected a finite measurement within ±1000000000m with at most 6 fractional digits");
});

for (const statement of ["metadata", "walk"]) {
  for (const field of MEASUREMENTS) {
    test(statement + " rejects overflowing " + field + " before normalization", /**
     * Verify statement + " rejects overflowing " + field + " before normalization; arrange the scenario and make
     * its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.deepEqual(failedCompilation('route "Numeric"\n' + statement + " " + field + "=" + OVERFLOW + "m"), FAILED);
    });
  }
  for (const field of LENGTHS) {
    for (const value of ["0m", "-1m"]) {
      test(statement + " rejects nonpositive " + field + "=" + value, /**
       * Verify statement + " rejects nonpositive " + field + "=" + value; arrange the scenario and make its single
       * direct assertion. Assertion and setup failures propagate to the test runner.
       * @responsibility coordinator
       * @returns {void} Completes the documented operation; no return value is consumed.
       */ () => {
        assert.deepEqual(failedCompilation('route "Numeric"\n' + statement + " " + field + "=" + value), FAILED);
      });
    }
  }
  for (const field of ["entrance_elevation", "exit_elevation"]) {
    for (const value of ["0m", "-1m"]) {
      test(statement + " permits signed elevation " + field + "=" + value, /**
       * Verify statement + " permits signed elevation " + field + "=" + value; arrange the scenario and make its
       * single direct assertion. Assertion and setup failures propagate to the test runner.
       * @responsibility coordinator
       * @returns {void} Completes the documented operation; no return value is consumed.
       */ () => {
        assert.equal(core.compileRoute('route "Numeric"\n' + statement + " " + field + "=" + value).ok, true);
      });
    }
  }
}

for (const token of [OVERFLOW, "1000000001", "0.0000001", "80.0000000"]) {
  test("inclination parsing rejects unsupported numeric token " + token.slice(0, 24), /**
   * Verify inclination parsing rejects unsupported numeric token " + token.slice(0, 24); arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
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
    test(statement + " rejects numeric detail " + attribute.slice(0, 45), /**
     * Verify statement + " rejects numeric detail " + attribute.slice(0, 45); arrange the scenario and make its
     * single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.deepEqual(failedCompilation('route "Numeric"\n' + statement + " " + attribute), FAILED);
    });
  }
}

test("both redirection aliases are checked when present together", /**
 * Verify both redirection aliases are checked when present together; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(failedCompilation('route "Numeric"\nrappel height=10m rope=20m redirections=1m:left redirection=' + OVERFLOW + "m:right"), FAILED);
});

for (const count of ["1", "9007199254740991"]) {
  test("safe anchor count boundary is preserved as declared text: " + count, /**
   * Verify safe anchor count boundary is preserved as declared text: " + count; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = core.compileRoute('route "Numeric"\nrappel height=10m rope=20m anchor_count=' + count);
    assert.deepEqual([result.ok, result.model.elements[0].attributes.anchor_count, JSON.parse(result.json).elements[0].attributes.anchor_count], [true, count, count]);
  });
}

for (const percent of ["0.000001", "80.123456", "100"]) {
  test("valid inclination precision is preserved: " + percent, /**
   * Verify valid inclination precision is preserved: " + percent; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = core.compileRoute('route "Numeric"\nrappel height=10m rope=20m inclination=' + percent + "%");
    assert.equal(result.model.elements[0].attributes.inclination.percent, Number(percent));
  });
}

test("unrecognized free-text metadata remains text", /**
 * Verify unrecognized free-text metadata remains text; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute('route "Numeric"\nmetadata rope_inventory="1x60m" description="Infinity NaN"');
  assert.deepEqual(result.model.extensions, { rope_inventory: "1x60m", description: "Infinity NaN" });
});

test("invalid numeric source never invokes downstream compiler ports", /**
 * Verify invalid numeric source never invokes downstream compiler ports; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const calls = [];
  const compile = core.createRouteCompiler({
    /**
     * Supply the normalize test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */
    normalize: () => calls.push("normalize"),
    /**
     * Supply the validateGeometry test double and record its invocation in caller-owned fixture state; return
     * the scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */
    validateGeometry: () => calls.push("geometry"),
    /**
     * Supply the layout test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */
    layout: () => calls.push("layout"),
    /**
     * Supply the exportJson test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */
    exportJson: () => calls.push("export")
  });
  compile('route "Numeric"\nrappel height=' + OVERFLOW + "m rope=20m");
  assert.deepEqual(calls, []);
});

for (const value of [NaN, Infinity, -Infinity, Number.MAX_VALUE, Number.MAX_SAFE_INTEGER + 1]) {
  test("JSON export rejects unsupported numbers: " + String(value), /**
   * Verify JSON export rejects unsupported numbers: " + String(value); arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.exportRouteJson so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.exportRouteJson.
     */ () => core.exportRouteJson({ metadata: { number: value } }), RangeError);
  });
}

test("JSON export validates values produced by serialization hooks", /**
 * Verify JSON export validates values produced by serialization hooks; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.exportRouteJson so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.exportRouteJson.
   */ () => core.exportRouteJson({ metadata: { /**
    * Supply the toJSON test double; return the scenario's deliberately selected value. No production I/O is
    * performed by this fixture.
    * @responsibility computation
    * @returns {Object} A record containing number.
    */ toJSON: () => ({ number: Infinity }) } }), RangeError);
});

test("JSON export preserves intentional nulls and safe numeric boundaries", /**
 * Verify JSON export preserves intentional nulls and safe numeric boundaries; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(JSON.parse(core.exportRouteJson({ unknown: null, positive: Number.MAX_SAFE_INTEGER, negative: -Number.MAX_SAFE_INTEGER })), {
    unknown: null, positive: Number.MAX_SAFE_INTEGER, negative: -Number.MAX_SAFE_INTEGER
  });
});

test("summary rejects overflowing aggregate lengths", /**
 * Verify summary rejects overflowing aggregate lengths; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const elements = [1, 2].map(/**
   * Project type, attributes into the record required by [1, 2].map.
   * @responsibility computation
   * @returns {Object} A record containing type, attributes.
   */ () => ({ type: "walk", attributes: { distance: { meters: Number.MAX_VALUE } } }));
  assert.throws(/**
   * Exercise core.summarizeRoute so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.summarizeRoute.
   */ () => core.summarizeRoute(elements), RangeError);
});

test("summary rejects overflowing elevation differences", /**
 * Verify summary rejects overflowing elevation differences; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.summarizeRoute so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.summarizeRoute.
   */ () => core.summarizeRoute([], { entrance_elevation: { meters: Number.MAX_VALUE }, exit_elevation: { meters: -Number.MAX_VALUE } }), RangeError);
});

test("technical arithmetic rejects multiplication overflow", /**
 * Verify technical arithmetic rejects multiplication overflow; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.technicalVerticalMeters so the enclosing assertion can observe its return value or thrown
   * error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.technicalVerticalMeters.
   */ () => core.technicalVerticalMeters({ attributes: { height: { meters: Number.MAX_VALUE }, inclination: { percent: 200 } } }), RangeError);
});

test("combined technical motion rejects excessive derived magnitude", /**
 * Verify combined technical motion rejects excessive derived magnitude; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const element = { type: "rappel", attributes: { height: { meters: Number.MAX_SAFE_INTEGER } } };
  const climb = { type: "climb", attributes: { height: { meters: -Number.MAX_SAFE_INTEGER } } };
  assert.throws(/**
   * Exercise core.technicalSegmentDelta so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.technicalSegmentDelta.
   */ () => core.technicalSegmentDelta(element, climb), RangeError);
});

test("elevation profiles reject overflowing endpoint subtraction", /**
 * Verify elevation profiles reject overflowing endpoint subtraction; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.routeElevationProfile so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.routeElevationProfile.
   */ () => core.routeElevationProfile({ metadata: { entrance_elevation: { meters: Number.MAX_VALUE }, exit_elevation: { meters: -Number.MAX_VALUE } } }), RangeError);
});

test("custom normalized models with nonfinite numbers fail geometry validation", /**
 * Verify custom normalized models with nonfinite numbers fail geometry validation; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const calls = [];
  const model = { elements: [], metadata: {}, summary: { totalDistanceMeters: Infinity } };
  const compile = core.createRouteCompiler({
    /**
     * Supply the normalize test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The model value selected or validated above.
     */
    normalize: () => model,
    /**
     * Supply the layout test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */
    layout: () => calls.push("layout"),
    /**
     * Supply the exportJson test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */
    exportJson: () => calls.push("export")
  });
  const result = compile('route "Numeric"');
  assert.deepEqual({ ok: result.ok, message: result.diagnostics[0].message, outputs: [result.model, result.layout, result.json], calls }, {
    ok: false, message: "Route.summary.totalDistanceMeters is outside the supported numeric range.", outputs: [null, null, null], calls: []
  });
});

for (const option of ["horizontalScale", "baseSpacing", "spineX", "marginY", "marginBottom"]) {
  test("weighted layout rejects excessive derived coordinates from " + option, /**
   * Verify weighted layout rejects excessive derived coordinates from " + option; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.compileRoute so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.compileRoute.
     */ () => core.compileRoute('route "Numeric"\nstart\nwalk distance=1m\nexit', { layout: { [option]: Number.MAX_SAFE_INTEGER } }), RangeError);
  });
}

for (const option of ["pixelsPerMeter", "minNodeGap"]) {
  test("elevation layout rejects excessive derived coordinates from " + option, /**
   * Verify elevation layout rejects excessive derived coordinates from " + option; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.compileRoute so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.compileRoute.
     */ () => core.compileRoute(ELEVATION_SOURCE, { layout: { [option]: Number.MAX_SAFE_INTEGER } }), RangeError);
  });
}

test("minimum-gap helper rejects arithmetic overflow", /**
 * Verify minimum-gap helper rejects arithmetic overflow; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.applyMinimumNodeGap so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.applyMinimumNodeGap.
   */ () => core.applyMinimumNodeGap([{ y: Number.MAX_VALUE }, { y: Number.MAX_VALUE }], Number.MAX_VALUE), RangeError);
});

for (const [name, source] of [
  ["maximum height", 'route "Numeric"\nmetadata entrance_elevation=1000000000m exit_elevation=0m\nrappel height=1000000000m rope=1000000000m'],
  ["minimum decimal", 'route "Numeric"\nmetadata entrance_elevation=0m exit_elevation=-0.000001m\nrappel height=0.000001m rope=0.000002m'],
  ["negative endpoints", 'route "Numeric"\nmetadata entrance_elevation=0m exit_elevation=-1000000000m\nrappel height=1000000000m rope=1000000000m'],
  ["fractional totals", 'route "Numeric"\nwalk distance=0.1m\nwalk distance=0.2m'],
  ["negative zero", 'route "Numeric"\nmetadata entrance_elevation=-0m exit_elevation=0m\nstart\nexit']
]) {
  test(name + " has a lossless model-to-JSON numeric round trip", /**
   * Verify name + " has a lossless model-to-JSON numeric round trip; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = core.compileRoute(source);
    assert.deepEqual({ ok: result.ok, serialized: JSON.parse(result.json) }, { ok: true, serialized: result.model });
  });
  test(name + " produces structurally valid SVG without nonfinite coordinates", /**
   * Verify name + " produces structurally valid SVG without nonfinite coordinates; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = core.compileRoute(source);
    const markup = renderTopoSvg(result.model, result.layout);
    const document = new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
    const invalid = Array.from(document.getElementsByTagName("*")).flatMap(/**
     * Apply Array.from(element.attributes).filter to the supplied arguments; retain the callee's return and
     * failure behavior.
     * @responsibility computation
     * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
     * @returns {Array} The result returned by Array.from(element.attributes).filter.
     */ (element) => Array.from(element.attributes).filter(/**
     * Evaluate the selection condition /\b(?:NaN|Infinity)\b/.test(attribute.value).
     * @responsibility computation
     * @param {unknown} attribute - SVG presentation attribute name resolved through the element's ancestors.
     * @returns {boolean} The result returned by {}.test.
     */ (attribute) => /\b(?:NaN|Infinity)\b/.test(attribute.value)));
    assert.deepEqual({ root: document.documentElement.localName, invalid }, { root: "svg", invalid: [] });
  });
}

test("decimal summary arithmetic is retained consistently without silent rounding", /**
 * Verify decimal summary arithmetic is retained consistently without silent rounding; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute('route "Numeric"\nwalk distance=0.1m\nwalk distance=0.2m');
  assert.deepEqual([result.model.summary.totalDistanceMeters, JSON.parse(result.json).summary.totalDistanceMeters], [0.30000000000000004, 0.30000000000000004]);
});

test("custom layout ports cannot return successful nonfinite coordinates", /**
 * Verify custom layout ports cannot return successful nonfinite coordinates; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compile = core.createRouteCompiler({ /**
   * Supply the layout test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Object} A record containing width.
   */ layout: () => ({ width: Infinity }) });
  assert.throws(/**
   * Exercise compile so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by compile.
   */ () => compile('route "Numeric"'), RangeError);
});

test("custom validators and exporters cannot bypass the model numeric contract", /**
 * Verify custom validators and exporters cannot bypass the model numeric contract; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compile = core.createRouteCompiler({
    /**
     * Supply the normalize test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing summary.
     */
    normalize: () => ({ summary: { totalDistanceMeters: Infinity } }),
    /**
     * Supply the validateGeometry test double; return the scenario's deliberately selected value. No production
     * I/O is performed by this fixture.
     * @responsibility computation
     * @returns {Array} The ordered records or values assembled above.
     */
    validateGeometry: () => [],
    /**
     * Supply the exportJson test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {string} The literal "{}" for this branch.
     */
    exportJson: () => "{}"
  });
  assert.throws(/**
   * Exercise compile so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by compile.
   */ () => compile('route "Numeric"'), RangeError);
});

test("boundary measurements preserve physical deltas through layout and JSON", /**
 * Verify boundary measurements preserve physical deltas through layout and JSON; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute('route "Numeric"\nmetadata entrance_elevation=1000000000m exit_elevation=0m\nrappel height=1000000000m rope=1000000000m', { layout: { minNodeGap: 0, pixelsPerMeter: 1 } });
  assert.deepEqual([result.model.traversal.segments[0].verticalDeltaMeters, JSON.parse(result.json).traversal.segments[0].verticalDeltaMeters, result.layout.segments[0].technicalDeltaY, result.layout.points.map(/**
   * Project point.elevationMeters from the current record.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {unknown} The point.elevationMeters value selected or validated above.
   */ (point) => point.elevationMeters)], [-1e9, -1e9, 1e9, [1e9, 0]]);
});

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState]]) {
  test(name + " returns diagnostics and no SVG for numeric overflow", /**
   * Verify name + " returns diagnostics and no SVG for numeric overflow; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create('route "Numeric"\nrappel height=' + OVERFLOW + "m rope=20m");
    assert.deepEqual({ ok: state.ok, svg: state.svg, model: state.model, json: state.json }, { ok: false, svg: "", model: null, json: null });
  });
}

test("annotation content extent cannot overflow the supported layout height", /**
 * Verify annotation content extent cannot overflow the supported layout height; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = core.normalizeRoute(core.parseVrl('route "Annotation bounds"\nnote "First"\nnote "Second"').ast);
  assert.throws(/**
   * Exercise core.computeVerticalLayout so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.computeVerticalLayout.
   */ () => core.computeVerticalLayout(model, { marginY: Number.MAX_SAFE_INTEGER - 50, marginBottom: 20 }), /Layout\.height must be finite/);
});

test("stacked annotation rows cannot overflow the supported coordinate range", /**
 * Verify stacked annotation rows cannot overflow the supported coordinate range; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const model = core.normalizeRoute(core.parseVrl('route "Annotation bounds"\nnote "First"\nnote "Second"').ast);
  assert.throws(/**
   * Exercise core.computeVerticalLayout so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.computeVerticalLayout.
   */ () => core.computeVerticalLayout(model, { marginY: Number.MAX_SAFE_INTEGER - 20, marginBottom: 0 }), /Layout\.nodes\.1\.y must be finite/);
});

test("numeric boundary measurements retain trailing annotation attachments through JSON", /**
 * Verify numeric boundary measurements retain trailing annotation attachments through JSON; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute('route "Annotated numeric boundary"\nmetadata entrance_elevation=0m exit_elevation=-1000000000m\nrappel height=1000000000m rope=1000000000m\nexit\nnote "Exit conditions"', { layout: { minNodeGap: 0, pixelsPerMeter: 1 } });
  const exported = JSON.parse(result.json);
  assert.deepEqual([result.layout.nodes.at(-1).elevationMeters, exported.traversal.annotations, exported.traversal.segments[0].verticalDeltaMeters], [-1e9, [{ elementIndex: 2, pointIndex: 1 }], -1e9]);
});
