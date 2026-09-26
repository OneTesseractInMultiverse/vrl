import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import * as core from "@subvertic/vrl-core";
import * as svg from "@subvertic/vrl-render-svg";
import { createVrlReactDiagramState, createVrlDiagramComponent } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/vrl-svelte";
import { svgAttribute } from "../packages/vrl-render-svg/src/attributes.js";

const SOURCE = 'route "Configuration"\nstart "Entry"\nrappel height=10m rope=20m anchor=bolts anchor_count=2 station=left stages=4m+6m redirection=3m:left\npool type=deep\nhazard type=snake severity=high\nexit "Finish"';
const QUOTE_PAYLOAD = 'red" onload="void(0)';
const ELEMENT_PAYLOAD = 'custom"><script>inert</script><g data-injected="yes';
const LAYOUT_FIELDS = ["width", "spineX", "marginY", "marginBottom", "baseSpacing", "horizontalScale", "pixelsPerMeter", "minNodeGap"];

/**
 * Parse markup with the independent XML parser so assertions observe serialized document structure.
 * @responsibility coordinator
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {unknown} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
}

/**
 * Compile the fixed source with supplied options and render it through the public facade to exercise
 * boundary failures.
 * @responsibility coordinator
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {unknown} The result returned by svg.renderTopoSvg.
 */
function render(options = {}) {
  const result = core.compileRoute(SOURCE, options);
  return svg.renderTopoSvg(result.model, result.layout, options);
}

/**
 * Independently inspect parsed SVG for forbidden elements, event attributes and injected/link attributes.
 * @responsibility computation
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {Array} The result returned by Array.from(document.getElementsByTagName("*")).flatMap.
 */
function forbiddenStructure(markup) {
  const document = documentFor(markup);
  return Array.from(document.getElementsByTagName("*")).flatMap(/**
   * Project the current entry into an ordered tuple for
   * Array.from(document.getElementsByTagName("*")).flatMap.
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {Array} The ordered records or values assembled above.
   */ (element) => [
    ...(["script", "foreignObject", "iframe"].includes(element.localName) ? [element.localName] : []),
    ...Array.from(element.attributes).filter(/**
     * Evaluate the selection condition /^on/i.test(attribute.name) || ["data-injected", "href",
     * "xlink:href"].includes(attribute.name).
     * @responsibility computation
     * @param {unknown} attribute - SVG presentation attribute name resolved through the element's ancestors.
     * @returns {unknown} The result of the documented comparison or calculation.
     */ (attribute) => /^on/i.test(attribute.name) || ["data-injected", "href", "xlink:href"].includes(attribute.name)).map(/**
     * Project attribute.name from the current record.
     * @responsibility computation
     * @param {unknown} attribute - SVG presentation attribute name resolved through the element's ancestors.
     * @returns {unknown} The attribute.name value selected or validated above.
     */ (attribute) => attribute.name)
  ]);
}

test("quoted paint cannot create an SVG event attribute", /**
 * Verify quoted paint cannot create an SVG event attribute; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise render so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by render.
   */ () => render({ themeTokens: { background: QUOTE_PAYLOAD } }), TypeError);
});

test("quoted width is rejected before compilation can create layout output", /**
 * Verify quoted width is rejected before compilation can create layout output; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.compileRoute so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.compileRoute.
   */ () => core.compileRoute(SOURCE, { layout: { width: '640" onload="void(0)' } }), TypeError);
});

for (const name of LAYOUT_FIELDS) {
  for (const value of ["640", null, true, NaN, Infinity, -Infinity, -1, Number.MAX_VALUE]) {
    test(`${name} rejects invalid numeric configuration ${String(value)}`, /**
     * Verify ${name} rejects invalid numeric configuration ${String(value)}; arrange the scenario and make its
     * single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.throws(/**
       * Exercise core.compileRoute so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {unknown} The result returned by core.compileRoute.
       */ () => core.compileRoute(SOURCE, { layout: { [name]: value } }), value === null || typeof value !== "number" ? TypeError : RangeError);
    });
  }
  test(`${name} rejects malformed configuration in elevation layouts too`, /**
   * Verify ${name} rejects malformed configuration in elevation layouts too; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.computeElevationLayout so the enclosing assertion can observe its return value or thrown
     * error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.computeElevationLayout.
     */ () => core.computeElevationLayout({ metadata: { entrance_elevation: { meters: 0 }, exit_elevation: { meters: 0 } }, elements: [] }, { [name]: QUOTE_PAYLOAD }), TypeError);
  });
  test(`${name} can be omitted explicitly`, /**
   * Verify ${name} can be omitted explicitly; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(core.compileRoute(SOURCE, { layout: { [name]: undefined } }).layout, core.compileRoute(SOURCE).layout);
  });
}

for (const name of ["width", "baseSpacing", "horizontalScale", "pixelsPerMeter"]) {
  test(`${name} rejects zero`, /**
   * Verify ${name} rejects zero; arrange the scenario and make its single direct assertion. Assertion and setup
   * failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.compileRoute so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.compileRoute.
     */ () => core.compileRoute(SOURCE, { layout: { [name]: 0 } }), RangeError);
  });
}

