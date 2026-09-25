import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { createDiagnostic } from "@subvertic/core";
import { createDiagramState, diagramWarningText } from "@subvertic/diagram";
import { createVrlDiagramComponent } from "@subvertic/react";
import { renderVrlSvelteMarkup } from "@subvertic/svelte";
import { createVrlSvelteKitLoad } from "@subvertic/sveltekit";
import { loadSvelteDiagrams } from "./helpers/svelte-ssr.js";

const VALID = 'route "Good rope"\nstart\nrappel height=10m rope=20m\nexit';
const WARNING = 'route "Short rope"\nrappel height=10m rope=5m';
const MULTIPLE = 'route "Multiple warnings"\nrappel height=10m rope=5m stages=2m+3m';
const INVALID = 'route "Bad height"\nrappel height=-10m rope=5m';
const { svelte, kit } = await loadSvelteDiagrams();
const Component = createVrlDiagramComponent(React);
const ADAPTERS = [
  ["React", (props) => renderToStaticMarkup(React.createElement(Component, props))],
  ["Svelte markup", ({ source = "", options = {}, ...props }) => renderVrlSvelteMarkup(source, options, props)],
  ["Svelte component", (props) => svelte.render(props).html],
  ["SvelteKit component", (props) => kit.render(props).html]
];

function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(`<root>${markup}</root>`, "application/xml");
}

function warningPanel(document) {
  return Array.from(document.getElementsByTagName("pre")).find((element) => element.getAttribute("role") === "status");
}

function content(markup) {
  const document = documentFor(markup);
  const panel = warningPanel(document);
  return { svgCount: document.getElementsByTagName("svg").length, warnings: panel?.textContent ?? "",
    diagnostics: Array.from(document.getElementsByTagName("pre")).filter((element) => element !== panel).map((element) => element.textContent) };
}

for (const [name, render] of ADAPTERS) {
  test(`${name}: clean success renders one diagram without an empty warning panel`, () => {
    assert.deepEqual(content(render({ source: VALID })), { svgCount: 1, warnings: "", diagnostics: [] });
  });
  for (const source of [WARNING, MULTIPLE]) {
    test(`${name}: warnings accompany a successful diagram in diagnostic order (${source.split("\n")[0]})`, () => {
      const state = createDiagramState(source);
      assert.deepEqual([state.ok, content(render({ source }))], [true, { svgCount: 1, warnings: state.diagnosticsText, diagnostics: [] }]);
    });
  }
  test(`${name}: warnings have an accessible name and sit outside the image role`, () => {
    const document = documentFor(render({ source: WARNING }));
    const panel = warningPanel(document);
    const image = Array.from(document.getElementsByTagName("div")).find((element) => element.getAttribute("role") === "img");
    assert.deepEqual([panel.getAttribute("aria-label"), panel.getAttribute("aria-live"), panel.getAttribute("aria-atomic"), panel.parentNode === image.parentNode, image.contains(panel)], ["Route warnings", "polite", "true", true, false]);
  });
  test(`${name}: long warning text can wrap`, () => {
    const style = warningPanel(documentFor(render({ source: WARNING }))).getAttribute("style").replaceAll(" ", "");
    assert.deepEqual([style.includes("white-space:pre-wrap"), style.includes("overflow-wrap:anywhere")], [true, true]);
  });
  test(`${name}: hiding warnings preserves a frozen complete state`, () => {
    const state = createDiagramState(MULTIPLE);
    const before = structuredClone(state);
    state.diagnostics.forEach(Object.freeze);
    Object.freeze(state.diagnostics);
    Object.freeze(state);
    assert.deepEqual([content(render({ diagram: state, showWarnings: false })), state], [{ svgCount: 1, warnings: "", diagnostics: [] }, before]);
  });
  test(`${name}: display can be restored after intentional suppression`, () => {
    const state = createDiagramState(WARNING);
    render({ diagram: state, showWarnings: false });
    assert.equal(content(render({ diagram: state, showWarnings: true })).warnings, state.diagnosticsText);
  });
  test(`${name}: warning display changes only the surrounding HTML, preserving the complete SVG`, () => {
    const state = createDiagramState(WARNING);
    const shown = documentFor(render({ diagram: state }));
    const hidden = documentFor(render({ diagram: state, showWarnings: false }));
    const expected = documentFor(state.svg).getElementsByTagName("svg")[0].toString();
    assert.deepEqual([shown, hidden].map((document) => document.getElementsByTagName("svg")[0].toString()), [expected, expected]);
  });
  for (const showWarnings of [true, false]) {
    test(`${name}: blocking errors never render SVG with showWarnings=${showWarnings}`, () => {
      const state = createDiagramState(INVALID);
      assert.deepEqual(content(render({ source: INVALID, showWarnings })), { svgCount: 0, warnings: "", diagnostics: [state.diagnosticsText] });
    });
  }
  test(`${name}: warnings and errors together retain the entire failure report`, () => {
    const warning = createDiagnostic("custom", "warning", "Advisory", { line: 1, column: 1 });
    const error = createDiagnostic("custom", "error", "Blocked", { line: 2, column: 1 });
    const state = { ...createDiagramState(INVALID), diagnostics: [warning, error], diagnosticsText: "Advisory\nBlocked", svg: "<svg/>" };
    assert.deepEqual(content(render({ diagram: state, showWarnings: false })), { svgCount: 0, warnings: "", diagnostics: ["Advisory\nBlocked"] });
  });
  test(`${name}: a successful legacy supplied diagram without diagnostics still renders`, () => {
    assert.deepEqual(content(render({ diagram: { ok: true, svg: "<svg/>" } })), { svgCount: 1, warnings: "", diagnostics: [] });
  });
  test(`${name}: supplied warnings bypass invalid source and compilation options`, () => {
    const state = createDiagramState(WARNING);
    assert.deepEqual(content(render({ source: null, options: null, diagram: state })), { svgCount: 1, warnings: state.diagnosticsText, diagnostics: [] });
  });
  test(`${name}: custom warning label and class are escaped without losing their values`, () => {
    const warningsLabel = 'Warnings " & <label>';
    const warningsClassName = 'custom" onclick="inert';
    const panel = warningPanel(documentFor(render({ source: WARNING, warningsLabel, warningsClassName })));
    assert.deepEqual([panel.getAttribute("aria-label"), panel.getAttribute("class"), panel.hasAttribute("onclick")], [warningsLabel, warningsClassName, false]);
  });
  test(`${name}: diagnostic content remains text instead of executable markup`, () => {
    const diagnostic = createDiagnostic("custom", "warning", '<img src="x" onerror="inert"/> & text', { line: 2, column: 3 });
    const state = { ...createDiagramState(VALID), diagnostics: [diagnostic] };
    const document = documentFor(render({ diagram: state }));
    assert.deepEqual([warningPanel(document).textContent, document.getElementsByTagName("img").length], ['WARNING custom at 2:3: <img src="x" onerror="inert"/> & text', 0]);
  });
  test(`${name}: changing source removes stale warnings`, () => {
    render({ source: WARNING });
    assert.deepEqual(content(render({ source: VALID })), { svgCount: 1, warnings: "", diagnostics: [] });
  });
  for (const showWarnings of [null, "false", 0, {}]) {
    test(`${name}: invalid display flag ${JSON.stringify(showWarnings)} throws`, () => {
      assert.throws(() => render({ source: VALID, showWarnings }), { name: "TypeError", message: "showWarnings must be a boolean." });
    });
  }
  test(`${name}: failed precomputed state still rejects invalid warning configuration`, () => {
    assert.throws(() => render({ diagram: createDiagramState(INVALID), showWarnings: "false" }), { name: "TypeError", message: "showWarnings must be a boolean." });
  });
}

