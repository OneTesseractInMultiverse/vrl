import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { compileRoute, formatDiagnostic } from "@subvertic/vrl-core";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";
import { createVrlReactDiagramState, createVrlDiagramComponent } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitData, createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";
import { createDiagramStateWithPorts } from "../packages/vrl-diagram/src/application/create-diagram-state.js";
import { assembleDiagramState } from "../packages/vrl-diagram/src/application/diagram-state.js";

const VALID = 'route "Survey & descent"\nstart\nrappel height=10m rope=20m flow=high\nexit';
const WARNING = 'route "Short rope"\nrappel height=10m rope=5m';
const INVALID = 'route "Invalid height"\nrappel height=-10m rope=20m';
const CASES = [["valid", VALID], ["warning-only", WARNING], ["invalid", INVALID], ["syntax error", 'route "Unclosed'], ["multiple warnings", 'route "Warnings"\nrappel height=10m rope=5m stages=2m+3m']];
const FACTORIES = [createDiagramState, createVrlReactDiagramState, createVrlSvelteDiagramState, createVrlSvelteKitData];
const React = { /**
 * Project type, props, child into the record required by createElement.
 * @responsibility computation
 * @param {unknown} type - Declared element or record discriminator.
 * @param {unknown} props - Component properties supplied by the embedding consumer.
 * @param {unknown} child - Current child node or record during recursive traversal.
 * @returns {Object} A record containing type, props, child.
 */ createElement: (type, props, child) => ({ type, props, child }) };

for (const [path, expected] of [["docs/diagram-state.md", ["Short rope", ["warning"]]], ["packages/vrl-diagram/README.md", ["Canyon preview", []]]]) {
  test(`${path}: the documented source example produces its stated diagnostics`, /**
   * Verify ${path}: the documented source example produces its stated diagnostics; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const documentation = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    const source = documentation.match(/const source = `([^`]+)`;/)[1];
    const state = createDiagramState(source, { language: "es", legend: false });
    assert.deepEqual([state.model.name, state.diagnostics.map(/**
     * Return the selected severity binding unchanged.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {string} input1.severity - Diagnostic severity, error or warning.
     * @returns {unknown} The severity value selected or validated above.
     */ ({ severity }) => severity)], expected);
  });
}

// Independent projection of the existing core and SVG contracts, including every state field.
/**
 * Build the expected adapter projection from public compiler/render operations; deeper domain correctness
 * uses separate independent fixtures.
 * @responsibility coordinator
 * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {Object} A record containing the supplied fields, diagnosticsText, svg.
 */
function expectedState(source, options = {}) {
  const result = compileRoute(source, options);
  return { ...result, diagnosticsText: result.diagnostics.map(formatDiagnostic).join("\n"),
    svg: result.ok ? renderTopoSvg(result.model, result.layout, options) : "" };
}

