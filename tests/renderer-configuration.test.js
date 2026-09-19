import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import * as core from "@subvertic/core";
import * as svg from "@subvertic/render-svg";
import { createVrlReactDiagramState, createVrlDiagramComponent } from "@subvertic/react";
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/svelte";
import { svgAttribute } from "../packages/vrl-render-svg/src/attributes.js";

const SOURCE = 'route "Configuration"\nstart "Entry"\nrappel height=10m rope=20m anchor=bolts anchor_count=2 station=left stages=4m+6m redirection=3m:left\npool type=deep\nhazard type=snake severity=high\nexit "Finish"';
const QUOTE_PAYLOAD = 'red" onload="void(0)';
const ELEMENT_PAYLOAD = 'custom"><script>inert</script><g data-injected="yes';
const LAYOUT_FIELDS = ["width", "spineX", "marginY", "marginBottom", "baseSpacing", "horizontalScale", "pixelsPerMeter", "minNodeGap"];

function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
}

function render(options = {}) {
  const result = core.compileRoute(SOURCE, options);
  return svg.renderTopoSvg(result.model, result.layout, options);
}

function forbiddenStructure(markup) {
  const document = documentFor(markup);
  return Array.from(document.getElementsByTagName("*")).flatMap((element) => [
    ...(["script", "foreignObject", "iframe"].includes(element.localName) ? [element.localName] : []),
    ...Array.from(element.attributes).filter((attribute) => /^on/i.test(attribute.name) || ["data-injected", "href", "xlink:href"].includes(attribute.name)).map((attribute) => attribute.name)
  ]);
}

test("quoted paint cannot create an SVG event attribute", () => {
  assert.throws(() => render({ themeTokens: { background: QUOTE_PAYLOAD } }), TypeError);
});

test("quoted width is rejected before compilation can create layout output", () => {
  assert.throws(() => core.compileRoute(SOURCE, { layout: { width: '640" onload="void(0)' } }), TypeError);
});

for (const name of LAYOUT_FIELDS) {
  for (const value of ["640", null, true, NaN, Infinity, -Infinity, -1, Number.MAX_VALUE]) {
    test(`${name} rejects invalid numeric configuration ${String(value)}`, () => {
      assert.throws(() => core.compileRoute(SOURCE, { layout: { [name]: value } }), value === null || typeof value !== "number" ? TypeError : RangeError);
    });
  }
  test(`${name} rejects malformed configuration in elevation layouts too`, () => {
    assert.throws(() => core.computeElevationLayout({ metadata: { entrance_elevation: { meters: 0 }, exit_elevation: { meters: 0 } }, elements: [] }, { [name]: QUOTE_PAYLOAD }), TypeError);
  });
  test(`${name} can be omitted explicitly`, () => {
    assert.deepEqual(core.compileRoute(SOURCE, { layout: { [name]: undefined } }).layout, core.compileRoute(SOURCE).layout);
  });
}

for (const name of ["width", "baseSpacing", "horizontalScale", "pixelsPerMeter"]) {
  test(`${name} rejects zero`, () => {
    assert.throws(() => core.compileRoute(SOURCE, { layout: { [name]: 0 } }), RangeError);
  });
}

for (const name of ["spineX", "marginY", "marginBottom", "minNodeGap"]) {
  test(`${name} accepts zero`, () => {
    assert.equal(core.compileRoute(SOURCE, { layout: { [name]: 0 } }).ok, true);
  });
}

for (const value of [null, [], "settings", 7, Object.create({ width: QUOTE_PAYLOAD })]) {
  test(`layout rejects non-record configuration ${String(value)}`, () => {
    assert.throws(() => core.computeVerticalLayout({ elements: [] }, value), TypeError);
  });
}

test("layout rejects unknown option names", () => {
  assert.throws(() => core.compileRoute(SOURCE, { layout: { widht: 640 } }), /Unknown layout option/);
});

