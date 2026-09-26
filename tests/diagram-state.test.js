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
const React = { createElement: (type, props, child) => ({ type, props, child }) };

for (const [path, expected] of [["docs/diagram-state.md", ["Short rope", ["warning"]]], ["packages/vrl-diagram/README.md", ["Canyon preview", []]]]) {
  test(`${path}: the documented source example produces its stated diagnostics`, () => {
    const documentation = readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
    const source = documentation.match(/const source = `([^`]+)`;/)[1];
    const state = createDiagramState(source, { language: "es", legend: false });
    assert.deepEqual([state.model.name, state.diagnostics.map(({ severity }) => severity)], expected);
  });
}

// Independent projection of the existing core and SVG contracts, including every state field.
function expectedState(source, options = {}) {
  const result = compileRoute(source, options);
  return { ...result, diagnosticsText: result.diagnostics.map(formatDiagnostic).join("\n"),
    svg: result.ok ? renderTopoSvg(result.model, result.layout, options) : "" };
}

function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "text/html");
}

function captureError(run) {
  try { run(); } catch (error) { return error; }
  throw new Error("Expected operation to throw");
}

for (const create of FACTORIES) {
  for (const [name, source] of CASES) {
    test(`${create.name}: complete ${name} state preserves the compiler and renderer contracts`, () => {
      const options = { language: "es", theme: "dark", legend: false, layout: { width: 400 } };
      assert.deepEqual(create(source, options), expectedState(source, options));
    });
  }

  test(`${create.name}: warnings retain successful model, layout, JSON, and SVG`, () => {
    const state = create(WARNING);
    assert.deepEqual([state.ok, state.diagnostics.map(({ severity, message }) => [severity, message]), state.model.name, state.layout.nodes.length, JSON.parse(state.json).name, state.svg === ""],
      [true, [["warning", "Rope length is shorter than rappel height."]], "Short rope", 1, "Short rope", false]);
  });

  test(`${create.name}: invalid source suppresses renderer-only configuration failures`, () => {
    const state = create(INVALID, { theme: "unsupported", legend: "false" });
    assert.deepEqual([state.ok, state.model, state.layout, state.json, state.svg, state.diagnostics.every((item) => item.severity === "error")], [false, null, null, null, "", true]);
  });

  test(`${create.name}: source and option changes produce fresh complete states`, () => {
    const options = { language: "en", layout: { width: 320 } };
    const first = create(VALID, options);
    options.language = "es";
    options.layout.width = 700;
    const next = create(WARNING, options);
    assert.deepEqual([first, next], [expectedState(VALID, { language: "en", layout: { width: 320 } }), expectedState(WARNING, { language: "es", layout: { width: 700 } })]);
  });

  test(`${create.name}: frozen caller options are accepted unchanged`, () => {
    const options = Object.freeze({ language: "es", legend: false, layout: Object.freeze({ width: 320 }), themeTokens: Object.freeze({ water: "#abcdef" }) });
    assert.deepEqual(create(VALID, options), expectedState(VALID, options));
  });

  test(`${create.name}: editing a returned state cannot affect a subsequent call`, () => {
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
    test(`${create.name}: ${name} propagates an exception instead of a diagnostic state`, () => {
      assert.throws(() => create(source, options), error);
    });
  }
}

test("the coordinator forwards the same source, options, model, and layout exactly once", () => {
  const options = { language: "es", layout: { width: 320 } };
  const result = compileRoute(VALID, options);
  const calls = [];
  const state = createDiagramStateWithPorts(VALID, options, {
    compile: (source, supplied) => { calls.push(["compile", source === VALID, supplied === options]); return result; },
    render: (model, layout, supplied) => { calls.push(["render", model === result.model, layout === result.layout, supplied === options]); return "<svg/>"; }
  });
  assert.deepEqual([calls, state], [[["compile", true, true], ["render", true, true, true]], { ...result, diagnosticsText: "", svg: "<svg/>" }]);
});

test("the coordinator skips rendering after a blocking compiler result", () => {
  const result = compileRoute(INVALID);
  const calls = [];
  const state = createDiagramStateWithPorts(INVALID, {}, { compile: () => { calls.push("compile"); return result; }, render: () => { calls.push("render"); throw new Error("Must not run"); } });
  assert.deepEqual([calls, state], [["compile"], expectedState(INVALID)]);
});

test("the coordinator renders a warning-only compiler result once", () => {
  const result = compileRoute(WARNING);
  let renders = 0;
  const state = createDiagramStateWithPorts(WARNING, {}, { compile: () => result, render: () => { renders += 1; return "<svg/>"; } });
  assert.deepEqual([renders, state.diagnostics === result.diagnostics, state.svg], [1, true, "<svg/>"]);
});

test("compiler exceptions retain their identity and prevent renderer invocation", () => {
  const failure = new Error("Compiler unavailable");
  const calls = [];
  const error = captureError(() => createDiagramStateWithPorts(VALID, {}, {
    compile: () => { calls.push("compile"); throw failure; }, render: () => { calls.push("render"); return "<svg/>"; }
  }));
  assert.deepEqual([error === failure, calls], [true, ["compile"]]);
});

test("renderer exceptions retain their identity without returning partial state", () => {
  const failure = new Error("Renderer unavailable");
  const calls = [];
  const error = captureError(() => createDiagramStateWithPorts(VALID, {}, {
    compile: () => { calls.push("compile"); return compileRoute(VALID); },
    render: () => { calls.push("render"); throw failure; }
  }));
  assert.deepEqual([error === failure, calls], [true, ["compile", "render"]]);
});

test("state projection suppresses every derived value for a failed result", () => {
  const result = compileRoute(INVALID);
  const before = structuredClone(result);
  const state = assembleDiagramState({ ...result, model: {}, layout: {}, json: "unexpected" }, "unexpected");
  assert.deepEqual([result, state], [before, expectedState(INVALID)]);
});

test("state projection retains diagnostic order, codes, and source ranges", () => {
  const result = compileRoute('route "Warnings"\nrappel height=10m rope=5m stages=2m+3m');
  const state = assembleDiagramState(result, "<svg/>");
  assert.deepEqual([state.diagnostics === result.diagnostics, state.diagnosticsText], [true, result.diagnostics.map(formatDiagnostic).join("\n")]);
});

for (const [name, source] of CASES.slice(0, 3)) {
  test(`React renders the complete ${name} state with the warning panel disabled`, () => {
    const Component = createVrlDiagramComponent(React);
    const state = expectedState(source);
    assert.deepEqual(Component({ source, showWarnings: false }), state.ok
      ? { type: "div", props: { className: "vrl-diagram", role: "img", dangerouslySetInnerHTML: { __html: state.svg } }, child: undefined }
      : { type: "pre", props: { className: "vrl-diagram__diagnostics" }, child: state.diagnosticsText });
  });

  test(`Svelte markup preserves the complete ${name} diagram with the warning panel disabled`, () => {
    const state = expectedState(source);
    const document = documentFor(renderVrlSvelteMarkup(source, {}, { showWarnings: false }));
    const root = document.documentElement;
    assert.deepEqual([root.tagName, root.getAttribute("class"), root.getAttribute("role"), state.ok ? root.getElementsByTagName("svg")[0].toString() : root.textContent],
      state.ok ? ["div", "vrl-diagram", "img", documentFor(state.svg).documentElement.toString()] : ["pre", "vrl-diagram__diagnostics", null, state.diagnosticsText]);
  });
}

test("React recomputes when source/options change and uses defaults when omitted", () => {
  const Component = createVrlDiagramComponent(React, { source: VALID, options: { language: "es" }, showWarnings: false });
  assert.deepEqual([Component().props.dangerouslySetInnerHTML.__html, Component({ source: WARNING, options: { language: "en" } }).props.dangerouslySetInnerHTML.__html], [expectedState(VALID, { language: "es" }).svg, expectedState(WARNING).svg]);
});

test("a shared successful state bypasses compilation and rendering in React", () => {
  const Component = createVrlDiagramComponent(React);
  const diagram = Object.freeze(createDiagramState(VALID));
  assert.deepEqual(Component({ source: null, options: null, diagram }), { type: "div", props: { className: "vrl-diagram", role: "img", dangerouslySetInnerHTML: { __html: diagram.svg } }, child: undefined });
});

test("a shared successful state bypasses compilation and rendering in Svelte markup", () => {
  const diagram = Object.freeze(createDiagramState(VALID));
  assert.equal(renderVrlSvelteMarkup(null, null, { diagram }), `<div class="vrl-diagram" role="img">${diagram.svg}</div>`);
});

test("injected failed state remains text in React without executing source/options", () => {
  const Component = createVrlDiagramComponent(React);
  const diagram = { ok: false, diagnosticsText: '<field> & "value"', svg: "must not render" };
  assert.deepEqual(Component({ source: null, options: null, diagram }), { type: "pre", props: { className: "vrl-diagram__diagnostics" }, child: '<field> & "value"' });
});

test("injected failed state is escaped as text in Svelte markup", () => {
  const diagram = { ok: false, diagnosticsText: '<field> & "value"', svg: "must not render" };
  const root = documentFor(renderVrlSvelteMarkup(null, null, { diagram })).documentElement;
  assert.deepEqual([root.tagName, root.textContent, root.getElementsByTagName("field").length], ["pre", '<field> & "value"', 0]);
});

for (const [name, source] of CASES.slice(0, 3)) {
  test(`SvelteKit resolves asynchronous inputs into complete ${name} state`, async () => {
    const options = { language: "es", legend: false };
    const load = createVrlSvelteKitLoad({ key: "routeDiagram", source: async (event) => event.source, options: async (event) => event.options });
    assert.deepEqual(await load({ source, options }), { routeDiagram: expectedState(source, options) });
  });
}

test("one SvelteKit load handles concurrent events without retaining source/options", async () => {
  const load = createVrlSvelteKitLoad({ source: async ({ source }) => source, options: async ({ options }) => options });
  const events = [{ source: VALID, options: { language: "es" } }, { source: WARNING, options: { theme: "dark" } }, { source: INVALID, options: {} }];
  assert.deepEqual(await Promise.all(events.map(load)), events.map(({ source, options }) => ({ vrl: expectedState(source, options) })));
});

test("SvelteKit source rejection preserves the error and skips the options resolver", async () => {
  const failure = new Error("Source unavailable");
  const calls = [];
  const load = createVrlSvelteKitLoad({ source: async () => { calls.push("source"); throw failure; }, options: () => { calls.push("options"); return {}; } });
  const error = await load({}).catch((error) => error);
  assert.deepEqual([error === failure, calls], [true, ["source"]]);
});

test("SvelteKit options rejection preserves the resolver error", async () => {
  const failure = new Error("Options unavailable");
  const load = createVrlSvelteKitLoad({ source: VALID, options: async () => { throw failure; } });
  await assert.rejects(load({}), (error) => error === failure);
});

for (const options of [{ layout: { width: 0 } }, { theme: "unsupported" }]) {
  test(`SvelteKit rejects compiler/renderer configuration ${JSON.stringify(options)}`, async () => {
    const load = createVrlSvelteKitLoad({ source: VALID, options });
    await assert.rejects(load({}), options.layout ? RangeError : TypeError);
  });
}
