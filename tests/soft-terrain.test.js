import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { createVrlDiagramComponent } from "@subvertic/vrl-react";
import { renderVrlSvelteMarkup } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";
import { loadSvelteDiagrams } from "./helpers/svelte-ssr.js";
import { documentFor, clippedPrimitives, emittedBounds } from "./helpers/svg-bounds.js";
import { CASES } from "./fixtures/scene-fitting.js";
import { curvedTechnicalPoint } from "../packages/vrl-render-svg/src/soft-terrain-geometry.js";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/soft-terrain-canyon.json", import.meta.url), "utf8"));
const SOURCE = readFileSync(fixture.source, "utf8");
const gallery = JSON.parse(readFileSync(new URL("../examples/style-gallery.json", import.meta.url), "utf8"));
const ANNOTATED = 'route "Technical facts"\nstart\nrappel R1 height=18m rope=40m anchor=bolts anchor_count=7 stages=6m+12m redirection=9m:right note="Check station"\nclimb C1 height=6m exposure=high note="Shared boundary"\ndownclimb D1\npool type=unknown\nexit';
const { svelte, kit } = await loadSvelteDiagrams();
const Component = createVrlDiagramComponent(React);
const ADAPTERS = [
  ["React", props => renderToStaticMarkup(React.createElement(Component, props))],
  ["Svelte markup", ({ source, options }) => renderVrlSvelteMarkup(source, options)],
  ["Svelte component", props => svelte.render(props).html],
  ["SvelteKit component", props => kit.render(props).html]
];
function result(source = SOURCE, layout = {}) { return compileRoute(source, { layout }); }
function scene(source = SOURCE, options = {}, layout = {}) {
  const compiled = result(source, layout);
  return computeTopoScene(compiled.model, compiled.layout, { style: "soft-terrain", ...options });
}
function svg(source = SOURCE, options = {}, layout = {}) {
  const compiled = result(source, layout);
  return renderTopoSvg(compiled.model, compiled.layout, { style: "soft-terrain", ...options });
}
function byClass(document, name) {
  return [...document.getElementsByTagName("*")].filter(node => node.getAttribute("class")?.split(" ").includes(name));
}
function facts(model) {
  return model.elements.map(element => Object.fromEntries(Object.entries({ id: element.id, type: element.type,
    label: ["start", "exit"].includes(element.type) ? element.label : undefined,
    height: element.attributes.height?.meters, rope: element.attributes.rope?.meters,
    anchor: element.attributes.anchor, count: element.attributes.anchor_count,
    poolType: element.type === "pool" ? element.attributes.type : undefined,
    distance: element.attributes.distance?.meters, note: element.extensions.note }).filter(([, value]) => value !== undefined)));
}