test("layout rejects a prototype-setting property supplied as data", () => {
  assert.throws(() => core.compileRoute(SOURCE, { layout: JSON.parse('{"__proto__":{"width":10}}') }), /Unknown layout option/);
});

test("null-prototype layout configuration is accepted", () => {
  assert.equal(core.computeVerticalLayout({ elements: [] }, Object.assign(Object.create(null), { width: 720.5 })).width, 720.5);
});

test("layout configuration is snapshotted without mutating the caller", () => {
  const options = Object.freeze({ width: 720.5, marginY: 0 });
  core.compileRoute(SOURCE, { layout: options });
  assert.deepEqual(options, { width: 720.5, marginY: 0 });
});

for (const width of [0.5, 720]) {
  test(`supported width ${width} survives compilation and SVG serialization`, () => {
    const document = documentFor(render({ layout: { width } }));
    assert.equal(Number(document.documentElement.getAttribute("width")) >= width, true);
  });
}

test("horizontal scale helper rejects excessive magnitude", () => {
  assert.throws(() => core.resolveHorizontalScale(Number.MAX_VALUE), RangeError);
});

const COLORS = ["#abc", "#abcd", "#aabbcc", "#aabbccdd", "RED", "rebeccapurple", "transparent", "currentColor", "none", " rgb(0, 128, 255) ", "rgb(0%, 50%, 100%)", "rgba(1, 2, 3, .5)", "rgba(1, 2, 3, 100%)", "hsl(-30, 50%, 100%)", "hsla(360, 100%, 0%, 0)", "hsla(0, 0%, 0%, 50%)"];
for (const color of COLORS) {
  test(`paint preserves supported value ${color}`, () => {
    const document = documentFor(render({ themeTokens: { background: color } }));
    assert.equal(document.getElementsByTagName("rect")[0].getAttribute("fill"), color.trim());
  });
}

const INVALID_PAINTS = [QUOTE_PAYLOAD, ELEMENT_PAYLOAD, "url(#local)", "url(https://example.invalid/paint)", "url(data:image/svg+xml,inert)", "var(--paint)", "expression(inert)", "red;fill:blue", "\\72 ed", "#12", "#12345", "#1234567", "", "notacolor", 123, null, {}, "rgb(256, 0, 0)", "rgb(-1, 0, 0)", "rgb(0%, 1, 2)", "rgb(1,2)", "rgba(1,2,3)", "rgba(1,2,3,2)", "rgba(1,2,3,-.1)", "rgb(1,2,NaN)", `rgb(${"9".repeat(400)},0,0)`, "hsl(30%,50%,50%)", "hsl(30,50,50%)", "hsl(30,101%,50%)", "rgb(1 2 3)", "red\u0000"];
for (const [index, color] of INVALID_PAINTS.entries()) {
  test(`paint rejects unsupported or adversarial value ${index}`, () => {
    assert.throws(() => svg.resolveTheme("light", { background: color }), TypeError);
  });
}

for (const token of Object.keys(svg.LIGHT_THEME)) {
  test(`theme token ${token} validates paint`, () => {
    assert.throws(() => render({ themeTokens: { [token]: QUOTE_PAYLOAD } }), TypeError);
  });
}

for (const theme of ["bright", "", null, {}, 1]) {
  test(`theme rejects unsupported selector ${String(theme)}`, () => {
    assert.throws(() => render({ theme }), TypeError);
  });
}

for (const tokens of [null, [], "red", Object.create({ background: QUOTE_PAYLOAD })]) {
  test(`theme rejects non-record overrides ${String(tokens)}`, () => {
    assert.throws(() => svg.resolveTheme("light", tokens), TypeError);
  });
}

test("theme rejects unknown token keys", () => {
  assert.throws(() => svg.resolveTheme("light", { backgound: "red" }), /Unknown theme token/);
});