for (const name of ["spineX", "marginY", "marginBottom", "minNodeGap"]) {
  test(`${name} accepts zero`, /**
   * Verify ${name} accepts zero; arrange the scenario and make its single direct assertion. Assertion and setup
   * failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(core.compileRoute(SOURCE, { layout: { [name]: 0 } }).ok, true);
  });
}

for (const value of [null, [], "settings", 7, Object.create({ width: QUOTE_PAYLOAD })]) {
  test(`layout rejects non-record configuration ${String(value)}`, /**
   * Verify layout rejects non-record configuration ${String(value)}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise core.computeVerticalLayout so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by core.computeVerticalLayout.
     */ () => core.computeVerticalLayout({ elements: [] }, value), TypeError);
  });
}

test("layout rejects unknown option names", /**
 * Verify layout rejects unknown option names; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.compileRoute so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.compileRoute.
   */ () => core.compileRoute(SOURCE, { layout: { widht: 640 } }), /Unknown layout option/);
});

test("layout rejects a prototype-setting property supplied as data", /**
 * Verify layout rejects a prototype-setting property supplied as data; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.compileRoute so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.compileRoute.
   */ () => core.compileRoute(SOURCE, { layout: JSON.parse('{"__proto__":{"width":10}}') }), /Unknown layout option/);
});

test("null-prototype layout configuration is accepted", /**
 * Verify null-prototype layout configuration is accepted; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(core.computeVerticalLayout({ elements: [] }, Object.assign(Object.create(null), { width: 720.5 })).width, 720.5);
});

test("layout configuration is snapshotted without mutating the caller", /**
 * Verify layout configuration is snapshotted without mutating the caller; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const options = Object.freeze({ width: 720.5, marginY: 0 });
  core.compileRoute(SOURCE, { layout: options });
  assert.deepEqual(options, { width: 720.5, marginY: 0 });
});

for (const width of [0.5, 720]) {
  test(`supported width ${width} survives compilation and SVG serialization`, /**
   * Verify supported width ${width} survives compilation and SVG serialization; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = documentFor(render({ layout: { width } }));
    assert.equal(Number(document.documentElement.getAttribute("width")) >= width, true);
  });
}

test("horizontal scale helper rejects excessive magnitude", /**
 * Verify horizontal scale helper rejects excessive magnitude; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise core.resolveHorizontalScale so the enclosing assertion can observe its return value or thrown
   * error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by core.resolveHorizontalScale.
   */ () => core.resolveHorizontalScale(Number.MAX_VALUE), RangeError);
});

