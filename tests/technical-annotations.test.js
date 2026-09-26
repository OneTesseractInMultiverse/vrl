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

function source(shape, details = DETAILS) {
  return `route "Technical survey"\nrappel shape=${shape} ${details}`;
}

function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
}

function byClass(document, className) {
  return [...document.getElementsByTagName("*")].filter((element) => element.getAttribute("class") === className);
}

function texts(document, className) {
  return byClass(document, className).map((element) => element.textContent.trim());
}

function render(sourceText, options = {}) {
  const result = compileRoute(sourceText, options);
  return documentFor(renderTopoSvg(result.model, result.layout, options));
}

function pathNumbers(path) {
  return path.getAttribute("d").match(/[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi).map(Number);
}

function textPosition(element) {
  return [Number(element.getAttribute("x")), Number(element.getAttribute("y"))];
}

function annotationSnapshot(document) {
  return [...byClass(document, "vrl-rappel-stage-label"), ...byClass(document, "vrl-rappel-stage-boundary"), ...byClass(document, "vrl-redirection-anchor")]
    .map((element) => element.toString());
}

for (const shape of SHAPES) {
  test(`${shape}: both declared stage lengths survive as SVG text`, () => {
    assert.deepEqual(texts(render(source(shape)), "vrl-rappel-stage-label"), ["10m", "20m"]);
  });

  test(`${shape}: declared redirection distance and side survive visually and in its accessible name`, () => {
    const anchors = byClass(render(source(shape)), "vrl-redirection-anchor");
    assert.deepEqual(anchors.map((element) => [element.getElementsByTagName("text")[0].textContent, element.getAttribute("aria-label")]), [["5m L", "Redirection anchor 5m L"]]);
  });

  test(`${shape}: Spanish redirection labels reach the shared renderer`, () => {
    const anchors = byClass(render(source(shape), { language: "es" }), "vrl-redirection-anchor");
    assert.deepEqual(anchors.map((element) => [element.getElementsByTagName("text")[0].textContent, element.getAttribute("aria-label")]), [["5m izq", "Anclaje de desvio 5m izq"]]);
  });

  for (const [language, expected] of [
    ["en", "Vertical Route Language schematic for Technical survey. R1, 30m: Rope stages: 10m + 20m; Redirection anchor 5m L."],
    ["es", "Esquema VRL para Technical survey. R1, 30m: Tramos de cuerda: 10m + 20m; Anclaje de desvio 5m izq."]
  ]) {
    test(`${shape}: ${language} top-level description exposes annotation values and their owner`, () => {
      assert.equal(render(source(shape), { language }).getElementsByTagName("desc")[0].textContent, expected);
    });
  }

  test(`${shape}: plural redirections retain declaration order and distances`, () => {
    assert.deepEqual(texts(render(source(shape, "height=30m rope=60m redirections=5m:left,25m:right")), "vrl-redirection-anchor"), ["5m L", "25m R"]);
  });

  test(`${shape}: stage boundary follows the first third of the technical slope`, () => {
    const document = render(source(shape));
    const [x1, y1, x2, y2] = pathNumbers(byClass(document, "vrl-route-segment vrl-drop-slope")[0]);
    const boundary = byClass(document, "vrl-rappel-stage-boundary")[0];
    assert.deepEqual(["x1", "y1", "x2", "y2"].map((name) => Number(boundary.getAttribute(name))), [Math.round(x1 + (x2 - x1) / 3) - 8, Math.round(y1 + (y2 - y1) / 3), Math.round(x1 + (x2 - x1) / 3) + 8, Math.round(y1 + (y2 - y1) / 3)]);
  });

  test(`${shape}: annotation-free features do not acquire invented details`, () => {
    assert.deepEqual(annotationSnapshot(render(source(shape, "height=30m rope=60m"))), []);
  });

  test(`${shape}: only ladder geometry draws rungs`, () => {
    assert.equal(byClass(render(source(shape)), "vrl-drop-rung").length > 0, shape === "ladder");
  });

  test(`${shape}: a stage-sum warning retains the declared lengths`, () => {
    const result = compileRoute(source(shape, "height=30m rope=60m stages=10m+25m"));
    const document = documentFor(renderTopoSvg(result.model, result.layout));
    assert.deepEqual([result.ok, result.diagnostics.map((item) => [item.severity, item.message]), texts(document, "vrl-rappel-stage-label")], [true, [["warning", 'Field "stages" total does not match rappel height.']], ["10m", "25m"]]);
  });

  for (const [type, fields] of [["rappel", "rope=60m"], ["downclimb", ""], ["climb", ""]]) {
    test(`${shape} ${type}: all technical types retain their own annotations`, () => {
      const document = render(`route "Types"\n${type} height=30m ${fields} stages=10m+20m redirection=5m:left shape=${shape}`);
      assert.deepEqual([texts(document, "vrl-rappel-stage-label"), texts(document, "vrl-redirection-anchor")], [["10m", "20m"], ["5m L"]]);
    });
  }

  test(`${shape}: adjacent descents and climbs do not exchange or duplicate annotations`, () => {
    const document = render(`${source(shape)}\nnote "Shared boundary"\nclimb height=5m stages=2m+3m redirection=1m:right shape=${shape}`);
    const groups = byClass(document, shape === "ladder" ? "vrl-drop-ladder" : "vrl-drop-direct");
    assert.deepEqual(groups.map((group) => [texts(group, "vrl-rappel-stage-label"), texts(group, "vrl-redirection-anchor")]), [[["10m", "20m"], ["5m L"]], [["2m", "3m"], ["1m R"]]]);
  });

  test(`${shape}: near-endpoint valid redirections keep exact text and the existing five-percent display inset`, () => {
    const document = render(source(shape, "height=30m rope=60m redirections=0.000001m:left,29.999999m:right"));
    const [x1, y1, x2, y2] = pathNumbers(byClass(document, "vrl-route-segment vrl-drop-slope")[0]);
    const anchors = byClass(document, "vrl-redirection-anchor");
    assert.deepEqual(anchors.map((anchor) => [anchor.textContent.trim(), pathNumbers(anchor.getElementsByTagName("path")[0]).slice(0, 2)]), [["0.000001m L", [Math.round(x1 + (x2 - x1) * 0.05), Math.round(y1 + (y2 - y1) * 0.05) - 6]], ["29.999999m R", [Math.round(x1 + (x2 - x1) * 0.95), Math.round(y1 + (y2 - y1) * 0.95) - 6]]]);
  });

  test(`${shape}: tiny positive stage lengths retain exact values`, () => {
    assert.deepEqual(texts(render(source(shape, "height=30m rope=60m stages=0.000001m+29.999999m")), "vrl-rappel-stage-label"), ["0.000001m", "29.999999m"]);
  });

  test(`${shape}: visible stage labels fit the scene even at narrow canvas edges`, () => {
    const result = compileRoute(source(shape, "height=1000000000m rope=1000000000m stages=500000000m+500000000m redirection=1m:left"), { layout: { width: 1, spineX: 0, marginY: 0, marginBottom: 0 } });
    const scene = computeTopoScene(result.model, result.layout, { legend: false });
    const labels = byClass(documentFor(renderTopoSvg(result.model, result.layout, { legend: false })), "vrl-rappel-stage-label");
    const clipped = labels.filter((label) => {
      const [x, y] = textPosition(label);
      const width = label.textContent.length * Number(label.getAttribute("font-size")) * 1.1;
      return x - width < scene.contentBounds.minX || y - 9 < scene.contentBounds.minY || x > scene.contentBounds.maxX || y + 5 > scene.contentBounds.maxY;
    });
    assert.deepEqual([labels.length, clipped.length], [2, 0]);
  });

  for (const fields of ["stages=bad+20m", "stages=30m", "stages=0m+30m", "stages=-1m+31m", "redirection=far:left", "redirection=0m:left", "redirection=-1m:right", "redirection=30m:left", "redirection=31m:right", "redirection=5m:up"]) {
    test(`${shape}: malformed or out-of-range ${fields} blocks derived output`, () => {
      const result = compileRoute(source(shape, `height=30m rope=60m ${fields}`));
      assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics.some((item) => item.severity === "error" && item.location.line === 2)], [false, null, null, null, true]);
    });
  }
}

