import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, escapeXml, renderDetailLine, renderInfoBox, renderTopoSvg, resolveTheme } from "@subvertic/vrl-render-svg";
import { svgAttribute } from "../packages/vrl-render-svg/src/attributes.js";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitData } from "@subvertic/vrl-sveltekit";

/**
 * Parse markup with the independent XML parser so assertions observe serialized document structure.
 * @responsibility coordinator
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {unknown} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function documentFor(markup) {
  // The dependency defaults to XML 1.1 line normalization; standalone SVG uses XML 1.0.
  return new DOMParser({
    onError: onErrorStopParsing,
    /**
     * Apply source.replace to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
     * @returns {string} The result returned by source.replace.
     */
    normalizeLineEndings: (source) => source.replace(/\r\n?/g, "\n")
  }).parseFromString(markup, "image/svg+xml");
}

/**
 * Quote VRL text by escaping only backslashes and double quotes, preserving all other characters for
 * boundary tests.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
function quoted(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

/**
 * Build a complete route source whose title is the correctly quoted supplied text.
 * @responsibility computation
 * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
function sourceFor(name) {
  return `route ${quoted(name)}\nstart\nexit`;
}

/**
 * Read the information panel's displayed title from the independent parsed SVG document.
 * @responsibility computation
 * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
 * @returns {unknown} The [...document.getElementsByTagName("g")] .find((element) => element.getAttribute("class") === "vrl-info-box") .getElementsByTagName("text").0.textContent value selected or validated above.
 */
function infoTitle(document) {
  return [...document.getElementsByTagName("g")]
    .find(/**
     * Evaluate the selection condition element.getAttribute("class") === "vrl-info-box".
     * @responsibility computation
     * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ (element) => element.getAttribute("class") === "vrl-info-box")
    .getElementsByTagName("text")[0].textContent;
}

const TITLES = [
  ["ampersands and angle brackets", "R&D <Canyon>", "R&D <CANYON>"],
  ["both quote characters", 'The "Blue" Canyon\'s Exit', 'THE "BLUE" CANYON\'S EXIT'],
  ["mixed case", "MiXeD canyon", "MIXED CANYON"],
  ["Unicode and expanding case", "Cañón Straße 🧗 水", "CAÑÓN STRASSE 🧗 水"],
  ["literal entity spellings", "&amp; &lt; &#13; &unknown;", "&AMP; &LT; &#13; &UNKNOWN;"],
  ["markup-looking text", '</text><script title="x">alert(1)</script>', '</TEXT><SCRIPT TITLE="X">ALERT(1)</SCRIPT>'],
  ["CDATA ending", "A ]]> b", "A ]]> B"],
  ["combining accents", "Cafe\u0301 canyon", "CAFE\u0301 CANYON"]
];

for (const [name, value, expected] of TITLES) {
  test(`${name}: standalone SVG recovers the formatted title and original accessible text`, /**
   * Verify ${name}: standalone SVG recovers the formatted title and original accessible text; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(sourceFor(value));
    const document = documentFor(renderTopoSvg(result.model, result.layout));
    assert.deepEqual({
      heading: infoTitle(document),
      title: document.getElementsByTagName("title")[0].textContent,
      description: document.getElementsByTagName("desc")[0].textContent
    }, {
      heading: expected,
      title: `${value} topo`,
      description: `Vertical Route Language schematic for ${value}.`
    });
  });
}

test("markup-looking route titles never become elements", /**
 * Verify markup-looking route titles never become elements; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(sourceFor('</text><script>alert(1)</script>'));
  assert.equal(documentFor(renderTopoSvg(result.model, result.layout)).getElementsByTagName("script").length, 0);
});

test("summary preparation contains the exact raw display title before XML encoding", /**
 * Verify summary preparation contains the exact raw display title before XML encoding; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(sourceFor("Straße & <Canyon>"));
  assert.equal(computeTopoScene(result.model, result.layout).infoBox.lines[0], "STRASSE & <CANYON>");
});

test("the low-level info box preserves valid entities when used without scene preparation", /**
 * Verify the low-level info box preserves valid entities when used without scene preparation; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(sourceFor('R&D <Canyon> "A"'));
  const markup = renderInfoBox(result.model, result.layout, resolveTheme());
  assert.equal(infoTitle(documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`)), 'R&D <CANYON> "A"');
});

// Each excluded control is tested individually, with boundaries around the surrogate ranges.
const INVALID_TEXT = [
  ...Array.from({ length: 32 }, /**
   * Return the selected index binding unchanged.
   * @responsibility computation
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The index value selected or validated above.
   */ (_, index) => index).filter(/**
   * Evaluate the selection condition ![9, 10, 13].includes(code).
   * @responsibility computation
   * @param {string} code - Stable diagnostic identifier, or selected symbol code for presentation.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (code) => ![9, 10, 13].includes(code)).map(/**
   * Apply String.fromCharCode to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {string} code - Stable diagnostic identifier, or selected symbol code for presentation.
   * @returns {unknown} The result returned by String.fromCharCode.
   */ (code) => String.fromCharCode(code)),
  "\ud800", "\udbff", "\udc00", "\udfff", "\udc00\ud800", "\ud800a", "a\udfff", "\ufffe", "\uffff"
];