const COLORS = ["#abc", "#abcd", "#aabbcc", "#aabbccdd", "RED", "rebeccapurple", "transparent", "currentColor", "none", " rgb(0, 128, 255) ", "rgb(0%, 50%, 100%)", "rgba(1, 2, 3, .5)", "rgba(1, 2, 3, 100%)", "hsl(-30, 50%, 100%)", "hsla(360, 100%, 0%, 0)", "hsla(0, 0%, 0%, 50%)"];
for (const color of COLORS) {
  test(`paint preserves supported value ${color}`, /**
   * Verify paint preserves supported value ${color}; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = documentFor(render({ themeTokens: { background: color } }));
    assert.equal(document.getElementsByTagName("rect")[0].getAttribute("fill"), color.trim());
  });
}

const INVALID_PAINTS = [QUOTE_PAYLOAD, ELEMENT_PAYLOAD, "url(#local)", "url(https://example.invalid/paint)", "url(data:image/svg+xml,inert)", "var(--paint)", "expression(inert)", "red;fill:blue", "\\72 ed", "#12", "#12345", "#1234567", "", "notacolor", 123, null, {}, "rgb(256, 0, 0)", "rgb(-1, 0, 0)", "rgb(0%, 1, 2)", "rgb(1,2)", "rgba(1,2,3)", "rgba(1,2,3,2)", "rgba(1,2,3,-.1)", "rgb(1,2,NaN)", `rgb(${"9".repeat(400)},0,0)`, "hsl(30%,50%,50%)", "hsl(30,50,50%)", "hsl(30,101%,50%)", "rgb(1 2 3)", "red\u0000"];
for (const [index, color] of INVALID_PAINTS.entries()) {
  test(`paint rejects unsupported or adversarial value ${index}`, /**
   * Verify paint rejects unsupported or adversarial value ${index}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise svg.resolveTheme so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by svg.resolveTheme.
     */ () => svg.resolveTheme("light", { background: color }), TypeError);
  });
}

for (const token of Object.keys(svg.LIGHT_THEME)) {
  test(`theme token ${token} validates paint`, /**
   * Verify theme token ${token} validates paint; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise render so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by render.
     */ () => render({ themeTokens: { [token]: QUOTE_PAYLOAD } }), TypeError);
  });
}

for (const theme of ["bright", "", null, {}, 1]) {
  test(`theme rejects unsupported selector ${String(theme)}`, /**
   * Verify theme rejects unsupported selector ${String(theme)}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise render so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by render.
     */ () => render({ theme }), TypeError);
  });
}

for (const tokens of [null, [], "red", Object.create({ background: QUOTE_PAYLOAD })]) {
  test(`theme rejects non-record overrides ${String(tokens)}`, /**
   * Verify theme rejects non-record overrides ${String(tokens)}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise svg.resolveTheme so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by svg.resolveTheme.
     */ () => svg.resolveTheme("light", tokens), TypeError);
  });
}

test("theme rejects unknown token keys", /**
 * Verify theme rejects unknown token keys; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise svg.resolveTheme so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by svg.resolveTheme.
   */ () => svg.resolveTheme("light", { backgound: "red" }), /Unknown theme token/);
});

test("theme accepts null-prototype overrides", /**
 * Verify theme accepts null-prototype overrides; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(svg.resolveTheme("dark", Object.assign(Object.create(null), { background: "#fff" })).background, "#fff");
});

test("theme resolution does not mutate overrides", /**
 * Verify theme resolution does not mutate overrides; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const tokens = Object.freeze({ background: " red " });
  svg.resolveTheme("light", tokens);
  assert.equal(tokens.background, " red ");
});

for (const options of [null, [], "options", { legend: "false" }, { legend: null }]) {
  test(`renderer rejects malformed options ${JSON.stringify(options)}`, /**
   * Verify renderer rejects malformed options ${JSON.stringify(options)}; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = core.compileRoute(SOURCE);
    assert.throws(/**
     * Exercise svg.renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by svg.renderTopoSvg.
     */ () => svg.renderTopoSvg(result.model, result.layout, options), TypeError);
  });
}

for (const [field, value, error] of [["width", "640", TypeError], ["width", 0, RangeError], ["height", -1, RangeError], ["height", Infinity, RangeError], ["width", Number.MAX_VALUE, RangeError], ["nodes", {}, TypeError], ["segments", undefined, TypeError], ["points", {}, TypeError]]) {
  test(`renderer rejects malformed supplied layout ${field}: ${String(value)}`, /**
   * Verify renderer rejects malformed supplied layout ${field}: ${String(value)}; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = core.compileRoute(SOURCE);
    assert.throws(/**
     * Exercise svg.renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by svg.renderTopoSvg.
     */ () => svg.renderTopoSvg(result.model, { ...result.layout, [field]: value }), error);
  });
}

for (const collection of ["nodes", "points"]) {
  for (const coordinate of ["x", "y"]) {
    test(`renderer rejects quoted ${collection} ${coordinate}`, /**
     * Verify renderer rejects quoted ${collection} ${coordinate}; arrange the scenario and make its single direct
     * assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = core.compileRoute(SOURCE);
      const layout = structuredClone(result.layout);
      layout[collection][0][coordinate] = QUOTE_PAYLOAD;
      assert.throws(/**
       * Exercise svg.renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {unknown} The result returned by svg.renderTopoSvg.
       */ () => svg.renderTopoSvg(result.model, layout), TypeError);
    });
  }
}

