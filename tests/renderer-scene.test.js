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

function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
}

function fragment(markup) {
  return documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`);
}

function byClass(document, name) {
  return [...document.getElementsByTagName("*")].filter((element) => element.getAttribute("class")?.split(" ").includes(name));
}

function badges(scene) {
  return scene.nodes.flatMap(({ node, drawing }) => drawing.detailRecords.flat().filter((part) => part.kind === "badge")
    .map(({ category, value }) => [node.element.type, category, value]));
}

test("the documented scene example preserves canonical badge values in Spanish", () => {
  const documentation = readFileSync(new URL("../docs/rendering-scene.md", import.meta.url), "utf8");
  const source = documentation.match(/const source = `([^`]+)`;/)[1];
  const result = compileRoute(source);
  const scene = computeTopoScene(result.model, result.layout, { language: "es", legend: false });
  assert.deepEqual(scene.nodes.flatMap(({ drawing }) => drawing.detailRecords.flat()).filter((record) => record.kind === "badge").map(({ category, value, label }) => ({ category, value, label })), [
    { category: "flow", value: "high", label: "alto" }, { category: "inclination", value: 80, label: "80%" }
  ]);
});

for (const language of ["en", "es"]) {
  for (const shape of ["ladder", "direct", "slab"]) {
    test(`${language} ${shape}: scene badge categories and values come from normalized fields`, () => {
      const result = compileRoute(SOURCE.replace("flow=high", `shape=${shape} flow=high`));
      const scene = computeTopoScene(result.model, result.layout, { language });
      assert.deepEqual(badges(scene), [["rappel", "flow", "high"], ["rappel", "inclination", 80], ["climb", "exposure", "medium"], ["climb", "inclination", 60], ["hazard", "hazardSeverity", "critical"]]);
    });

    test(`${language} ${shape}: complete SVG retains only the declared badges and stage facts`, () => {
      const result = compileRoute(SOURCE.replace("flow=high", `shape=${shape} flow=high`));
      const document = documentFor(renderTopoSvg(result.model, result.layout, { language, legend: false }));
      assert.deepEqual({
        labels: byClass(document, "vrl-detail-badge").map((item) => item.textContent.trim()),
        stages: byClass(document, "vrl-rappel-stage-label").map((item) => item.textContent),
        owners: byClass(document, "vrl-node-rappel").map((item) => item.getAttribute("aria-label"))
      }, { labels: language === "en" ? ["high", "80%", "medium", "60%", "critical"] : ["alto", "80%", "medio", "60%", "critico"], stages: ["10m", "20m"], owners: [language === "en" ? "Rappel R1" : "Rapel R1"] });
    });
  }

  for (const value of ["high", "alto", "flow: high", "flujo: alto", "severity: critical", "exposure: low", "80%", "flow: high / 80%", "<tag> & high"]) {
    test(`${language}: note ${JSON.stringify(value)} remains literal text without badges`, () => {
      const result = compileRoute(`route "Notes"\nnote "${value}"`);
      const document = documentFor(renderTopoSvg(result.model, result.layout, { language, legend: false }));
      assert.deepEqual([byClass(document, "vrl-detail-badge").length, byClass(document, "vrl-detail-line").map((item) => item.textContent)], [0, [value]]);
    });
  }
}

test("localizing a scene preserves segment ownership and geometry", () => {
  const result = compileRoute(SOURCE);
  const geometry = (language) => computeTopoScene(result.model, result.layout, { language }).segments.map(({ kind, ownerId, shape, geometry, paths, rungs }) => ({ kind, ownerId, shape, geometry, paths, rungs }));
  assert.deepEqual(geometry("es"), geometry("en"));
});

test("serialization consumes its snapshot without reading model or layout references", () => {
  const result = compileRoute(SOURCE);
  const scene = computeTopoScene(result.model, result.layout);
  const expected = serializeTopoScene(scene, resolveTheme());
  result.model.name = "Changed";
  result.layout.nodes.forEach((node) => { node.x = NaN; node.element.attributes = null; node.element.label = "Changed"; });
  assert.equal(serializeTopoScene(scene, resolveTheme()), expected);
});

test("scene serialization matches the public full renderer", () => {
  const result = compileRoute(SOURCE);
  const options = { language: "es", theme: "dark", symbology: "french" };
  assert.equal(serializeTopoScene(computeTopoScene(result.model, result.layout, options), resolveTheme("dark")), renderTopoSvg(result.model, result.layout, options));
});

test("inclined rung coordinates are perpendicular to the technical line", () => {
  assert.deepEqual(rungPlacements({ dropX: 20, startY: 0, bottomX: 60, bottomY: 40 }), [{ x1: 28, y1: 18, x2: 38, y2: 8 }, { x1: 42, y1: 32, x2: 52, y2: 22 }]);
});

