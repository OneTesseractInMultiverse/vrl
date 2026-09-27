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
const names = ["core", "icons", "render-svg", "diagram", "react", "svelte", "sveltekit"];
for (const name of names) {
  test(`packed ${name} resolves inside the isolated application`, /**
   * Verify packed ${name} resolves inside the isolated application; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(require.resolve(`@subvertic/vrl-${name}`).startsWith(join(process.cwd(), "node_modules", "@subvertic", `vrl-${name}`)), true);
  });
  test(`packed ${name} rejects private package entry paths`, /**
   * Verify packed ${name} rejects private package entry paths; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
   */ async () => {
    await assert.rejects(import(`@subvertic/vrl-${name}/src/index.js`), { code: "ERR_PACKAGE_PATH_NOT_EXPORTED" });
  });
}
for (const name of ["svelte", "sveltekit"]) {
  for (const target of ["client", "server"]) {
    test(`${name} component compiles for ${target} with installed Svelte ${VERSION}`, /**
     * Verify ${name} component compiles for ${target} with installed Svelte ${VERSION}; arrange the scenario and
     * make its single direct assertion. Assertion and setup failures propagate to the test runner.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */ () => {
      const filename = require.resolve(`@subvertic/vrl-${name}/VrlDiagram.svelte`);
      const legacy = VERSION.startsWith("4.");
      const result = compile(readFileSync(filename, "utf8"), { filename, generate: legacy ? target === "client" ? "dom" : "ssr" : target, ...(legacy ? { hydratable: true } : {}) });
      assert.equal(typeof result.js.code === "string" && result.js.code.includes("export"), true);
    });
  }
}
for (const [name, source] of Object.entries(SOURCES)) {
  test(`packed state returns correct success/failure fields for ${name}`, /**
   * Verify the independently expected success, warning or blocking-failure state for each packed source case.
   * Preserve short numeric rope and explicit unknown rope/height as successful warning states.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const state = createDiagramState(source);
    assert.deepEqual([state.ok, state.diagnostics.map(/**
     * Project item.severity from the current record.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {unknown} The item.severity value selected or validated above.
     */ item => item.severity), state.svg.startsWith("<svg "), state.model === null],
      name === "invalid" ? [false, ["error"], false, true] : [true, ["warning", "unknownRope", "unknownHeight"].includes(name) ? ["warning"] : [], true, false]);
  });
}
test("caller configuration errors propagate from packed state", /**
 * Verify caller configuration errors propagate from packed state; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise createDiagramState so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by createDiagramState.
   */ () => createDiagramState(SOURCES.valid, { legend: "false" }), TypeError);
});
test("a missing public component entry fails the consuming build", /**
 * Verify a missing public component entry fails the consuming build; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {Promise<void>} Resolves when the documented asynchronous operation completes; awaited failures reject. Completes the documented operation; no return value is consumed.
 */ async () => {
  await assert.rejects(build({ stdin: { contents: 'import Diagram from "@subvertic/vrl-svelte/Missing.svelte"; console.log(Diagram);', resolveDir: process.cwd() }, bundle: true, write: false, logLevel: "silent" }),
    /**
     * Exercise error.errors.some so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @param {unknown} error - Failure propagated by the observed operation.
     * @returns {boolean} The result returned by error.errors.some.
     */
    error => error.errors.some(/**
     * Evaluate the selection condition item.text.includes('Could not resolve
     * "@subvertic/vrl-svelte/Missing.svelte"').
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {boolean} The result returned by item.text.includes.
     */ item => item.text.includes('Could not resolve "@subvertic/vrl-svelte/Missing.svelte"')));
});

for (const [name, alias, version] of [["react", "react-unsupported", "17.0.2"], ["svelte", "svelte-unsupported", "3.59.2"]]) {
  test(`strict peers reject actual ${name} ${version} against the packed adapter`, /**
   * Verify strict peers reject actual ${name} ${version} against the packed adapter; arrange the scenario and
   * make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const result = rejectedPeerInstall(name, alias);
    const error = JSON.parse(result.stdout).error;
    assert.deepEqual([result.status, error.code, (error.detail ?? "").includes(`peer ${name}@">=`)], [1, "ERESOLVE", true]);
  });
}

/**
 * Attempt an isolated incompatible-peer installation and retain process evidence that the declared peer
 * boundary is enforced.
 * @responsibility coordinator
 * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @param {unknown} alias - Package alias used for the deliberate peer-compatibility failure.
 * @returns {unknown} The result returned by spawnSync.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
function rejectedPeerInstall(name, alias) {
  const directory = mkdtempSync(join(tmpdir(), "vrl-peer-failure-"));
  try {
    const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
    const tarball = lock.packages[`node_modules/${alias}`].resolved;
    const packed = spawnSync("npm", ["pack", tarball, "--json", "--pack-destination", directory, "--offline", "--ignore-scripts"], { encoding: "utf8" });
    if (packed.status !== 0) throw new Error(packed.stderr);
    const legacy = JSON.parse(packed.stdout)[0].filename;
    const dependencies = Object.fromEntries(["core", "icons", "render-svg", "diagram", name].map(/**
     * Project the current entry into an ordered tuple for ["core", "icons", "render-svg", "diagram", name].map.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {Array} The ordered records or values assembled above.
     */ item => [`@subvertic/vrl-${item}`, `file:${join(process.cwd(), "tarballs", `vrl-${item}.tgz`)}`]));
    dependencies[name] = `file:${join(directory, legacy)}`;
    writeFileSync(join(directory, "package.json"), JSON.stringify({ name: "unsupported-peer-consumer", version: "1.0.0", private: true, dependencies }));
    return spawnSync("npm", ["install", "--package-lock-only", "--offline", "--ignore-scripts", "--strict-peer-deps", "--legacy-peer-deps=false", "--json", "--no-audit", "--no-fund"], { cwd: directory, encoding: "utf8", timeout: 30_000 });
  } finally { rmSync(directory, { recursive: true, force: true }); }
}
