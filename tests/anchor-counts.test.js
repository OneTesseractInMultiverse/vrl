import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { compileRoute, createRouteCompiler } from "@subvertic/core";
import { anchorMarkCount, computeTopoScene, formatTopoDetail, renderAnchorMarks, renderTopoSvg, resolveTheme } from "@subvertic/render-svg";
import { createVrlReactDiagramState } from "@subvertic/react";
import { createVrlSvelteDiagramState } from "@subvertic/svelte";
import { createVrlSvelteKitData } from "@subvertic/sveltekit";

const COUNTS = [[1, 1, ""], [3, 3, ""], [4, 4, ""], [5, 4, "+1"], [9, 4, "+5"], [2147483647, 4, "+2147483643"], [9007199254740991, 4, "+9007199254740987"]];

function source(count) {
  return `route "Anchor survey"\nrappel height=30m rope=60m${count === undefined ? "" : ` anchor_count=${count}`}`;
}

function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
}

function byClass(document, className) {
  return [...document.getElementsByTagName("*")].filter((element) => element.getAttribute("class") === className);
}

function helperDocument(count, side = "left") {
  const markup = renderAnchorMarks({ x: 100, y: 200 }, { attributes: { anchor_count: count } }, resolveTheme(), side);
  return documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`);
}

for (const [count, marks, overflow] of COUNTS) {
  for (const [language, singular, plural, introduction, name] of [
    ["en", "anchor", "anchors", "Vertical Route Language schematic for Anchor survey.", "Rappel R1"],
    ["es", "anclaje", "anclajes", "Esquema VRL para Anchor survey.", "Rapel R1"]
  ]) {
    test(`${count} anchors in ${language}: factual text and accessibility retain the full count`, () => {
      const result = compileRoute(source(count));
      const document = documentFor(renderTopoSvg(result.model, result.layout, { language }));
      const expected = `${count} ${count === 1 ? singular : plural}`;
      assert.deepEqual({
        detail: formatTopoDetail(result.model.elements[0], null, language),
        visibleDetail: byClass(document, "vrl-detail-line")[0].textContent,
        label: byClass(document, "vrl-anchor-marks")[0].getAttribute("aria-label"),
        description: document.getElementsByTagName("desc")[0].textContent
      }, { detail: `60m / ${expected}`, visibleDetail: `60m / ${expected}`, label: expected, description: `${introduction} ${name}: ${expected}.` });
    });
  }

  test(`${count} anchors: drawing stays bounded and the remainder is explicit`, () => {
    const result = compileRoute(source(count));
    const document = documentFor(renderTopoSvg(result.model, result.layout));
    assert.deepEqual([byClass(document, "vrl-anchor-marks")[0].getElementsByTagName("circle").length, byClass(document, "vrl-anchor-overflow").map((element) => element.textContent).join("")], [marks, overflow]);
  });

  test(`${count} anchors: existing mark-count helper still returns the drawing count`, () => {
    assert.equal(anchorMarkCount({ attributes: { anchor_count: String(count) } }), marks);
  });

  test(`${count} anchors: model and JSON retain the exact source quantity`, () => {
    const result = compileRoute(source(count));
    renderTopoSvg(result.model, result.layout);
    assert.deepEqual([result.model.elements[0].attributes.anchor_count, JSON.parse(result.json).elements[0].attributes.anchor_count], [String(count), String(count)]);
  });
}

for (const count of [undefined, null, 0, -1, 1.5, NaN, Infinity, 9007199254740992, "bad", "", false, true, {}, [], 5n, Symbol("count")]) {
  test(`low-level unsupported quantity ${String(count)} produces no invented marks`, () => {
    assert.equal(renderAnchorMarks({ x: 100, y: 200 }, { attributes: { anchor_count: count } }, resolveTheme()), "");
  });

  test(`low-level unsupported quantity ${String(count)} produces no factual count text`, () => {
    assert.equal(formatTopoDetail({ type: "rappel", attributes: { anchor_count: count } }), "");
  });
}

for (const side of ["left", "right"]) {
  test(`${side} marks and overflow occupy separate, predictable positions`, () => {
    const document = helperDocument(5, side);
    const circles = [...document.getElementsByTagName("circle")];
    const label = byClass(document, "vrl-anchor-overflow")[0];
    assert.deepEqual({ circles: circles.map((item) => [Number(item.getAttribute("cx")), Number(item.getAttribute("cy"))]), label: [Number(label.getAttribute("x")), Number(label.getAttribute("y")), label.getAttribute("text-anchor"), label.textContent] }, side === "left"
      ? { circles: [[86, 176], [78, 176], [70, 176], [62, 176]], label: [53, 179, "end", "+1"] }
      : { circles: [[114, 176], [122, 176], [130, 176], [138, 176]], label: [147, 179, "start", "+1"] });
  });
}

test("overflow shorthand is hidden from accessibility while its group names the true total", () => {
  const document = helperDocument(9);
  assert.deepEqual([byClass(document, "vrl-anchor-overflow")[0].getAttribute("aria-hidden"), byClass(document, "vrl-anchor-marks")[0].getAttribute("aria-label")], ["true", "9 anchors"]);
});

test("missing count remains unknown even when the anchor type is specified", () => {
  const result = compileRoute(`${source()} anchor=bolts`);
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  assert.deepEqual([byClass(document, "vrl-anchor-marks").length, byClass(document, "vrl-anchor-overflow").length, byClass(document, "vrl-detail-line")[0].textContent, document.getElementsByTagName("desc")[0].textContent], [0, 0, "60m", "Vertical Route Language schematic for Anchor survey."]);
});

for (const value of ["0", "-1", "1.5", "01", "1e2", "9007199254740992", "9007199254740993", "Infinity", "NaN", '""', '"5 anchors"', "true"]) {
  test(`invalid source anchor_count=${value} blocks compilation instead of silently capping or rounding`, () => {
    const result = compileRoute(source(value));
    assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.map((diagnostic) => [diagnostic.severity, diagnostic.location.line])], [false, null, null, null, [["error", 2]]]);
  });
}

for (const shape of ["ladder", "direct", "slab"]) {
  test(`${shape}: truthful anchor counts coexist with technical annotations`, () => {
    const result = compileRoute(`${source(5)} shape=${shape} stages=10m+20m redirection=5m:left`);
    const document = documentFor(renderTopoSvg(result.model, result.layout));
    assert.equal(document.getElementsByTagName("desc")[0].textContent, "Vertical Route Language schematic for Anchor survey. Rappel R1: 5 anchors. R1, 30m: Rope stages: 10m + 20m; Redirection anchor 5m L.");
  });
}

test("counts retain their owning element in source order, including annotations", () => {
  const result = compileRoute('route "Owners"\nhazard H anchor_count=9\nrappel A height=30m rope=60m anchor_count=5\nclimb B height=5m anchor_count=1');
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  assert.equal(document.getElementsByTagName("desc")[0].textContent, "Vertical Route Language schematic for Owners. Hazard H: 9 anchors. Rappel A: 5 anchors. Climb B: 1 anchor.");
});

test("overflow on an annotation-only route retains its true accessible count", () => {
  const result = compileRoute('route "Annotation"\nhazard anchor_count=5');
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  assert.deepEqual([byClass(document, "vrl-anchor-overflow")[0].textContent, document.getElementsByTagName("desc")[0].textContent], ["+1", "Vertical Route Language schematic for Annotation. Hazard H1: 5 anchors."]);
});

test("accessible counts preserve markup-looking owner IDs as ordinary text", () => {
  const result = compileRoute('route "Survey"\nrappel "A<&>" height=30m rope=60m anchor_count=5');
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  assert.equal(document.getElementsByTagName("desc")[0].textContent, "Vertical Route Language schematic for Survey. Rappel A<&>: 5 anchors.");
});

for (const [language, theme] of [["en", "light"], ["es", "dark"]]) {
  test(`${language} ${theme}: maximum-count overflow expands scene bounds without moving physical data`, () => {
    const result = compileRoute(source(9007199254740991), { layout: { width: 1, spineX: 0, marginY: 0, marginBottom: 0 } });
    const before = structuredClone(result.layout);
    const scene = computeTopoScene(result.model, result.layout, { language, theme, legend: false });
    const document = documentFor(renderTopoSvg(result.model, result.layout, { language, theme, legend: false }));
    const overflow = byClass(document, "vrl-anchor-overflow")[0];
    const left = Number(overflow.getAttribute("x")) - overflow.textContent.length * 9 * 1.1;
    assert.deepEqual([scene.contentBounds.minX < left, scene.viewBox.x < left, result.layout], [true, true, before]);
  });
}

test("invalid source counts stop downstream compiler ports", () => {
  const calls = [];
  const compile = createRouteCompiler(Object.fromEntries(["normalize", "validateGeometry", "layout", "exportJson"].map((name) => [name, () => { calls.push(name); throw new Error("Unexpected downstream call"); }])));
  compile(source(0));
  assert.deepEqual(calls, []);
});

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState], ["SvelteKit", createVrlSvelteKitData]]) {
  test(`${name}: counts above the display cap remain truthful`, () => {
    const state = create(source(5), { language: "es" });
    const document = documentFor(state.svg);
    assert.deepEqual([state.ok, byClass(document, "vrl-anchor-marks")[0].getAttribute("aria-label"), byClass(document, "vrl-anchor-overflow")[0].textContent], [true, "5 anclajes", "+1"]);
  });

  test(`${name}: zero count returns diagnostics and no diagram`, () => {
    const state = create(source(0));
    assert.deepEqual([state.ok, state.svg, state.model, state.diagnostics[0].severity], [false, "", null, "error"]);
  });
}

test("repeated capped rendering preserves model, layout, and deterministic SVG", () => {
  const result = compileRoute(source(9007199254740991));
  const before = structuredClone(result);
  const first = renderTopoSvg(result.model, result.layout);
  const second = renderTopoSvg(result.model, result.layout);
  assert.deepEqual([result, first], [before, second]);
});
