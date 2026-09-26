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
  ["React", /**
   * Apply renderToStaticMarkup to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @returns {unknown} The result returned by renderToStaticMarkup.
   */ props => renderToStaticMarkup(React.createElement(Component, props))],
  ["Svelte markup", /**
   * Apply renderVrlSvelteMarkup to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.source - Input source described above; no implicit global source or mutable singleton is read.
   * @param {Object} input1.options - Operation-specific option record; must be supplied by the calling coordinator. Values are forwarded to the owning compiler/render or framework boundary.
   * @returns {unknown} The result returned by renderVrlSvelteMarkup.
   */ ({ source, options }) => renderVrlSvelteMarkup(source, options)],
  ["Svelte component", /**
   * Project svelte.render(props).html from the current record.
   * @responsibility computation
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @returns {unknown} The svelte.render(props).html value selected or validated above.
   */ props => svelte.render(props).html],
  ["SvelteKit component", /**
   * Project kit.render(props).html from the current record.
   * @responsibility computation
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @returns {unknown} The kit.render(props).html value selected or validated above.
   */ props => kit.render(props).html]
];
/**
 * Compile the supplied canyon source with the scenario's core layout options.
 * @responsibility coordinator
 * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read; defaults to SOURCE.
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to {}.
 * @returns {unknown} The result returned by compileRoute.
 */
function result(source = SOURCE, layout = {}) { return compileRoute(source, { layout }); }
/**
 * Compile the canyon and prepare its soft-terrain scene, allowing deliberate render-option overrides.
 * @responsibility coordinator
 * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read; defaults to SOURCE.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to {}.
 * @returns {unknown} The result returned by computeTopoScene.
 */
function scene(source = SOURCE, options = {}, layout = {}) {
  const compiled = result(source, layout);
  return computeTopoScene(compiled.model, compiled.layout, { style: "soft-terrain", ...options });
}
/**
 * Compile the canyon and serialize its soft-terrain diagram through the public renderer.
 * @responsibility coordinator
 * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read; defaults to SOURCE.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to {}.
 * @returns {unknown} The result returned by renderTopoSvg.
 */
function svg(source = SOURCE, options = {}, layout = {}) {
  const compiled = result(source, layout);
  return renderTopoSvg(compiled.model, compiled.layout, { style: "soft-terrain", ...options });
}
/**
 * Select parsed SVG elements containing the requested class token.
 * @responsibility computation
 * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
 * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @returns {Array} The result returned by [...document.getElementsByTagName("*")].filter.
 */
