import assert from "node:assert/strict";
import test from "node:test";
import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg } from "@subvertic/vrl-render-svg";
import { routeCases, parseSeed, caseName } from "./helpers/seeded-cases.js";
import { clippedPrimitives } from "./helpers/svg-bounds.js";
import { xmlDocument, byClass, clippedBounds, nonfinitePaths } from "./helpers/invariant-observations.js";

for (const item of routeCases(parseSeed(process.env.VRL_TEST_SEED))) {
  test(`strict XML preserves supplied title and notes: ${caseName(item)}`, /**
   * Verify strict XML preserves supplied title and notes: ${caseName(item)}; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(item.source, item.options);
    let observed;
    try {
      const document = xmlDocument(renderTopoSvg(result.model, result.layout));
      observed = [document.documentElement.namespaceURI, document.getElementsByTagName("title")[0].textContent,
        byClass(document, "vrl-node-note").map(/**
         * Apply byClass(node, "vrl-detail-row").map(row => row.textContent).join to the supplied arguments; retain the
         * callee's return and failure behavior.
         * @responsibility computation
         * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
         * @returns {string} The result returned by byClass(node, "vrl-detail-row").map(row => row.textContent).join.
         */ node => byClass(node, "vrl-detail-row").map(/**
         * Project row.textContent from the current record.
         * @responsibility computation
         * @param {unknown} row - One prepared detail or legend row.
         * @returns {unknown} The row.textContent value selected or validated above.
         */ row => row.textContent).join(" ")).sort()];
    } catch (error) { observed = { xmlError: error.message }; }
    assert.deepEqual(observed, ["http://www.w3.org/2000/svg", `${item.title} topo`, [...item.notes].sort()], item.source);
  });
  test(`scene contains all supplied stage and redirection facts: ${caseName(item)}`, /**
   * Verify scene contains all supplied stage and redirection facts: ${caseName(item)}; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(item.source, item.options);
    const document = xmlDocument(renderTopoSvg(result.model, result.layout));
    assert.deepEqual([byClass(document, "vrl-rappel-stage-label").map(/**
     * Project node.textContent from the current record.
     * @responsibility computation
     * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
     * @returns {unknown} The node.textContent value selected or validated above.
     */ node => node.textContent), byClass(document, "vrl-redirection-anchor").map(/**
     * Apply node.textContent.trim to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
     * @returns {string} The result returned by node.textContent.trim.
     */ node => node.textContent.trim())],
      [item.events.flatMap(/**
       * Apply event.stages.map to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @param {unknown} event - SvelteKit request event or independently specified technical event.
       * @returns {Array} The result returned by event.stages.map.
       */ event => event.stages.map(/**
       * Format the current entry as the text required by event.stages.map, preserving supplied values.
       * @responsibility computation
       * @param {unknown} stage - One declared metric stage in source order.
       * @returns {string} Formatted text retaining the supplied values and ordering.
       */ stage => `${stage}m`)), item.events.map(/**
       * Format the current entry as the text required by item.events.map, preserving supplied values.
       * @responsibility computation
       * @param {unknown} event - SvelteKit request event or independently specified technical event.
       * @returns {string} Formatted text retaining the supplied values and ordering.
       */ event => `${event.redirection}m ${event.side === "left" ? "L" : "R"}`)], item.source);
  });
  test(`scene bounds enclose content and panels: ${caseName(item)}`, /**
   * Verify scene bounds enclose content and panels: ${caseName(item)}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(item.source, item.options);
    const scene = computeTopoScene(result.model, result.layout, { legend: item.index % 2 === 0 });
    const document = xmlDocument(renderTopoSvg(result.model, result.layout, { legend: item.index % 2 === 0 }));
    assert.deepEqual([nonfinitePaths(scene), clippedBounds(scene), clippedPrimitives(document)], [[], [], []], item.source);
  });
  test(`repeated rendering preserves model layout and bytes: ${caseName(item)}`, /**
   * Verify repeated rendering preserves model layout and bytes: ${caseName(item)}; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = compileRoute(item.source, item.options);
    const before = structuredClone([result.model, result.layout]);
    const markup = renderTopoSvg(result.model, result.layout);
    assert.deepEqual([result.model, result.layout, renderTopoSvg(result.model, result.layout)], [...before, markup], item.source);
  });
}

for (const character of ["\u0000", "\u000b", "\ud800", "\ufffe"]) {
  test(`XML-invalid text fails without a partial document: ${character.charCodeAt(0)}`, /**
   * Verify XML-invalid text fails without a partial document: ${character.charCodeAt(0)}; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const source = `route "Invalid ${character}"\nstart\nexit`;
    const result = compileRoute(source);
    assert.throws(/**
     * Exercise renderTopoSvg so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by renderTopoSvg.
     */ () => renderTopoSvg(result.model, result.layout), { name: "TypeError", message: "XML text must contain valid XML 1.0 characters." });
  });
}