test("theme accepts null-prototype overrides", () => {
  assert.equal(svg.resolveTheme("dark", Object.assign(Object.create(null), { background: "#fff" })).background, "#fff");
});

test("theme resolution does not mutate overrides", () => {
  const tokens = Object.freeze({ background: " red " });
  svg.resolveTheme("light", tokens);
  assert.equal(tokens.background, " red ");
});

for (const options of [null, [], "options", { legend: "false" }, { legend: null }]) {
  test(`renderer rejects malformed options ${JSON.stringify(options)}`, () => {
    const result = core.compileRoute(SOURCE);
    assert.throws(() => svg.renderTopoSvg(result.model, result.layout, options), TypeError);
  });
}

for (const [field, value, error] of [["width", "640", TypeError], ["width", 0, RangeError], ["height", -1, RangeError], ["height", Infinity, RangeError], ["width", Number.MAX_VALUE, RangeError], ["nodes", {}, TypeError], ["segments", undefined, TypeError], ["points", {}, TypeError]]) {
  test(`renderer rejects malformed supplied layout ${field}: ${String(value)}`, () => {
    const result = core.compileRoute(SOURCE);
    assert.throws(() => svg.renderTopoSvg(result.model, { ...result.layout, [field]: value }), error);
  });
}

for (const collection of ["nodes", "points"]) {
  for (const coordinate of ["x", "y"]) {
    test(`renderer rejects quoted ${collection} ${coordinate}`, () => {
      const result = core.compileRoute(SOURCE);
      const layout = structuredClone(result.layout);
      layout[collection][0][coordinate] = QUOTE_PAYLOAD;
      assert.throws(() => svg.renderTopoSvg(result.model, layout), TypeError);
    });
  }
}

for (const endpoint of ["start", "end"]) {
  test(`renderer validates independent custom segment ${endpoint} coordinates`, () => {
    const result = core.compileRoute(SOURCE);
    const layout = structuredClone(result.layout);
    layout.segments[0][endpoint] = { ...layout.segments[0][endpoint], x: Number.MAX_VALUE };
    assert.throws(() => svg.renderTopoSvg(result.model, layout), RangeError);
  });
}

test("renderer rejects nonfinite technical pixel deltas", () => {
  const result = core.compileRoute(SOURCE);
  const layout = structuredClone(result.layout);
  layout.segments.find((segment) => segment.kind === "technical").technicalDeltaY = NaN;
  assert.throws(() => svg.renderTopoSvg(result.model, layout), RangeError);
});

test("positioned layouts can omit the optional points projection", () => {
  const result = core.compileRoute(SOURCE);
  const { points, ...layout } = result.layout;
  assert.equal(documentFor(svg.renderTopoSvg(result.model, layout)).documentElement.localName, "svg");
});

test("custom element type remains a single class attribute", () => {
  const node = { x: 10, y: 20, element: { type: ELEMENT_PAYLOAD, id: "X1", label: null, attributes: {} } };
  const markup = `<svg xmlns="http://www.w3.org/2000/svg">${svg.renderNode(node, svg.resolveTheme())}</svg>`;
  const document = documentFor(markup);
  assert.deepEqual([document.getElementsByTagName("g")[0].getAttribute("class"), forbiddenStructure(markup)], [`vrl-node vrl-node-${ELEMENT_PAYLOAD}`, []]);
});

test("low-level attribute serialization contains quote payloads inside one value", () => {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg">${svg.renderLegendRow({ kind: "text", value: "Legend" }, QUOTE_PAYLOAD, 20, svg.resolveTheme())}</svg>`;
  const document = documentFor(markup);
  assert.deepEqual([document.getElementsByTagName("text")[0].getAttribute("x"), forbiddenStructure(markup)], [QUOTE_PAYLOAD, []]);
});

test("generated path attributes cannot be terminated by custom coordinate strings", () => {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg">${svg.renderTerrainProfile({ width: 100, height: 100, nodes: [{ x: 10, y: QUOTE_PAYLOAD }] }, svg.resolveTheme())}</svg>`;
  assert.deepEqual(forbiddenStructure(markup), []);
});

