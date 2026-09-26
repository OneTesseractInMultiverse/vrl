import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { dependencyViolations } from "./helpers/dependency-boundaries.js";
import { rendererDependencyViolations } from "./helpers/renderer-boundaries.js";
import { diagramDependencyViolations } from "./helpers/diagram-boundaries.js";

test("core imports obey inward boundaries including re-exports and composition", /**
 * Verify core imports obey inward boundaries including re-exports and composition; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const root = new URL("../packages/vrl-core/src/", import.meta.url);
  const files = readdirSync(root, { recursive: true }).filter(/**
   * Evaluate the selection condition file.endsWith(".js").
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @returns {unknown} The result returned by file.endsWith.
   */ (file) => file.endsWith(".js"));
  assert.deepEqual(files.flatMap(/**
   * Apply dependencyViolations to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @returns {unknown} The result returned by dependencyViolations.
   */ (file) => dependencyViolations(file, readFileSync(new URL(file, root), "utf8"))), []);
});

for (const [file, source] of [
  ["application/use-case.js", 'import { parse } from "../parser/line-parser.js";'],
  ["application/use-case.js", 'export { compileRoute } from "../composition/route-compiler.js";'],
  ["application/use-case.js", 'import { exportJson } from "../adapters/json/export-route-json.js";'],
  ["application/use-case.js", 'import { parse } from "../index.js";'],
  ["domain/model.js", 'export * from "../application/compiler-ports.js";'],
  ["domain/model.js", 'import { createEmptyRoute } from "../application/route-ast.js";'],
  ["parser/parser.js", 'import { compileRouteWithPorts } from "../application/compile-route.js";'],
  ["domain/model.js", 'import "react";'],
  ["domain/model.js", 'import fs from "node:fs";'],
  ["domain/model.js", 'import browser from "../../../../vrl-react/src/index.js";'],
  ["validation/check.js", 'import { compileRoute } from "../composition/route-compiler.js";'],
  ["application/use-case.js", 'const module = import("../parser/line-parser.js");'],
  ["domain/model.js", 'const module = require(name);'],
  ["unclassified/new.js", 'import { normalize } from "../domain/model.js";']
]) {
  test(`dependency boundary rejects ${file}: ${source}`, /**
   * Verify dependency boundary rejects ${file}: ${source}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(dependencyViolations(file, source).length, 1);
  });
}

test("dependency check accepts multiline inward imports and re-exports", /**
 * Verify dependency check accepts multiline inward imports and re-exports; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(dependencyViolations("application/use-case.js", 'import {\n  createDiagnostic\n} from "../domain/diagnostics.js";\nexport { compilerPorts } from "./compiler-ports.js";'), []);
});

test("default composition may depend on concrete implementations", /**
 * Verify default composition may depend on concrete implementations; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(dependencyViolations("composition/route-compiler.js", 'import { parseVrl } from "../parser/line-parser.js";\nimport { exportRouteJson } from "../adapters/json/export-route-json.js";'), []);
});

test("parser adapters may construct the application-owned syntax records", /**
 * Verify parser adapters may construct the application-owned syntax records; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(dependencyViolations("parser/parser.js", 'import { createEmptyRoute } from "../application/route-ast.js";'), []);
});

test("renderer computations and serialization remain separated without new dependencies", /**
 * Verify renderer computations and serialization remain separated without new dependencies; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const root = new URL("../packages/vrl-render-svg/src/", import.meta.url);
  const files = readdirSync(root).filter(/**
   * Evaluate the selection condition file.endsWith(".js").
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @returns {unknown} The result returned by file.endsWith.
   */ (file) => file.endsWith(".js"));
  assert.deepEqual(files.flatMap(/**
   * Apply rendererDependencyViolations to the supplied arguments; retain the callee's return and failure
   * behavior.
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @returns {unknown} The result returned by rendererDependencyViolations.
   */ (file) => rendererDependencyViolations(file, readFileSync(new URL(file, root), "utf8"))), []);
});

