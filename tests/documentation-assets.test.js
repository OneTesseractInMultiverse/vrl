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
const read = file => readFileSync(new URL(file, root), "utf8");
const contracts = JSON.parse(read("tests/fixtures/example-files.json"));
const profile = JSON.parse(read("examples/quebrada-gata.render.json"));

function observe(source, contract) {
  const result = compileRoute(source);
  return { ok: result.ok, diagnostics: result.diagnostics.map(item => [item.severity, item.code]),
    ids: result.model?.elements.map(element => element.id),
    facts: Object.fromEntries(Object.keys(contract.facts).map(pointer => [pointer, pointerValue(result, pointer)])) };
}
function expected(contract) {
  return { ok: true, diagnostics: contract.warnings.map(code => ["warning", code]), ids: contract.ids, facts: contract.facts };
}

test("every standalone VRL example has a reviewed behavioral contract", () => {
  assert.deepEqual(readdirSync(new URL("examples/", root)).filter(file => file.endsWith(".vrl")).sort(), Object.keys(contracts).sort());
});
for (const [file, contract] of Object.entries(contracts)) {
  test(`${file} source matches its reviewed declared facts`, () => {
    assert.equal(sourceFingerprint(read(`examples/${file}`)), contract.sha256);
  });
  test(`${file} retains exact facts, identity and documented warning conditions`, () => {
    assert.deepEqual(observe(read(`examples/${file}`), contract), expected(contract));
  });
}
for (const file of ["README.md", "packages/vrl-core/README.md", "docs/react.md", "docs/svelte.md"]) {
  test(`${file} quick start preserves the shared fictional canyon facts without warnings`, () => {
    const source = read(file).match(/const source = `([^`]+)`;/)[1];
    const contract = contracts["soft-terrain-canyon.vrl"];
    assert.deepEqual(observe(source, contract), expected(contract));
  });
}
test("the legacy SVG preview matches current source and its documented render profile", () => {
  const compiled = compileRoute(read("examples/quebrada-gata.vrl"), { layout: profile.layout });
  const svg = renderTopoSvg(compiled.model, compiled.layout, profile.render).replace(/^[ \t]+$/gm, "") + "\n";
  assert.equal(svg, read("docs/assets/quebrada-gata.svg"));
});
test("the regenerated legacy preview retains complete primitive bounds", () => {
  assert.deepEqual(clippedPrimitives(documentFor(read("docs/assets/quebrada-gata.svg"))), []);
});
test("the documented example command emits warnings and writes the reviewed SVG", t => {
  const directory = mkdtempSync(join(tmpdir(), "vrl-example-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const destination = join(directory, "route.svg");
  const run = spawnSync(process.execPath, [fileURLToPath(new URL("scripts/render-example.mjs", root)), destination], { encoding: "utf8" });
  assert.deepEqual([run.status, run.stderr.includes("Intermediate elevations are underdetermined"), readFileSync(destination, "utf8")],
    [0, true, read("docs/assets/quebrada-gata.svg")]);
});