function byClass(document, name) {
  return [...document.getElementsByTagName("*")].filter(/**
   * Evaluate the selection condition node.getAttribute("class")?.split(" ").includes(name).
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ node => node.getAttribute("class")?.split(" ").includes(name));
}
/**
 * Project supplied model identity, measurement, anchor, pool and note facts without using renderer output as
 * the expected source.
 * @responsibility computation
 * @param {Object} model - Normalized route data with typed attributes, traversal and summary.
 * @returns {Array} The result returned by model.elements.map.
 */
function facts(model) {
  return model.elements.map(/**
   * Apply Object.fromEntries to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The result returned by Object.fromEntries.
   */ element => Object.fromEntries(Object.entries({ id: element.id, type: element.type,
    label: ["start", "exit"].includes(element.type) ? element.label : undefined,
    height: element.attributes.height?.meters, rope: element.attributes.rope?.meters,
    anchor: element.attributes.anchor, count: element.attributes.anchor_count,
    poolType: element.type === "pool" ? element.attributes.type : undefined,
    distance: element.attributes.distance?.meters, note: element.extensions.note }).filter(/**
     * Evaluate the selection condition value !== undefined.
     * @responsibility computation
     * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
     * @param {unknown} input1[1] - Tuple member bound as value: value paired with its own key.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ ([, value]) => value !== undefined)));
}

for (const style of ["classic", "soft-terrain"]) {
  test(`${style} preserves the independently declared ordered fixture facts`, /**
   * Verify ${style} preserves the independently declared ordered fixture facts; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = createDiagramState(SOURCE, { style });
    assert.deepEqual([facts(state.model), state.model.traversal.segments.filter(/**
     * Evaluate the selection condition segment.kind === "technical".
     * @responsibility computation
     * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ segment => segment.kind === "technical").map(/**
     * Project the current entry into an ordered tuple for state.model.traversal.segments.filter(segment =>
     * segment.kind === "technical").map.
     * @responsibility computation
     * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
     * @returns {Array} The ordered records or values assembled above.
     */ segment => [state.model.elements[segment.elementIndex].id, segment.direction, segment.verticalDeltaMeters])], [fixture.facts, fixture.technical]);
  });
}
test("soft terrain displays exact measurements, anchor types/counts, uncertainty and hazard ownership", /**
 * Verify soft terrain displays exact measurements, anchor types/counts, uncertainty and hazard ownership;
 * arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to the
 * test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const prepared = scene();
  assert.deepEqual(fixture.labels.map(/**
   * Find a prepared node by explicit identity and retain its exact displayed title and detail text.
   * @responsibility computation
   * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
   * @param {unknown} input1[0] - Tuple member bound as id: the ordered input consumed below.
   * @returns {Array} The ordered records or values assembled above.
   */ ([id]) => {
    const node = prepared.nodes.find(/**
     * Evaluate the selection condition node.node.element.id === id.
     * @responsibility computation
     * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ node => node.node.element.id === id);
    return [id, node.title, node.detail];
  }), fixture.labels);
});
test("style selection changes no compiler result fields or JSON", /**
 * Verify style selection changes no compiler result fields or JSON; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { svg: classicSvg, ...classic } = createDiagramState(SOURCE);
  const { svg: softSvg, ...soft } = createDiagramState(SOURCE, { style: "soft-terrain" });
  assert.deepEqual(soft, classic);
});
test("an explicit classic style preserves the default markup byte for byte", /**
 * Verify an explicit classic style preserves the default markup byte for byte; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg(SOURCE, { style: "classic" }), svg(SOURCE, { style: undefined }));
});
for (const style of [null, false, 0, {}, [], "", "soft", "SOFT-TERRAIN", "soft-terrain ", 'soft-terrain" onload="x']) {
  test(`invalid style fails at the renderer boundary: ${JSON.stringify(style)}`, /**
   * Verify invalid style fails at the renderer boundary: ${JSON.stringify(style)}; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise svg so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by svg.
     */ () => svg(SOURCE, { style }), { name: "TypeError", message: "Renderer style must be classic or soft-terrain." });
  });
}
for (const shape of ["ladder", "direct", "slab"]) {
  test(`${shape} uses directed curves without implying physical ladders`, /**
   * Verify ${shape} uses directed curves without implying physical ladders; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = documentFor(svg(ANNOTATED.replace("rope=40m", `rope=40m shape=${shape}`)));
    assert.deepEqual([byClass(document, "vrl-drop-curve").map(/**
     * Apply group.getAttribute to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} group - Parsed SVG group selected for the observation.
     * @returns {unknown} The result returned by group.getAttribute.
     */ group => group.getAttribute("data-owner-id")), byClass(document, "vrl-drop-rung").length,
      byClass(document, "vrl-drop-slope").map(/**
       * Project the current entry into an ordered tuple for byClass(document, "vrl-drop-slope").map.
       * @responsibility computation
       * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
       * @returns {Array} The ordered records or values assembled above.
       */ path => [path.getAttribute("d").includes(" C "), path.getAttribute("marker-end"), path.getAttribute("stroke-width")])],
    [["R1", "C1", "D1"], 0, Array(3).fill([true, "url(#vrl-arrow)", "2"])]);
  });
}
test("adjacent descent and ascent curve endpoints retain canonical signed pixel deltas", /**
 * Verify adjacent descent and ascent curve endpoints retain canonical signed pixel deltas; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compiled = result(ANNOTATED);
  const prepared = computeTopoScene(compiled.model, compiled.layout, { style: "soft-terrain" });
  assert.deepEqual(prepared.segments.filter(/**
   * Evaluate the selection condition segment.kind === "technical".
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ segment => segment.kind === "technical").map(/**
   * Project the current entry into an ordered tuple for prepared.segments.filter(segment => segment.kind ===
   * "technical").map.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {Array} The ordered records or values assembled above.
   */ segment => [segment.ownerId, segment.geometry.bottomY - segment.geometry.startY]),
    compiled.layout.segments.filter(/**
     * Evaluate the selection condition segment.kind === "technical".
     * @responsibility computation
     * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ segment => segment.kind === "technical").map(/**
     * Project the current entry into an ordered tuple for compiled.layout.segments.filter(segment => segment.kind
     * === "technical").map.
     * @responsibility computation
     * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
     * @returns {Array} The ordered records or values assembled above.
     */ segment => [segment.element.id, segment.technicalDeltaY]));
});
test("emitted curve arrows follow descent, ascent and descent in source order", /**
 * Verify emitted curve arrows follow descent, ascent and descent in source order; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const document = documentFor(svg(ANNOTATED));
  const directions = byClass(document, "vrl-drop-slope").map(/**
   * Read emitted path coordinates and compare final versus initial y to verify actual SVG traversal direction.
   * @responsibility computation
   * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
   * @returns {unknown} The result returned by Math.sign.
   */ path => {
    const coordinates = path.getAttribute("d").match(/-?\d+(?:\.\d+)?(?:e[+-]?\d+)?/gi).map(Number);
    return Math.sign(coordinates.at(-1) - coordinates[1]);
  });
  assert.deepEqual(directions, [1, -1, 1]);
});
test("stages and redirections lie on the curve, preserving labels and counts", /**
 * Verify stages and redirections lie on the curve, preserving labels and counts; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const segment = scene(ANNOTATED).segments.find(/**
   * Evaluate the selection condition segment.ownerId === "R1".
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ segment => segment.ownerId === "R1");
  const { dropX, startY, bottomY } = segment.geometry;
  const middle = segment.redirections[0].point;
  const bow = Math.min(12, Math.abs(bottomY - startY) / 6);
  assert.deepEqual([segment.stages.map(/**
   * Project stage.text from the current record.
   * @responsibility computation
   * @param {unknown} stage - One declared metric stage in source order.
   * @returns {unknown} The stage.text value selected or validated above.
   */ stage => stage.text), segment.stages.filter(/**
   * Evaluate the selection condition stage.boundary !== null.
   * @responsibility computation
   * @param {unknown} stage - One declared metric stage in source order.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ stage => stage.boundary !== null).length,
    segment.redirections.map(/**
     * Project mark.text from the current record.
     * @responsibility computation
     * @param {unknown} mark - Prepared or parsed anchor marker being observed.
     * @returns {unknown} The mark.text value selected or validated above.
     */ mark => mark.text), middle], [["6m", "12m"], 1, ["9m R"], { x: dropX + 0.75 * bow, y: (startY + bottomY) / 2 }]);
});
test("the full anchor count and overflow survive the new style", /**
 * Verify the full anchor count and overflow survive the new style; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const document = documentFor(svg(ANNOTATED));
  assert.deepEqual([document.documentElement.textContent.includes("7 anchors"), byClass(document, "vrl-anchor-overflow").map(/**
   * Project node.textContent from the current record.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {unknown} The node.textContent value selected or validated above.
   */ node => node.textContent), byClass(document, "vrl-anchor-marks")[0].getElementsByTagName("circle").length], [true, ["+3"], 4]);
});
for (const [type, extra, dry, text] of [
  [undefined, "", false, "pool depth unknown"], ["unknown", "", false, "pool depth unknown"],
  ["shallow", "", false, "shallow"], ["deep", "", false, "deep"], ["swimmer", "", false, "swimmer"],
  ["dry", "", true, "dry"], ["unknown", " flow=dry", true, "pool depth unknown"]
]) {
  test(`pool ${type} ${extra} uses a symbolic basin and retains its stated condition`, /**
   * Verify pool ${type} ${extra} uses a symbolic basin and retains its stated condition; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const prepared = scene(`route Pool\npool ${type === undefined ? "" : `type=${type}`}${extra} note="Recorded observation"`);
    assert.deepEqual([prepared.pools.map(/**
     * Project the current entry into an ordered tuple for prepared.pools.map.
     * @responsibility computation
     * @param {unknown} pool - Prepared symbolic pool record retaining its owner and dry-state cues.
     * @returns {Array} The ordered records or values assembled above.
     */ pool => [pool.dry, pool.surface === null]), prepared.nodes[0].detail.includes(text), prepared.nodes[0].detail.includes("Recorded observation")], [[[dry, dry]], true, true]);
  });
  test(`exported pool ${type} ${extra} distinguishes dry outlines from water cues`, /**
   * Verify exported pool ${type} ${extra} distinguishes dry outlines from water cues; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = documentFor(svg(`route Pool\npool ${type === undefined ? "" : `type=${type}`}${extra}`));
    const basin = byClass(document, "vrl-pool-basin")[0];
    assert.deepEqual([basin.getAttribute("fill") === "none", byClass(document, "vrl-pool-surface").length], [dry, dry ? 0 : 1]);
  });
}
test("pool silhouettes do not invent depth-dependent sizes", /**
 * Verify pool silhouettes do not invent depth-dependent sizes; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(scene("route Pool\npool type=unknown").pools.map(/**
   * Project pool.basin from the current record.
   * @responsibility computation
   * @param {unknown} pool - Prepared symbolic pool record retaining its owner and dry-state cues.
   * @returns {unknown} The pool.basin value selected or validated above.
   */ pool => pool.basin), scene("route Pool\npool type=deep").pools.map(/**
   * Project pool.basin from the current record.
   * @responsibility computation
   * @param {unknown} pool - Prepared symbolic pool record retaining its owner and dry-state cues.
   * @returns {unknown} The pool.basin value selected or validated above.
   */ pool => pool.basin));
});
for (const language of ["en", "es"]) for (const theme of ["light", "dark"]) {
  test(`${language} ${theme} missing downclimb height stays explicitly unknown`, /**
   * Verify ${language} ${theme} missing downclimb height stays explicitly unknown; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const prepared = scene(ANNOTATED, { language, theme });
    assert.equal(prepared.nodes.find(/**
     * Evaluate the selection condition node.node.element.id === "D1".
     * @responsibility computation
     * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ node => node.node.element.id === "D1").title, language === "en" ? "D1, height unknown" : "D1, altura desconocida");
  });
  test(`${language} ${theme} retains explicit schematic explanations and non-color water cues`, /**
   * Verify ${language} ${theme} retains explicit schematic explanations and non-color water cues; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = documentFor(svg(SOURCE, { language, theme }));
    assert.deepEqual([byClass(document, "vrl-terrain-contour").length, byClass(document, "vrl-terrain-wash")[0].getAttribute("fill-opacity"), byClass(document, "vrl-pool-surface").length,
      document.getElementsByTagName("desc")[0].textContent.includes(language === "en" ? "do not measure depth" : "no indican profundidad"),
      document.documentElement.textContent.includes(language === "en" ? "Pool outline: symbolic" : "Poza: tamano simbolico")], [1, "0.45", 1, true, true]);
  });
}
for (const [name, source, layoutOptions, renderOptions] of CASES) {
  test(`soft terrain ${name}: all emitted primitives fit complete bounds`, /**
   * Verify soft terrain ${name}: all emitted primitives fit complete bounds; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(clippedPrimitives(documentFor(svg(source, { ...renderOptions, style: "soft-terrain" }, layoutOptions))), []);
  });
}
for (const width of [320, 736]) {
  test(`soft labels clear neighboring symbols at requested width ${width}`, /**
   * Verify soft labels clear neighboring symbols at requested width ${width}; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = documentFor(svg(ANNOTATED, { language: "es" }, { width }));
    const symbols = byClass(document, "vrl-symbol").flatMap(/**
     * Project the current entry into an ordered tuple for byClass(document, "vrl-symbol").flatMap.
     * @responsibility computation
     * @param {unknown} group - Parsed SVG group selected for the observation.
     * @returns {Array} The ordered records or values assembled above.
     */ group => [...group.getElementsByTagName("*")])
      .filter(/**
       * Evaluate the selection condition ["circle", "text", "path"].includes(element.tagName).
       * @responsibility computation
       * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
       * @returns {boolean} The result returned by ["circle", "text", "path"].includes.
       */ element => ["circle", "text", "path"].includes(element.tagName)).map(emittedBounds);
    const labels = [...byClass(document, "vrl-node").flatMap(/**
     * Apply [...group.childNodes].filter to the supplied arguments; retain the callee's return and failure
     * behavior.
     * @responsibility computation
     * @param {unknown} group - Parsed SVG group selected for the observation.
     * @returns {Array} The result returned by [...group.childNodes].filter.
     */ group => [...group.childNodes].filter(/**
     * Evaluate the selection condition node.nodeName === "text".
     * @responsibility computation
     * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ node => node.nodeName === "text")),
      ...byClass(document, "vrl-detail-line").flatMap(/**
       * Project the current entry into an ordered tuple for byClass(document, "vrl-detail-line").flatMap.
       * @responsibility computation
       * @param {unknown} group - Parsed SVG group selected for the observation.
       * @returns {Array} The ordered records or values assembled above.
       */ group => [...group.getElementsByTagName("text")])];
    const collisions = labels.filter(/**
     * Detect an intersection between an independently measured label envelope and any symbol envelope.
     * @responsibility computation
     * @param {string} label - Unescaped display label supplied by the caller.
     * @returns {boolean} The result returned by symbols.some.
     */ label => {
      const box = emittedBounds(label);
      return symbols.some(/**
       * Evaluate the selection condition box.minX < symbol.maxX && box.maxX > symbol.minX && box.minY < symbol.maxY
       * && box.maxY > symbol.minY.
       * @responsibility computation
       * @param {unknown} symbol - Prepared symbol record or selected profile code.
       * @returns {unknown} The result of the documented comparison or calculation.
       */ symbol => box.minX < symbol.maxX && box.maxX > symbol.minX && box.minY < symbol.maxY && box.maxY > symbol.minY);
    }).map(/**
     * Project label.textContent from the current record.
     * @responsibility computation
     * @param {string} label - Unescaped display label supplied by the caller.
     * @returns {unknown} The label.textContent value selected or validated above.
     */ label => label.textContent);
    assert.deepEqual(collisions, []);
  });
  test(`soft terrain at requested width ${width} stays deterministic and retains narrow labels`, /**
   * Verify soft terrain at requested width ${width} stays deterministic and retains narrow labels; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const compiled = result(ANNOTATED, { width });
    const before = structuredClone(compiled);
    const options = Object.freeze({ style: "soft-terrain", idPrefix: "same" });
    const first = renderTopoSvg(compiled.model, compiled.layout, options);
    assert.deepEqual([renderTopoSvg(compiled.model, compiled.layout, options), compiled, clippedPrimitives(documentFor(first))], [first, before, []]);
  });
}
test("empty routes still have finite fitted terrain without fabricated elements", /**
 * Verify empty routes still have finite fitted terrain without fabricated elements; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const prepared = scene("route Empty");
  assert.deepEqual([prepared.nodes.length, prepared.pools.length, clippedPrimitives(documentFor(svg("route Empty")))], [0, 0, []]);
});
test("caller-built layouts may omit optional terrain points", /**
 * Verify caller-built layouts may omit optional terrain points; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compiled = result(); delete compiled.layout.points;
  assert.deepEqual(clippedPrimitives(documentFor(renderTopoSvg(compiled.model, compiled.layout, { style: "soft-terrain" }))), []);
});
test("leftward canonical technical curves keep their ascent/descent and annotations in bounds", /**
 * Verify leftward canonical technical curves keep their ascent/descent and annotations in bounds; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compiled = result(ANNOTATED); compiled.layout.points.forEach(/**
   * Deliberately modify point.x in the caller-owned fixture so the enclosing test can observe the specified
   * mutation or failure boundary.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ point => { point.x = -point.x; });
  assert.deepEqual(clippedPrimitives(documentFor(renderTopoSvg(compiled.model, compiled.layout, { style: "soft-terrain" }))), []);
});
for (const change of [/**
 * Deliberately modify segment.direction in the caller-owned fixture so the enclosing test can observe the
 * specified mutation or failure boundary.
 * @responsibility computation
 * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ segment => { segment.direction = "up"; }, /**
  * Deliberately modify segment.technicalDeltaY in the caller-owned fixture so the enclosing test can observe
  * the specified mutation or failure boundary.
  * @responsibility computation
  * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
  * @returns {void} Completes the documented operation; no return value is consumed.
  */ segment => { segment.technicalDeltaY = 0; }, /**
  * Deliberately modify segment.direction in the caller-owned fixture so the enclosing test can observe the
  * specified mutation or failure boundary.
  * @responsibility computation
  * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
  * @returns {void} Completes the documented operation; no return value is consumed.
  */ segment => { segment.direction = "unknown"; }]) {
  test("contradictory supplied technical geometry fails rather than reversing a feature", /**
   * Verify contradictory supplied technical geometry fails rather than reversing a feature; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const compiled = result(); change(compiled.layout.segments.find(/**
     * Evaluate the selection condition segment.kind === "technical".
     * @responsibility computation
     * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ segment => segment.kind === "technical"));
    assert.throws(/**
     * Exercise renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by renderTopoSvg.
     */ () => renderTopoSvg(compiled.model, compiled.layout, { style: "soft-terrain" }), { name: "RangeError", message: /canonical direction/ });
  });
}
test("nonfinite supplied geometry fails before any SVG is returned", /**
 * Verify nonfinite supplied geometry fails before any SVG is returned; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compiled = result(); compiled.layout.points[0].x = Infinity;
  assert.throws(/**
   * Exercise renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by renderTopoSvg.
   */ () => renderTopoSvg(compiled.model, compiled.layout, { style: "soft-terrain" }), RangeError);
});
test("curve annotation ratios retain endpoint clearance without changing displayed measurements", /**
 * Verify curve annotation ratios retain endpoint clearance without changing displayed measurements; arrange
 * the scenario and make its single direct assertion. Assertion and setup failures propagate to the test
 * runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const geometry = { dropX: 0, bottomX: 0, startX: 0, endX: 40, startY: 0, bottomY: 60 };
  assert.deepEqual([curvedTechnicalPoint(geometry, 0).y, curvedTechnicalPoint(geometry, 1).y], [3, 57]);
});
for (const [name, adapter] of ADAPTERS) {
  test(`${name} forwards style without dropping labels`, /**
   * Verify ${name} forwards style without dropping labels; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const markup = adapter({ source: SOURCE, options: { style: "soft-terrain" } });
    assert.deepEqual([markup.includes("vrl-terrain-contour"), markup.includes("declared rope: 40m"), markup.includes("Slippery landing")], [true, true, true]);
  });
  test(`${name} propagates style configuration failures`, /**
   * Verify ${name} propagates style configuration failures; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise adapter so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by adapter.
     */ () => adapter({ source: SOURCE, options: { style: "invalid" } }), TypeError);
  });
}
test("SvelteKit asynchronous load options retain the soft-terrain style", /**
 * Verify SvelteKit asynchronous load options retain the soft-terrain style; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const data = await createVrlSvelteKitLoad({ source: SOURCE, /**
   * Supply the options test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Promise<Object>} Resolves with a record containing style. Rejects when the awaited operation fails.
   */ options: async () => ({ style: "soft-terrain" }) })({});
  assert.equal(data.vrl.svg.includes("vrl-terrain-contour"), true);
});
for (const profile of gallery) {
  test(`reviewed ${profile.name} export stays reproducible from its declared source/options`, /**
   * Verify reviewed ${profile.name} export stays reproducible from its declared source/options; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const source = readFileSync(profile.source, "utf8");
    const compiled = result(source, profile.layout);
    const baseline = readFileSync(new URL(`../docs/assets/soft-terrain/${profile.name}.svg`, import.meta.url), "utf8");
    assert.equal(renderTopoSvg(compiled.model, compiled.layout, profile.render).replace(/^[ \t]+$/gm, "") + "\n", baseline);
  });
}