/**
 * Parse markup with the independent XML parser so assertions observe serialized document structure.
 * @responsibility coordinator
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {unknown} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "text/html");
}

/**
 * Capture the exact thrown error from an operation and fail explicitly when it unexpectedly succeeds.
 * @responsibility coordinator
 * @param {unknown} run - Operation invoked to capture its thrown error or returned result.
 * @returns {unknown} The error value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
function captureError(run) {
  try { run(); } catch (error) { return error; }
  throw new Error("Expected operation to throw");
}

for (const create of FACTORIES) {
  for (const [name, source] of CASES) {
    test(`${create.name}: complete ${name} state preserves the compiler and renderer contracts`, /**
     * Verify ${create.name}: complete ${name} state preserves the compiler and renderer contracts; arrange the
     * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const options = { language: "es", theme: "dark", legend: false, layout: { width: 400 } };
      assert.deepEqual(create(source, options), expectedState(source, options));
    });
  }

  test(`${create.name}: warnings retain successful model, layout, JSON, and SVG`, /**
   * Verify ${create.name}: warnings retain successful model, layout, JSON, and SVG; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create(WARNING);
    assert.deepEqual([state.ok, state.diagnostics.map(/**
     * Project the current entry into an ordered tuple for state.diagnostics.map.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {string} input1.severity - Diagnostic severity, error or warning.
     * @param {string} input1.message - Human-readable diagnostic or process message.
     * @returns {Array} The ordered records or values assembled above.
     */ ({ severity, message }) => [severity, message]), state.model.name, state.layout.nodes.length, JSON.parse(state.json).name, state.svg === ""],
      [true, [["warning", "Rope length is shorter than rappel height."]], "Short rope", 1, "Short rope", false]);
  });

  test(`${create.name}: invalid source suppresses renderer-only configuration failures`, /**
   * Verify ${create.name}: invalid source suppresses renderer-only configuration failures; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create(INVALID, { theme: "unsupported", legend: "false" });
    assert.deepEqual([state.ok, state.model, state.layout, state.json, state.svg, state.diagnostics.every(/**
     * Evaluate the selection condition item.severity === "error".
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ (item) => item.severity === "error")], [false, null, null, null, "", true]);
  });

  test(`${create.name}: source and option changes produce fresh complete states`, /**
   * Verify ${create.name}: source and option changes produce fresh complete states; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const options = { language: "en", layout: { width: 320 } };
    const first = create(VALID, options);
    options.language = "es";
    options.layout.width = 700;
    const next = create(WARNING, options);
    assert.deepEqual([first, next], [expectedState(VALID, { language: "en", layout: { width: 320 } }), expectedState(WARNING, { language: "es", layout: { width: 700 } })]);
  });

  test(`${create.name}: frozen caller options are accepted unchanged`, /**
   * Verify ${create.name}: frozen caller options are accepted unchanged; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const options = Object.freeze({ language: "es", legend: false, layout: Object.freeze({ width: 320 }), themeTokens: Object.freeze({ water: "#abcdef" }) });
    assert.deepEqual(create(VALID, options), expectedState(VALID, options));
  });

  test(`${create.name}: editing a returned state cannot affect a subsequent call`, /**
   * Verify ${create.name}: editing a returned state cannot affect a subsequent call; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const first = create(WARNING);
    first.ast.name = "Edited syntax";
    first.model.name = "Edited model";
    first.layout.nodes[0].x = -123;
    first.diagnostics[0].message = "Edited diagnostic";
    assert.deepEqual(create(WARNING), expectedState(WARNING));
  });

  for (const [name, source, options, error] of [
    ["non-string source", null, {}, TypeError],
    ["null options", VALID, null, TypeError],
    ["invalid limits", VALID, { limits: { maxElements: 0 } }, RangeError],
    ["invalid layout", VALID, { layout: { width: 0 } }, RangeError],
    ["invalid theme", VALID, { theme: "unsupported" }, TypeError],
    ["invalid paint", VALID, { themeTokens: { panel: "url(#external)" } }, TypeError],
    ["invalid XML text", 'route "XML"\nnote "before\u000bafter"', {}, TypeError]
  ]) {
    test(`${create.name}: ${name} propagates an exception instead of a diagnostic state`, /**
     * Verify ${create.name}: ${name} propagates an exception instead of a diagnostic state; arrange the scenario
     * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.throws(/**
       * Exercise create so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {unknown} The result returned by create.
       */ () => create(source, options), error);
    });
  }
}

test("the coordinator forwards the same source, options, model, and layout exactly once", /**
 * Verify the coordinator forwards the same source, options, model, and layout exactly once; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const options = { language: "es", layout: { width: 320 } };
  const result = compileRoute(VALID, options);
  const calls = [];
  const state = createDiagramStateWithPorts(VALID, options, {
    /**
     * Supply the compile test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
     * @param {unknown} supplied - Caller-supplied option or port value retained for identity/comparison checks.
     * @returns {unknown} The result value selected or validated above.
     */
    compile: (source, supplied) => { calls.push(["compile", source === VALID, supplied === options]); return result; },
    /**
     * Supply the render test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @param {Object} model - Normalized route data with typed attributes, traversal and summary.
     * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
     * @param {unknown} supplied - Caller-supplied option or port value retained for identity/comparison checks.
     * @returns {string} The literal "<svg/>" for this branch.
     */
    render: (model, layout, supplied) => { calls.push(["render", model === result.model, layout === result.layout, supplied === options]); return "<svg/>"; }
  });
  assert.deepEqual([calls, state], [[["compile", true, true], ["render", true, true, true]], { ...result, diagnosticsText: "", svg: "<svg/>" }]);
});

