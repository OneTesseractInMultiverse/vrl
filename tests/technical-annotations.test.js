import assert from "node:assert/strict";
import test from "node:test";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { compileRoute, createRouteCompiler } from "@subvertic/vrl-core";
import { computeTopoScene, renderDirectTechnicalSegment, renderDropLadderSegment, renderTopoSvg, resolveTheme } from "@subvertic/vrl-render-svg";
import { createVrlReactDiagramState } from "@subvertic/vrl-react";
import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";
import { createVrlSvelteKitData } from "@subvertic/vrl-sveltekit";

const SHAPES = ["ladder", "direct", "slab"];
const DETAILS = "height=30m rope=60m stages=10m+20m redirection=5m:left";

/**
 * Build a rappel source with the requested shape and explicit technical-detail fields.
 * @responsibility computation
 * @param {unknown} shape - Technical drawing shape: ladder, direct or curve.
 * @param {unknown} details - Optional diagnostic code/span or rendered annotation details for this operation; defaults to DETAILS.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
function source(shape, details = DETAILS) {
  return `route "Technical survey"\nrappel shape=${shape} ${details}`;
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
 * Project trimmed text content from elements selected by the requested SVG class.
 * @responsibility computation
 * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
 * @param {unknown} className - CSS class token used for wrapper styling or DOM selection.
 * @returns {Array} The result returned by byClass(document, className).map.
 */
function texts(document, className) {
  return byClass(document, className).map(/**
   * Apply element.textContent.trim to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {string} The result returned by element.textContent.trim.
   */ (element) => element.textContent.trim());
}

/**
 * Compile and render the supplied source, then parse the complete SVG for independent annotation assertions.
 * @responsibility coordinator
 * @param {string} sourceText - Complete VRL source text to compile for this scenario.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Values are forwarded to the owning compiler/render or framework boundary.
 * @returns {unknown} The result returned by documentFor.
 */
function render(sourceText, options = {}) {
  const result = compileRoute(sourceText, options);
  return documentFor(renderTopoSvg(result.model, result.layout, options));
}

/**
 * Extract signed decimal/exponent coordinates from emitted SVG path data for independent geometry checks.
 * @responsibility computation
 * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
 * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function pathNumbers(path) {
  return path.getAttribute("d").match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number);
}

/**
 * Read emitted x/y text coordinates as numbers from the parsed SVG element.
 * @responsibility computation
 * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
 * @returns {Array} The ordered records or values assembled above.
 */
function textPosition(element) {
  return [Number(element.getAttribute("x")), Number(element.getAttribute("y"))];
}

/**
 * Serialize observed stage labels, stage boundaries and redirection groups for exact cross-style comparison.
 * @responsibility computation
 * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
 * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function annotationSnapshot(document) {
  return [...byClass(document, "vrl-rappel-stage-label"), ...byClass(document, "vrl-rappel-stage-boundary"), ...byClass(document, "vrl-redirection-anchor")]
    .map(/**
     * Apply element.toString to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {Object} element - Owning route element with its type, identity and declared attributes.
     * @returns {unknown} The result returned by element.toString.
     */ (element) => element.toString());
}