for (const shape of ["direct", "slab"]) {
  test(`${shape}: annotations match ladder output exactly in elevated and schematic layouts`, () => {
    const documents = ["", "metadata entrance_elevation=100m exit_elevation=76m\n"].map((metadata) => {
      const build = (style) => render(`route "Parity"\n${metadata}rappel shape=${style} ${DETAILS} inclination=80%`, { layout: { minNodeGap: 1000 } });
      return [annotationSnapshot(build(shape)), annotationSnapshot(build("ladder"))];
    });
    assert.deepEqual(documents.map(([actual]) => actual), documents.map(([, expected]) => expected));
  });
}

for (const [name, helper] of [["ladder", renderDropLadderSegment], ["direct", renderDirectTechnicalSegment]]) {
  test(`${name} helper: stage positions use the measured technical line rather than the longer connector`, () => {
    const element = compileRoute(source(name)).model.elements[0];
    const previous = { x: 10, y: 100, element };
    const next = { x: 110, y: 600 };
    const layout = { technicalDeltaY: 300 };
    const markup = name === "ladder" ? helper(previous, next, resolveTheme(), element, "en", layout) : helper(previous, next, resolveTheme(), element, layout);
    const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`);
    assert.deepEqual(byClass(document, "vrl-rappel-stage-label").map(textPosition), [[28, 148], [28, 298]]);
  });

  test(`${name} helper: default element and language preserve annotations`, () => {
    const element = compileRoute(source(name)).model.elements[0];
    const markup = helper({ x: 10, y: 100, element }, { x: 110, y: 400 }, resolveTheme());
    const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`);
    assert.deepEqual([texts(document, "vrl-rappel-stage-label"), texts(document, "vrl-redirection-anchor")], [["10m", "20m"], ["5m L"]]);
  });
}

