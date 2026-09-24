import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import * as diagram from "@subvertic/diagram";

test("the neutral diagram package exposes only its composed state factory", () => {
  assert.deepEqual(Object.keys(diagram), ["createDiagramState"]);
});

test("the neutral package depends on core and SVG without framework dependencies", () => {
  const manifest = JSON.parse(readFileSync(new URL("../packages/vrl-diagram/package.json", import.meta.url), "utf8"));
  assert.deepEqual([manifest.dependencies, manifest.peerDependencies, manifest.optionalDependencies], [{ "@subvertic/core": manifest.version, "@subvertic/render-svg": manifest.version }, undefined, undefined]);
});

test("release planning includes the shared package before its adapters without registry access", () => {
  const result = spawnSync(process.execPath, ["scripts/publish-workspaces.mjs", "--plan", "--skip-registry", "--release", "current", "--trusted-publisher"], { cwd: new URL("../", import.meta.url), encoding: "utf8" });
  const order = [...result.stdout.matchAll(/^    - (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual([result.status, order], [0, ["@subvertic/core", "@subvertic/render-svg", "@subvertic/diagram", "@subvertic/react", "@subvertic/svelte", "@subvertic/sveltekit"]]);
});