for (const shape of SHAPES) {
  test(`${shape}: both declared stage lengths survive as SVG text`, /**
   * Verify ${shape}: both declared stage lengths survive as SVG text; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(texts(render(source(shape)), "vrl-rappel-stage-label"), ["10m", "20m"]);
  });

  test(`${shape}: declared redirection distance and side survive visually and in its accessible name`, /**
   * Verify ${shape}: declared redirection distance and side survive visually and in its accessible name; arrange
   * the scenario and make its single direct assertion. Assertion and setup failures propagate to the test
   * runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const anchors = byClass(render(source(shape)), "vrl-redirection-anchor");
    assert.deepEqual(anchors.map(/**
     * Project the current entry into an ordered tuple for anchors.map.
     * @responsibility computation
     * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
     * @returns {Array} The ordered records or values assembled above.
     */ (element) => [element.getElementsByTagName("text")[0].textContent, element.getAttribute("aria-label")]), [["5m L", "Redirection anchor 5m L"]]);
  });

  test(`${shape}: Spanish redirection labels reach the shared renderer`, /**
   * Verify ${shape}: Spanish redirection labels reach the shared renderer; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const anchors = byClass(render(source(shape), { language: "es" }), "vrl-redirection-anchor");
    assert.deepEqual(anchors.map(/**
     * Project the current entry into an ordered tuple for anchors.map.
     * @responsibility computation
     * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
     * @returns {Array} The ordered records or values assembled above.
     */ (element) => [element.getElementsByTagName("text")[0].textContent, element.getAttribute("aria-label")]), [["5m izq", "Anclaje de desvio 5m izq"]]);
  });

  for (const [language, expected] of [
    ["en", `Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.\n1. Rappel R1. Movement: descent. Vertical change: -30m. Anchor type: unknown. Anchor count: unknown. Physical height: 30m. Redirection: 5m left. Declared rope: 60m. Technical shape: ${shape}. Rope stages: 10m; 20m.`],
    ["es", `Ruta esquematica, sin escala. Lea los elementos en orden. Las cuerdas son longitudes declaradas, no requisitos de equipo.\n1. Rapel R1. Movimiento: descenso. Cambio vertical: -30m. Tipo de anclaje: desconocido. Cantidad de anclajes: desconocido. Altura fisica: 30m. Desviador: 5m izquierda. Cuerda declarada: 60m. Forma tecnica: ${shape}. Tramos de cuerda: 10m; 20m.`]
  ]) {
    test(`${shape}: ${language} top-level description exposes annotation values and their owner`, /**
     * Verify ${shape}: ${language} top-level description exposes annotation values and their owner; arrange the
     * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      assert.equal(render(source(shape), { language }).getElementsByTagName("desc")[0].textContent, expected);
    });
  }

  test(`${shape}: plural redirections retain declaration order and distances`, /**
   * Verify ${shape}: plural redirections retain declaration order and distances; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(texts(render(source(shape, "height=30m rope=60m redirections=5m:left,25m:right")), "vrl-redirection-anchor"), ["5m L", "25m R"]);
  });

  test(`${shape}: stage boundary follows the first third of the technical slope`, /**
   * Verify ${shape}: stage boundary follows the first third of the technical slope; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = render(source(shape));
    const [x1, y1, x2, y2] = pathNumbers(byClass(document, "vrl-route-segment vrl-drop-slope")[0]);
    const boundary = byClass(document, "vrl-rappel-stage-boundary")[0];
    assert.deepEqual(["x1", "y1", "x2", "y2"].map(/**
     * Apply Number to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
     * @returns {unknown} The result returned by Number.
     */ (name) => Number(boundary.getAttribute(name))), [Math.round(x1 + (x2 - x1) / 3) - 8, Math.round(y1 + (y2 - y1) / 3), Math.round(x1 + (x2 - x1) / 3) + 8, Math.round(y1 + (y2 - y1) / 3)]);
  });

  test(`${shape}: annotation-free features do not acquire invented details`, /**
   * Verify ${shape}: annotation-free features do not acquire invented details; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(annotationSnapshot(render(source(shape, "height=30m rope=60m"))), []);
  });

  test(`${shape}: only ladder geometry draws rungs`, /**
   * Verify ${shape}: only ladder geometry draws rungs; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(byClass(render(source(shape)), "vrl-drop-rung").length > 0, shape === "ladder");
  });

  test(`${shape}: a stage-sum warning retains the declared lengths`, /**
   * Verify ${shape}: a stage-sum warning retains the declared lengths; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source(shape, "height=30m rope=60m stages=10m+25m"));
    const document = documentFor(renderTopoSvg(result.model, result.layout));
    assert.deepEqual([result.ok, result.diagnostics.map(/**
     * Project the current entry into an ordered tuple for result.diagnostics.map.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {Array} The ordered records or values assembled above.
     */ (item) => [item.severity, item.message]), texts(document, "vrl-rappel-stage-label")], [true, [["warning", 'Field "stages" total does not match rappel height.']], ["10m", "25m"]]);
  });

  for (const [type, fields] of [["rappel", "rope=60m"], ["downclimb", ""], ["climb", ""]]) {
    test(`${shape} ${type}: all technical types retain their own annotations`, /**
     * Verify ${shape} ${type}: all technical types retain their own annotations; arrange the scenario and make its
     * single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const document = render(`route "Types"\n${type} height=30m ${fields} stages=10m+20m redirection=5m:left shape=${shape}`);
      assert.deepEqual([texts(document, "vrl-rappel-stage-label"), texts(document, "vrl-redirection-anchor")], [["10m", "20m"], ["5m L"]]);
    });
  }

  test(`${shape}: adjacent descents and climbs do not exchange or duplicate annotations`, /**
   * Verify ${shape}: adjacent descents and climbs do not exchange or duplicate annotations; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = render(`${source(shape)}\nnote "Shared boundary"\nclimb height=5m stages=2m+3m redirection=1m:right shape=${shape}`);
    const groups = byClass(document, shape === "ladder" ? "vrl-drop-ladder" : "vrl-drop-direct");
    assert.deepEqual(groups.map(/**
     * Project the current entry into an ordered tuple for groups.map.
     * @responsibility computation
     * @param {unknown} group - Parsed SVG group selected for the observation.
     * @returns {Array} The ordered records or values assembled above.
     */ (group) => [texts(group, "vrl-rappel-stage-label"), texts(group, "vrl-redirection-anchor")]), [[["10m", "20m"], ["5m L"]], [["2m", "3m"], ["1m R"]]]);
  });

  test(`${shape}: near-endpoint valid redirections keep exact text and the existing five-percent display inset`, /**
   * Verify ${shape}: near-endpoint valid redirections keep exact text and the existing five-percent display
   * inset; arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to
   * the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const document = render(source(shape, "height=30m rope=60m redirections=0.000001m:left,29.999999m:right"));
    const [x1, y1, x2, y2] = pathNumbers(byClass(document, "vrl-route-segment vrl-drop-slope")[0]);
    const anchors = byClass(document, "vrl-redirection-anchor");
    assert.deepEqual(anchors.map(/**
     * Project the current entry into an ordered tuple for anchors.map.
     * @responsibility computation
     * @param {unknown} anchor - SVG text alignment: start, middle or end.
     * @returns {Array} The ordered records or values assembled above.
     */ (anchor) => [anchor.textContent.trim(), pathNumbers(anchor.getElementsByTagName("path")[0]).slice(0, 2)]), [["0.000001m L", [Math.round(x1 + (x2 - x1) * 0.05), Math.round(y1 + (y2 - y1) * 0.05) - 6]], ["29.999999m R", [Math.round(x1 + (x2 - x1) * 0.95), Math.round(y1 + (y2 - y1) * 0.95) - 6]]]);
  });

  test(`${shape}: tiny positive stage lengths retain exact values`, /**
   * Verify ${shape}: tiny positive stage lengths retain exact values; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(texts(render(source(shape, "height=30m rope=60m stages=0.000001m+29.999999m")), "vrl-rappel-stage-label"), ["0.000001m", "29.999999m"]);
  });

  test(`${shape}: visible stage labels fit the scene even at narrow canvas edges`, /**
   * Verify ${shape}: visible stage labels fit the scene even at narrow canvas edges; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(source(shape, "height=1000000000m rope=1000000000m stages=500000000m+500000000m redirection=1m:left"), { layout: { width: 1, spineX: 0, marginY: 0, marginBottom: 0 } });
    const scene = computeTopoScene(result.model, result.layout, { legend: false });
    const labels = byClass(documentFor(renderTopoSvg(result.model, result.layout, { legend: false })), "vrl-rappel-stage-label");
    const clipped = labels.filter(/**
     * Detect labels extending beyond prepared content bounds using an independently estimated text envelope.
     * @responsibility computation
     * @param {string} label - Unescaped display label supplied by the caller.
     * @returns {unknown} The result of the documented comparison or calculation.
     */ (label) => {
      const [x, y] = textPosition(label);
      const width = label.textContent.length * Number(label.getAttribute("font-size")) * 1.1;
      return x - width < scene.contentBounds.minX || y - 9 < scene.contentBounds.minY || x > scene.contentBounds.maxX || y + 5 > scene.contentBounds.maxY;
    });
    assert.deepEqual([labels.length, clipped.length], [2, 0]);
  });

  for (const fields of ["stages=bad+20m", "stages=30m", "stages=0m+30m", "stages=-1m+31m", "redirection=far:left", "redirection=0m:left", "redirection=-1m:right", "redirection=30m:left", "redirection=31m:right", "redirection=5m:up"]) {
    test(`${shape}: malformed or out-of-range ${fields} blocks derived output`, /**
     * Verify ${shape}: malformed or out-of-range ${fields} blocks derived output; arrange the scenario and make
     * its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = compileRoute(source(shape, `height=30m rope=60m ${fields}`));
      assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.some(/**
       * Evaluate the selection condition item.severity === "error" && item.location.line === 2.
       * @responsibility computation
       * @param {unknown} item - Current prepared record or test case.
       * @returns {unknown} The result of the documented comparison or calculation.
       */ (item) => item.severity === "error" && item.location.line === 2)], [false, null, null, null, true]);
    });
  }
}

