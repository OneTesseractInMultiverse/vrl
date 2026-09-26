import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";
import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg, renderNode, renderNodes, renderLegend, renderInfoBox, renderLegendSymbolRow, renderDirectTechnicalSegment, renderWaterSegments, resolveTheme } from "@subvertic/vrl-render-svg";
import { detailRecordsForElement } from "../packages/vrl-render-svg/src/detail-content.js";
import { detailRecordRows, placeDetailRows } from "../packages/vrl-render-svg/src/detail-layout.js";
import { rungPlacements, stagePlacements, redirectionPlacements } from "../packages/vrl-render-svg/src/segment-scene.js";
import { symbolPlacement } from "../packages/vrl-render-svg/src/node-scene.js";
import { prepareInfoBox, prepareLegendRow } from "../packages/vrl-render-svg/src/panel-scene.js";
import { serializeTopoScene } from "../packages/vrl-render-svg/src/svg-serializer.js";

const SOURCE = 'route "Survey & <canyon>"\nstart\nrappel height=30m rope=60m flow=high inclination=80% stages=10m+20m redirection=5m:left station=right\nclimb height=5m exposure=medium inclination=60%\nhazard severity=critical note="flow: high / 80%"\nexit';

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
 * Wrap a serializer fragment in an SVG root and parse it with the independent XML parser.
 * @responsibility coordinator
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {unknown} The result returned by documentFor.
 */
function fragment(markup) {
  return documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`);
}

/**
 * Select parsed SVG elements containing the requested class token.
 * @responsibility computation
 * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
 * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @returns {Array} The result returned by [...document.getElementsByTagName("*")].filter.
 */
function byClass(document, name) {
  return [...document.getElementsByTagName("*")].filter(/**
   * Evaluate the selection condition element.getAttribute("class")?.split(" ").includes(name).
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (element) => element.getAttribute("class")?.split(" ").includes(name));
}

/**
 * Project each prepared typed badge's owning element type, category and original value for semantic
 * comparisons.
 * @responsibility computation
 * @param {Object} scene - Complete renderer-owned scene with positioned primitives, IDs and fitted viewBox.
 * @returns {Array} The result returned by scene.nodes.flatMap.
 */
function badges(scene) {
  return scene.nodes.flatMap(/**
   * Apply drawing.detailRecords.flat().filter((part) => part.kind === "badge").map to the supplied arguments;
   * retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.node - Current positioned node, or syntax node when inspecting source code.
   * @param {unknown} input1.drawing - Prepared node primitives and their text/anchor placements.
   * @returns {Array} The result returned by drawing.detailRecords.flat().filter((part) => part.kind === "badge").map.
   */ ({ node, drawing }) => drawing.detailRecords.flat().filter(/**
   * Evaluate the selection condition part.kind === "badge".
   * @responsibility computation
   * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (part) => part.kind === "badge")
    .map(/**
     * Project the current entry into an ordered tuple for drawing.detailRecords.flat().filter((part) =>
     * part.kind
     * === "badge").map.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {string} input1.category - Badge or rule category controlling vocabulary and presentation.
     * @param {unknown} input1.value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
     * @returns {Array} The ordered records or values assembled above.
     */ ({ category, value }) => [node.element.type, category, value]));
}

test("the documented scene example preserves canonical badge values in Spanish", /**
 * Verify the documented scene example preserves canonical badge values in Spanish; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const documentation = readFileSync(new URL("../docs/rendering-scene.md", import.meta.url), "utf8");
  const source = documentation.match(/const source = `([^`]+)`;/)[1];
  const result = compileRoute(source);
  const scene = computeTopoScene(result.model, result.layout, { language: "es", legend: false });
  assert.deepEqual(scene.nodes.flatMap(/**
   * Apply drawing.detailRecords.flat to the supplied arguments; retain the callee's return and failure
   * behavior.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.drawing - Prepared node primitives and their text/anchor placements.
   * @returns {Array} The result returned by drawing.detailRecords.flat.
   */ ({ drawing }) => drawing.detailRecords.flat()).filter(/**
   * Evaluate the selection condition record.kind === "badge".
   * @responsibility computation
   * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (record) => record.kind === "badge").map(/**
    * Project category, value, label into the record required by scene.nodes.flatMap(({ drawing }) =>
    * drawing.detailRecords.flat()).filter((record) => record.kind === "badge").map.
    * @responsibility computation
    * @param {Object} input1 - Input record destructured into the separately documented members below.
    * @param {string} input1.category - Badge or rule category controlling vocabulary and presentation.
    * @param {unknown} input1.value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
    * @param {string} input1.label - Unescaped display label supplied by the caller.
    * @returns {Object} A record containing category, value, label.
    */ ({ category, value, label }) => ({ category, value, label })), [
    { category: "flow", value: "high", label: "alto" }, { category: "inclination", value: 80, label: "80%" }
  ]);
});