for (const [name, serialize] of [["text", escapeXml], ["attribute", svgAttribute]]) {
  for (const value of INVALID_TEXT) {
    test(`${name} rejects XML-invalid ${JSON.stringify(value)}`, /**
     * Verify ${name} rejects XML-invalid ${JSON.stringify(value)}; arrange the scenario and make its single direct
     * assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.throws(/**
       * Exercise serialize so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {unknown} The result returned by serialize.
       */ () => serialize(`before${value}after`), { name: "TypeError", message: "XML text must contain valid XML 1.0 characters." });
    });
  }
}

const VALID_TEXT = [
  "", "\t", "\n", "\r", "\r\n", "\u0020", "\u2028\u2029", "\u007f\u0085\u009f", "\ud7ff", "\ue000", "\ufdd0\ufdef", "\ufffd",
  "\u{10000}", "\u{1ffff}", "\u{10ffff}", 'A & B <C> "D" \'E\'', "&#0; &amp; &AMP; &notAnEntity;", "Cañón 🧗 水"
];

for (const value of VALID_TEXT) {
  test(`XML text round trip preserves ${JSON.stringify(value)}`, /**
   * Verify XML text round trip preserves ${JSON.stringify(value)}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg"><text>${escapeXml(value)}</text></svg>`);
    assert.equal(document.getElementsByTagName("text")[0].textContent, value);
  });
  test(`XML attribute round trip preserves ${JSON.stringify(value)}`, /**
   * Verify XML attribute round trip preserves ${JSON.stringify(value)}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg" aria-label="${svgAttribute(value)}"/>`);
    assert.equal(document.documentElement.getAttribute("aria-label"), value);
  });
}

test("escapeXml retains its scalar-to-string compatibility", /**
 * Verify escapeXml retains its scalar-to-string compatibility; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(escapeXml(42), "42");
});

test("escapeXml validates the converted string", /**
 * Verify escapeXml validates the converted string; arrange the scenario and make its single direct assertion.
 * Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise escapeXml so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by escapeXml.
   */ () => escapeXml({ /**
    * Supply the toString test double; return the scenario's deliberately selected value. No production I/O is
    * performed by this fixture.
    * @responsibility computation
    * @returns {string} The literal "bad\u0000text" for this branch.
    */ toString: () => "bad\u0000text" }), TypeError);
});

const SOURCES_WITH_INVALID_TEXT = [
  ["route name", 'route "Bad\u0000name"\nstart\nexit'],
  ["metadata", 'route "Metadata"\nmetadata region="Bad\u0001region"\nstart\nexit'],
  ["boundary label", 'route "Labels"\nstart "Bad\ud800label"\nexit'],
  ["note", 'route "Notes"\nstart\nnote "Bad\uffffnote"\nexit'],
  ["hazard note", 'route "Hazards"\nstart\nhazard type=snake note="Bad\u0000note"\nexit'],
  ["pool note", 'route "Pools"\nstart\npool type=deep note="Bad\ufffenote"\nexit'],
  ["note with vertical tab", 'route "Notes"\nstart\nnote "Bad\u000bnote"\nexit'],
  ["note with form feed", 'route "Notes"\nstart\nnote "Bad\u000cnote"\nexit']
];

for (const [name, source] of SOURCES_WITH_INVALID_TEXT) {
  test(`${name} cannot produce malformed or silently cleaned SVG`, /**
   * Verify ${name} cannot produce malformed or silently cleaned SVG; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source);
    assert.throws(/**
     * Exercise renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by renderTopoSvg.
     */ () => renderTopoSvg(result.model, result.layout), { name: "TypeError", message: "XML text must contain valid XML 1.0 characters." });
  });
}

test("invalid detail controls are rejected before low-level whitespace wrapping", /**
 * Verify invalid detail controls are rejected before low-level whitespace wrapping; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise renderDetailLine so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by renderDetailLine.
   */ () => renderDetailLine("before\u000bafter", 0, 0, resolveTheme(), "en", 40), TypeError);
});

test("XML restrictions remain outside the core model and JSON export", /**
 * Verify XML restrictions remain outside the core model and JSON export; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(sourceFor("Bad\u0000name"));
  assert.deepEqual([result.ok, result.model.name, JSON.parse(result.json).name], [true, "Bad\u0000name", "Bad\u0000name"]);
});

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState], ["SvelteKit", createVrlSvelteKitData]]) {
  test(`${name} produces independently parseable SVG for special route titles`, /**
   * Verify ${name} produces independently parseable SVG for special route titles; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create(sourceFor("R&D <Canyon>"));
    assert.equal(infoTitle(documentFor(state.svg)), "R&D <CANYON>");
  });
  test(`${name} propagates invalid XML text failures`, /**
   * Verify ${name} propagates invalid XML text failures; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise create so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by create.
     */ () => create(sourceFor("Bad\u0000name")), TypeError);
  });
}

test("Svelte server markup retains special route title text", /**
 * Verify Svelte server markup retains special route title text; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(infoTitle(documentFor(renderVrlSvelteMarkup(sourceFor("R&D <Canyon>")))), "R&D <CANYON>");
});

test("title rendering is deterministic and leaves route and layout snapshots untouched", /**
 * Verify title rendering is deterministic and leaves route and layout snapshots untouched; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(sourceFor("Straße & <Canyon>"));
  const before = JSON.stringify([result.model, result.layout]);
  const first = renderTopoSvg(result.model, result.layout);
  const second = renderTopoSvg(result.model, result.layout);
  assert.deepEqual([first, JSON.stringify([result.model, result.layout])], [second, before]);
});