test("the coordinator skips rendering after a blocking compiler result", /**
 * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
 * blocking validation to prevent this call.
 * @responsibility computation
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(INVALID);
  const calls = [];
  const state = createDiagramStateWithPorts(INVALID, {}, { /**
   * Supply the compile test double and record its invocation in caller-owned fixture state; return the
   * scenario's deliberately selected value. No production I/O is performed by this fixture.
   * @responsibility computation
   * @returns {unknown} The result value selected or validated above.
   */ compile: () => { calls.push("compile"); return result; }, /**
    * Supply the render test double and record its invocation in caller-owned fixture state; throw the selected
    * failure so its propagation or forbidden invocation is observable. No production I/O is performed by this
    * fixture.
    * @responsibility computation
    * @returns {void} Completes the documented operation; no return value is consumed.
    * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
    */ render: () => { calls.push("render"); throw new Error("Must not run"); } });
  assert.deepEqual([calls, state], [["compile"], expectedState(INVALID)]);
});

test("the coordinator renders a warning-only compiler result once", /**
 * Verify the coordinator renders a warning-only compiler result once; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(WARNING);
  let renders = 0;
  const state = createDiagramStateWithPorts(WARNING, {}, { /**
   * Supply the compile test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {unknown} The result value selected or validated above.
   */ compile: () => result, /**
    * Deliberately modify renders in the caller-owned fixture so the enclosing test can observe the specified
    * mutation or failure boundary.
    * @responsibility computation
    * @returns {string} The literal "<svg/>" for this branch.
    */ render: () => { renders += 1; return "<svg/>"; } });
  assert.deepEqual([renders, state.diagnostics === result.diagnostics, state.svg], [1, true, "<svg/>"]);
});

test("compiler exceptions retain their identity and prevent renderer invocation", /**
 * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
 * blocking validation to prevent this call.
 * @responsibility computation
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const failure = new Error("Compiler unavailable");
  const calls = [];
  const error = captureError(/**
   * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
   * blocking validation to prevent this call.
   * @responsibility computation
   * @returns {unknown} The result returned by createDiagramStateWithPorts.
   */ () => createDiagramStateWithPorts(VALID, {}, {
    /**
     * Supply the compile test double and record its invocation in caller-owned fixture state; throw the selected
     * failure so its propagation or forbidden invocation is observable. No production I/O is performed by this
     * fixture.
     * @responsibility computation
     * @returns {void} Completes the documented operation; no return value is consumed.
     * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
     */
    compile: () => { calls.push("compile"); throw failure; }, /**
     * Supply the render test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {string} The literal "<svg/>" for this branch.
     */ render: () => { calls.push("render"); return "<svg/>"; }
  }));
  assert.deepEqual([error === failure, calls], [true, ["compile"]]);
});

test("renderer exceptions retain their identity without returning partial state", /**
 * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
 * blocking validation to prevent this call.
 * @responsibility computation
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const failure = new Error("Renderer unavailable");
  const calls = [];
  const error = captureError(/**
   * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
   * blocking validation to prevent this call.
   * @responsibility computation
   * @returns {unknown} The result returned by createDiagramStateWithPorts.
   */ () => createDiagramStateWithPorts(VALID, {}, {
    /**
     * Supply the compile test double and record its invocation in caller-owned fixture state; delegate to the
     * selected implementation after recording the supplied inputs. No production I/O is performed by this
     * fixture.
     * @responsibility coordinator
     * @returns {unknown} The result returned by compileRoute.
     */
    compile: () => { calls.push("compile"); return compileRoute(VALID); },
    /**
     * Supply the render test double and record its invocation in caller-owned fixture state; throw the selected
     * failure so its propagation or forbidden invocation is observable. No production I/O is performed by this
     * fixture.
     * @responsibility computation
     * @returns {void} Completes the documented operation; no return value is consumed.
     * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
     */
    render: () => { calls.push("render"); throw failure; }
  }));
  assert.deepEqual([error === failure, calls], [true, ["compile", "render"]]);
});

