import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { compileRoute, createRouteCompiler } from "@subvertic/vrl-core";
import { anchorMarkCount, computeTopoScene, formatTopoDetail, renderAnchorMarks, renderTopoSvg, resolveTheme } from "@subvertic/vrl-render-svg";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitData } from "@subvertic/vrl-sveltekit";

const COUNTS = [[1, 1, ""], [3, 3, ""], [4, 4, ""], [5, 4, "+1"], [9, 4, "+5"], [2147483647, 4, "+2147483643"], [9007199254740991, 4, "+9007199254740987"]];

/**
 * Build a one-rappel source with the requested explicit anchor count, omitting the field when count is
 * undefined.
 * @responsibility computation
 * @param {number} count - Number of generated records or declared anchors; visual caps do not alter declared quantities.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
function source(count) {
  return `route "Anchor survey"\nrappel height=30m rope=60m${count === undefined ? "" : ` anchor_count=${count}`}`;
}

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
 * Select parsed SVG elements containing the requested class token.
 * @responsibility computation
 * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
 * @param {unknown} className - CSS class token used for wrapper styling or DOM selection.
 * @returns {Array} The result returned by [...document.getElementsByTagName("*")].filter.
 */
function byClass(document, className) {
  return [...document.getElementsByTagName("*")].filter(/**
   * Evaluate the selection condition element.getAttribute("class") === className.
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (element) => element.getAttribute("class") === className);
}

/**
 * Render the anchor helper at a fixed position and parse its SVG fragment for independent quantity and
 * placement assertions.
 * @responsibility coordinator
 * @param {number} count - Number of generated records or declared anchors; visual caps do not alter declared quantities.
 * @param {unknown} side - Declared left/right station or redirection side; defaults to "left".
 * @returns {unknown} The result returned by documentFor.
 */
function helperDocument(count, side = "left") {
  const markup = renderAnchorMarks({ x: 100, y: 200 }, { attributes: { anchor_count: count } }, resolveTheme(), side);
  return documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`);
}

for (const [count, marks, overflow] of COUNTS) {
  for (const [language, singular, plural, introduction, name] of [
    ["en", "anchor", "anchors", "Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.", "Rappel R1"],
    ["es", "anclaje", "anclajes", "Ruta esquematica, sin escala. Lea los elementos en orden. Las cuerdas son longitudes declaradas, no requisitos de equipo.", "Rapel R1"]
  ]) {
    test(`${count} anchors in ${language}: factual text and accessibility retain the full count`, /**
     * Verify ${count} anchors in ${language}: factual text and accessibility retain the full count; arrange the
     * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = compileRoute(source(count));
      const document = documentFor(renderTopoSvg(result.model, result.layout, { language }));
      const expected = `${count} ${count === 1 ? singular : plural}`;
      assert.deepEqual({
        detail: formatTopoDetail(result.model.elements[0], null, language),
        visibleDetail: byClass(document, "vrl-detail-line")[0].textContent,
        label: byClass(document, "vrl-anchor-marks")[0].getAttribute("aria-label"),
        description: document.getElementsByTagName("desc")[0].textContent
      }, { detail: `60m / ${expected}`, visibleDetail: `60m / ${expected}`, label: expected, description: language === "en" ? `${introduction}\n1. ${name}. Movement: descent. Vertical change: -30m. Anchor type: unknown. Anchor count: ${count}. Physical height: 30m. Declared rope: 60m.` : `${introduction}\n1. ${name}. Movimiento: descenso. Cambio vertical: -30m. Tipo de anclaje: desconocido. Cantidad de anclajes: ${count}. Altura fisica: 30m. Cuerda declarada: 60m.` });
    });
  }

  test(`${count} anchors: drawing stays bounded and the remainder is explicit`, /**
   * Verify ${count} anchors: drawing stays bounded and the remainder is explicit; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source(count));
    const document = documentFor(renderTopoSvg(result.model, result.layout));
    assert.deepEqual([byClass(document, "vrl-anchor-marks")[0].getElementsByTagName("circle").length, byClass(document, "vrl-anchor-overflow").map(/**
     * Project element.textContent from the current record.
     * @responsibility computation
     * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
     * @returns {unknown} The element.textContent value selected or validated above.
     */ (element) => element.textContent).join("")], [marks, overflow]);
  });

  test(`${count} anchors: existing mark-count helper still returns the drawing count`, /**
   * Verify ${count} anchors: existing mark-count helper still returns the drawing count; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(anchorMarkCount({ attributes: { anchor_count: String(count) } }), marks);
  });

  test(`${count} anchors: model and JSON retain the exact source quantity`, /**
   * Verify ${count} anchors: model and JSON retain the exact source quantity; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source(count));
    renderTopoSvg(result.model, result.layout);
    assert.deepEqual([result.model.elements[0].attributes.anchor_count, JSON.parse(result.json).elements[0].attributes.anchor_count], [String(count), String(count)]);
  });
}

for (const count of [undefined, null, 0, -1, 1.5, NaN, Infinity, 9007199254740992, "bad", "", false, true, {}, [], 5n, Symbol("count")]) {
  test(`low-level unsupported quantity ${String(count)} produces no invented marks`, /**
   * Verify low-level unsupported quantity ${String(count)} produces no invented marks; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(renderAnchorMarks({ x: 100, y: 200 }, { attributes: { anchor_count: count } }, resolveTheme()), "");
  });

  test(`low-level unsupported quantity ${String(count)} produces no factual count text`, /**
   * Verify low-level unsupported quantity ${String(count)} produces no factual count text; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(formatTopoDetail({ type: "rappel", attributes: { anchor_count: count } }), "");
  });
}

for (const side of ["left", "right"]) {
  test(`${side} marks and overflow occupy separate, predictable positions`, /**
   * Verify ${side} marks and overflow occupy separate, predictable positions; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = helperDocument(5, side);
    const circles = [...document.getElementsByTagName("circle")];
    const label = byClass(document, "vrl-anchor-overflow")[0];
    assert.deepEqual({ circles: circles.map(/**
     * Project the current entry into an ordered tuple for circles.map.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {Array} The ordered records or values assembled above.
     */ (item) => [Number(item.getAttribute("cx")), Number(item.getAttribute("cy"))]), label: [Number(label.getAttribute("x")), Number(label.getAttribute("y")), label.getAttribute("text-anchor"), label.textContent] }, side === "left"
      ? { circles: [[86, 176], [78, 176], [70, 176], [62, 176]], label: [53, 179, "end", "+1"] }
      : { circles: [[114, 176], [122, 176], [130, 176], [138, 176]], label: [147, 179, "start", "+1"] });
  });
}

test("overflow shorthand is hidden from accessibility while its group names the true total", /**
 * Verify overflow shorthand is hidden from accessibility while its group names the true total; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const document = helperDocument(9);
  assert.deepEqual([byClass(document, "vrl-anchor-overflow")[0].getAttribute("aria-hidden"), byClass(document, "vrl-anchor-marks")[0].getAttribute("aria-label")], ["true", "9 anchors"]);
});

test("missing count remains unknown even when the anchor type is specified", /**
 * Verify missing count remains unknown even when the anchor type is specified; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(`${source()} anchor=bolts`);
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  assert.deepEqual([byClass(document, "vrl-anchor-marks").length, byClass(document, "vrl-anchor-overflow").length, byClass(document, "vrl-detail-line")[0].textContent, document.getElementsByTagName("desc")[0].textContent], [0, 0, "60m", "Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.\n1. Rappel R1. Movement: descent. Vertical change: -30m. Anchor type: bolts. Anchor count: unknown. Physical height: 30m. Declared rope: 60m."]);
});

for (const value of ["0", "-1", "1.5", "01", "1e2", "9007199254740992", "9007199254740993", "Infinity", "NaN", '""', '"5 anchors"', "true"]) {
  test(`invalid source anchor_count=${value} blocks compilation instead of silently capping or rounding`, /**
   * Verify invalid source anchor_count=${value} blocks compilation instead of silently capping or rounding;
   * arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to the
   * test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source(value));
    assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.map(/**
     * Project the current entry into an ordered tuple for result.diagnostics.map.
     * @responsibility computation
     * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
     * @returns {Array} The ordered records or values assembled above.
     */ (diagnostic) => [diagnostic.severity, diagnostic.location.line])], [false, null, null, null, [["error", 2]]]);
  });
}

for (const shape of ["ladder", "direct", "slab"]) {
  test(`${shape}: truthful anchor counts coexist with technical annotations`, /**
   * Verify ${shape}: truthful anchor counts coexist with technical annotations; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(`${source(5)} shape=${shape} stages=10m+20m redirection=5m:left`);
    const document = documentFor(renderTopoSvg(result.model, result.layout));
    assert.equal(document.getElementsByTagName("desc")[0].textContent, `Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.\n1. Rappel R1. Movement: descent. Vertical change: -30m. Anchor type: unknown. Anchor count: 5. Physical height: 30m. Redirection: 5m left. Declared rope: 60m. Technical shape: ${shape}. Rope stages: 10m; 20m.`);
  });
}

test("counts retain their owning element in source order, including annotations", /**
 * Verify counts retain their owning element in source order, including annotations; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Owners"\nhazard H anchor_count=9\nrappel A height=30m rope=60m anchor_count=5\nclimb B height=5m anchor_count=1');
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  assert.equal(document.getElementsByTagName("desc")[0].textContent, "Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.\n1. Hazard H. Annotation at route boundary: 1. Anchor count: 9.\n2. Rappel A. Movement: descent. Vertical change: -30m. Anchor type: unknown. Anchor count: 5. Physical height: 30m. Declared rope: 60m.\n3. Climb B. Movement: ascent. Vertical change: 5m. Anchor count: 1. Physical height: 5m.");
});

test("overflow on an annotation-only route retains its true accessible count", /**
 * Verify overflow on an annotation-only route retains its true accessible count; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Annotation"\nhazard anchor_count=5');
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  assert.deepEqual([byClass(document, "vrl-anchor-overflow")[0].textContent, document.getElementsByTagName("desc")[0].textContent], ["+1", "Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.\n1. Hazard H1. No physical boundary. Anchor count: 5."]);
});

test("accessible counts preserve markup-looking owner IDs as ordinary text", /**
 * Verify accessible counts preserve markup-looking owner IDs as ordinary text; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Survey"\nrappel "A<&>" height=30m rope=60m anchor_count=5');
  const document = documentFor(renderTopoSvg(result.model, result.layout));
  assert.equal(document.getElementsByTagName("desc")[0].textContent, "Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.\n1. Rappel A<&>. Movement: descent. Vertical change: -30m. Anchor type: unknown. Anchor count: 5. Physical height: 30m. Declared rope: 60m.");
});

for (const [language, theme] of [["en", "light"], ["es", "dark"]]) {
  test(`${language} ${theme}: maximum-count overflow expands scene bounds without moving physical data`, /**
   * Verify ${language} ${theme}: maximum-count overflow expands scene bounds without moving physical data;
   * arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to the
   * test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source(9007199254740991), { layout: { width: 1, spineX: 0, marginY: 0, marginBottom: 0 } });
    const before = structuredClone(result.layout);
    const scene = computeTopoScene(result.model, result.layout, { language, theme, legend: false });
    const document = documentFor(renderTopoSvg(result.model, result.layout, { language, theme, legend: false }));
    const overflow = byClass(document, "vrl-anchor-overflow")[0];
    const left = Number(overflow.getAttribute("x")) - overflow.textContent.length * 9 * 1.1;
    assert.deepEqual([scene.contentBounds.minX < left, scene.viewBox.x < left, result.layout], [true, true, before]);
  });
}

test("invalid source counts stop downstream compiler ports", /**
 * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
 * blocking validation to prevent this call.
 * @responsibility computation
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const calls = [];
  const compile = createRouteCompiler(Object.fromEntries(["normalize", "validateGeometry", "layout", "exportJson"].map(/**
   * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
   * blocking validation to prevent this call.
   * @responsibility computation
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {Array} The ordered records or values assembled above.
   */ (name) => [name, /**
    * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
    * blocking validation to prevent this call.
    * @responsibility computation
    * @returns {void} Completes the documented operation; no return value is consumed.
    * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
    */ () => { calls.push(name); throw new Error("Unexpected downstream call"); }])));
  compile(source(0));
  assert.deepEqual(calls, []);
});

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState], ["SvelteKit", createVrlSvelteKitData]]) {
  test(`${name}: counts above the display cap remain truthful`, /**
   * Verify ${name}: counts above the display cap remain truthful; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create(source(5), { language: "es" });
    const document = documentFor(state.svg);
    assert.deepEqual([state.ok, byClass(document, "vrl-anchor-marks")[0].getAttribute("aria-label"), byClass(document, "vrl-anchor-overflow")[0].textContent], [true, "5 anclajes", "+1"]);
  });

  test(`${name}: zero count returns diagnostics and no diagram`, /**
   * Verify ${name}: zero count returns diagnostics and no diagram; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create(source(0));
    assert.deepEqual([state.ok, state.svg, state.model, state.diagnostics[0].severity], [false, "", null, "error"]);
  });
}

test("repeated capped rendering preserves model, layout, and deterministic SVG", /**
 * Verify repeated capped rendering preserves model, layout, and deterministic SVG; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source(9007199254740991));
  const before = structuredClone(result);
  const first = renderTopoSvg(result.model, result.layout);
  const second = renderTopoSvg(result.model, result.layout);
  assert.deepEqual([result, first], [before, second]);
});