for (const endpoint of ["start", "end"]) {
  test(`renderer validates independent custom segment ${endpoint} coordinates`, /**
   * Verify renderer validates independent custom segment ${endpoint} coordinates; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = core.compileRoute(SOURCE);
    const layout = structuredClone(result.layout);
    layout.segments[0][endpoint] = { ...layout.segments[0][endpoint], x: Number.MAX_VALUE };
    assert.throws(/**
     * Exercise svg.renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by svg.renderTopoSvg.
     */ () => svg.renderTopoSvg(result.model, layout), RangeError);
  });
}

test("renderer rejects nonfinite technical pixel deltas", /**
 * Verify renderer rejects nonfinite technical pixel deltas; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute(SOURCE);
  const layout = structuredClone(result.layout);
  layout.segments.find(/**
   * Evaluate the selection condition segment.kind === "technical".
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (segment) => segment.kind === "technical").technicalDeltaY = NaN;
  assert.throws(/**
   * Exercise svg.renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by svg.renderTopoSvg.
   */ () => svg.renderTopoSvg(result.model, layout), RangeError);
});

test("positioned layouts can omit the optional points projection", /**
 * Verify positioned layouts can omit the optional points projection; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = core.compileRoute(SOURCE);
  const { points, ...layout } = result.layout;
  assert.equal(documentFor(svg.renderTopoSvg(result.model, layout)).documentElement.localName, "svg");
});

test("custom element type remains a single class attribute", /**
 * Verify custom element type remains a single class attribute; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const node = { x: 10, y: 20, element: { type: ELEMENT_PAYLOAD, id: "X1", label: null, attributes: {} } };
  const markup = `<svg xmlns="http://www.w3.org/2000/svg">${svg.renderNode(node, svg.resolveTheme())}</svg>`;
  const document = documentFor(markup);
  assert.deepEqual([document.getElementsByTagName("g")[0].getAttribute("class"), forbiddenStructure(markup)], [`vrl-node vrl-node-${ELEMENT_PAYLOAD}`, []]);
});

test("low-level attribute serialization contains quote payloads inside one value", /**
 * Verify low-level attribute serialization contains quote payloads inside one value; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg">${svg.renderLegendRow({ kind: "text", value: "Legend" }, QUOTE_PAYLOAD, 20, svg.resolveTheme())}</svg>`;
  const document = documentFor(markup);
  assert.deepEqual([document.getElementsByTagName("text")[0].getAttribute("x"), forbiddenStructure(markup)], [QUOTE_PAYLOAD, []]);
});

test("generated path attributes cannot be terminated by custom coordinate strings", /**
 * Verify generated path attributes cannot be terminated by custom coordinate strings; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const markup = `<svg xmlns="http://www.w3.org/2000/svg">${svg.renderTerrainProfile({ width: 100, height: 100, nodes: [{ x: 10, y: QUOTE_PAYLOAD }] }, svg.resolveTheme())}</svg>`;
  assert.deepEqual(forbiddenStructure(markup), []);
});

test("low-level paint serialization rejects resource references", /**
 * Verify low-level paint serialization rejects resource references; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise svg.renderLegendRow so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by svg.renderLegendRow.
   */ () => svg.renderLegendRow({ kind: "text", value: "Legend" }, 10, 20, { mutedText: "url(#external)" }), TypeError);
});

test("attribute serialization preserves Unicode, quotes, ampersands, and XML whitespace", /**
 * Verify attribute serialization preserves Unicode, quotes, ampersands, and XML whitespace; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const value = 'Cañón 🧗 "A" & <B>\n\t\r';
  const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg" aria-label="${svgAttribute(value)}"/>`);
  assert.equal(document.documentElement.getAttribute("aria-label"), value);
});

for (const [index, value] of [undefined, null, {}, true, NaN, Infinity, "\u0000", "\ud800", "\udfff", "\ufffe", "\uffff"].entries()) {
  test(`attribute serialization rejects invalid scalar ${index}: ${JSON.stringify(value)}`, /**
   * Verify attribute serialization rejects invalid scalar ${index}: ${JSON.stringify(value)}; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise svgAttribute so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by svgAttribute.
     */ () => svgAttribute(value), typeof value === "number" ? RangeError : TypeError);
  });
}

