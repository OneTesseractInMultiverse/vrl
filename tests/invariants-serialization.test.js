import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg } from "@subvertic/vrl-render-svg";
import { routeCases, parseSeed, caseName } from "./helpers/seeded-cases.js";
import { clippedPrimitives } from "./helpers/svg-bounds.js";
import { xmlDocument, byClass, clippedBounds, nonfinitePaths } from "./helpers/invariant-observations.js";

for (const item of routeCases(parseSeed(process.env.VRL_TEST_SEED))) {
  test(`strict XML preserves supplied title and notes: ${caseName(item)}`, () => {
    const result = compileRoute(item.source, item.options);
    let observed;
    try {
      const document = xmlDocument(renderTopoSvg(result.model, result.layout));
      observed = [document.documentElement.namespaceURI, document.getElementsByTagName("title")[0].textContent,
        byClass(document, "vrl-node-note").map(node => byClass(node, "vrl-detail-row").map(row => row.textContent).join(" ")).sort()];
    } catch (error) { observed = { xmlError: error.message }; }
    assert.deepEqual(observed, ["http://www.w3.org/2000/svg", `${item.title} topo`, [...item.notes].sort()], item.source);
  });
  test(`scene contains all supplied stage and redirection facts: ${caseName(item)}`, () => {
    const result = compileRoute(item.source, item.options);
    const document = xmlDocument(renderTopoSvg(result.model, result.layout));
    assert.deepEqual([byClass(document, "vrl-rappel-stage-label").map(node => node.textContent), byClass(document, "vrl-redirection-anchor").map(node => node.textContent.trim())],
      [item.events.flatMap(event => event.stages.map(stage => `${stage}m`)), item.events.map(event => `${event.redirection}m ${event.side === "left" ? "L" : "R"}`)], item.source);
  });
  test(`scene bounds enclose content and panels: ${caseName(item)}`, () => {
    const result = compileRoute(item.source, item.options);
    const scene = computeTopoScene(result.model, result.layout, { legend: item.index % 2 === 0 });
    const document = xmlDocument(renderTopoSvg(result.model, result.layout, { legend: item.index % 2 === 0 }));
    assert.deepEqual([nonfinitePaths(scene), clippedBounds(scene), clippedPrimitives(document)], [[], [], []], item.source);
  });
  test(`repeated rendering preserves model layout and bytes: ${caseName(item)}`, () => {
    const result = compileRoute(item.source, item.options);
    const before = structuredClone([result.model, result.layout]);
    const markup = renderTopoSvg(result.model, result.layout);
    assert.deepEqual([result.model, result.layout, renderTopoSvg(result.model, result.layout)], [...before, markup], item.source);
  });
}

for (const character of ["\u0000", "\u000b", "\ud800", "\ufffe"]) {
  test(`XML-invalid text fails without a partial document: ${character.charCodeAt(0)}`, () => {
    const source = `route "Invalid ${character}"\nstart\nexit`;
    const result = compileRoute(source);
    assert.throws(() => renderTopoSvg(result.model, result.layout), { name: "TypeError", message: "XML text must contain valid XML 1.0 characters." });
  });
}
