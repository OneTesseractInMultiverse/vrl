import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, readdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compileRoute } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";
import { pointerValue, sourceFingerprint } from "../scripts/documentation/example-facts.mjs";
import { documentFor, clippedPrimitives } from "./helpers/svg-bounds.js";

const root = new URL("../", import.meta.url);
/**
 * Apply readFileSync to the supplied arguments; retain the callee's return and failure behavior.
 * @responsibility coordinator
 * @param {string} file - Repository-relative source path used in discovery or diagnostics.
 * @returns {unknown} The result returned by readFileSync.
 */
const read = file => readFileSync(new URL(file, root), "utf8");
const contracts = JSON.parse(read("tests/fixtures/example-files.json"));
const profile = JSON.parse(read("examples/quebrada-gata.render.json"));

/**
 * Compile a standalone example and project status, ordered warning conditions, IDs and reviewed JSON-pointer
 * facts.
 * @responsibility coordinator
 * @param {unknown} source - Input source described above; no implicit global source or mutable singleton is read.
 * @param {Object} contract - Reviewed example expectation including facts, diagnostics and optional fragment context.
 * @returns {Object} A record containing ok, diagnostics, ids, facts.
 */
function observe(source, contract) {
  const result = compileRoute(source);
  return { ok: result.ok, diagnostics: result.diagnostics.map(/**
   * Project the current entry into an ordered tuple for result.diagnostics.map.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {Array} The ordered records or values assembled above.
   */ item => [item.severity, item.code]),
    ids: result.model?.elements.map(/**
     * Project element.id from the current record.
     * @responsibility computation
     * @param {Object} element - Owning route element with its type, identity and declared attributes.
     * @returns {unknown} The element.id value selected or validated above.
     */ element => element.id),
    facts: Object.fromEntries(Object.keys(contract.facts).map(/**
     * Project the current entry into an ordered tuple for Object.keys(contract.facts).map.
     * @responsibility computation
     * @param {string} pointer - Own-property JSON pointer with ~0/~1 escaping.
     * @returns {Array} The ordered records or values assembled above.
     */ pointer => [pointer, pointerValue(result, pointer)])) };
}
/**
 * Return independently specified expectations for the selected fixture case.
 * @responsibility computation
 * @param {Object} contract - Reviewed example expectation including facts, diagnostics and optional fragment context.
 * @returns {Object} A record containing ok, diagnostics, ids, facts.
 */
function expected(contract) {
  return { ok: true, diagnostics: contract.warnings.map(/**
   * Project the current entry into an ordered tuple for contract.warnings.map.
   * @responsibility computation
   * @param {string} code - Stable diagnostic identifier, or selected symbol code for presentation.
   * @returns {Array} The ordered records or values assembled above.
   */ code => ["warning", code]), ids: contract.ids, facts: contract.facts };
}

test("every standalone VRL example has a reviewed behavioral contract", /**
 * Verify every standalone VRL example has a reviewed behavioral contract; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(readdirSync(new URL("examples/", root)).filter(/**
   * Evaluate the selection condition file.endsWith(".vrl").
   * @responsibility computation
   * @param {string} file - Repository-relative source path used in discovery or diagnostics.
   * @returns {unknown} The result returned by file.endsWith.
   */ file => file.endsWith(".vrl")).sort(), Object.keys(contracts).sort());
});
for (const [file, contract] of Object.entries(contracts)) {
  test(`${file} source matches its reviewed declared facts`, /**
   * Verify ${file} source matches its reviewed declared facts; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(sourceFingerprint(read(`examples/${file}`)), contract.sha256);
  });
  test(`${file} retains exact facts, identity and documented warning conditions`, /**
   * Verify ${file} retains exact facts, identity and documented warning conditions; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.deepEqual(observe(read(`examples/${file}`), contract), expected(contract));
  });
}
for (const file of ["README.md", "packages/vrl-core/README.md", "docs/react.md", "docs/svelte.md"]) {
  test(`${file} quick start preserves the shared fictional canyon facts without warnings`, /**
   * Verify ${file} quick start preserves the shared fictional canyon facts without warnings; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const source = read(file).match(/const source = `([^`]+)`;/)[1];
    const contract = contracts["soft-terrain-canyon.vrl"];
    assert.deepEqual(observe(source, contract), expected(contract));
  });
}
test("the legacy SVG preview matches current source and its documented render profile", /**
 * Verify the legacy SVG preview matches current source and its documented render profile; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const compiled = compileRoute(read("examples/quebrada-gata.vrl"), { layout: profile.layout });
  const svg = renderTopoSvg(compiled.model, compiled.layout, profile.render).replace(/^[ \t]+$/gm, "") + "\n";
  assert.equal(svg, read("docs/assets/quebrada-gata.svg"));
});
test("the regenerated legacy preview retains complete primitive bounds", /**
 * Verify the regenerated legacy preview retains complete primitive bounds; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(clippedPrimitives(documentFor(read("docs/assets/quebrada-gata.svg"))), []);
});
test("the documented example command emits warnings and writes the reviewed SVG", /**
 * Verify the documented example command emits warnings and writes the reviewed SVG; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @param {unknown} t - Test-runner context used to register fixture cleanup.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ t => {
  const directory = mkdtempSync(join(tmpdir(), "vrl-example-"));
  t.after(/**
   * Apply rmSync to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility coordinator
   * @returns {unknown} The result returned by rmSync.
   */ () => rmSync(directory, { recursive: true, force: true }));
  const destination = join(directory, "route.svg");
  const run = spawnSync(process.execPath, [fileURLToPath(new URL("scripts/render-example.mjs", root)), destination], { encoding: "utf8" });
  assert.deepEqual([run.status, run.stderr.includes("Intermediate elevations are underdetermined"), readFileSync(destination, "utf8")],
    [0, true, read("docs/assets/quebrada-gata.svg")]);
});
