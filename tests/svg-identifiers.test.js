import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg, renderRouteSegments, renderDropLadderSegment, renderDirectTechnicalSegment, resolveTheme } from "@subvertic/vrl-render-svg";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { createVrlDiagramComponent } from "@subvertic/vrl-react";
import { renderVrlSvelteMarkup } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";
import { loadSvelteDiagrams } from "./helpers/svelte-ssr.js";

const SOURCE = 'route "Same canyon"\nstart\nrappel height=10m rope=20m\nclimb height=3m\nexit';
const compiled = compileRoute(SOURCE);
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
   * @param {unknown} input1.props - Component properties supplied by the embedding consumer.
   * @returns {unknown} The result returned by renderVrlSvelteMarkup.
   */ ({ source = "", options = {}, ...props }) => renderVrlSvelteMarkup(source, options, props)],
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
 * Parse multiple SVG fragments under an independent XML root so cross-diagram IDs can be compared.
 * @responsibility coordinator
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {unknown} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function parse(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(`<root>${markup}</root>`, "application/xml");
}
/**
 * Project all emitted marker IDs from independently parsed SVG markup.
 * @responsibility computation
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function markers(markup) {
  return [...parse(markup).getElementsByTagName("marker")].map(/**
   * Apply marker.getAttribute to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} marker - Prepared or parsed symbol/marker record.
   * @returns {unknown} The result returned by marker.getAttribute.
   */ marker => marker.getAttribute("id"));
}
/**
 * Collect nonempty emitted marker-end references from parsed path elements.
 * @responsibility computation
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function references(markup) {
  return [...parse(markup).getElementsByTagName("path")].map(/**
   * Apply path.getAttribute to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
   * @returns {unknown} The result returned by path.getAttribute.
   */ path => path.getAttribute("marker-end")).filter(Boolean);
}
/**
 * Render the fixed compiled route using the scenario's namespace and theme options.
 * @responsibility coordinator
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {unknown} The result returned by renderTopoSvg.
 */
function render(options = {}) { return renderTopoSvg(compiled.model, compiled.layout, options); }

for (const idPrefix of [undefined, "a", "A_b-9", "a".repeat(64)]) {
  test(`valid SVG prefix ${idPrefix} identifies all technical references`, /**
   * Verify valid SVG prefix ${idPrefix} identifies all technical references; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const svg = render({ idPrefix });
    const id = `${idPrefix ?? "vrl"}-arrow`;
    assert.deepEqual([markers(svg), references(svg)], [[id], [`url(#${id})`, `url(#${id})`]]);
  });
}
for (const idPrefix of [null, false, 1, [], {}, { /**
 * Supply the toString test double; return the scenario's deliberately selected value. No production I/O is
 * performed by this fixture.
 * @responsibility computation
 * @returns {string} The literal "valid" for this branch.
 */ toString: () => "valid" }]) {
  test(`non-string SVG prefix is rejected: ${JSON.stringify(idPrefix)}`, /**
   * Verify non-string SVG prefix is rejected: ${JSON.stringify(idPrefix)}; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise render so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by render.
     */ () => render({ idPrefix }), { name: "TypeError", message: "Renderer idPrefix must be a string." });
  });
}
for (const idPrefix of ["", "a".repeat(65), "1route", "_route", "-route", "route space", "route\n", "route\r", "route\t", "é", "a\u0000", 'a" onload="x', "a'><script/>", "a#b", "a)b", "a:b", "a.b", "a\\b"]) {
  test(`malformed SVG prefix fails without coercion or truncation: ${JSON.stringify(idPrefix)}`, /**
   * Verify malformed SVG prefix fails without coercion or truncation: ${JSON.stringify(idPrefix)}; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise render so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by render.
     */ () => render({ idPrefix }), { name: "RangeError", message: /idPrefix/ });
  });
}