for (const language of ["en", "es"]) {
  for (const shape of ["ladder", "direct", "slab"]) {
    test(`${language} ${shape}: scene badge categories and values come from normalized fields`, /**
     * Verify ${language} ${shape}: scene badge categories and values come from normalized fields; arrange the
     * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = compileRoute(SOURCE.replace("flow=high", `shape=${shape} flow=high`));
      const scene = computeTopoScene(result.model, result.layout, { language });
      assert.deepEqual(badges(scene), [["rappel", "flow", "high"], ["rappel", "inclination", 80], ["climb", "exposure", "medium"], ["climb", "inclination", 60], ["hazard", "hazardSeverity", "critical"]]);
    });

    test(`${language} ${shape}: complete SVG retains only the declared badges and stage facts`, /**
     * Verify ${language} ${shape}: complete SVG retains only the declared badges and stage facts; arrange the
     * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = compileRoute(SOURCE.replace("flow=high", `shape=${shape} flow=high`));
      const document = documentFor(renderTopoSvg(result.model, result.layout, { language, legend: false }));
      assert.deepEqual({
        labels: byClass(document, "vrl-detail-badge").map(/**
         * Apply item.textContent.trim to the supplied arguments; retain the callee's return and failure behavior.
         * @responsibility computation
         * @param {unknown} item - Current prepared record or test case.
         * @returns {string} The result returned by item.textContent.trim.
         */ (item) => item.textContent.trim()),
        stages: byClass(document, "vrl-rappel-stage-label").map(/**
         * Project item.textContent from the current record.
         * @responsibility computation
         * @param {unknown} item - Current prepared record or test case.
         * @returns {unknown} The item.textContent value selected or validated above.
         */ (item) => item.textContent),
        owners: byClass(document, "vrl-node-rappel").map(/**
         * Apply item.getAttribute to the supplied arguments; retain the callee's return and failure behavior.
         * @responsibility computation
         * @param {unknown} item - Current prepared record or test case.
         * @returns {unknown} The result returned by item.getAttribute.
         */ (item) => item.getAttribute("aria-label"))
      }, { labels: language === "en" ? ["high", "80%", "medium", "60%", "critical"] : ["alto", "80%", "medio", "60%", "critico"], stages: ["10m", "20m"], owners: [language === "en" ? "Rappel R1" : "Rapel R1"] });
    });
  }

  for (const value of ["high", "alto", "flow: high", "flujo: alto", "severity: critical", "exposure: low", "80%", "flow: high / 80%", "<tag> & high"]) {
    test(`${language}: note ${JSON.stringify(value)} remains literal text without badges`, /**
     * Verify ${language}: note ${JSON.stringify(value)} remains literal text without badges; arrange the scenario
     * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = compileRoute(`route "Notes"\nnote "${value}"`);
      const document = documentFor(renderTopoSvg(result.model, result.layout, { language, legend: false }));
      assert.deepEqual([byClass(document, "vrl-detail-badge").length, byClass(document, "vrl-detail-line").map(/**
       * Project item.textContent from the current record.
       * @responsibility computation
       * @param {unknown} item - Current prepared record or test case.
       * @returns {unknown} The item.textContent value selected or validated above.
       */ (item) => item.textContent)], [0, [value]]);
    });
  }
}