for (const shape of ["direct", "slab"]) {
  test(`${shape}: annotations match ladder output exactly in elevated and schematic layouts`, /**
   * Verify ${shape}: annotations match ladder output exactly in elevated and schematic layouts; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const documents = ["", "metadata entrance_elevation=100m exit_elevation=76m\n"].map(/**
     * Render the requested technical shape and ladder control from identical route facts, then compare their
     * emitted annotation records.
     * @responsibility coordinator
     * @param {Object} metadata - Route-level metadata; absent endpoint measurements remain unknown.
     * @returns {Array} The ordered records or values assembled above.
     */ (metadata) => {
      /**
       * Apply render to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts.
       * @returns {unknown} The result returned by render.
       */
      const build = (style) => render(`route "Parity"\n${metadata}rappel shape=${style} ${DETAILS} inclination=80%`, { layout: { minNodeGap: 1000 } });
      return [annotationSnapshot(build(shape)), annotationSnapshot(build("ladder"))];
    });
    assert.deepEqual(documents.map(/**
     * Return the selected actual binding unchanged.
     * @responsibility computation
     * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
     * @param {unknown} input1[0] - Tuple member bound as actual: Observed value being compared with independently specified expectations.
     * @returns {unknown} The actual value selected or validated above.
     */ ([actual]) => actual), documents.map(/**
      * Return the selected expected binding unchanged.
      * @responsibility computation
      * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
      * @param {unknown} input1[1] - Tuple member bound as expected: the ordered input consumed below.
      * @returns {unknown} The expected value selected or validated above.
      */ ([, expected]) => expected));
  });
}