test("scene inspection carries the same resolved identifiers used by serialization", /**
 * Verify scene inspection carries the same resolved identifiers used by serialization; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(computeTopoScene(compiled.model, compiled.layout, { idPrefix: "inspection" }).identifiers, { arrow: "inspection-arrow" });
});
test("each scene owns its identifier record independently of other render calls", /**
 * Verify each scene owns its identifier record independently of other render calls; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const scene = computeTopoScene(compiled.model, compiled.layout, { idPrefix: "owned" });
  scene.identifiers.arrow = "changed";
  assert.equal(computeTopoScene(compiled.model, compiled.layout, { idPrefix: "owned" }).identifiers.arrow, "owned-arrow");
});
for (const shape of ["ladder", "direct", "slab"]) {
  test(`${shape} technical lines keep every reference in the selected namespace`, /**
   * Verify ${shape} technical lines keep every reference in the selected namespace; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = createDiagramState(SOURCE.replace("rope=20m", `rope=20m shape=${shape}`), { idPrefix: "shape" });
    assert.deepEqual(references(state.svg), ["url(#shape-arrow)", "url(#shape-arrow)"]);
  });
}
test("scene preparation rejects invalid namespaces before returning records", /**
 * Verify scene preparation rejects invalid namespaces before returning records; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise computeTopoScene so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by computeTopoScene.
   */ () => computeTopoScene(compiled.model, compiled.layout, { idPrefix: "bad#id" }), RangeError);
});
test("two differently themed diagrams resolve references inside their own SVG", /**
 * Verify two differently themed diagrams resolve references inside their own SVG; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const document = parse(render({ idPrefix: "left" }) + render({ idPrefix: "right", theme: "dark" }));
  const actual = [...document.getElementsByTagName("svg")].map(/**
   * Observe each SVG's marker ID, paint and arrow references to verify ownership and theme isolation.
   * @responsibility computation
   * @param {unknown} svg - Renderer-produced SVG string; precomputed consumer markup is trusted.
   * @returns {Array} The ordered records or values assembled above.
   */ svg => {
    const marker = svg.getElementsByTagName("marker")[0];
    const arrows = [...svg.getElementsByTagName("path")].filter(/**
     * Evaluate the selection condition path.hasAttribute("marker-end").
     * @responsibility computation
     * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
     * @returns {unknown} The result returned by path.hasAttribute.
     */ path => path.hasAttribute("marker-end"));
    return [marker.getAttribute("id"), marker.getElementsByTagName("path")[0].getAttribute("fill"), arrows.length,
      arrows.every(/**
       * Evaluate the selection condition document.getElementById(path.getAttribute("marker-end").slice(5, -1)) ===
       * marker && path.getAttribute("stroke") === marker.getElementsByTagName("path")[0].getAttribute("fill").
       * @responsibility computation
       * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
       * @returns {unknown} The result of the documented comparison or calculation.
       */ path => document.getElementById(path.getAttribute("marker-end").slice(5, -1)) === marker && path.getAttribute("stroke") === marker.getElementsByTagName("path")[0].getAttribute("fill"))];
  });
  assert.deepEqual(actual, [["left-arrow", "#111111", 2, true], ["right-arrow", "#c3ccd4", 2, true]]);
});
test("identical calls remain byte-identical despite intervening namespaces and themes", /**
 * Verify identical calls remain byte-identical despite intervening namespaces and themes; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const first = render({ idPrefix: "stable" });
  render({ idPrefix: "other", theme: "dark" });
  assert.equal(render({ idPrefix: "stable" }), first);
});
test("reusing a prefix deliberately repeats identifiers without hidden deduplication", /**
 * Verify reusing a prefix deliberately repeats identifiers without hidden deduplication; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(markers(render({ idPrefix: "shared" }) + render({ idPrefix: "shared", theme: "dark" })), ["shared-arrow", "shared-arrow"]);
});
test("the legacy default remains vrl-arrow for standalone diagrams", /**
 * Verify the legacy default remains vrl-arrow for standalone diagrams; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(markers(render()), ["vrl-arrow"]);
});
test("namespace selection changes no route facts, diagnostics, geometry, or JSON", /**
 * Verify namespace selection changes no route facts, diagnostics, geometry, or JSON; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const { svg: firstSvg, ...first } = createDiagramState(SOURCE, { idPrefix: "first" });
  const { svg: secondSvg, ...second } = createDiagramState(SOURCE, { idPrefix: "second" });
  assert.deepEqual([first, firstSvg.replaceAll("first-arrow", "second-arrow")], [second, secondSvg]);
});
test("rendering leaves frozen caller options and input records unchanged", /**
 * Verify rendering leaves frozen caller options and input records unchanged; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const options = Object.freeze({ idPrefix: "owned", legend: false });
  const before = structuredClone(compiled);
  render(options);
  assert.deepEqual([options, compiled], [{ idPrefix: "owned", legend: false }, before]);
});

const technical = compiled.layout.segments.find(/**
 * Evaluate the selection condition segment.kind === "technical".
 * @responsibility computation
 * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
 * @returns {boolean} The result of the documented comparison or calculation.
 */ segment => segment.kind === "technical");