test("localizing a scene preserves segment ownership and geometry", /**
 * Verify localizing a scene preserves segment ownership and geometry; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(SOURCE);
  /**
   * Apply computeTopoScene(result.model, result.layout, { language }).segments.map to the supplied arguments;
   * retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
   * @returns {Array} The result returned by computeTopoScene(result.model, result.layout, { language }).segments.map.
   */
  const geometry = (language) => computeTopoScene(result.model, result.layout, { language }).segments.map(/**
   * Project kind, ownerId, shape, geometry, paths, rungs into the record required by
   * computeTopoScene(result.model, result.layout, { language }).segments.map.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
   * @param {unknown} input1.ownerId - Identity of the canonical technical or pool owner.
   * @param {unknown} input1.shape - Technical drawing shape: ladder, direct or curve.
   * @param {Object} input1.geometry - Prepared technical coordinates in SVG drawing units.
   * @param {Array} input1.paths - Prepared SVG path strings or collected diagnostic paths.
   * @param {Array} input1.rungs - Prepared rung stroke coordinates.
   * @returns {Object} A record containing kind, ownerId, shape, geometry, paths, rungs.
   */ ({ kind, ownerId, shape, geometry, paths, rungs }) => ({ kind, ownerId, shape, geometry, paths, rungs }));
  assert.deepEqual(geometry("es"), geometry("en"));
});

test("serialization consumes its snapshot without reading model or layout references", /**
 * Verify serialization consumes its snapshot without reading model or layout references; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(SOURCE);
  const scene = computeTopoScene(result.model, result.layout);
  const expected = serializeTopoScene(scene, resolveTheme());
  result.model.name = "Changed";
  result.layout.nodes.forEach(/**
   * Deliberately modify node.x, node.element.attributes, node.element.label in the caller-owned fixture so the
   * enclosing test can observe the specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (node) => { node.x = NaN; node.element.attributes = null; node.element.label = "Changed"; });
  assert.equal(serializeTopoScene(scene, resolveTheme()), expected);
});

test("scene serialization matches the public full renderer", /**
 * Verify scene serialization matches the public full renderer; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(SOURCE);
  const options = { language: "es", theme: "dark", symbology: "french" };
  assert.equal(serializeTopoScene(computeTopoScene(result.model, result.layout, options), resolveTheme("dark")), renderTopoSvg(result.model, result.layout, options));
});

test("inclined rung coordinates are perpendicular to the technical line", /**
 * Verify inclined rung coordinates are perpendicular to the technical line; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(rungPlacements({ dropX: 20, startY: 0, bottomX: 60, bottomY: 40 }), [{ x1: 28, y1: 18, x2: 38, y2: 8 }, { x1: 42, y1: 32, x2: 52, y2: 22 }]);
});

test("stage placement uses lengths and emits no terminal boundary", /**
 * Verify stage placement uses lengths and emits no terminal boundary; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const placements = stagePlacements({ dropX: 20, startY: 100, bottomX: 20, bottomY: 200 }, { attributes: { stages: [{ meters: 40 }, { meters: 60 }] } });
  assert.deepEqual(placements, [
    { x: 4, y: 118, text: "40m", fontSize: 9, anchor: "end", boundaryRatio: 0.4, boundary: { x1: 12, y1: 140, x2: 28, y2: 140 } },
    { x: 4, y: 168, text: "60m", fontSize: 9, anchor: "end", boundaryRatio: null, boundary: null }
  ]);
});

test("redirection placement localizes labels without altering its diamond", /**
 * Verify redirection placement localizes labels without altering its diamond; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const element = { attributes: { height: { meters: 100 }, redirections: [{ distance: { meters: 25 }, side: "left" }] } };
  const placements = redirectionPlacements({ dropX: 20, startY: 100, bottomX: 20, bottomY: 200 }, element, "es");
  assert.deepEqual(placements, [{ point: { x: 20, y: 125 }, x: 32, y: 128, text: "25m izq", fontSize: 8, anchor: "start", label: "Anclaje de desvio 25m izq", path: "M 20 119 L 26 125 L 20 131 L 14 125 Z" }]);
});

test("detail placement shares explicit text and badge positions with canvas fitting", /**
 * Verify detail placement shares explicit text and badge positions with canvas fitting; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const records = detailRecordsForElement({ type: "rappel", attributes: { rope: { meters: 60 }, flow: "high" } });
  const rows = placeDetailRows(detailRecordRows(records, Infinity), 10, 20);
  assert.deepEqual(rows.map(/**
   * Apply row.map to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} row - One prepared detail or legend row.
   * @returns {Array} The result returned by row.map.
   */ (row) => row.map(/**
    * Project kind, text, label, x, y, textX, textY, width into the record required by row.map.
    * @responsibility computation
    * @param {Object} input1 - Input record destructured into the separately documented members below.
    * @param {unknown} input1.kind - Discriminator selecting the supported record or diagnostic category.
    * @param {unknown} input1.text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
    * @param {string} input1.label - Unescaped display label supplied by the caller.
    * @param {number} input1.x - Horizontal position in SVG drawing units.
    * @param {number} input1.y - Vertical position in SVG drawing units.
    * @param {unknown} input1.textX - Text horizontal coordinate in drawing units.
    * @param {unknown} input1.textY - Text baseline coordinate in drawing units.
    * @param {number} input1.width - Available horizontal extent in drawing units.
    * @returns {Object} A record containing kind, text, label, x, y, textX, textY, width.
    */ ({ kind, text, label, x, y, textX, textY, width }) => ({ kind, text, label, x, y, textX, textY, width }))), [[
    { kind: "text", text: "60m", label: undefined, x: 10, y: 20, textX: undefined, textY: undefined, width: undefined },
    { kind: "text", text: " / ", label: undefined, x: 31, y: 20, textX: undefined, textY: undefined, width: undefined },
    { kind: "text", text: "flow: ", label: undefined, x: 52, y: 20, textX: undefined, textY: undefined, width: undefined },
    { kind: "badge", text: undefined, label: "high", x: 86, y: 8, textX: 103, textY: 17, width: 34 }
  ]]);
});

