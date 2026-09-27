import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { createDiagnostic } from "@subvertic/vrl-core";
import { createDiagramState, diagramWarningText } from "@subvertic/vrl-diagram";
import { createVrlDiagramComponent } from "@subvertic/vrl-react";
import { renderVrlSvelteMarkup } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";
import { loadSvelteDiagrams } from "./helpers/svelte-ssr.js";

const VALID = 'route "Good rope"\nstart\nrappel height=10m rope=20m\nexit';
const WARNING = 'route "Short rope"\nrappel height=10m rope=5m';
const MULTIPLE = 'route "Multiple warnings"\nrappel height=10m rope=5m stages=2m+3m';
const INVALID = 'route "Bad height"\nrappel height=-10m rope=5m';
const { svelte, kit } = await loadSvelteDiagrams();
const Component = createVrlDiagramComponent(React);
const ADAPTERS = [
  ["React", /**
   * Apply renderToStaticMarkup to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @returns {unknown} The result returned by renderToStaticMarkup.
   */ (props) => renderToStaticMarkup(React.createElement(Component, props))],
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
   */ (props) => svelte.render(props).html],
  ["SvelteKit component", /**
   * Project kit.render(props).html from the current record.
   * @responsibility computation
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @returns {unknown} The kit.render(props).html value selected or validated above.
   */ (props) => kit.render(props).html]
];

/**
 * Parse markup with the independent XML parser so assertions observe serialized document structure.
 * @responsibility coordinator
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {unknown} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(`<root>${markup}</root>`, "application/xml");
}

/**
 * Serialize nonempty warning text with escaped labels and classes in an accessible status panel.
 * @responsibility computation
 * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
 * @returns {unknown} The result returned by Array.from(document.getElementsByTagName("pre")).find.
 */