const previous = { ...technical.start, element: technical.element };
const FRAGMENTS = [
  ["route", /**
   * Apply renderRouteSegments to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} prefix - Text prefix or namespace retained before the formatted value.
   * @returns {unknown} The result returned by renderRouteSegments.
   */ prefix => renderRouteSegments(compiled.layout, resolveTheme(), "en", prefix), 2],
  ["ladder", /**
   * Apply renderDropLadderSegment to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} prefix - Text prefix or namespace retained before the formatted value.
   * @returns {unknown} The result returned by renderDropLadderSegment.
   */ prefix => renderDropLadderSegment(previous, technical.end, resolveTheme(), technical.element, "en", compiled.layout, prefix), 1],
  ["direct", /**
   * Apply renderDirectTechnicalSegment to the supplied arguments; retain the callee's return and failure
   * behavior.
   * @responsibility computation
   * @param {unknown} prefix - Text prefix or namespace retained before the formatted value.
   * @returns {unknown} The result returned by renderDirectTechnicalSegment.
   */ prefix => renderDirectTechnicalSegment(previous, technical.end, resolveTheme(), technical.element, compiled.layout, "en", prefix), 1]
];
for (const [name, fragment, count] of FRAGMENTS) {
  test(`${name} fragment references the caller's matching marker definition`, /**
   * Verify ${name} fragment references the caller's matching marker definition; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(references(fragment("fragment")), Array(count).fill("url(#fragment-arrow)"));
  });
  test(`${name} fragment retains the default for existing callers`, /**
   * Verify ${name} fragment retains the default for existing callers; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(references(fragment(undefined)), Array(count).fill("url(#vrl-arrow)"));
  });
  test(`${name} fragment rejects an unsafe namespace`, /**
   * Verify ${name} fragment rejects an unsafe namespace; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise fragment so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by fragment.
     */ () => fragment("bad)url"), RangeError);
  });
}
for (const [name, adapter] of ADAPTERS) {
  test(`${name} forwards a stable prefix for each occurrence of the same route`, /**
   * Verify ${name} forwards a stable prefix for each occurrence of the same route; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(markers(adapter({ source: SOURCE, options: { idPrefix: "first" } }) + adapter({ source: SOURCE, options: { idPrefix: "second", theme: "dark" } })), ["first-arrow", "second-arrow"]);
  });
  test(`${name} propagates namespace failures`, /**
   * Verify ${name} propagates namespace failures; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise adapter so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by adapter.
     */ () => adapter({ source: SOURCE, options: { idPrefix: "bad id" } }), RangeError);
  });
  test(`${name} preserves a supplied state's namespace instead of rewriting trusted markup`, /**
   * Verify ${name} preserves a supplied state's namespace instead of rewriting trusted markup; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const diagram = createDiagramState(SOURCE, { idPrefix: "server" });
    assert.deepEqual(markers(adapter({ diagram, source: null, options: { idPrefix: "ignored" } })), ["server-arrow"]);
  });
}
test("SvelteKit load preserves an async caller-provided instance namespace", /**
 * Verify SvelteKit load preserves an async caller-provided instance namespace; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const load = createVrlSvelteKitLoad({ source: SOURCE, /**
   * Supply the options test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @param {unknown} event - SvelteKit request event or independently specified technical event.
   * @returns {Promise<Object>} Resolves with a record containing idPrefix. Rejects when the awaited operation fails.
   */ options: async event => ({ idPrefix: event.params.instance }) });
  const data = await load({ params: { instance: "load-primary" } });
  assert.deepEqual(markers(kit.render({ data, options: { idPrefix: "ignored" } }).html), ["load-primary-arrow"]);
});
test("SvelteKit load propagates an invalid namespace without returning partial data", /**
 * Verify SvelteKit load propagates an invalid namespace without returning partial data; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const load = createVrlSvelteKitLoad({ source: SOURCE, options: { idPrefix: "bad id" } });
  await assert.rejects(load({}), RangeError);
});