test("shared diagram application and framework adapters obey their dependency boundaries", /**
 * Verify shared diagram application and framework adapters obey their dependency boundaries; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const root = new URL("../packages/", import.meta.url);
  const packages = ["vrl-diagram", "vrl-react", "vrl-svelte", "vrl-sveltekit"];
  const files = packages.flatMap(/**
   * Apply readdirSync(new URL(`${name}/src/`, root), { recursive: true }).filter((file) =>
   * /\.(js|svelte)$/.test(file)).map to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility coordinator
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {Array} The result returned by readdirSync(new URL(`${name}/src/`, root), { recursive: true }).filter((file) => /\.(js|svelte)$/.test(file)).map.
   */ (name) => readdirSync(new URL(`${name}/src/`, root), { recursive: true }).filter(/**
   * Evaluate the selection condition /\.(js|svelte)$/.test(file).
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @returns {boolean} The result returned by {}.test.
   */ (file) => /\.(js|svelte)$/.test(file)).map(/**
   * Format the current entry as the text required by readdirSync(new URL(`${name}/src/`, root), { recursive:
   * true }).filter((file) => /\.(js|svelte)$/.test(file)).map, preserving supplied values.
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ (file) => `${name}/src/${file}`));
  assert.deepEqual(files.flatMap(/**
   * Apply diagramDependencyViolations to the supplied arguments; retain the callee's return and failure
   * behavior.
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @returns {unknown} The result returned by diagramDependencyViolations.
   */ (file) => diagramDependencyViolations(file, readFileSync(new URL(file, root), "utf8"))), []);
});

for (const [file, source] of [
  ["vrl-diagram/src/application/create-diagram-state.js", 'import { renderTopoSvg } from "@subvertic/vrl-render-svg";'],
  ["vrl-diagram/src/application/create-diagram-state.js", 'import { createDiagramState } from "../composition/diagram-state.js";'],
  ["vrl-diagram/src/application/diagram-state.js", 'import { compileRoute } from "@subvertic/vrl-core";'],
  ["vrl-diagram/src/application/diagram-warnings.js", 'import { compileRoute } from "@subvertic/vrl-core";'],
  ["vrl-diagram/src/application/diagram-warnings.js", 'import { renderTopoSvg } from "@subvertic/vrl-render-svg";'],
  ["vrl-diagram/src/composition/diagram-state.js", 'import React from "react";'],
  ["vrl-diagram/src/composition/diagram-state.js", 'import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";'],
  ["vrl-diagram/src/application/diagram-state.js", 'import { formatDiagnostic } from "../../../vrl-core/src/domain/diagnostics.js";'],
  ["vrl-react/src/index.js", 'import { compileRoute } from "@subvertic/vrl-core";'],
  ["vrl-svelte/src/index.js", 'import { renderTopoSvg } from "@subvertic/vrl-render-svg";'],
  ["vrl-sveltekit/src/index.js", 'import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";'],
  ["vrl-diagram/src/application/diagram-state.js", 'const module = import(name);']
]) {
  test(`diagram boundary rejects ${file}: ${source}`, /**
   * Verify diagram boundary rejects ${file}: ${source}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(diagramDependencyViolations(file, source).length, 1);
  });
}

for (const [file, source] of [
  ["node-scene.js", 'import { serializeNode } from "./svg-serializer.js";'],
  ["detail-content.js", 'import { escapeXml } from "./xml.js";'],
  ["topo-scene.js", 'export * from "./svg-renderer.js";'],
  ["svg-serializer.js", 'import { diagramText } from "./locale.js";'],
  ["svg-serializer.js", 'import { detailBadgePart } from "./presentation.js";'],
  ["svg-serializer.js", 'import { technicalVerticalMeters } from "@subvertic/vrl-core";'],
  ["segment-scene.js", 'import { model } from "../../vrl-core/src/domain/model.js";'],
  ["svg-renderer.js", 'import library from "external-package";'],
  ["panel-scene.js", 'import fs from "node:fs";'],
  ["node-scene.js", 'const module = import(name);']
]) {
  test(`renderer boundary rejects ${file}: ${source}`, /**
   * Verify renderer boundary rejects ${file}: ${source}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(rendererDependencyViolations(file, source).length, 1);
  });
}
