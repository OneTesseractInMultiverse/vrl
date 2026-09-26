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
  ["React", props => renderToStaticMarkup(React.createElement(Component, props))],
  ["Svelte markup", ({ source = "", options = {}, ...props }) => renderVrlSvelteMarkup(source, options, props)],
  ["Svelte component", props => svelte.render(props).html],
  ["SvelteKit component", props => kit.render(props).html]
];

function parse(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(`<root>${markup}</root>`, "application/xml");
}
function markers(markup) {
  return [...parse(markup).getElementsByTagName("marker")].map(marker => marker.getAttribute("id"));
}
function references(markup) {
  return [...parse(markup).getElementsByTagName("path")].map(path => path.getAttribute("marker-end")).filter(Boolean);
}
function render(options = {}) { return renderTopoSvg(compiled.model, compiled.layout, options); }

for (const idPrefix of [undefined, "a", "A_b-9", "a".repeat(64)]) {
  test(`valid SVG prefix ${idPrefix} identifies all technical references`, () => {
    const svg = render({ idPrefix });
    const id = `${idPrefix ?? "vrl"}-arrow`;
    assert.deepEqual([markers(svg), references(svg)], [[id], [`url(#${id})`, `url(#${id})`]]);
  });
}
for (const idPrefix of [null, false, 1, [], {}, { toString: () => "valid" }]) {
  test(`non-string SVG prefix is rejected: ${JSON.stringify(idPrefix)}`, () => {
    assert.throws(() => render({ idPrefix }), { name: "TypeError", message: "Renderer idPrefix must be a string." });
  });
}
for (const idPrefix of ["", "a".repeat(65), "1route", "_route", "-route", "route space", "route\n", "route\r", "route\t", "é", "a\u0000", 'a" onload="x', "a'><script/>", "a#b", "a)b", "a:b", "a.b", "a\\b"]) {
  test(`malformed SVG prefix fails without coercion or truncation: ${JSON.stringify(idPrefix)}`, () => {
    assert.throws(() => render({ idPrefix }), { name: "RangeError", message: /idPrefix/ });
  });
}

test("scene inspection carries the same resolved identifiers used by serialization", () => {
  assert.deepEqual(computeTopoScene(compiled.model, compiled.layout, { idPrefix: "inspection" }).identifiers, { arrow: "inspection-arrow" });
});
test("each scene owns its identifier record independently of other render calls", () => {
  const scene = computeTopoScene(compiled.model, compiled.layout, { idPrefix: "owned" });
  scene.identifiers.arrow = "changed";
  assert.equal(computeTopoScene(compiled.model, compiled.layout, { idPrefix: "owned" }).identifiers.arrow, "owned-arrow");
});
for (const shape of ["ladder", "direct", "slab"]) {
  test(`${shape} technical lines keep every reference in the selected namespace`, () => {
    const state = createDiagramState(SOURCE.replace("rope=20m", `rope=20m shape=${shape}`), { idPrefix: "shape" });
    assert.deepEqual(references(state.svg), ["url(#shape-arrow)", "url(#shape-arrow)"]);
  });
}
test("scene preparation rejects invalid namespaces before returning records", () => {
  assert.throws(() => computeTopoScene(compiled.model, compiled.layout, { idPrefix: "bad#id" }), RangeError);
});
test("two differently themed diagrams resolve references inside their own SVG", () => {
  const document = parse(render({ idPrefix: "left" }) + render({ idPrefix: "right", theme: "dark" }));
  const actual = [...document.getElementsByTagName("svg")].map(svg => {
    const marker = svg.getElementsByTagName("marker")[0];
    const arrows = [...svg.getElementsByTagName("path")].filter(path => path.hasAttribute("marker-end"));
    return [marker.getAttribute("id"), marker.getElementsByTagName("path")[0].getAttribute("fill"), arrows.length,
      arrows.every(path => document.getElementById(path.getAttribute("marker-end").slice(5, -1)) === marker && path.getAttribute("stroke") === marker.getElementsByTagName("path")[0].getAttribute("fill"))];
  });
  assert.deepEqual(actual, [["left-arrow", "#111111", 2, true], ["right-arrow", "#c3ccd4", 2, true]]);
});
test("identical calls remain byte-identical despite intervening namespaces and themes", () => {
  const first = render({ idPrefix: "stable" });
  render({ idPrefix: "other", theme: "dark" });
  assert.equal(render({ idPrefix: "stable" }), first);
});
test("reusing a prefix deliberately repeats identifiers without hidden deduplication", () => {
  assert.deepEqual(markers(render({ idPrefix: "shared" }) + render({ idPrefix: "shared", theme: "dark" })), ["shared-arrow", "shared-arrow"]);
});
test("the legacy default remains vrl-arrow for standalone diagrams", () => {
  assert.deepEqual(markers(render()), ["vrl-arrow"]);
});
test("namespace selection changes no route facts, diagnostics, geometry, or JSON", () => {
  const { svg: firstSvg, ...first } = createDiagramState(SOURCE, { idPrefix: "first" });
  const { svg: secondSvg, ...second } = createDiagramState(SOURCE, { idPrefix: "second" });
  assert.deepEqual([first, firstSvg.replaceAll("first-arrow", "second-arrow")], [second, secondSvg]);
});
test("rendering leaves frozen caller options and input records unchanged", () => {
  const options = Object.freeze({ idPrefix: "owned", legend: false });
  const before = structuredClone(compiled);
  render(options);
  assert.deepEqual([options, compiled], [{ idPrefix: "owned", legend: false }, before]);
});