test("narrow detail rows wrap plain text while keeping badge category and value", /**
 * Verify narrow detail rows wrap plain text while keeping badge category and value; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const records = detailRecordsForElement({ type: "hazard", attributes: { severity: "high" }, extensions: { note: "Avoid the final pool" } });
  assert.deepEqual(detailRecordRows(records, 60), [
    [{ kind: "badge", category: "hazardSeverity", value: "high", className: "high", prefix: "severity: ", label: "high" }],
    [{ kind: "text", text: "Avoid the" }], [{ kind: "text", text: "final pool" }]
  ]);
});

test("plain slash-separated text remains a single semantic record", /**
 * Verify plain slash-separated text remains a single semantic record; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(detailRecordsForElement({ type: "note", attributes: {}, extensions: { text: "flow: high / 80%" } }), [{ kind: "text", text: "flow: high / 80%" }]);
});

test("symbol preparation returns localized text and geometry without XML", /**
 * Verify symbol preparation returns localized text and geometry without XML; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(symbolPlacement({ x: 20, y: 30 }, { type: "hazard", attributes: {}, extensions: { type: "snake" } }, "federation", "es"), {
    kind: "snake", code: "SN", label: "Peligro de serpientes", path: "M 11 38 C 18 20, 24 40, 30 22", textX: 20, textY: 50
  });
});

test("summary lines have explicit positions independently of markup", /**
 * Verify summary lines have explicit positions independently of markup; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const info = prepareInfoBox({ name: "Survey", metadata: {} }, { width: 500 }, "en");
  assert.deepEqual(info.textLines.map(/**
   * Project the current entry into an ordered tuple for info.textLines.map.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {number} input1.x - Horizontal position in SVG drawing units.
   * @param {number} input1.y - Vertical position in SVG drawing units.
   * @param {unknown} input1.heading - Displayed heading or parsed table heading being compared.
   * @returns {Array} The ordered records or values assembled above.
   */ ({ x, y, heading }) => [x, y, heading]), [[256.5, 50, true], [256.5, 74, false], [256.5, 94, false], [256.5, 114, false], [256.5, 134, false]]);
});

