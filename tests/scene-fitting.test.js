import assert from "node:assert/strict";
import test from "node:test";
import { documentFor, emittedBounds, clippedPrimitives } from "./helpers/svg-bounds.js";
import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg, topoLegendHeight } from "@subvertic/vrl-render-svg";
import { unionBounds } from "../packages/vrl-render-svg/src/scene-bounds.js";
import { CASES, LONG_ROUTE, DENSE, DETAILS } from "./fixtures/scene-fitting.js";

for (const [name, source, layoutOptions, renderOptions] of CASES) {
  test(`${name}: every emitted primitive fits within the canvas`, /**
   * Verify ${name}: every emitted primitive fits within the canvas; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source, { layout: layoutOptions });
    assert.deepEqual(clippedPrimitives(documentFor(renderTopoSvg(result.model, result.layout, renderOptions))), []);
  });
  test(`${name}: scene and SVG repeat deterministically without mutating physical data`, /**
   * Verify ${name}: scene and SVG repeat deterministically without mutating physical data; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source, { layout: layoutOptions });
    const before = JSON.stringify([result.model, result.layout]);
    const scene = computeTopoScene(result.model, result.layout, renderOptions);
    const markup = renderTopoSvg(result.model, result.layout, renderOptions);
    const repeatedMarkup = renderTopoSvg(result.model, result.layout, renderOptions);
    const again = computeTopoScene(result.model, result.layout, renderOptions);
    assert.deepEqual([JSON.stringify([result.model, result.layout]), scene, markup], [before, again, repeatedMarkup]);
  });
}

test("a long route grows the SVG beyond its last node rather than cropping to the requested width", /**
 * Verify a long route grows the SVG beyond its last node rather than cropping to the requested width; arrange
 * the scenario and make its single direct assertion. Assertion and setup failures propagate to the test
 * runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(LONG_ROUTE);
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  const [x, , width] = document.documentElement.getAttribute("viewBox").split(" ").map(Number);
  assert.equal(x + width > 870, true);
});

test("the legend follows the last drawn label even when notes exceed the original layout height", /**
 * Verify the legend follows the last drawn label even when notes exceed the original layout height; arrange
 * the scenario and make its single direct assertion. Assertion and setup failures propagate to the test
 * runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(DENSE, { layout: { width: 120, marginBottom: 0 } });
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  const groups = [...document.getElementsByTagName("g")];
  const legend = groups.find(/**
   * Evaluate the selection condition element.getAttribute("class") === "vrl-legend".
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (element) => element.getAttribute("class") === "vrl-legend");
  const labelBottoms = groups.filter(/**
   * Evaluate the selection condition element.getAttribute("class")?.startsWith("vrl-node ").
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (element) => element.getAttribute("class")?.startsWith("vrl-node "))
    .flatMap(/**
     * Apply [...node.getElementsByTagName("text")].map to the supplied arguments; retain the callee's return and
     * failure behavior.
     * @responsibility computation
     * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
     * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
     */ (node) => [...node.getElementsByTagName("text")].map(/**
     * Project emittedBounds(element).maxY from the current record.
     * @responsibility computation
     * @param {Object} element - Owning route element with its type, identity and declared attributes.
     * @returns {unknown} The emittedBounds(element).maxY value selected or validated above.
     */ (element) => emittedBounds(element).maxY));
  assert.equal(Number(legend.getElementsByTagName("rect")[0].getAttribute("y")) > Math.max(...labelBottoms), true);
});