const technical = compiled.layout.segments.find(segment => segment.kind === "technical");
const previous = { ...technical.start, element: technical.element };
const FRAGMENTS = [
  ["route", prefix => renderRouteSegments(compiled.layout, resolveTheme(), "en", prefix), 2],
  ["ladder", prefix => renderDropLadderSegment(previous, technical.end, resolveTheme(), technical.element, "en", compiled.layout, prefix), 1],
  ["direct", prefix => renderDirectTechnicalSegment(previous, technical.end, resolveTheme(), technical.element, compiled.layout, "en", prefix), 1]
];
for (const [name, fragment, count] of FRAGMENTS) {
  test(`${name} fragment references the caller's matching marker definition`, () => {
    assert.deepEqual(references(fragment("fragment")), Array(count).fill("url(#fragment-arrow)"));
  });
  test(`${name} fragment retains the default for existing callers`, () => {
    assert.deepEqual(references(fragment(undefined)), Array(count).fill("url(#vrl-arrow)"));
  });
  test(`${name} fragment rejects an unsafe namespace`, () => {
    assert.throws(() => fragment("bad)url"), RangeError);
  });
}
for (const [name, adapter] of ADAPTERS) {
  test(`${name} forwards a stable prefix for each occurrence of the same route`, () => {
    assert.deepEqual(markers(adapter({ source: SOURCE, options: { idPrefix: "first" } }) + adapter({ source: SOURCE, options: { idPrefix: "second", theme: "dark" } })), ["first-arrow", "second-arrow"]);
  });
  test(`${name} propagates namespace failures`, () => {
    assert.throws(() => adapter({ source: SOURCE, options: { idPrefix: "bad id" } }), RangeError);
  });
  test(`${name} preserves a supplied state's namespace instead of rewriting trusted markup`, () => {
    const diagram = createDiagramState(SOURCE, { idPrefix: "server" });
    assert.deepEqual(markers(adapter({ diagram, source: null, options: { idPrefix: "ignored" } })), ["server-arrow"]);
  });
}
test("SvelteKit load preserves an async caller-provided instance namespace", async () => {
  const load = createVrlSvelteKitLoad({ source: SOURCE, options: async event => ({ idPrefix: event.params.instance }) });
  const data = await load({ params: { instance: "load-primary" } });
  assert.deepEqual(markers(kit.render({ data, options: { idPrefix: "ignored" } }).html), ["load-primary-arrow"]);
});
test("SvelteKit load propagates an invalid namespace without returning partial data", async () => {
  const load = createVrlSvelteKitLoad({ source: SOURCE, options: { idPrefix: "bad id" } });
  await assert.rejects(load({}), RangeError);
});