test("direct helper accepts language after its existing layout argument", () => {
  const element = compileRoute(source("direct")).model.elements[0];
  const markup = renderDirectTechnicalSegment({ x: 10, y: 100 }, { x: 110, y: 400 }, resolveTheme(), element, null, "es");
  const document = documentFor(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`);
  assert.deepEqual(texts(document, "vrl-redirection-anchor"), ["5m izq"]);
});

test("unsupported line shapes are diagnosed rather than selected silently", () => {
  const result = compileRoute(source("unsupported"));
  assert.deepEqual([result.ok, result.model, result.layout, result.json, result.diagnostics[0].message], [false, null, null, null, 'Field "shape" has unsupported value "unsupported".']);
});

test("invalid annotations do not reach normalization or rendering inputs", () => {
  const calls = [];
  const compiler = createRouteCompiler(Object.fromEntries(["normalize", "validateGeometry", "layout", "exportJson"].map((name) => [name, () => { calls.push(name); throw new Error("Unexpected downstream call"); }])));
  compiler(source("direct", "height=30m rope=60m redirection=30m:left"));
  assert.deepEqual(calls, []);
});

for (const [name, create] of [["React", createVrlReactDiagramState], ["Svelte", createVrlSvelteDiagramState], ["SvelteKit", createVrlSvelteKitData]]) {
  test(`${name}: direct annotations survive the adapter pipeline`, () => {
    const state = create(source("direct"), { language: "es" });
    const document = documentFor(state.svg);
    assert.deepEqual([state.ok, texts(document, "vrl-rappel-stage-label"), texts(document, "vrl-redirection-anchor")], [true, ["10m", "20m"], ["5m izq"]]);
  });

  test(`${name}: invalid annotations return diagnostics and no diagram`, () => {
    const state = create(source("slab", "height=30m rope=60m stages=0m+30m"));
    assert.deepEqual([state.ok, state.svg, state.diagnostics[0].severity], [false, "", "error"]);
  });
}

test("rendering every shape is deterministic and preserves model and layout", () => {
  const results = SHAPES.map((shape) => compileRoute(source(shape)));
  const before = structuredClone(results);
  const first = results.map((result) => renderTopoSvg(result.model, result.layout));
  const second = results.map((result) => renderTopoSvg(result.model, result.layout));
  assert.deepEqual([results, first], [before, second]);
});


test("accessible annotation description preserves feature order across connections", () => {
  const document = render(`${source("direct")}\nwalk distance=1m\nclimb height=5m stages=2m+3m redirection=1m:right shape=slab`);
  assert.equal(document.getElementsByTagName("desc")[0].textContent, "Vertical Route Language schematic for Technical survey. R1, 30m: Rope stages: 10m + 20m; Redirection anchor 5m L. C1, 5m: Rope stages: 2m + 3m; Redirection anchor 1m R.");
});

test("accessible descriptions retain explicit identifiers as escaped text", () => {
  const document = render('route "Survey"\nrappel "R<&>" height=30m rope=60m stages=10m+20m shape=direct');
  assert.equal(document.getElementsByTagName("desc")[0].textContent, "Vertical Route Language schematic for Survey. R<&>, 30m: Rope stages: 10m + 20m.");
});

test("accessible descriptions omit an absent stage list while retaining redirections", () => {
  const document = render(source("slab", "height=30m rope=60m redirections=5m:left,25m:right"));
  assert.equal(document.getElementsByTagName("desc")[0].textContent, "Vertical Route Language schematic for Technical survey. R1, 30m: Redirection anchor 5m L; Redirection anchor 25m R.");
});