for (const [name, helper] of [["ladder", renderDropLadderSegment], ["direct", renderDirectTechnicalSegment]]) {
  test(`${name} helper: stage positions use the measured technical line rather than the longer connector`, /**
   * Verify ${name} helper: stage positions use the measured technical line rather than the longer connector;
   * arrange the scenario and make its single direct assertion. Assertion and setup failures propagate to the
   * test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const element = compileRoute(source(name)).model.elements[0];
    const previous = { x: 10, y: 100, element };
    const next = { x: 110, y: 600 };
    const layout = { technicalDeltaY: 300 };
    const markup = name === "ladder" ? helper(previous, next, resolveTheme(), element, "en", layout) : helper(previous, next, resolveTheme(), element, layout);
    const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`);
    assert.deepEqual(byClass(document, "vrl-rappel-stage-label").map(textPosition), [[28, 148], [28, 298]]);
  });

  test(`${name} helper: default element and language preserve annotations`, /**
   * Verify ${name} helper: default element and language preserve annotations; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const element = compileRoute(source(name)).model.elements[0];
    const markup = helper({ x: 10, y: 100, element }, { x: 110, y: 400 }, resolveTheme());
    const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`);
    assert.deepEqual([texts(document, "vrl-rappel-stage-label"), texts(document, "vrl-redirection-anchor")], [["10m", "20m"], ["5m L"]]);
  });
}

test("direct helper accepts language after its existing layout argument", /**
 * Verify direct helper accepts language after its existing layout argument; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const element = compileRoute(source("direct")).model.elements[0];
  const markup = renderDirectTechnicalSegment({ x: 10, y: 100 }, { x: 110, y: 400 }, resolveTheme(), element, null, "es");
  const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`);
  assert.deepEqual(texts(document, "vrl-redirection-anchor"), ["5m izq"]);
});

test("unsupported line shapes are diagnosed rather than selected silently", /**
 * Verify unsupported line shapes are diagnosed rather than selected silently; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(source("unsupported"));
  assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics[0].message], [false, null, null, null, 'Field "shape" has unsupported value "unsupported".']);
});

test("invalid annotations do not reach normalization or rendering inputs", /**
 * Record an unexpected downstream invocation and throw immediately; the surrounding assertion requires
 * blocking validation to prevent this call.
 * @responsibility computation
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const calls = [];
  const compiler = createRouteCompiler(Object.fromEntries(["normalize", "validateGeometry", "layout", "exportJson"].map(/**
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
  compiler(source("direct", "height=30m rope=60m redirection=30m:left"));
  assert.deepEqual(calls, []);
});

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState], ["SvelteKit", createVrlSvelteKitData]]) {
  test(`${name}: direct annotations survive the adapter pipeline`, /**
   * Verify ${name}: direct annotations survive the adapter pipeline; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create(source("direct"), { language: "es" });
    const document = documentFor(state.svg);
    assert.deepEqual([state.ok, texts(document, "vrl-rappel-stage-label"), texts(document, "vrl-redirection-anchor")], [true, ["10m", "20m"], ["5m izq"]]);
  });

  test(`${name}: invalid annotations return diagnostics and no diagram`, /**
   * Verify ${name}: invalid annotations return diagnostics and no diagram; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = create(source("slab", "height=30m rope=60m stages=0m+30m"));
    assert.deepEqual([state.ok, state.svg, state.diagnostics[0].severity], [false, "", "error"]);
  });
}

test("rendering every shape is deterministic and preserves model and layout", /**
 * Verify rendering every shape is deterministic and preserves model and layout; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const results = SHAPES.map(/**
   * Apply compileRoute to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} shape - Technical drawing shape: ladder, direct or curve.
   * @returns {unknown} The result returned by compileRoute.
   */ (shape) => compileRoute(source(shape)));
  const before = structuredClone(results);
  const first = results.map(/**
   * Apply renderTopoSvg to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
   * @returns {unknown} The result returned by renderTopoSvg.
   */ (result) => renderTopoSvg(result.model, result.layout));
  const second = results.map(/**
   * Apply renderTopoSvg to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
   * @returns {unknown} The result returned by renderTopoSvg.
   */ (result) => renderTopoSvg(result.model, result.layout));
  assert.deepEqual([results, first], [before, second]);
});


