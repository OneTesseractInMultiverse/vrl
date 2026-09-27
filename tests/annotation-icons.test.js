import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg, renderSymbolMarker } from "@subvertic/vrl-render-svg";
import { renderIconGeometry, iconManifest } from "@subvertic/vrl-icons";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitData } from "@subvertic/vrl-sveltekit";
import { annotationIconId, annotationClearanceX, placeAnnotationIcon, contourObstacles } from "../packages/vrl-render-svg/src/annotation-icons.js";

const source = readFileSync(new URL("../examples/soft-terrain-canyon.vrl", import.meta.url), "utf8");
const compiled = compileRoute(source, { layout: { width: 736 } });
const options = { style: "soft-terrain", symbols: "annotations" };
/**
 * Prepare a fictional canyon scene through the public renderer with explicit per-test overrides.
 * @responsibility coordinator
 * @param {Object} overrides - Per-test renderer overrides, defaulting to an empty record.
 * @param {Object} result - Compiled model/layout fixture; defaults to the shared fictional canyon.
 * @returns {Object} Owned presentation scene; validation failures propagate to the caller.
 */
function scene(overrides = {}, result = compiled) { return computeTopoScene(result.model, result.layout, { ...options, ...overrides }); }
/**
 * Render the fictional canyon through the public adapter using explicit per-test overrides.
 * @responsibility coordinator
 * @param {Object} overrides - Per-test renderer overrides, defaulting to an empty record.
 * @returns {string} Standalone SVG; invalid configuration errors propagate.
 */
function svg(overrides = {}) { return renderTopoSvg(compiled.model, compiled.layout, { ...options, ...overrides }); }
/**
 * Project independently comparable route text, placement and structural geometry while excluding decorative icon visibility.
 * @responsibility computation
 * @param {unknown} value - Candidate or captured fixture value inspected by this operation.
 * @returns {Object} Comparison record retaining all inspected text and coordinate fields.
 */
function facts(value) {
  return { description: value.description, title: value.title, nodes: value.nodes.map(/**
   * Project or check ({ title: drawing.title, detail: drawing.detail, titleX: drawing.titleX, titleY: drawing.titleY, details: drawing.detail for the enclosing contract assertion.
   * @responsibility computation
   * @param {Object} input1 - Destructured input or member retained by the surrounding projection.
   * @param {Object} input1.drawing - Destructured input or member retained by the surrounding projection.
   * @returns {Object} New projected record retaining the selected fixture fields.
   */ ({ drawing }) => ({ title: drawing.title, detail: drawing.detail, titleX: drawing.titleX, titleY: drawing.titleY, details: drawing.details, leader: drawing.leader, slot: drawing.annotationSlot })), terrain: value.terrain, pools: value.pools, segments: value.segments, bounds: value.bounds, viewBox: value.viewBox };
}

