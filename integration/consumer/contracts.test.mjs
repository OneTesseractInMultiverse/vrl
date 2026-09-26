import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { compile, VERSION } from "svelte/compiler";
import { build } from "esbuild";
import { createDiagramState } from "@subvertic/vrl-diagram";
import { SOURCES } from "./src/lib/cases.js";

const require = createRequire(import.meta.url);
const names = ["core", "render-svg", "diagram", "react", "svelte", "sveltekit"];
for (const name of names) {
  test(`packed ${name} resolves inside the isolated application`, () => {
    assert.equal(require.resolve(`@subvertic/vrl-${name}`).startsWith(join(process.cwd(), "node_modules", "@subvertic", `vrl-${name}`)), true);
  });
  test(`packed ${name} rejects private package entry paths`, async () => {
    await assert.rejects(import(`@subvertic/vrl-${name}/src/index.js`), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" });
  });
}
for (const name of ["svelte", "sveltekit"]) {
  for (const target of ["client", "server"]) {
    test(`${name} component compiles for ${target} with installed Svelte ${VERSION}`, () => {
      const filename = require.resolve(`@subvertic/vrl-${name}/VrlDiagram.svelte`);
      const legacy = VERSION.startsWith("4.");
      const result = compile(readFileSync(filename, "utf8"), { filename, generate: legacy ? target === "client" ? "dom" : "ssr" : target, ...(legacy ? { hydratable: true } : {}) });
      assert.equal(typeof result.js.code === "string" && result.js.code.includes("export"), true);
    });
  }
}
for (const [name, source] of Object.entries(SOURCES)) {
  test(`packed state returns correct success/failure fields for ${name}`, () => {
    const state = createDiagramState(source);
    assert.deepEqual([state.ok, state.diagnostics.map(item => item.severity), state.svg.startsWith("<svg "), state.model === null],
      name === "invalid" ? [false, ["error"], false, true] : [true, name === "warning" ? ["warning"] : [], true, false]);
  });
}
test("caller configuration errors propagate from packed state", () => {
  assert.throws(() => createDiagramState(SOURCES.valid, { legend: "false" }), TypeError);
});
test("a missing public component entry fails the consuming build", async () => {
  await assert.rejects(build({ stdin: { contents: 'import Diagram from "@subvertic/vrl-svelte/Missing.svelte"; console.log(Diagram);', resolveDir: process.cwd() }, bundle: true, write: false, logLevel: "silent" }),
    error => error.errors.some(item => item.text.includes('Could not resolve "@subvertic/vrl-svelte/Missing.svelte"')));
});

for (const [name, alias, version] of [["react", "react-unsupported", "17.0.2"], ["svelte", "svelte-unsupported", "3.59.2"]]) {
  test(`strict peers reject actual ${name} ${version} against the packed adapter`, () => {
    const result = rejectedPeerInstall(name, alias);
    const error = JSON.parse(result.stdout).error;
    assert.deepEqual([result.status, error.code, (error.detail ?? "").includes(`peer ${name}@">=`)], [1, "ERESOLVE", true]);
  });
}

function rejectedPeerInstall(name, alias) {
  const directory = mkdtempSync(join(tmpdir(), "vrl-peer-failure-"));
  try {
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    const tarball = lock.packages[`node_modules/${alias}`].resolved;
    const packed = spawnSync("npm", ["pack", tarball, "--json", "--pack-destination", directory, "--offline", "--ignore-scripts"], { encoding: "utf8" });
    if (packed.status !== 0) throw new Error(packed.stderr);
    const legacy = JSON.parse(packed.stdout)[0].filename;
    const dependencies = Object.fromEntries(["core", "render-svg", "diagram", name].map(item => [`@subvertic/vrl-${item}`, `file:${join(process.cwd(), "tarballs", `vrl-${item}.tgz`)}`]));
    dependencies[name] = `file:${join(directory, legacy)}`;
    writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "unsupported-peer-consumer", version: "1.0.0", private: true, dependencies }));
    return spawnSync("npm", ["install", "--package-lock-only", "--offline", "--ignore-scripts", "--strict-peer-deps", "--legacy-peer-deps=false", "--json", "--no-audit", "--no-fund"], { cwd: directory, encoding: "utf8", timeout: 30_000 });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