test("stage placement uses lengths and emits no terminal boundary", () => {
  const placements = stagePlacements({ dropX: 20, startY: 100, bottomX: 20, bottomY: 200 }, { attributes: { stages: [{ meters: 40 }, { meters: 60 }] } });
  assert.deepEqual(placements, [
    { x: 4, y: 118, text: "40m", fontSize: 9, anchor: "end", boundaryRatio: 0.4, boundary: { x1: 12, y1: 140, x2: 28, y2: 140 } },
    { x: 4, y: 168, text: "60m", fontSize: 9, anchor: "end", boundaryRatio: null, boundary: null }
  ]);
});

test("redirection placement localizes labels without altering its diamond", () => {
  const element = { attributes: { height: { meters: 100 }, redirections: [{ distance: { meters: 25 }, side: "left" }] } };
  const placements = redirectionPlacements({ dropX: 20, startY: 100, bottomX: 20, bottomY: 200 }, element, "es");
  assert.deepEqual(placements, [{ point: { x: 20, y: 125 }, x: 32, y: 128, text: "25m izq", fontSize: 8, anchor: "start", label: "Anclaje de desvio 25m izq", path: "M 20 119 L 26 125 L 20 131 L 14 125 Z" }]);
});

test("detail placement shares explicit text and badge positions with canvas fitting", () => {
  const records = detailRecordsForElement({ type: "rappel", attributes: { rope: { meters: 60 }, flow: "high" } });
  const rows = placeDetailRows(detailRecordRows(records, Infinity), 10, 20);
  assert.deepEqual(rows.map((row) => row.map(({ kind, text, label, x, y, textX, textY, width }) => ({ kind, text, label, x, y, textX, textY, width }))), [[
    { kind: "text", text: "60m", label: undefined, x: 10, y: 20, textX: undefined, textY: undefined, width: undefined },
    { kind: "text", text: " / ", label: undefined, x: 31, y: 20, textX: undefined, textY: undefined, width: undefined },
    { kind: "text", text: "flow: ", label: undefined, x: 52, y: 20, textX: undefined, textY: undefined, width: undefined },
    { kind: "badge", text: undefined, label: "high", x: 86, y: 8, textX: 103, textY: 17, width: 34 }
  ]]);
});

test("narrow detail rows wrap plain text while keeping badge category and value", () => {
  const records = detailRecordsForElement({ type: "hazard", attributes: { severity: "high" }, extensions: { note: "Avoid the final pool" } });
  assert.deepEqual(detailRecordRows(records, 60), [
    [{ kind: "badge", category: "hazardSeverity", value: "high", className: "high", prefix: "severity: ", label: "high" }],
    [{ kind: "text", text: "Avoid the" }], [{ kind: "text", text: "final pool" }]
  ]);
});

test("plain slash-separated text remains a single semantic record", () => {
  assert.deepEqual(detailRecordsForElement({ type: "note", attributes: {}, extensions: { text: "flow: high / 80%" } }), [{ kind: "text", text: "flow: high / 80%" }]);
});

test("symbol preparation returns localized text and geometry without XML", () => {
  assert.deepEqual(symbolPlacement({ x: 20, y: 30 }, { type: "hazard", attributes: {}, extensions: { type: "snake" } }, "federation", "es"), {
    kind: "snake", code: "SN", label: "Peligro de serpientes", path: "M 11 38 C 18 20, 24 40, 30 22", textX: 20, textY: 50
  });
});

test("summary lines have explicit positions independently of markup", () => {
  const info = prepareInfoBox({ name: "Survey", metadata: {} }, { width: 500 }, "en");
  assert.deepEqual(info.textLines.map(({ x, y, heading }) => [x, y, heading]), [[256.5, 50, true], [256.5, 74, false], [256.5, 94, false], [256.5, 114, false], [256.5, 134, false]]);
});

test("legend symbol placement accounts for the preceding code and label", () => {
  assert.deepEqual(prepareLegendRow({ kind: "symbols", entries: [["R", "Rappel"], ["C", "Climb"]] }, 10, 20, "en"), { kind: "symbols", entries: [{ code: "R", label: "Rappel", x: 10, y: 20, fontSize: 9 }, { code: "C", label: "Climb", x: 80, y: 20, fontSize: 9 }] });
});

test("public legend symbol helper preserves escaped labels and coordinates", () => {
  const document = fragment(renderLegendSymbolRow([["<R>", "Rappel & descent"]], 10, 20, resolveTheme()));
  assert.deepEqual([...document.getElementsByTagName("text")].map((item) => [item.getAttribute("x"), item.getAttribute("y"), item.textContent.trim()]), [["10", "20", "<R> = Rappel & descent"]]);
});