test("accessible annotation description preserves feature order across connections", /**
 * Verify accessible annotation description preserves feature order across connections; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const document = render(`${source("direct")}\nwalk distance=1m\nclimb height=5m stages=2m+3m redirection=1m:right shape=slab`);
  assert.equal(document.getElementsByTagName("desc")[0].textContent, "Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.\n1. Rappel R1. Movement: descent. Vertical change: -30m. Anchor type: unknown. Anchor count: unknown. Physical height: 30m. Redirection: 5m left. Declared rope: 60m. Technical shape: direct. Rope stages: 10m; 20m.\n2. Walk W1. Walking distance: 1m.\n3. Climb C1. Movement: ascent. Vertical change: 5m. Physical height: 5m. Redirection: 1m right. Technical shape: slab. Rope stages: 2m; 3m.");
});

test("accessible descriptions retain explicit identifiers as escaped text", /**
 * Verify accessible descriptions retain explicit identifiers as escaped text; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const document = render('route "Survey"\nrappel "R<&>" height=30m rope=60m stages=10m+20m shape=direct');
  assert.equal(document.getElementsByTagName("desc")[0].textContent, "Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.\n1. Rappel R<&>. Movement: descent. Vertical change: -30m. Anchor type: unknown. Anchor count: unknown. Physical height: 30m. Declared rope: 60m. Technical shape: direct. Rope stages: 10m; 20m.");
});

test("accessible descriptions omit an absent stage list while retaining redirections", /**
 * Verify accessible descriptions omit an absent stage list while retaining redirections; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const document = render(source("slab", "height=30m rope=60m redirections=5m:left,25m:right"));
  assert.equal(document.getElementsByTagName("desc")[0].textContent, "Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.\n1. Rappel R1. Movement: descent. Vertical change: -30m. Anchor type: unknown. Anchor count: unknown. Physical height: 30m. Redirections: 5m left; 25m right. Declared rope: 60m. Technical shape: slab.");
});