test("state projection suppresses every derived value for a failed result", /**
 * Verify state projection suppresses every derived value for a failed result; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(INVALID);
  const before = structuredClone(result);
  const state = assembleDiagramState({ ...result, model: {}, layout: {}, json: "unexpected" }, "unexpected");
  assert.deepEqual([result, state], [before, expectedState(INVALID)]);
});

test("state projection retains diagnostic order, codes, and source ranges", /**
 * Verify state projection retains diagnostic order, codes, and source ranges; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Warnings"\nrappel height=10m rope=5m stages=2m+3m');
  const state = assembleDiagramState(result, "<svg/>");
  assert.deepEqual([state.diagnostics === result.diagnostics, state.diagnosticsText], [true, result.diagnostics.map(formatDiagnostic).join("\n")]);
});

for (const [name, source] of CASES.slice(0, 3)) {
  test(`React renders the complete ${name} state with the warning panel disabled`, /**
   * Verify React renders the complete ${name} state with the warning panel disabled; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const Component = createVrlDiagramComponent(React);
    const state = expectedState(source);
    assert.deepEqual(Component({ source, showWarnings: false }), state.ok
      ? { type: "div", props: { className: "vrl-diagram", role: undefined, dangerouslySetInnerHTML: { __html: state.svg } }, child: undefined }
      : { type: "pre", props: { className: "vrl-diagram__diagnostics" }, child: state.diagnosticsText });
  });

  test(`Svelte markup preserves the complete ${name} diagram with the warning panel disabled`, /**
   * Verify Svelte markup preserves the complete ${name} diagram with the warning panel disabled; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = expectedState(source);
    const document = documentFor(renderVrlSvelteMarkup(source, {}, { showWarnings: false }));
    const root = document.documentElement;
    assert.deepEqual([root.tagName, root.getAttribute("class"), root.getAttribute("role"), state.ok ? root.getElementsByTagName("svg")[0].toString() : root.textContent],
      state.ok ? ["div", "vrl-diagram", null, documentFor(state.svg).documentElement.toString()] : ["pre", "vrl-diagram__diagnostics", null, state.diagnosticsText]);
  });
}

test("React recomputes when source/options change and uses defaults when omitted", /**
 * Verify React recomputes when source/options change and uses defaults when omitted; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent(React, { source: VALID, options: { language: "es" }, showWarnings: false });
  assert.deepEqual([Component().props.dangerouslySetInnerHTML.__html, Component({ source: WARNING, options: { language: "en" } }).props.dangerouslySetInnerHTML.__html], [expectedState(VALID, { language: "es" }).svg, expectedState(WARNING).svg]);
});

test("a shared successful state bypasses compilation and rendering in React", /**
 * Verify a shared successful state bypasses compilation and rendering in React; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent(React);
  const diagram = Object.freeze(createDiagramState(VALID));
  assert.deepEqual(Component({ source: null, options: null, diagram }), { type: "div", props: { className: "vrl-diagram", role: undefined, dangerouslySetInnerHTML: { __html: diagram.svg } }, child: undefined });
});

test("a shared successful state bypasses compilation and rendering in Svelte markup", /**
 * Verify a shared successful state bypasses compilation and rendering in Svelte markup; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const diagram = Object.freeze(createDiagramState(VALID));
  assert.equal(renderVrlSvelteMarkup(null, null, { diagram }), `<div class="vrl-diagram">${diagram.svg}</div>`);
});

test("injected failed state remains text in React without executing source/options", /**
 * Verify injected failed state remains text in React without executing source/options; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent(React);
  const diagram = { ok: false, diagnosticsText: '<field> & "value"', svg: "must not render" };
  assert.deepEqual(Component({ source: null, options: null, diagram }), { type: "pre", props: { className: "vrl-diagram__diagnostics" }, child: '<field> & "value"' });
});

test("injected failed state is escaped as text in Svelte markup", /**
 * Verify injected failed state is escaped as text in Svelte markup; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const diagram = { ok: false, diagnosticsText: '<field> & "value"', svg: "must not render" };
  const root = documentFor(renderVrlSvelteMarkup(null, null, { diagram })).documentElement;
  assert.deepEqual([root.tagName, root.textContent, root.getElementsByTagName("field").length], ["pre", '<field> & "value"', 0]);
});

for (const [name, source] of CASES.slice(0, 3)) {
  test(`SvelteKit resolves asynchronous inputs into complete ${name} state`, /**
   * Verify SvelteKit resolves asynchronous inputs into complete ${name} state; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
   */ async () => {
    const options = { language: "es", legend: false };
    const load = createVrlSvelteKitLoad({ key: "routeDiagram", /**
     * Supply the source test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @param {unknown} event - SvelteKit request event or independently specified technical event.
     * @returns {Promise<unknown>} Resolves with the event.source value selected or validated above. Rejects when the awaited operation fails.
     */ source: async (event) => event.source, /**
      * Supply the options test double; return the scenario's deliberately selected value. No production I/O is
      * performed by this fixture.
      * @responsibility computation
      * @param {unknown} event - SvelteKit request event or independently specified technical event.
      * @returns {Promise<unknown>} Resolves with the event.options value selected or validated above. Rejects when the awaited operation fails.
      */ options: async (event) => event.options });
    assert.deepEqual(await load({ source, options }), { routeDiagram: expectedState(source, options) });
  });
}

