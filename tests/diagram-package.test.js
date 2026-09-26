import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as diagram from "@subvertic/vrl-diagram";

test("the neutral diagram package exposes its state factory and warning projection", /**
 * Verify the neutral diagram package exposes its state factory and warning projection; arrange the scenario
 * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual(Object.keys(diagram), ["createDiagramState", "diagramWarningText"]);
});

test("the neutral package depends on core and SVG without framework dependencies", /**
 * Verify the neutral package depends on core and SVG without framework dependencies; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const manifest = JSON.parse(readFileSync(new URL("../packages/vrl-diagram/package.json", import.meta.url), "utf8"));
  assert.deepEqual([manifest.dependencies, manifest.peerDependencies, manifest.optionalDependencies], [{ "@subvertic/vrl-core": manifest.version, "@subvertic/vrl-render-svg": manifest.version }, undefined, undefined]);
});

test("release planning includes the shared package before its adapters without registry access", /**
 * Verify release planning includes the shared package before its adapters without registry access; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = spawnSync(process.execPath, ["scripts/publish-workspaces.mjs", "--plan", "--skip-registry", "--release", "current", "--trusted-publisher"], { cwd: new URL("../", import.meta.url), encoding: "utf8" });
  const order = [...result.stdout.matchAll(/^    - (.+)$/gm)].map(/**
   * Project match.1 from the current record.
   * @responsibility computation
   * @param {unknown} match - Regular-expression match including the capture groups consumed below.
   * @returns {unknown} The match.1 value selected or validated above.
   */ (match) => match[1]);
  assert.deepEqual([result.status, order], [0, ["@subvertic/vrl-core", "@subvertic/vrl-render-svg", "@subvertic/vrl-diagram", "@subvertic/vrl-react", "@subvertic/vrl-svelte", "@subvertic/vrl-sveltekit"]]);
});