function warningPanel(document) {
  return Array.from(document.getElementsByTagName("pre")).find(/**
   * Evaluate the selection condition element.getAttribute("role") === "status".
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (element) => element.getAttribute("role") === "status");
}

/**
 * Independently observe SVG count, nonblocking warning text and blocking diagnostic text from parsed
 * framework markup.
 * @responsibility computation
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {Object} A record containing svgCount, warnings, diagnostics.
 */
function content(markup) {
  const document = documentFor(markup);
  const panel = warningPanel(document);
  return { svgCount: document.getElementsByTagName("svg").length, warnings: panel?.textContent ?? "",
    diagnostics: Array.from(document.getElementsByTagName("pre")).filter(/**
     * Evaluate the selection condition element !== panel.
     * @responsibility computation
     * @param {Object} element - Owning route element with its type, identity and declared attributes.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ (element) => element !== panel).map(/**
      * Project element.textContent from the current record.
      * @responsibility computation
      * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
      * @returns {unknown} The element.textContent value selected or validated above.
      */ (element) => element.textContent) };
}

for (const [name, render] of ADAPTERS) {
  test(`${name}: clean success renders one diagram without an empty warning panel`, /**
   * Verify ${name}: clean success renders one diagram without an empty warning panel; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(content(render({ source: VALID })), { svgCount: 1, warnings: "", diagnostics: [] });
  });
  for (const source of [WARNING, MULTIPLE]) {
    test(`${name}: warnings accompany a successful diagram in diagnostic order (${source.split("\n")[0]})`, /**
     * Verify ${name}: warnings accompany a successful diagram in diagnostic order (${source.split("\n")[0]});
     * arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to the
     * test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const state = createDiagramState(source);
      assert.deepEqual([state.ok, content(render({ source }))], [true, { svgCount: 1, warnings: state.diagnosticsText, diagnostics: [] }]);
    });
  }
  test(`${name}: warnings have an accessible name and sit outside the image role`, /**
   * Verify ${name}: warnings have an accessible name and sit outside the image role; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = documentFor(render({ source: WARNING }));
    const panel = warningPanel(document);
    const image = document.getElementsByTagName("svg")[0].parentNode;
    assert.deepEqual([panel.getAttribute("aria-label"), panel.getAttribute("aria-live"), panel.getAttribute("aria-atomic"), panel.parentNode === image.parentNode, image.contains(panel)], ["Route warnings", "polite", "true", true, false]);
  });
  test(`${name}: long warning text can wrap`, /**
   * Verify ${name}: long warning text can wrap; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const style = warningPanel(documentFor(render({ source: WARNING }))).getAttribute("style").replaceAll(" ", "");
    assert.deepEqual([style.includes("white-space:pre-wrap"), style.includes("overflow-wrap:anywhere")], [true, true]);
  });
  test(`${name}: hiding warnings preserves a frozen complete state`, /**
   * Verify ${name}: hiding warnings preserves a frozen complete state; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = createDiagramState(MULTIPLE);
    const before = structuredClone(state);
    state.diagnostics.forEach(Object.freeze);
    Object.freeze(state.diagnostics);
    Object.freeze(state);
    assert.deepEqual([content(render({ diagram: state, showWarnings: false })), state], [{ svgCount: 1, warnings: "", diagnostics: [] }, before]);
  });
  test(`${name}: display can be restored after intentional suppression`, /**
   * Verify ${name}: display can be restored after intentional suppression; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = createDiagramState(WARNING);
    render({ diagram: state, showWarnings: false });
    assert.equal(content(render({ diagram: state, showWarnings: true })).warnings, state.diagnosticsText);
  });
  test(`${name}: warning display changes only the surrounding HTML, preserving the complete SVG`, /**
   * Verify ${name}: warning display changes only the surrounding HTML, preserving the complete SVG; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = createDiagramState(WARNING);
    const shown = documentFor(render({ diagram: state }));
    const hidden = documentFor(render({ diagram: state, showWarnings: false }));
    const expected = documentFor(state.svg).getElementsByTagName("svg")[0].toString();
    assert.deepEqual([shown, hidden].map(/**
     * Apply document.getElementsByTagName("svg").0.toString to the supplied arguments; retain the callee's return
     * and failure behavior.
     * @responsibility computation
     * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
     * @returns {unknown} The result returned by document.getElementsByTagName("svg").0.toString.
     */ (document) => document.getElementsByTagName("svg")[0].toString()), [expected, expected]);
  });
  for (const showWarnings of [true, false]) {
    test(`${name}: blocking errors never render SVG with showWarnings=${showWarnings}`, /**
     * Verify ${name}: blocking errors never render SVG with showWarnings=${showWarnings}; arrange the scenario and
     * make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const state = createDiagramState(INVALID);
      assert.deepEqual(content(render({ source: INVALID, showWarnings })), { svgCount: 0, warnings: "", diagnostics: [state.diagnosticsText] });
    });
  }
  test(`${name}: warnings and errors together retain the entire failure report`, /**
   * Verify ${name}: warnings and errors together retain the entire failure report; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const warning = createDiagnostic("custom", "warning", "Advisory", { line: 1, column: 1 });
    const error = createDiagnostic("custom", "error", "Blocked", { line: 2, column: 1 });
    const state = { ...createDiagramState(INVALID), diagnostics: [warning, error], diagnosticsText: "Advisory\nBlocked", svg: "<svg/>" };
    assert.deepEqual(content(render({ diagram: state, showWarnings: false })), { svgCount: 0, warnings: "", diagnostics: ["Advisory\nBlocked"] });
  });
  test(`${name}: a successful legacy supplied diagram without diagnostics still renders`, /**
   * Verify ${name}: a successful legacy supplied diagram without diagnostics still renders; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(content(render({ diagram: { ok: true, svg: "<svg/>" } })), { svgCount: 1, warnings: "", diagnostics: [] });
  });
  test(`${name}: supplied warnings bypass invalid source and compilation options`, /**
   * Verify ${name}: supplied warnings bypass invalid source and compilation options; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = createDiagramState(WARNING);
    assert.deepEqual(content(render({ source: null, options: null, diagram: state })), { svgCount: 1, warnings: state.diagnosticsText, diagnostics: [] });
  });
  test(`${name}: custom warning label and class are escaped without losing their values`, /**
   * Verify ${name}: custom warning label and class are escaped without losing their values; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const warningsLabel = 'Warnings " & <label>';
    const warningsClassName = 'custom" onclick="inert';
    const panel = warningPanel(documentFor(render({ source: WARNING, warningsLabel, warningsClassName })));
    assert.deepEqual([panel.getAttribute("aria-label"), panel.getAttribute("class"), panel.hasAttribute("onclick")], [warningsLabel, warningsClassName, false]);
  });
  test(`${name}: diagnostic content remains text instead of executable markup`, /**
   * Verify ${name}: diagnostic content remains text instead of executable markup; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const diagnostic = createDiagnostic("custom", "warning", '<img src="x" onerror="inert"/> & text', { line: 2, column: 3 });
    const state = { ...createDiagramState(VALID), diagnostics: [diagnostic] };
    const document = documentFor(render({ diagram: state }));
    assert.deepEqual([warningPanel(document).textContent, document.getElementsByTagName("img").length], ['WARNING custom at 2:3: <img src="x" onerror="inert"/> & text', 0]);
  });
  test(`${name}: changing source removes stale warnings`, /**
   * Verify ${name}: changing source removes stale warnings; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    render({ source: WARNING });
    assert.deepEqual(content(render({ source: VALID })), { svgCount: 1, warnings: "", diagnostics: [] });
  });
  for (const showWarnings of [null, "false", 0, {}]) {
    test(`${name}: invalid display flag ${JSON.stringify(showWarnings)} throws`, /**
     * Verify ${name}: invalid display flag ${JSON.stringify(showWarnings)} throws; arrange the scenario and make
     * its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.throws(/**
       * Exercise render so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {unknown} The result returned by render.
       */ () => render({ source: VALID, showWarnings }), { name: "TypeError", message: "showWarnings must be a boolean." });
    });
  }
  test(`${name}: failed precomputed state still rejects invalid warning configuration`, /**
   * Verify ${name}: failed precomputed state still rejects invalid warning configuration; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise render so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by render.
     */ () => render({ diagram: createDiagramState(INVALID), showWarnings: "false" }), { name: "TypeError", message: "showWarnings must be a boolean." });
  });
}