test("public summary helper accepts historical prepared panel records", () => {
  const result = compileRoute(SOURCE);
  const prepared = computeTopoScene(result.model, result.layout).infoBox;
  const { textLines, label, ...legacy } = prepared;
  assert.equal(renderInfoBox(result.model, result.layout, resolveTheme(), "en", legacy), renderInfoBox(result.model, result.layout, resolveTheme(), "en", prepared));
});

test("public legend helper accepts historical prepared panel records", () => {
  const result = compileRoute(SOURCE);
  const prepared = computeTopoScene(result.model, result.layout).legend;
  const { drawingRows, titleX, titleY, ...legacy } = prepared;
  assert.equal(renderLegend(result.layout, resolveTheme(), "en", "federation", legacy), renderLegend(result.layout, resolveTheme(), "en", "federation", prepared));
});

for (const [name, options] of [["formatted text", { title: "Custom", detail: "flow: high" }], ["prepared rows", { detail: "flow: high", detailRows: [["flow: high"]] }], ["rows without a detail override", { detailRows: [["flow: high"]] }]]) {
  test(`renderNode preserves explicit legacy ${name} overrides`, () => {
    const node = compileRoute('route "Custom"\nnote "plain"').layout.nodes[0];
    const document = fragment(renderNode(node, resolveTheme(), "federation", undefined, "en", options));
    assert.deepEqual(byClass(document, "vrl-detail-badge-flow").map((item) => item.textContent.trim()), ["high"]);
  });
}

test("renderNode accepts an explicit empty legacy detail override", () => {
  const node = compileRoute('route "Custom"\nnote "plain"').layout.nodes[0];
  assert.equal(byClass(fragment(renderNode(node, resolveTheme(), "federation", undefined, "en", { detail: "" })), "vrl-detail-line").length, 0);
});

test("renderNode treats a null detail override as omitted", () => {
  const node = compileRoute('route "Custom"\nnote "flow: high"').layout.nodes[0];
  assert.equal(renderNode(node, resolveTheme(), "federation", undefined, "en", { detail: null }), renderNode(node, resolveTheme()));
});

test("public node collection helper retains canonical badge semantics", () => {
  const result = compileRoute('route "Notes"\nnote "flow: high"');
  assert.deepEqual(byClass(fragment(renderNodes(result.layout, resolveTheme())), "vrl-detail-line").map((item) => item.textContent), ["flow: high"]);
});

for (const [name, mutate, message] of [
  ["null node", (layout) => { layout.nodes[0] = null; }, /Layout point/],
  ["array node", (layout) => { layout.nodes[0] = []; }, /Layout point/],
  ["absent element", (layout) => { delete layout.nodes[0].element; }, /Layout element/],
  ["null attributes", (layout) => { layout.nodes[0].element.attributes = null; }, /Layout element attributes/],
  ["null terrain point", (layout) => { layout.points[0] = null; }, /Layout point/],
  ["null segment", (layout) => { layout.segments[0] = null; }, /Layout segment/],
  ["absent segment endpoint", (layout) => { delete layout.segments[0].end; }, /Layout point/],
  ["absent segment owner", (layout) => { delete layout.segments[0].element; }, /Layout element/]
]) {
  for (const prepare of [computeTopoScene, renderTopoSvg]) {
    test(`${prepare.name} rejects ${name} at the layout boundary`, () => {
      const result = compileRoute(SOURCE);
      mutate(result.layout);
      assert.throws(() => prepare(result.model, result.layout), { name: "TypeError", message });
    });
  }
}

test("invalid XML text cannot disappear through canonical detail wrapping", () => {
  const result = compileRoute('route "Invalid"\nnote "before after"', { layout: { width: 20 } });
  result.model.elements[0].extensions.text = "before\u000bafter";
  assert.throws(() => renderTopoSvg(result.model, result.layout), TypeError);
});

for (const coordinate of [NaN, Infinity, -Infinity]) {
  test(`direct fragment rendering rejects nonfinite path coordinate ${coordinate}`, () => {
    const element = { type: "rappel", attributes: {} };
    assert.throws(() => renderDirectTechnicalSegment({ x: 10, y: coordinate, element }, { x: 50, y: 100 }, resolveTheme()), RangeError);
  });

  test(`water fragment rendering rejects nonfinite path coordinate ${coordinate}`, () => {
    assert.throws(() => renderWaterSegments({ nodes: [{ x: 10, y: coordinate, element: { type: "pool" } }] }, resolveTheme()), RangeError);
  });
}