for (const style of ["classic", "soft-terrain"]) {
  test(`${style} preserves the independently declared ordered fixture facts`, () => {
    const state = createDiagramState(SOURCE, { style });
    assert.deepEqual([facts(state.model), state.model.traversal.segments.filter(segment => segment.kind === "technical").map(segment => [state.model.elements[segment.elementIndex].id, segment.direction, segment.verticalDeltaMeters])], [fixture.facts, fixture.technical]);
  });
}
test("soft terrain displays exact measurements, anchor types/counts, uncertainty and hazard ownership", () => {
  const prepared = scene();
  assert.deepEqual(fixture.labels.map(([id]) => {
    const node = prepared.nodes.find(node => node.node.element.id === id);
    return [id, node.title, node.detail];
  }), fixture.labels);
});
test("style selection changes no compiler result fields or JSON", () => {
  const { svg: classicSvg, ...classic } = createDiagramState(SOURCE);
  const { svg: softSvg, ...soft } = createDiagramState(SOURCE, { style: "soft-terrain" });
  assert.deepEqual(soft, classic);
});
test("an explicit classic style preserves the default markup byte for byte", () => {
  assert.equal(svg(SOURCE, { style: "classic" }), svg(SOURCE, { style: undefined }));
});
for (const style of [null, false, 0, {}, [], "", "soft", "SOFT-TERRAIN", "soft-terrain ", 'soft-terrain" onload="x']) {
  test(`invalid style fails at the renderer boundary: ${JSON.stringify(style)}`, () => {
    assert.throws(() => svg(SOURCE, { style }), { name: "TypeError", message: "Renderer style must be classic or soft-terrain." });
  });
}
for (const shape of ["ladder", "direct", "slab"]) {
  test(`${shape} uses directed curves without implying physical ladders`, () => {
    const document = documentFor(svg(ANNOTATED.replace("rope=40m", `rope=40m shape=${shape}`)));
    assert.deepEqual([byClass(document, "vrl-drop-curve").map(group => group.getAttribute("data-owner-id")), byClass(document, "vrl-drop-rung").length,
      byClass(document, "vrl-drop-slope").map(path => [path.getAttribute("d").includes(" C "), path.getAttribute("marker-end"), path.getAttribute("stroke-width")])],
    [["R1", "C1", "D1"], 0, Array(3).fill([true, "url(#vrl-arrow)", "2"])]);
  });
}
test("adjacent descent and ascent curve endpoints retain canonical signed pixel deltas", () => {
  const compiled = result(ANNOTATED);
  const prepared = computeTopoScene(compiled.model, compiled.layout, { style: "soft-terrain" });
  assert.deepEqual(prepared.segments.filter(segment => segment.kind === "technical").map(segment => [segment.ownerId, segment.geometry.bottomY - segment.geometry.startY]),
    compiled.layout.segments.filter(segment => segment.kind === "technical").map(segment => [segment.element.id, segment.technicalDeltaY]));
});
test("emitted curve arrows follow descent, ascent and descent in source order", () => {
  const document = documentFor(svg(ANNOTATED));
  const directions = byClass(document, "vrl-drop-slope").map(path => {
    const coordinates = path.getAttribute("d").match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
    return Math.sign(coordinates.at(-1) - coordinates[1]);
  });
  assert.deepEqual(directions, [1, -1, 1]);
});
test("stages and redirections lie on the curve, preserving labels and counts", () => {
  const segment = scene(ANNOTATED).segments.find(segment => segment.ownerId === "R1");
  const { dropX, startY, bottomY } = segment.geometry;
  const middle = segment.redirections[0].point;
  const bow = Math.min(12, Math.abs(bottomY - startY) / 6);
  assert.deepEqual([segment.stages.map(stage => stage.text), segment.stages.filter(stage => stage.boundary !== null).length,
    segment.redirections.map(mark => mark.text), middle], [["6m", "12m"], 1, ["9m R"], { x: dropX + 0.75 * bow, y: (startY + bottomY) / 2 }]);
});
test("the full anchor count and overflow survive the new style", () => {
  const document = documentFor(svg(ANNOTATED));
  assert.deepEqual([document.documentElement.textContent.includes("7 anchors"), byClass(document, "vrl-anchor-overflow").map(node => node.textContent), byClass(document, "vrl-anchor-marks")[0].getElementsByTagName("circle").length], [true, ["+3"], 4]);
});
for (const [type, extra, dry, text] of [
  [undefined, "", false, "pool depth unknown"], ["unknown", "", false, "pool depth unknown"],
  ["shallow", "", false, "shallow"], ["deep", "", false, "deep"], ["swimmer", "", false, "swimmer"],
  ["dry", "", true, "dry"], ["unknown", " flow=dry", true, "pool depth unknown"]
]) {
  test(`pool ${type} ${extra} uses a symbolic basin and retains its stated condition`, () => {
    const prepared = scene(`route Pool\npool ${type === undefined ? "" : `type=${type}`}${extra} note="Recorded observation"`);
    assert.deepEqual([prepared.pools.map(pool => [pool.dry, pool.surface === null]), prepared.nodes[0].detail.includes(text), prepared.nodes[0].detail.includes("Recorded observation")], [[[dry, dry]], true, true]);
  });
  test(`exported pool ${type} ${extra} distinguishes dry outlines from water cues`, () => {
    const document = documentFor(svg(`route Pool\npool ${type === undefined ? "" : `type=${type}`}${extra}`));
    const basin = byClass(document, "vrl-pool-basin")[0];
    assert.deepEqual([basin.getAttribute("fill") === "none", byClass(document, "vrl-pool-surface").length], [dry, dry ? 0 : 1]);
  });
}
test("pool silhouettes do not invent depth-dependent sizes", () => {
  assert.deepEqual(scene("route Pool\npool type=unknown").pools.map(pool => pool.basin), scene("route Pool\npool type=deep").pools.map(pool => pool.basin));
});
for (const language of ["en", "es"]) for (const theme of ["light", "dark"]) {
  test(`${language} ${theme} missing downclimb height stays explicitly unknown`, () => {
    const prepared = scene(ANNOTATED, { language, theme });
    assert.equal(prepared.nodes.find(node => node.node.element.id === "D1").title, language === "en" ? "D1, height unknown" : "D1, altura desconocida");
  });
  test(`${language} ${theme} retains explicit schematic explanations and non-color water cues`, () => {
    const document = documentFor(svg(SOURCE, { language, theme }));
    assert.deepEqual([byClass(document, "vrl-terrain-contour").length, byClass(document, "vrl-terrain-wash")[0].getAttribute("fill-opacity"), byClass(document, "vrl-pool-surface").length,
      document.getElementsByTagName("desc")[0].textContent.includes(language === "en" ? "do not measure depth" : "no indican profundidad"),
      document.documentElement.textContent.includes(language === "en" ? "Pool outline: symbolic" : "Poza: tamano simbolico")], [1, "0.45", 1, true, true]);
  });
}
for (const [name, source, layoutOptions, renderOptions] of CASES) {
  test(`soft terrain ${name}: all emitted primitives fit complete bounds`, () => {
    assert.deepEqual(clippedPrimitives(documentFor(svg(source, { ...renderOptions, style: "soft-terrain" }, layoutOptions))), []);
  });
}
for (const width of [320, 736]) {
  test(`soft labels clear neighboring symbols at requested width ${width}`, () => {
    const document = documentFor(svg(ANNOTATED, { language: "es" }, { width }));
    const symbols = byClass(document, "vrl-symbol").flatMap(group => [...group.getElementsByTagName("*")])
      .filter(element => ["circle", "text", "path"].includes(element.tagName)).map(emittedBounds);
    const labels = [...byClass(document, "vrl-node").flatMap(group => [...group.childNodes].filter(node => node.nodeName === "text")),
      ...byClass(document, "vrl-detail-line").flatMap(group => [...group.getElementsByTagName("text")])];
    const collisions = labels.filter(label => {
      const box = emittedBounds(label);
      return symbols.some(symbol => box.minX < symbol.maxX && box.maxX > symbol.minX && box.minY < symbol.maxY && box.maxY > symbol.minY);
    }).map(label => label.textContent);
    assert.deepEqual(collisions, []);
  });
  test(`soft terrain at requested width ${width} stays deterministic and retains narrow labels`, () => {
    const compiled = result(ANNOTATED, { width });
    const before = structuredClone(compiled);
    const options = Object.freeze({ style: "soft-terrain", idPrefix: "same" });
    const first = renderTopoSvg(compiled.model, compiled.layout, options);
    assert.deepEqual([renderTopoSvg(compiled.model, compiled.layout, options), compiled, clippedPrimitives(documentFor(first))], [first, before, []]);
  });
}
test("empty routes still have finite fitted terrain without fabricated elements", () => {
  const prepared = scene("route Empty");
  assert.deepEqual([prepared.nodes.length, prepared.pools.length, clippedPrimitives(documentFor(svg("route Empty")))], [0, 0, []]);
});
test("caller-built layouts may omit optional terrain points", () => {
  const compiled = result(); delete compiled.layout.points;
  assert.deepEqual(clippedPrimitives(documentFor(renderTopoSvg(compiled.model, compiled.layout, { style: "soft-terrain" }))), []);
});
test("leftward canonical technical curves keep their ascent/descent and annotations in bounds", () => {
  const compiled = result(ANNOTATED); compiled.layout.points.forEach(point => { point.x = -point.x; });
  assert.deepEqual(clippedPrimitives(documentFor(renderTopoSvg(compiled.model, compiled.layout, { style: "soft-terrain" }))), []);
});
for (const change of [segment => { segment.direction = "up"; }, segment => { segment.technicalDeltaY = 0; }, segment => { segment.direction = "unknown"; }]) {
  test("contradictory supplied technical geometry fails rather than reversing a feature", () => {
    const compiled = result(); change(compiled.layout.segments.find(segment => segment.kind === "technical"));
    assert.throws(() => renderTopoSvg(compiled.model, compiled.layout, { style: "soft-terrain" }), { name: "RangeError", message: /canonical direction/ });
  });
}
test("nonfinite supplied geometry fails before any SVG is returned", () => {
  const compiled = result(); compiled.layout.points[0].x = Infinity;
  assert.throws(() => renderTopoSvg(compiled.model, compiled.layout, { style: "soft-terrain" }), RangeError);
});
test("curve annotation ratios retain endpoint clearance without changing displayed measurements", () => {
  const geometry = { dropX: 0, bottomX: 0, startX: 0, endX: 40, startY: 0, bottomY: 60 };
  assert.deepEqual([curvedTechnicalPoint(geometry, 0).y, curvedTechnicalPoint(geometry, 1).y], [3, 57]);
});
for (const [name, adapter] of ADAPTERS) {
  test(`${name} forwards style without dropping labels`, () => {
    const markup = adapter({ source: SOURCE, options: { style: "soft-terrain" } });
    assert.deepEqual([markup.includes("vrl-terrain-contour"), markup.includes("declared rope: 40m"), markup.includes("Slippery landing")], [true, true, true]);
  });
  test(`${name} propagates style configuration failures`, () => {
    assert.throws(() => adapter({ source: SOURCE, options: { style: "invalid" } }), TypeError);
  });
}
test("SvelteKit asynchronous load options retain the soft-terrain style", async () => {
  const data = await createVrlSvelteKitLoad({ source: SOURCE, options: async () => ({ style: "soft-terrain" }) })({});
  assert.equal(data.vrl.svg.includes("vrl-terrain-contour"), true);
});
for (const profile of gallery) {
  test(`reviewed ${profile.name} export stays reproducible from its declared source/options`, () => {
    const source = readFileSync(profile.source, "utf8");
    const compiled = result(source, profile.layout);
    const baseline = readFileSync(new URL(`../docs/assets/soft-terrain/${profile.name}.svg`, import.meta.url), "utf8");
    assert.equal(renderTopoSvg(compiled.model, compiled.layout, profile.render).replace(/^[ \t]+$/gm, "") + "\n", baseline);
  });
}