test("low-level paint serialization rejects resource references", () => {
  assert.throws(() => svg.renderLegendRow({ kind: "text", value: "Legend" }, 10, 20, { mutedText: "url(#external)" }), TypeError);
});

test("attribute serialization preserves Unicode, quotes, ampersands, and XML whitespace", () => {
  const value = 'Cañón 🧗 "A" & <B>\n\t\r';
  const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg" aria-label="${svgAttribute(value)}"/>`);
  assert.equal(document.documentElement.getAttribute("aria-label"), value);
});

for (const [index, value] of [undefined, null, {}, true, NaN, Infinity, "\u0000", "\ud800", "\udfff", "\ufffe", "\uffff"].entries()) {
  test(`attribute serialization rejects invalid scalar ${index}: ${JSON.stringify(value)}`, () => {
    assert.throws(() => svgAttribute(value), typeof value === "number" ? RangeError : TypeError);
  });
}

for (const theme of ["light", "dark"]) {
  test(`${theme} SVG has only expected elements and attributes`, () => {
    const markup = render({ theme });
    const document = documentFor(markup);
    assert.deepEqual({ root: document.documentElement.localName, namespace: document.documentElement.namespaceURI, prohibited: forbiddenStructure(markup), elements: [...new Set(Array.from(document.getElementsByTagName("*")).map((element) => element.localName))].sort() }, { root: "svg", namespace: "http://www.w3.org/2000/svg", prohibited: [], elements: ["circle", "defs", "desc", "g", "line", "marker", "path", "rect", "svg", "text", "title", "tspan"] });
  });
}

test("literal entity-looking content is encoded once rather than interpreted", () => {
  const value = '&quot; onload="inert';
  const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg" aria-label="${svgAttribute(value)}"/>`);
  assert.deepEqual(Array.from(document.documentElement.attributes).map((attribute) => [attribute.name, attribute.value]), [["xmlns", "http://www.w3.org/2000/svg"], ["aria-label", value]]);
});

test("structural oracle detects the original attribute-injection shape", () => {
  assert.deepEqual(forbiddenStructure('<svg xmlns="http://www.w3.org/2000/svg"><rect fill="red" onload="void(0)"/></svg>'), ["onload"]);
});

test("structural oracle rejects malformed XML rather than repairing it", () => {
  assert.throws(() => documentFor('<svg xmlns="http://www.w3.org/2000/svg"><g></svg>'));
});

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState]]) {
  test(`${name} refuses invalid paint before producing raw markup`, () => {
    assert.throws(() => create(SOURCE, { themeTokens: { background: QUOTE_PAYLOAD } }), TypeError);
  });
  test(`${name} refuses invalid layout configuration`, () => {
    assert.throws(() => create(SOURCE, { layout: { width: QUOTE_PAYLOAD } }), TypeError);
  });
  test(`${name} preserves supported customized paint`, () => {
    const document = documentFor(create(SOURCE, { theme: "dark", themeTokens: { background: "#123456" } }).svg);
    assert.equal(document.getElementsByTagName("rect")[0].getAttribute("fill"), "#123456");
  });
}

test("caller-supplied React diagram markup is an explicit trusted passthrough", () => {
  const Component = createVrlDiagramComponent({ createElement: (tag, props) => ({ tag, props }) });
  assert.equal(Component({ diagram: { ok: true, svg: '<svg data-owned="caller"/>' } }).props.dangerouslySetInnerHTML.__html, '<svg data-owned="caller"/>');
});

test("caller-supplied Svelte diagram markup is an explicit trusted passthrough", () => {
  assert.match(renderVrlSvelteMarkup("", {}, { diagram: { ok: true, svg: '<svg data-owned="caller"/>' } }), /<svg data-owned="caller"\/>/);
});
