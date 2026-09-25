import assert from "node:assert/strict";
import test from "node:test";
import { documentFor, emittedBounds, clippedPrimitives } from "./helpers/svg-bounds.js";
import { compileRoute } from "@subvertic/core";
import { computeTopoScene, renderTopoSvg, topoLegendHeight } from "@subvertic/render-svg";
import { unionBounds } from "../packages/vrl-render-svg/src/scene-bounds.js";
import { CASES, LONG_ROUTE, DENSE, DETAILS } from "./fixtures/scene-fitting.js";

for (const [name, source, layoutOptions, renderOptions] of CASES) {
  test(`${name}: every emitted primitive fits within the canvas`, () => {
    const result = compileRoute(source, { layout: layoutOptions });
    assert.deepEqual(clippedPrimitives(documentFor(renderTopoSvg(result.model, result.layout, renderOptions))), []);
  });
  test(`${name}: scene and SVG repeat deterministically without mutating physical data`, () => {
    const result = compileRoute(source, { layout: layoutOptions });
    const before = JSON.stringify([result.model, result.layout]);
    const scene = computeTopoScene(result.model, result.layout, renderOptions);
    const markup = renderTopoSvg(result.model, result.layout, renderOptions);
    const repeatedMarkup = renderTopoSvg(result.model, result.layout, renderOptions);
    const again = computeTopoScene(result.model, result.layout, renderOptions);
    assert.deepEqual([JSON.stringify([result.model, result.layout]), scene, markup], [before, again, repeatedMarkup]);
  });
}

test("a long route grows the SVG beyond its last node rather than cropping to the requested width", () => {
  const result = compileRoute(LONG_ROUTE);
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  const [x, , width] = document.documentElement.getAttribute("viewBox").split(" ").map(Number);
  assert.equal(x + width > 870, true);
});

test("the legend follows the last drawn label even when notes exceed the original layout height", () => {
  const result = compileRoute(DENSE, { layout: { width: 120, marginBottom: 0 } });
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  const groups = [...document.getElementsByTagName("g")];
  const legend = groups.find((element) => element.getAttribute("class") === "vrl-legend");
  const labelBottoms = groups.filter((element) => element.getAttribute("class")?.startsWith("vrl-node "))
    .flatMap((node) => [...node.getElementsByTagName("text")].map((element) => emittedBounds(element).maxY));
  assert.equal(Number(legend.getElementsByTagName("rect")[0].getAttribute("y")) > Math.max(...labelBottoms), true);
});

test("route summary occupies its own row above the physical scene", () => {
  const result = compileRoute(LONG_ROUTE, { layout: { marginY: 0 } });
  const scene = computeTopoScene(result.model, result.layout);
  assert.equal(scene.infoBox.bounds.maxY < scene.contentBounds.minY, true);
});

test("small margins retain negative symbol extents inside a negative viewBox origin", () => {
  const result = compileRoute('route "Origin"\nstart\nexit', { layout: { spineX: 0, marginY: 0 } });
  assert.equal(computeTopoScene(result.model, result.layout).viewBox.x < 0, true);
});

test("the background covers the full expanded viewport", () => {
  const result = compileRoute(LONG_ROUTE);
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  const rectangle = [...document.documentElement.childNodes].find((node) => node.nodeName === "rect");
  assert.deepEqual(["x", "y", "width", "height"].map((name) => Number(rectangle.getAttribute(name))), document.documentElement.getAttribute("viewBox").split(" ").map(Number));
});

test("hidden legends do not reserve legend space", () => {
  const result = compileRoute(LONG_ROUTE);
  assert.equal(computeTopoScene(result.model, result.layout, { legend: false }).legend, null);
});

test("leftward technical geometry and its side labels remain in the fitted canvas", () => {
  const result = compileRoute(`route "Left"\n${DETAILS}\nexit`);
  result.layout.points.forEach((point) => { point.x = -point.x; });
  assert.deepEqual(clippedPrimitives(documentFor(renderTopoSvg(result.model, result.layout))), []);
});

test("a compatible layout without optional terrain points still fits", () => {
  const result = compileRoute(LONG_ROUTE);
  delete result.layout.points;
  assert.deepEqual(clippedPrimitives(documentFor(renderTopoSvg(result.model, result.layout))), []);
});

for (const [field, value, error] of [["width", 0, RangeError], ["width", -1, RangeError], ["width", "640", TypeError], ["height", NaN, RangeError], ["height", Infinity, RangeError]]) {
  test(`scene preparation rejects invalid ${field} ${value}`, () => {
    const result = compileRoute(LONG_ROUTE);
    assert.throws(() => computeTopoScene(result.model, { ...result.layout, [field]: value }), error);
  });
}

test("valid requested width fails explicitly when content and padding cannot fit the numeric range", () => {
  const result = compileRoute('route "Limits"', { layout: { width: Number.MAX_SAFE_INTEGER } });
  assert.throws(() => renderTopoSvg(result.model, result.layout), /Complete diagram bounds/);
});

test("derived annotation bounds cannot become infinite", () => {
  const result = compileRoute('route "Bounds"\nclimb height=10m');
  result.layout.segments[0].technicalDeltaY = -Number.MAX_SAFE_INTEGER;
  result.layout.segments[0].start.y = -Number.MAX_SAFE_INTEGER;
  assert.throws(() => computeTopoScene(result.model, result.layout), /Complete diagram bounds/);
});

test("scene preparation rejects invalid legend settings", () => {
  const result = compileRoute(LONG_ROUTE);
  assert.throws(() => computeTopoScene(result.model, result.layout, { legend: "false" }), TypeError);
});

test("combining no graphical bounds yields an empty extent", () => {
  assert.deepEqual(unionBounds([]), { minX: 0, minY: 0, maxX: 0, maxY: 0 });
});

test("the legacy legend-height helper still reports zero when disabled", () => {
  assert.equal(topoLegendHeight({ legend: false }), 0);
});