test("route summary occupies its own row above the physical scene", /**
 * Verify route summary occupies its own row above the physical scene; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(LONG_ROUTE, { layout: { marginY: 0 } });
  const scene = computeTopoScene(result.model, result.layout);
  assert.equal(scene.infoBox.bounds.maxY < scene.contentBounds.minY, true);
});

test("small margins retain negative symbol extents inside a negative viewBox origin", /**
 * Verify small margins retain negative symbol extents inside a negative viewBox origin; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Origin"\nstart\nexit', { layout: { spineX: 0, marginY: 0 } });
  assert.equal(computeTopoScene(result.model, result.layout).viewBox.x < 0, true);
});

test("the background covers the full expanded viewport", /**
 * Verify the background covers the full expanded viewport; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(LONG_ROUTE);
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  const rectangle = [...document.documentElement.childNodes].find(/**
   * Evaluate the selection condition node.nodeName === "rect".
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (node) => node.nodeName === "rect");
  assert.deepEqual(["x", "y", "width", "height"].map(/**
   * Apply Number to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {unknown} The result returned by Number.
   */ (name) => Number(rectangle.getAttribute(name))), document.documentElement.getAttribute("viewBox").split(" ").map(Number));
});

test("hidden legends do not reserve legend space", /**
 * Verify hidden legends do not reserve legend space; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(LONG_ROUTE);
  assert.equal(computeTopoScene(result.model, result.layout, { legend: false }).legend, null);
});

test("leftward technical geometry and its side labels remain in the fitted canvas", /**
 * Verify leftward technical geometry and its side labels remain in the fitted canvas; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(`route "Left"\n${DETAILS}\nexit`);
  result.layout.points.forEach(/**
   * Deliberately modify point.x in the caller-owned fixture so the enclosing test can observe the specified
   * mutation or failure boundary.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (point) => { point.x = -point.x; });
  assert.deepEqual(clippedPrimitives(documentFor(renderTopoSvg(result.model, result.layout))), []);
});

test("a compatible layout without optional terrain points still fits", /**
 * Verify a compatible layout without optional terrain points still fits; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(LONG_ROUTE);
  delete result.layout.points;
  assert.deepEqual(clippedPrimitives(documentFor(renderTopoSvg(result.model, result.layout))), []);
});

for (const [field, value, error] of [["width", 0, RangeError], ["width", -1, RangeError], ["width", "640", TypeError], ["height", NaN, RangeError], ["height", Infinity, RangeError]]) {
  test(`scene preparation rejects invalid ${field} ${value}`, /**
   * Verify scene preparation rejects invalid ${field} ${value}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(LONG_ROUTE);
    assert.throws(/**
     * Exercise computeTopoScene so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by computeTopoScene.
     */ () => computeTopoScene(result.model, { ...result.layout, [field]: value }), error);
  });
}

test("valid requested width fails explicitly when content and padding cannot fit the numeric range", /**
 * Verify valid requested width fails explicitly when content and padding cannot fit the numeric range; arrange
 * the scenario and make its single direct assertion. Assertion and setup failures propagate to the test
 * runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Limits"', { layout: { width: Number.MAX_SAFE_INTEGER } });
  assert.throws(/**
   * Exercise renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by renderTopoSvg.
   */ () => renderTopoSvg(result.model, result.layout), /Complete diagram bounds/);
});

test("derived annotation bounds cannot become infinite", /**
 * Verify derived annotation bounds cannot become infinite; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Bounds"\nclimb height=10m');
  result.layout.segments[0].technicalDeltaY = -Number.MAX_SAFE_INTEGER;
  result.layout.segments[0].start.y = -Number.MAX_SAFE_INTEGER;
  assert.throws(/**
   * Exercise computeTopoScene so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by computeTopoScene.
   */ () => computeTopoScene(result.model, result.layout), /Complete diagram bounds/);
});

test("scene preparation rejects invalid legend settings", /**
 * Verify scene preparation rejects invalid legend settings; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(LONG_ROUTE);
  assert.throws(/**
   * Exercise computeTopoScene so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by computeTopoScene.
   */ () => computeTopoScene(result.model, result.layout, { legend: "false" }), TypeError);
});

test("combining no graphical bounds yields an empty extent", /**
 * Verify combining no graphical bounds yields an empty extent; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(unionBounds([]), { minX: 0, minY: 0, maxX: 0, maxY: 0 });
});

test("the legacy legend-height helper still reports zero when disabled", /**
 * Verify the legacy legend-height helper still reports zero when disabled; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(topoLegendHeight({ legend: false }), 0);
});