test("legend symbol placement accounts for the preceding code and label", /**
 * Verify legend symbol placement accounts for the preceding code and label; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(prepareLegendRow({ kind: "symbols", entries: [["R", "Rappel"], ["C", "Climb"]] }, 10, 20, "en"), { kind: "symbols", entries: [{ code: "R", label: "Rappel", x: 10, y: 20, fontSize: 9 }, { code: "C", label: "Climb", x: 80, y: 20, fontSize: 9 }] });
});

test("public legend symbol helper preserves escaped labels and coordinates", /**
 * Verify public legend symbol helper preserves escaped labels and coordinates; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const document = fragment(renderLegendSymbolRow([["<R>", "Rappel & descent"]], 10, 20, resolveTheme()));
  assert.deepEqual([...document.getElementsByTagName("text")].map(/**
   * Project the current entry into an ordered tuple for [...document.getElementsByTagName("text")].map.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {Array} The ordered records or values assembled above.
   */ (item) => [item.getAttribute("x"), item.getAttribute("y"), item.textContent.trim()]), [["10", "20", "<R> = Rappel & descent"]]);
});

test("public summary helper accepts historical prepared panel records", /**
 * Verify public summary helper accepts historical prepared panel records; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(SOURCE);
  const prepared = computeTopoScene(result.model, result.layout).infoBox;
  const { textLines, label, ...legacy } = prepared;
  assert.equal(renderInfoBox(result.model, result.layout, resolveTheme(), "en", legacy), renderInfoBox(result.model, result.layout, resolveTheme(), "en", prepared));
});

test("public legend helper accepts historical prepared panel records", /**
 * Verify public legend helper accepts historical prepared panel records; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute(SOURCE);
  const prepared = computeTopoScene(result.model, result.layout).legend;
  const { drawingRows, titleX, titleY, ...legacy } = prepared;
  assert.equal(renderLegend(result.layout, resolveTheme(), "en", "federation", legacy), renderLegend(result.layout, resolveTheme(), "en", "federation", prepared));
});

for (const [name, options] of [["formatted text", { title: "Custom", detail: "flow: high" }], ["prepared rows", { detail: "flow: high", detailRows: [["flow: high"]] }], ["rows without a detail override", { detailRows: [["flow: high"]] }]]) {
  test(`renderNode preserves explicit legacy ${name} overrides`, /**
   * Verify renderNode preserves explicit legacy ${name} overrides; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const node = compileRoute('route "Custom"\nnote "plain"').layout.nodes[0];
    const document = fragment(renderNode(node, resolveTheme(), "federation", undefined, "en", options));
    assert.deepEqual(byClass(document, "vrl-detail-badge-flow").map(/**
     * Apply item.textContent.trim to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {string} The result returned by item.textContent.trim.
     */ (item) => item.textContent.trim()), ["high"]);
  });
}

test("renderNode accepts an explicit empty legacy detail override", /**
 * Verify renderNode accepts an explicit empty legacy detail override; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const node = compileRoute('route "Custom"\nnote "plain"').layout.nodes[0];
  assert.equal(byClass(fragment(renderNode(node, resolveTheme(), "federation", undefined, "en", { detail: "" })), "vrl-detail-line").length, 0);
});

test("renderNode treats a null detail override as omitted", /**
 * Verify renderNode treats a null detail override as omitted; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const node = compileRoute('route "Custom"\nnote "flow: high"').layout.nodes[0];
  assert.equal(renderNode(node, resolveTheme(), "federation", undefined, "en", { detail: null }), renderNode(node, resolveTheme()));
});

test("public node collection helper retains canonical badge semantics", /**
 * Verify public node collection helper retains canonical badge semantics; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Notes"\nnote "flow: high"');
  assert.deepEqual(byClass(fragment(renderNodes(result.layout, resolveTheme())), "vrl-detail-line").map(/**
   * Project item.textContent from the current record.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The item.textContent value selected or validated above.
   */ (item) => item.textContent), ["flow: high"]);
});