test("shared warning selection filters only warnings without changing diagnostic order or records", () => {
  const first = createDiagnostic("custom", "warning", "First", { line: 2, column: 3 });
  const second = createDiagnostic("custom", "warning", "Second", { line: 4, column: 5 });
  const error = createDiagnostic("custom", "error", "Unrelated", { line: 1, column: 1 });
  const state = { ok: true, diagnostics: [first, error, second] };
  const before = structuredClone(state);
  assert.deepEqual([diagramWarningText(state), state], ["WARNING custom at 2:3: First\nWARNING custom at 4:5: Second", before]);
});

test("shared warning selection accepts legacy null diagnostics", () => {
  assert.equal(diagramWarningText({ ok: true, diagnostics: null }), "");
});

test("React component defaults can suppress warnings until explicitly enabled", () => {
  const Customized = createVrlDiagramComponent(React, { source: WARNING, showWarnings: false, warningsClassName: "custom-warnings", warningsLabel: "Avisos" });
  const hidden = renderToStaticMarkup(React.createElement(Customized));
  const visible = warningPanel(documentFor(renderToStaticMarkup(React.createElement(Customized, { showWarnings: true }))));
  assert.deepEqual([content(hidden).warnings, visible.getAttribute("class"), visible.getAttribute("aria-label")], ["", "custom-warnings", "Avisos"]);
});

test("React rejects null warning visibility in component defaults", () => {
  const Customized = createVrlDiagramComponent(React, { source: WARNING, showWarnings: null });
  assert.throws(() => renderToStaticMarkup(React.createElement(Customized)), { name: "TypeError", message: "showWarnings must be a boolean." });
});

test("React keeps container props on the image when warnings add an outer wrapper", () => {
  const document = documentFor(renderToStaticMarkup(React.createElement(Component, { source: WARNING, containerProps: { id: "image" }, className: "custom-image", role: "figure" })));
  const image = document.getElementById("image");
  assert.deepEqual([image.getAttribute("class"), image.getAttribute("role"), warningPanel(document).parentNode === image.parentNode], ["custom-image", "figure", true]);
});

test("SvelteKit load retains warnings and its component displays data under the configured key", async () => {
  const data = await createVrlSvelteKitLoad({ source: async () => WARNING, key: "route" })({});
  assert.deepEqual([data.route.diagnostics.map(({ severity }) => severity), content(kit.render({ data, diagramKey: "route", warningsLabel: "Avisos" }).html)], [["warning"], { svgCount: 1, warnings: data.route.diagnosticsText, diagnostics: [] }]);
});

test("SvelteKit explicit state takes precedence over warning-bearing load data", () => {
  const data = { vrl: createDiagramState(WARNING) };
  assert.deepEqual(content(kit.render({ data, diagram: createDiagramState(VALID) }).html), { svgCount: 1, warnings: "", diagnostics: [] });
});

test("SvelteKit warning options are forwarded to its Svelte component", () => {
  const data = { vrl: createDiagramState(WARNING) };
  assert.deepEqual(content(kit.render({ data, showWarnings: false }).html), { svgCount: 1, warnings: "", diagnostics: [] });
});