test("shared warning selection filters only warnings without changing diagnostic order or records", /**
 * Verify shared warning selection filters only warnings without changing diagnostic order or records; arrange
 * the scenario and make its single direct assertion. Assertion and setup failures propagate to the test
 * runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const first = createDiagnostic("custom", "warning", "First", { line: 2, column: 3 });
  const second = createDiagnostic("custom", "warning", "Second", { line: 4, column: 5 });
  const error = createDiagnostic("custom", "error", "Unrelated", { line: 1, column: 1 });
  const state = { ok: true, diagnostics: [first, error, second] };
  const before = structuredClone(state);
  assert.deepEqual([diagramWarningText(state), state], ["WARNING custom at 2:3: First\nWARNING custom at 4:5: Second", before]);
});

test("shared warning selection accepts legacy null diagnostics", /**
 * Verify shared warning selection accepts legacy null diagnostics; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(diagramWarningText({ ok: true, diagnostics: null }), "");
});

test("React component defaults can suppress warnings until explicitly enabled", /**
 * Verify React component defaults can suppress warnings until explicitly enabled; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Customized = createVrlDiagramComponent(React, { source: WARNING, showWarnings: false, warningsClassName: "custom-warnings", warningsLabel: "Avisos" });
  const hidden = renderToStaticMarkup(React.createElement(Customized));
  const visible = warningPanel(documentFor(renderToStaticMarkup(React.createElement(Customized, { showWarnings: true }))));
  assert.deepEqual([content(hidden).warnings, visible.getAttribute("class"), visible.getAttribute("aria-label")], ["", "custom-warnings", "Avisos"]);
});

test("React rejects null warning visibility in component defaults", /**
 * Verify React rejects null warning visibility in component defaults; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Customized = createVrlDiagramComponent(React, { source: WARNING, showWarnings: null });
  assert.throws(/**
   * Exercise renderToStaticMarkup so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by renderToStaticMarkup.
   */ () => renderToStaticMarkup(React.createElement(Customized)), { name: "TypeError", message: "showWarnings must be a boolean." });
});

test("React keeps container props on the image when warnings add an outer wrapper", /**
 * Verify React keeps container props on the image when warnings add an outer wrapper; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const document = documentFor(renderToStaticMarkup(React.createElement(Component, { source: WARNING, containerProps: { id: "image" }, className: "custom-image", role: "figure" })));
  const image = document.getElementById("image");
  assert.deepEqual([image.getAttribute("class"), image.getAttribute("role"), warningPanel(document).parentNode === image.parentNode], ["custom-image", "figure", true]);
});

test("SvelteKit load retains warnings and its component displays data under the configured key", /**
 * Verify SvelteKit load retains warnings and its component displays data under the configured key; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const data = await createVrlSvelteKitLoad({ /**
   * Supply the source test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Promise<unknown>} Resolves with the WARNING value selected or validated above. Rejects when the awaited operation fails.
   */ source: async () => WARNING, key: "route" })({});
  assert.deepEqual([data.route.diagnostics.map(/**
   * Return the selected severity binding unchanged.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {string} input1.severity - Diagnostic severity, error or warning.
   * @returns {unknown} The severity value selected or validated above.
   */ ({ severity }) => severity), content(kit.render({ data, diagramKey: "route", warningsLabel: "Avisos" }).html)], [["warning"], { svgCount: 1, warnings: data.route.diagnosticsText, diagnostics: [] }]);
});

test("SvelteKit explicit state takes precedence over warning-bearing load data", /**
 * Verify SvelteKit explicit state takes precedence over warning-bearing load data; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const data = { vrl: createDiagramState(WARNING) };
  assert.deepEqual(content(kit.render({ data, diagram: createDiagramState(VALID) }).html), { svgCount: 1, warnings: "", diagnostics: [] });
});

test("SvelteKit warning options are forwarded to its Svelte component", /**
 * Verify SvelteKit warning options are forwarded to its Svelte component; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const data = { vrl: createDiagramState(WARNING) };
  assert.deepEqual(content(kit.render({ data, showWarnings: false }).html), { svgCount: 1, warnings: "", diagnostics: [] });
});