for (const [name, mutate, message] of [
  ["null node", /**
   * Deliberately modify layout.nodes[0] in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (layout) => { layout.nodes[0] = null; }, /Layout point/],
  ["array node", /**
   * Deliberately modify layout.nodes[0] in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (layout) => { layout.nodes[0] = []; }, /Layout point/],
  ["absent element", /**
   * Deliberately modify layout.nodes[0].element in the caller-owned fixture so the enclosing test can observe
   * the specified mutation or failure boundary.
   * @responsibility computation
   * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (layout) => { delete layout.nodes[0].element; }, /Layout element/],
  ["null attributes", /**
   * Deliberately modify layout.nodes[0].element.attributes in the caller-owned fixture so the enclosing test
   * can observe the specified mutation or failure boundary.
   * @responsibility computation
   * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (layout) => { layout.nodes[0].element.attributes = null; }, /Layout element attributes/],
  ["null terrain point", /**
   * Deliberately modify layout.points[0] in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (layout) => { layout.points[0] = null; }, /Layout point/],
  ["null segment", /**
   * Deliberately modify layout.segments[0] in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (layout) => { layout.segments[0] = null; }, /Layout segment/],
  ["absent segment endpoint", /**
   * Deliberately modify layout.segments[0].end in the caller-owned fixture so the enclosing test can observe
   * the specified mutation or failure boundary.
   * @responsibility computation
   * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (layout) => { delete layout.segments[0].end; }, /Layout point/],
  ["absent segment owner", /**
   * Deliberately modify layout.segments[0].element in the caller-owned fixture so the enclosing test can
   * observe the specified mutation or failure boundary.
   * @responsibility computation
   * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (layout) => { delete layout.segments[0].element; }, /Layout element/]
]) {
  for (const prepare of [computeTopoScene, renderTopoSvg]) {
    test(`${prepare.name} rejects ${name} at the layout boundary`, /**
     * Verify ${prepare.name} rejects ${name} at the layout boundary; arrange the scenario and make its single
     * direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const result = compileRoute(SOURCE);
      mutate(result.layout);
      assert.throws(/**
       * Exercise prepare so the enclosing assertion can observe its return value or thrown error.
       * @responsibility coordinator
       * @returns {unknown} The result returned by prepare.
       */ () => prepare(result.model, result.layout), { name: "TypeError", message });
    });
  }
}

test("invalid XML text cannot disappear through canonical detail wrapping", /**
 * Verify invalid XML text cannot disappear through canonical detail wrapping; arrange the scenario and make
 * its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = compileRoute('route "Invalid"\nnote "before after"', { layout: { width: 20 } });
  result.model.elements[0].extensions.text = "before\u000bafter";
  assert.throws(/**
   * Exercise renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by renderTopoSvg.
   */ () => renderTopoSvg(result.model, result.layout), TypeError);
});

for (const coordinate of [NaN, Infinity, -Infinity]) {
  test(`direct fragment rendering rejects nonfinite path coordinate ${coordinate}`, /**
   * Verify direct fragment rendering rejects nonfinite path coordinate ${coordinate}; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const element = { type: "rappel", attributes: {} };
    assert.throws(/**
     * Exercise renderDirectTechnicalSegment so the enclosing assertion can observe its return value or thrown
     * error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by renderDirectTechnicalSegment.
     */ () => renderDirectTechnicalSegment({ x: 10, y: coordinate, element }, { x: 50, y: 100 }, resolveTheme()), RangeError);
  });

  test(`water fragment rendering rejects nonfinite path coordinate ${coordinate}`, /**
   * Verify water fragment rendering rejects nonfinite path coordinate ${coordinate}; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise renderWaterSegments so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by renderWaterSegments.
     */ () => renderWaterSegments({ nodes: [{ x: 10, y: coordinate, element: { type: "pool" } }] }, resolveTheme()), RangeError);
  });
}