test("one SvelteKit load handles concurrent events without retaining source/options", /**
 * Verify one SvelteKit load handles concurrent events without retaining source/options; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const load = createVrlSvelteKitLoad({ /**
   * Supply the source test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.source - Input source described above; no implicit global source or mutable singleton is read.
   * @returns {Promise<unknown>} Resolves with the source value selected or validated above. Rejects when the awaited operation fails.
   */ source: async ({ source }) => source, /**
    * Supply the options test double; return the scenario's deliberately selected value. No production I/O is
    * performed by this fixture.
    * @responsibility computation
    * @param {Object} input1 - Input record destructured into the separately documented members below.
    * @param {Object} input1.options - Operation-specific option record; must be supplied by the calling coordinator. Values are forwarded to the owning compiler/render or framework boundary.
    * @returns {Promise<unknown>} Resolves with the options value selected or validated above. Rejects when the awaited operation fails.
    */ options: async ({ options }) => options });
  const events = [{ source: VALID, options: { language: "es" } }, { source: WARNING, options: { theme: "dark" } }, { source: INVALID, options: {} }];
  assert.deepEqual(await Promise.all(events.map(load)), events.map(/**
   * Project vrl into the record required by events.map.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.source - Input source described above; no implicit global source or mutable singleton is read.
   * @param {Object} input1.options - Operation-specific option record; must be supplied by the calling coordinator. Values are forwarded to the owning compiler/render or framework boundary.
   * @returns {Object} A record containing vrl.
   */ ({ source, options }) => ({ vrl: expectedState(source, options) })));
});

test("SvelteKit source rejection preserves the error and skips the options resolver", /**
 * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
 * blocking validation to prevent this call.
 * @responsibility computation
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const failure = new Error("Source unavailable");
  const calls = [];
  const load = createVrlSvelteKitLoad({ /**
   * Supply the source test double and record its invocation in caller-owned fixture state; throw the selected
   * failure so its propagation or forbidden invocation is observable. No production I/O is performed by this
   * fixture.
   * @responsibility computation
   * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
   * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
   */ source: async () => { calls.push("source"); throw failure; }, /**
    * Supply the options test double and record its invocation in caller-owned fixture state; return the
    * scenario's deliberately selected value. No production I/O is performed by this fixture.
    * @responsibility computation
    * @returns {Object} A record containing .
    */ options: () => { calls.push("options"); return {}; } });
  const error = await load({}).catch(/**
   * Return the selected error binding unchanged.
   * @responsibility computation
   * @param {unknown} error - Failure propagated by the observed operation.
   * @returns {unknown} The error value selected or validated above.
   */ (error) => error);
  assert.deepEqual([error === failure, calls], [true, ["source"]]);
});

test("SvelteKit options rejection preserves the resolver error", /**
 * Verify SvelteKit options rejection preserves the resolver error; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  const failure = new Error("Options unavailable");
  const load = createVrlSvelteKitLoad({ source: VALID, /**
   * Supply the options test double; throw the selected failure so its propagation or forbidden invocation is
   * observable. No production I/O is performed by this fixture.
   * @responsibility computation
   * @returns {Promise<never>} Resolves when the documented asynchronous operation completes; awaited failures reject. Does not return normally; throws the failure being checked.
   * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
   */ options: async () => { throw failure; } });
  await assert.rejects(load({}), /**
   * Exercise the failing operation so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @param {unknown} error - Failure propagated by the observed operation.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (error) => error === failure);
});

for (const options of [{ layout: { width: 0 } }, { theme: "unsupported" }]) {
  test(`SvelteKit rejects compiler/renderer configuration ${JSON.stringify(options)}`, /**
   * Verify SvelteKit rejects compiler/renderer configuration ${JSON.stringify(options)}; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
   */ async () => {
    const load = createVrlSvelteKitLoad({ source: VALID, options });
    await assert.rejects(load({}), options.layout ? RangeError : TypeError);
  });
}