for (const theme of ["light", "dark"]) {
  test(`${theme} SVG has only expected elements and attributes`, /**
   * Verify ${theme} SVG has only expected elements and attributes; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const markup = render({ theme });
    const document = documentFor(markup);
    assert.deepEqual({ root: document.documentElement.localName, namespace: document.documentElement.namespaceURI, prohibited: forbiddenStructure(markup), elements: [...new Set(Array.from(document.getElementsByTagName("*")).map(/**
     * Project element.localName from the current record.
     * @responsibility computation
     * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
     * @returns {unknown} The element.localName value selected or validated above.
     */ (element) => element.localName))].sort() }, { root: "svg", namespace: "http://www.w3.org/2000/svg", prohibited: [], elements: ["circle", "defs", "desc", "g", "line", "marker", "path", "rect", "svg", "text", "title", "tspan"] });
  });
}

test("literal entity-looking content is encoded once rather than interpreted", /**
 * Verify literal entity-looking content is encoded once rather than interpreted; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const value = '&quot; onload="inert';
  const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg" aria-label="${svgAttribute(value)}"/>`);
  assert.deepEqual(Array.from(document.documentElement.attributes).map(/**
   * Project the current entry into an ordered tuple for Array.from(document.documentElement.attributes).map.
   * @responsibility computation
   * @param {unknown} attribute - SVG presentation attribute name resolved through the element's ancestors.
   * @returns {Array} The ordered records or values assembled above.
   */ (attribute) => [attribute.name, attribute.value]), [["xmlns", "http://www.w3.org/2000/svg"], ["aria-label", value]]);
});

test("structural oracle detects the original attribute-injection shape", /**
 * Verify structural oracle detects the original attribute-injection shape; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(forbiddenStructure('<svg xmlns="http://www.w3.org/2000/svg"><rect fill="red" onload="void(0)"/></svg>'), ["onload"]);
});

test("structural oracle rejects malformed XML rather than repairing it", /**
 * Verify structural oracle rejects malformed XML rather than repairing it; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise documentFor so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by documentFor.
   */ () => documentFor('<svg xmlns="http://www.w3.org/2000/svg"><g></svg>'));
});

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState]]) {
  test(`${name} refuses invalid paint before producing raw markup`, /**
   * Verify ${name} refuses invalid paint before producing raw markup; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise create so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by create.
     */ () => create(SOURCE, { themeTokens: { background: QUOTE_PAYLOAD } }), TypeError);
  });
  test(`${name} refuses invalid layout configuration`, /**
   * Verify ${name} refuses invalid layout configuration; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise create so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by create.
     */ () => create(SOURCE, { layout: { width: QUOTE_PAYLOAD } }), TypeError);
  });
  test(`${name} preserves supported customized paint`, /**
   * Verify ${name} preserves supported customized paint; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = documentFor(create(SOURCE, { theme: "dark", themeTokens: { background: "#123456" } }).svg);
    assert.equal(document.getElementsByTagName("rect")[0].getAttribute("fill"), "#123456");
  });
}

test("caller-supplied React diagram markup is an explicit trusted passthrough", /**
 * Verify caller-supplied React diagram markup is an explicit trusted passthrough; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const Component = createVrlDiagramComponent({ /**
   * Project tag, props into the record required by createElement.
   * @responsibility computation
   * @param {unknown} tag - Parsed tag or requested release tag as specified by the operation.
   * @param {unknown} props - Component properties supplied by the embedding consumer.
   * @returns {Object} A record containing tag, props.
   */ createElement: (tag, props) => ({ tag, props }) });
  assert.equal(Component({ diagram: { ok: true, svg: '<svg data-owned="caller"/>' } }).props.dangerouslySetInnerHTML.__html, '<svg data-owned="caller"/>');
});

test("caller-supplied Svelte diagram markup is an explicit trusted passthrough", /**
 * Verify caller-supplied Svelte diagram markup is an explicit trusted passthrough; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.match(renderVrlSvelteMarkup("", {}, { diagram: { ok: true, svg: '<svg data-owned="caller"/>' } }), /<svg data-owned="caller"\/>/);
});