for (const [element, expected] of [
  [{ type: "start", attributes: {} }, "start"], [{ type: "exit", attributes: {} }, "finish"],
  [{ type: "rappel", attributes: { anchor: "bolts" } }, "bolt"], [{ type: "rappel", attributes: { anchor: "tree" } }, "tree"],
  [{ type: "hazard", attributes: {}, extensions: { type: "slippery" } }, "slippery"],
  [{ type: "hazard", attributes: { type: "slippery" } }, "slippery"],
  [{ type: "rappel", attributes: { anchor: "natural" } }, null], [{ type: "rappel", attributes: { anchor: "mixed" } }, null],
  [{ type: "rappel", attributes: {} }, null], [{ type: "hazard", attributes: {} }, null],
  [{ type: "hazard", attributes: {}, extensions: { note: "slippery tree bolts", type: "unknown" } }, null],
  [{ type: "note", attributes: {}, extensions: { text: "slippery" } }, null],
  [{ type: "rappel", attributes: { anchor: "constructor" } }, null]
]) {
  test(`pilot mapping uses explicit facts: ${JSON.stringify(element)}`, /**
   * Verify pilot mapping uses explicit facts: the current fixture using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    assert.equal(annotationIconId(element), expected);
  });
}
test("pilot icons retain exact access, anchor and slippery ownership", /**
 * Verify pilot icons retain exact access, anchor and slippery ownership using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(scene().nodes.filter(/**
   * Project or check item.drawing.annotationIcon !== null for the enclosing contract assertion.
   * @responsibility computation
   * @param {unknown} item - Supplied fixture or presentation value consumed by the documented operation.
   * @returns {boolean} Whether the documented comparison or selection condition holds.
   */ item => item.drawing.annotationIcon !== null).map(/**
   * Project or check [item.node.element.type, item.drawing.annotationIcon.id] for the enclosing contract assertion.
   * @responsibility computation
   * @param {unknown} item - Supplied fixture or presentation value consumed by the documented operation.
   * @returns {Array} Ordered comparison or mapping tuple.
   */ item => [item.node.element.type, item.drawing.annotationIcon.id]), [["start", "start"], ["rappel", "bolt"], ["rappel", "tree"], ["hazard", "slippery"], ["exit", "finish"]]);
});
test("pilot text preserves physical drops, declared ropes, full count, unknown pool and slippery note", /**
 * Verify pilot text preserves physical drops, declared ropes, full count, unknown pool and slippery note using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(scene().nodes.map(/**
   * Project or check [item.drawing.title, item.drawing.detail] for the enclosing contract assertion.
   * @responsibility computation
   * @param {unknown} item - Supplied fixture or presentation value consumed by the documented operation.
   * @returns {Array} Ordered comparison or mapping tuple.
   */ item => [item.drawing.title, item.drawing.detail]), [
    ["Start Entry", ""], ["R1, 18m", "declared rope: 40m / bolts / 2 anchors"], ["", "pool depth unknown"],
    ["", "120m"], ["R2, 12m", "declared rope: 30m / tree / anchor count unknown"],
    ["Hazard H1: slippery", "Slippery landing"], ["Exit Exit", ""]
  ]);
});
for (const width of [320, 736]) for (const language of ["en", "es"]) for (const theme of ["light", "dark"]) {
  test(`icon toggle preserves all prepared facts and coordinates at ${width}/${language}/${theme}`, /**
   * Verify icon toggle preserves all prepared facts and coordinates at the current fixture/the current fixture/the current fixture using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    const result = compileRoute(source, { layout: { width } });
    assert.deepEqual(facts(scene({ symbols: "minimal", language, theme }, result)), facts(scene({ language, theme }, result)));
  });
}
test("minimal presentation omits pictograms but preserves full text", /**
 * Verify minimal presentation omits pictograms but preserves full text using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.doesNotMatch(svg({ symbols: "minimal" }), /data-vrl-icon=/);
});
test("annotation pictograms use exact public geometry and no opaque clearance squares", /**
 * Verify annotation pictograms use exact public geometry and no opaque clearance squares using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  const output = svg();
  assert.deepEqual([output.includes(renderIconGeometry("bolt")), output.includes(renderIconGeometry("tree")), /<g class="vrl-annotation-icon"[^>]*aria-hidden="true"[^>]*focusable="false"/.test(output), /<g class="vrl-annotation-icon"[^>]*>\s*<rect/.test(output)], [true, true, true, false]);
});
test("annotation slots include full stroke clearance beside labels", /**
 * Verify annotation slots include full stroke clearance beside labels using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(scene().nodes.filter(/**
   * Project or check item.drawing.annotationSlot for the enclosing contract assertion.
   * @responsibility computation
   * @param {unknown} item - Supplied fixture or presentation value consumed by the documented operation.
   * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
   */ item => item.drawing.annotationSlot).map(/**
   * Compare each prepared icon slot with its full stroke envelope and the adjacent title origin.
   * @responsibility computation
   * @param {unknown} item - Supplied fixture or presentation value consumed by the documented operation.
   * @returns {unknown} Projected fixture result used by the enclosing computation or assertion.
   */ item => {
    const slot = item.drawing.annotationSlot;
    return [slot.size, slot.bounds.minX < slot.x, slot.bounds.maxX > slot.x + slot.size, slot.bounds.maxX < item.drawing.titleX];
  }), Array(5).fill([24, true, true, true]));
});
test("annotation clearance moves beyond every overlapping obstacle including its reserved gutter", /**
 * Verify annotation clearance moves beyond every overlapping obstacle including its reserved gutter using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.equal(annotationClearanceX([{ minX: 0, maxX: 300, minY: 10, maxY: 90 }, { minX: 0, maxX: 900, minY: 150, maxY: 200 }], { labelX: 200, titleY: 50 }, 100), 340);
});
test("missing annotation identity does not fabricate a placeholder", /**
 * Verify missing annotation identity does not fabricate a placeholder using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => { assert.equal(placeAnnotationIcon(null, {}, -1), null); });
test("empty terrain contour has no imaginary obstacles", /**
 * Verify empty terrain contour has no imaginary obstacles using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => { assert.deepEqual(contourObstacles([]), []); });
test("terrain obstacle envelopes include descending and reversed edges with strokes", /**
 * Verify terrain obstacle envelopes include descending and reversed edges with strokes using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.deepEqual(contourObstacles([{ x: 30, y: 50 }, { x: 10, y: 20 }]), [{ minX: 8, minY: 18, maxX: 32, maxY: 52 }]);
});
test("repeated modes leave registry and route data unchanged", /**
 * Verify repeated modes leave registry and route data unchanged using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  const before = JSON.stringify([iconManifest, compiled]);
  svg(); svg({ symbols: "icons" }); svg({ symbols: "minimal" });
  assert.equal(JSON.stringify([iconManifest, compiled]), before);
});
test("annotation exports are deterministic across intervening mode switches", /**
 * Verify annotation exports are deterministic across intervening mode switches using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  const first = svg(); svg({ symbols: "minimal", language: "es" });
  assert.equal(svg(), first);
});
test("node icon mode retains the local implementation's explicit symbol choice", /**
 * Verify node icon mode retains the local implementation's explicit symbol choice using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => { assert.match(svg({ symbols: "icons" }), /vrl-symbol-icon/); });
test("node icons retain their abbreviation without opaque squares or text halos", /**
 * Inspect emitted node primitives to reject the former backing square and panel-colored text stroke.
 * @responsibility coordinator
 * @returns {void} Completes after the single transparency and abbreviation assertion succeeds.
 */ () => {
  const markup = renderSymbolMarker({ x: 32, y: 40 }, { type: "rappel", attributes: {} }, "#123456", "federation", "#f6f8fa", "en", "icons");
  const document = new DOMParser({ onError: onErrorStopParsing }).parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`, "image/svg+xml");
  const text = document.getElementsByTagName("text")[0];
  assert.deepEqual([document.getElementsByTagName("rect").length, text.hasAttribute("stroke"), text.getAttribute("fill"), text.textContent], [0, false, "#123456", "R"]);
});
test("node icon output is independent of panel background paint", /**
 * Verify that changing the surrounding panel cannot introduce a background into a transparent node marker.
 * @responsibility coordinator
 * @returns {void} Completes after identical marker output is established for different panel colors.
 */ () => {
  const node = { x: 32, y: 40 }, element = { type: "rappel", attributes: {} };
  assert.equal(renderSymbolMarker(node, element, "currentColor", "federation", "white", "en", "icons"), renderSymbolMarker(node, element, "currentColor", "federation", "black", "en", "icons"));
});
test("unknown node icon types fall back to the existing abbreviation symbol", /**
 * Verify unknown node icon types fall back to the existing abbreviation symbol using explicit fixture expectations; setup and assertion failures propagate to the runner.
 * @responsibility coordinator
 * @returns {void} Completes after its single correctness or failure assertion succeeds.
 */ () => {
  assert.match(renderSymbolMarker({ x: 10, y: 20 }, { type: "custom", attributes: {} }, "#123", "federation", "#fff", "en", "icons"), /vrl-symbol-standard/);
});
for (const symbols of [null, false, "unknown", {}, []]) {
  test(`unsupported symbol presentation rejects ${JSON.stringify(symbols)}`, /**
   * Verify unsupported symbol presentation rejects the current fixture using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => { assert.throws(/**
   * Invoke the deliberate failure scenario so the enclosing assertion observes the expected exception.
   * @responsibility coordinator
   * @returns {unknown} Result only if rejection regresses; intended exceptions propagate unchanged.
   */ () => svg({ symbols }), TypeError); });
}
for (const symbols of ["annotations", "minimal"]) {
  test(`${symbols} requires the soft-terrain presentation explicitly`, /**
   * Verify the current fixture requires the soft-terrain presentation explicitly using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => { assert.throws(/**
   * Invoke the deliberate failure scenario so the enclosing assertion observes the expected exception.
   * @responsibility coordinator
   * @returns {unknown} Result only if rejection regresses; intended exceptions propagate unchanged.
   */ () => svg({ style: "classic", symbols }), /require the soft-terrain/); });
}
for (const [name, create] of [["shared", createDiagramState], ["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState], ["SvelteKit", createVrlSvelteKitData]]) {
  test(`${name} forwards selective presentation without modifying model data`, /**
   * Verify the current fixture forwards selective presentation without modifying model data using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    const result = create(source, options);
    assert.deepEqual([result.ok, result.svg.includes('data-vrl-icon="bolt"'), result.json], [true, true, create(source, { ...options, symbols: "minimal" }).json]);
  });
}
for (const body of ["", "hazard H1", "start\nexit", 'hazard H1 type=unmapped note="slippery bolts tree"', 'rappel R1 height=1m rope=2m anchor=mixed', 'start "Inicio extremadamente largo árbol & <roca>"\nrappel R1 height=1m rope=2m anchor=bolts anchor_count=20\nrappel R2 height=1m rope=2m anchor=tree\nexit']) {
  test(`dense and unfamiliar facts preserve bounds: ${body}`, /**
   * Verify dense and unfamiliar facts preserve bounds: the current fixture using explicit fixture expectations; setup and assertion failures propagate to the runner.
   * @responsibility coordinator
   * @returns {void} Completes after its single correctness or failure assertion succeeds.
   */ () => {
    const result = compileRoute(`route Test\n${body}`, { layout: { width: 320 } });
    const value = scene({}, result);
    assert.equal(value.nodes.every(/**
     * Project or check !item.drawing.annotationSlot || (item.drawing.annotationSlot.bounds.minX >= value.viewBox.x && item.drawing.annotationSl for the enclosing contract assertion.
     * @responsibility computation
     * @param {unknown} item - Supplied fixture or presentation value consumed by the documented operation.
     * @returns {boolean} Whether the documented comparison or selection condition holds.
     */ item => !item.drawing.annotationSlot || (item.drawing.annotationSlot.bounds.minX >= value.viewBox.x && item.drawing.annotationSlot.bounds.maxX <= value.viewBox.x + value.viewBox.width && item.drawing.annotationSlot.bounds.minY >= value.viewBox.y && item.drawing.annotationSlot.bounds.maxY <= value.viewBox.y + value.viewBox.height)), true);
  });
}
