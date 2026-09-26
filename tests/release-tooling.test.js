import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { WORKSPACES, REPOSITORY } from "../scripts/release/config.mjs";
import { parseOptions } from "../scripts/release/options.mjs";
import { validateManifests, prepareFiles, createPlan, publicationActions, requireVersion } from "../scripts/release/planning.mjs";
import { runRelease, writePreparedFiles } from "../scripts/release/coordinator.mjs";
import { readFiles } from "../scripts/release/system.mjs";
import { verifyReleaseIdentity } from "../scripts/release/verification.mjs";

const original = readFiles();
const version = JSON.parse(original["package.json"]).version;
const names = WORKSPACES.map(/**
 * Project pkg.name from the current record.
 * @responsibility computation
 * @param {unknown} pkg - Configured, packed or installed package record.
 * @returns {unknown} The pkg.name value selected or validated above.
 */ pkg => pkg.name);
const nextVersion = version.split(".").map(/**
 * Increment only the patch component of the current fixture version for an independent next-version
 * expectation.
 * @responsibility computation
 * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
 * @param {number} index - Zero-based position in the current ordered collection.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */ (part, index) => index === 2 ? Number(part) + 1 : part).join(".");
/**
 * Clone the manifest-text map, apply one deliberate parsed-record change and serialize only the selected
 * file.
 * @responsibility computation
 * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
 * @param {unknown} change - Transformation applied to a cloned fixture file or record.
 * @returns {unknown} The files value selected or validated above.
 */
function changedFile(path, change) {
  const files = { ...original }, value = JSON.parse(files[path]);
  change(value); files[path] = JSON.stringify(value); return files;
}
/**
 * Build entirely in-memory release ports, artifact fixtures and call/write logs; no registry, filesystem
 * publication or authentication occurs.
 * @responsibility computation
 * @param {unknown} overrides - Caller-supplied values replacing the corresponding defaults; defaults to {}.
 * @returns {Object} A record containing ports, calls, writes, attempted, artifacts.
 */
function harness(overrides = {}) {
  const calls = [], writes = {}, attempted = [];
  const artifacts = names.map(/**
   * Project name, version, integrity, path into the record required by names.map.
   * @responsibility computation
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {Object} A record containing name, version, integrity, path.
   */ name => ({ name, version, integrity: `sha512-${name}`, path: `/temporary/${name}.tgz` }));
  const ports = {
    /**
     * Supply the readFiles test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing the supplied fields.
     */
    readFiles: () => { calls.push("read"); return { ...original }; },
    /**
     * Supply the versions test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing .
     */
    versions: () => { calls.push("versions"); return {}; },
    /**
     * Supply the report test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */
    report: () => calls.push("report"),
    /**
     * Supply the write test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
     * @param {unknown} content - Prepared content bounds or file text, according to the consuming adapter.
     * @returns {void} Completes the documented operation; no return value is consumed.
     */
    write: (path, content) => { calls.push("write"); writes[path] = content; },
    /**
     * Supply the clean test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */
    clean: () => calls.push("clean"), /**
     * Supply the check test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */ check: () => calls.push("check"),
    /**
     * Supply the dryRun test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */
    dryRun: () => calls.push("dry-run"), /**
     * Supply the authenticate test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */ authenticate: () => calls.push("authenticate"),
    /**
     * Supply the pack test double and record its invocation in caller-owned fixture state; return the scenario's
     * deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The artifacts value selected or validated above.
     */
    pack: () => { calls.push("pack"); return artifacts; },
    /**
     * Supply the integrity test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing .
     */
    integrity: () => { calls.push("integrity"); return {}; },
    /**
     * Supply the publish test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @param {Object} artifact - Prepared package tarball metadata.
     * @returns {void} Completes the documented operation; no return value is consumed.
     */
    publish: artifact => { calls.push("publish"); attempted.push(artifact.name); },
    /**
     * Supply the cleanup test double and record its invocation in caller-owned fixture state; return the
     * scenario's deliberately selected value. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {unknown} The result returned by calls.push.
     */
    cleanup: () => calls.push("cleanup"), ...overrides
  };
  return { ports, calls, writes, attempted, artifacts };
}

for (const args of [["--unknown"], ["--version"], ["--version", "--plan"], ["--release", "next"], ["--version", "1.0.0", "--release", "current"], ["--plan", "--prepare"], ["--prepare", "--dry-run"], ["--plan", "--otp", "123456"], ["--trusted-publisher", "--otp", "123456"], ["--skip-registry"], ["--resume", "--prepare"], ["--resume", "--skip-registry", "--plan"], ["--resume", "--dry-run"], ["--trusted-publisher", "--prepare"]]) {
  test(`invalid release options fail before effects: ${args.join(" ")}`, /**
   * Verify invalid release options fail before effects: ${args.join(" ")}; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise parseOptions so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by parseOptions.
     */ () => parseOptions(args), Error);
  });
}
test("default publication uses the committed current version", /**
 * Verify default publication uses the committed current version; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.deepEqual([parseOptions([]).release, parseOptions(["--provenance", "--provenance=false"]).provenance], ["current", false]);
});
for (const candidate of ["1.2", "v1.2.3", "01.2.3", "1.2.3-beta", "1.2.3\n", "9007199254740992.0.0", null]) {
  test(`unsupported release version is rejected: ${candidate}`, /**
   * Verify unsupported release version is rejected: ${candidate}; arrange the scenario and make its single
   * direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise requireVersion so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by requireVersion.
     */ () => requireVersion(candidate), Error);
  });
}
test("repository manifests have consistent identity and dependency pins", /**
 * Verify repository manifests have consistent identity and dependency pins; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(validateManifests(original), version);
});
for (const [name, path, mutate] of [
  ["public root", "package.json", /**
   * Deliberately modify value.private in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.private = false; }],
  ["root lock version", "package-lock.json", /**
   * Deliberately modify value.version in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.version = "9.9.9"; }],
  ["workspace identity", WORKSPACES[0].path, /**
   * Deliberately modify value.name in the caller-owned fixture so the enclosing test can observe the specified
   * mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.name = "wrong"; }],
  ["workspace version", WORKSPACES[0].path, /**
   * Deliberately modify value.version in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.version = "9.9.9"; }],
  ["private workspace", WORKSPACES[0].path, /**
   * Deliberately modify value.private in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.private = true; }],
  ["wrong provenance repository", WORKSPACES[0].path, /**
   * Deliberately modify value.repository.url in the caller-owned fixture so the enclosing test can observe the
   * specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.repository.url = "git+https://github.com/wrong/repo.git"; }],
  ["wrong repository directory", WORKSPACES[0].path, /**
   * Deliberately modify value.repository.directory in the caller-owned fixture so the enclosing test can
   * observe the specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.repository.directory = "elsewhere"; }],
  ["restricted publish", WORKSPACES[0].path, /**
   * Deliberately modify value.publishConfig.access in the caller-owned fixture so the enclosing test can
   * observe the specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.publishConfig.access = "restricted"; }],
  ["foreign registry", WORKSPACES[0].path, /**
   * Deliberately modify value.publishConfig.registry in the caller-owned fixture so the enclosing test can
   * observe the specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.publishConfig.registry = "https://example.com"; }],
  ["missing locked workspace", "package-lock.json", /**
   * Deliberately modify value.packages[WORKSPACES[0].directory] in the caller-owned fixture so the enclosing
   * test can observe the specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { delete value.packages[WORKSPACES[0].directory]; }],
  ["wrong internal pin", WORKSPACES[2].path, /**
   * Deliberately modify value.dependencies[names[0]] in the caller-owned fixture so the enclosing test can
   * observe the specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.dependencies[names[0]] = "^0.1.0"; }],
  ["wrong locked pin", "package-lock.json", /**
   * Deliberately modify value.packages[WORKSPACES[2].directory].dependencies[names[0]] in the caller-owned
   * fixture so the enclosing test can observe the specified mutation or failure boundary.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ value => { value.packages[WORKSPACES[2].directory].dependencies[names[0]] = "^0.1.0"; }]
]) {
  test(`${name} blocks release validation`, /**
   * Verify ${name} blocks release validation; arrange the scenario and make its single direct assertion.
   * Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise validateManifests so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by validateManifests.
     */ () => validateManifests(changedFile(path, mutate)), Error);
  });
}
for (const [args, expected] of [[["--plan", "--release", "minor"], "0.2.0"], [["--plan", "--release", "major"], "1.0.0"], [["--plan", "--release", "patch"], "0.1.1"], [["--plan", "--version", "2.3.4"], "2.3.4"]]) {
  test(`release planning resolves ${args.join(" ")}`, /**
   * Verify release planning resolves ${args.join(" ")}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.equal(createPlan("0.1.0", {}, parseOptions(args)).version, expected);
  });
}
test("automatic preparation skips versions used by any workspace", /**
 * Verify automatic preparation skips versions used by any workspace; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(createPlan("0.1.0", { a: ["0.1.0"], b: ["0.1.1"] }, parseOptions(["--prepare", "--release", "auto"])).version, "0.1.2");
});
test("publication never bumps versions implicitly", /**
 * Verify publication never bumps versions implicitly; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise createPlan so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by createPlan.
   */ () => createPlan("0.1.0", {}, parseOptions(["--release", "minor"])), /never change versions/);
});
test("already published versions require explicit resume", /**
 * Verify already published versions require explicit resume; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise createPlan so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by createPlan.
   */ () => createPlan(version, { [names[0]]: [version] }, parseOptions([])), /--resume/);
});
test("preparation updates all version and lock records without mutating input", /**
 * Verify preparation updates all version and lock records without mutating input; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const before = JSON.stringify(original), prepared = prepareFiles(original, nextVersion);
  assert.deepEqual([validateManifests(prepared), JSON.parse(prepared["package-lock.json"]).version, JSON.stringify(original)], [nextVersion, nextVersion, before]);
});
test("planning only reads and reports without writing or running checks", /**
 * Verify planning only reads and reports without writing or running checks; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const h = harness(); runRelease(parseOptions(["--plan", "--skip-registry"]), h.ports);
  assert.deepEqual(h.calls, ["read", "report"]);
});
test("preparation only writes projected version files", /**
 * Verify preparation only writes projected version files; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const h = harness(); runRelease(parseOptions(["--prepare", "--skip-registry", "--version", nextVersion]), h.ports);
  assert.deepEqual([h.calls, validateManifests(h.writes)], [["read", "report", ...Array(WORKSPACES.length + 2).fill("write")], nextVersion]);
});
for (let failAt = 0; failAt < Object.keys(original).length; failAt++) {
  test(`failed preparation write ${failAt} restores every attempted file`, /**
   * Verify failed preparation write ${failAt} restores every attempted file; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const files = { ...original }, updated = prepareFiles(files, nextVersion); let calls = 0, message;
    try { writePreparedFiles(files, updated, { /**
     * Supply the write test double; throw the selected failure so its propagation or forbidden invocation is
     * observable. No production I/O is performed by this fixture.
     * @responsibility computation
     * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
     * @param {unknown} content - Prepared content bounds or file text, according to the consuming adapter.
     * @returns {void} Completes the documented operation; no return value is consumed.
     * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
     */ write: (path, content) => { files[path] = content; if (calls++ === failAt) throw new Error("disk failure"); } }); } catch (error) { message = error.message; }
    assert.deepEqual([message, files], ["disk failure", original]);
  });
}
test("restoration failure reports the exact file and original error", /**
 * Verify restoration failure reports the exact file and original error; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.throws(/**
   * Exercise writePreparedFiles so the enclosing assertion can observe its return value or thrown error.
   * @responsibility coordinator
   * @returns {unknown} The result returned by writePreparedFiles.
   */ () => writePreparedFiles({ a: "old" }, { a: "new" }, { /**
    * Supply the write test double; throw the selected failure so its propagation or forbidden invocation is
    * observable. No production I/O is performed by this fixture.
    * @responsibility computation
    * @returns {never} Does not return normally; throws the failure being checked.
    * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
    */ write: () => { throw new Error("disk failure"); } }), /Restoration also failed: a: disk failure/);
});
test("unchanged preparation does not write files", /**
 * Verify unchanged preparation does not write files; arrange the scenario and make its single direct
 * assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const writes = []; writePreparedFiles({ a: "same" }, { a: "same" }, { /**
   * Supply the write test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
   * @returns {unknown} The result returned by writes.push.
   */ write: path => writes.push(path) });
  assert.deepEqual(writes, []);
});
test("dry run never queries, authenticates, writes, packs or publishes", /**
 * Verify dry run never queries, authenticates, writes, packs or publishes; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const h = harness(); runRelease(parseOptions(["--dry-run"]), h.ports);
  assert.deepEqual(h.calls, ["read", "report", "clean", "check", "dry-run"]);
});
test("successful publication validates all artifacts before publishing in dependency order", /**
 * Verify successful publication validates all artifacts before publishing in dependency order; arrange the
 * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const h = harness(), result = runRelease(parseOptions([]), h.ports);
  assert.deepEqual([h.calls, h.attempted, h.writes, result.published], [["read", "versions", "report", "clean", "check", "authenticate", "pack", "integrity", ...Array(names.length).fill("publish"), "cleanup"], names, {}, names]);
});
for (const stage of ["versions", "clean", "check", "authenticate", "pack", "integrity"]) {
  test(`failure during ${stage} prevents all publication and version writes`, /**
   * Verify failure during ${stage} prevents all publication and version writes; arrange the scenario and make
   * its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const h = harness({ /**
     * Prepare stage. Deliberate or propagated failures remain visible to the caller.
     * @responsibility computation
     * @returns {never} Does not return normally; throws the failure being checked.
     * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
     */ [stage]: () => { throw new Error(`${stage} failed`); } }); let message;
    try { runRelease(parseOptions([]), h.ports); } catch (error) { message = error.message; }
    assert.deepEqual([message.includes(`${stage} failed`), h.attempted, h.writes, h.calls.includes("cleanup")], [true, [], {}, ["pack", "integrity"].includes(stage)]);
  });
}
for (const completed of [0, 1, 3, 5]) {
  test(`publication failure after ${completed} packages retains progress and command exit status`, /**
   * Verify publication failure after ${completed} packages retains progress and command exit status; arrange the
   * scenario and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    let count = 0, failure; const h = harness({ /**
     * Supply the publish test double; throw the selected failure so its propagation or forbidden invocation is
     * observable. No production I/O is performed by this fixture.
     * @responsibility computation
     * @returns {void} Returns normally when the documented guard passes; otherwise throws.
     * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
     */ publish: () => { if (count++ === completed) { const error = new Error("command failed"); error.exitCode = 17; throw error; } } });
    try { runRelease(parseOptions([]), h.ports); } catch (error) { failure = error; }
    assert.deepEqual([failure.exitCode, failure.message.includes(`Confirmed published: ${names.slice(0, completed).join(", ") || "none"}.`), h.writes, h.calls.at(-1)], [17, true, {}, "cleanup"]);
  });
}
test("resume skips only identical published packages and publishes missing dependencies in order", /**
 * Verify resume skips only identical published packages and publishes missing dependencies in order; arrange
 * the scenario and make its single direct assertion. Assertion and setup failures propagate to the test
 * runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const h = harness({ /**
   * Supply the versions test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {Object} A record containing the supplied fields, the supplied fields.
   */ versions: () => ({ [names[0]]: [version], [names[1]]: [version] }), /**
    * Supply the integrity test double; return the scenario's deliberately selected value. No production I/O is
    * performed by this fixture.
    * @responsibility computation
    * @returns {Object} A record containing the supplied fields, the supplied fields.
    */ integrity: () => ({ [names[0]]: `sha512-${names[0]}`, [names[1]]: `sha512-${names[1]}` }) });
  const result = runRelease(parseOptions(["--resume", "--skip-check"]), h.ports);
  assert.deepEqual([result.skipped, h.attempted, h.calls.includes("check")], [names.slice(0, 2), names.slice(2), false]);
});
test("resume is idempotent when every published artifact matches", /**
 * Verify resume is idempotent when every published artifact matches; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const h = harness({ /**
   * Supply the versions test double; return the scenario's deliberately selected value. No production I/O is
   * performed by this fixture.
   * @responsibility computation
   * @returns {unknown} The result returned by Object.fromEntries.
   */ versions: () => Object.fromEntries(names.map(/**
   * Project the current entry into an ordered tuple for names.map.
   * @responsibility computation
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {Array} The ordered records or values assembled above.
   */ name => [name, [version]])), /**
    * Supply the integrity test double; return the scenario's deliberately selected value. No production I/O is
    * performed by this fixture.
    * @responsibility computation
    * @returns {unknown} The result returned by Object.fromEntries.
    */ integrity: () => Object.fromEntries(names.map(/**
   * Project the current entry into an ordered tuple for names.map.
   * @responsibility computation
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {Array} The ordered records or values assembled above.
   */ name => [name, `sha512-${name}`])) });
  const result = runRelease(parseOptions(["--resume"]), h.ports);
  assert.deepEqual([result.skipped, result.published, h.attempted], [names, [], []]);
});
for (const integrity of ["sha512-different", undefined]) {
  test(`resume rejects unverified artifacts before publishing anything: ${integrity}`, /**
   * Verify resume rejects unverified artifacts before publishing anything: ${integrity}; arrange the scenario
   * and make its single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const h = harness({ /**
     * Supply the versions test double; return the scenario's deliberately selected value. No production I/O is
     * performed by this fixture.
     * @responsibility computation
     * @returns {Object} A record containing the supplied fields.
     */ versions: () => ({ [names[5]]: [version] }), /**
      * Supply the integrity test double; return the scenario's deliberately selected value. No production I/O is
      * performed by this fixture.
      * @responsibility computation
      * @returns {Object} A record containing the supplied fields.
      */ integrity: () => ({ [names[5]]: integrity }) }); let failed = false;
    try { runRelease(parseOptions(["--resume"]), h.ports); } catch { failed = true; }
    assert.deepEqual([failed, h.attempted, h.calls.at(-1)], [true, [], "cleanup"]);
  });
}
for (const change of [/**
 * Apply artifacts.pop to the supplied arguments; retain the callee's return and failure behavior.
 * @responsibility computation
 * @param {unknown} artifacts - Packed tarball metadata including names, versions, paths and integrity.
 * @returns {unknown} The result returned by artifacts.pop.
 */ artifacts => artifacts.pop(), /**
  * Deliberately modify artifacts[0].version in the caller-owned fixture so the enclosing test can observe the
  * specified mutation or failure boundary.
  * @responsibility computation
  * @param {unknown} artifacts - Packed tarball metadata including names, versions, paths and integrity.
  * @returns {void} Completes the documented operation; no return value is consumed.
  */ artifacts => { artifacts[0].version = "9.9.9"; }, /**
  * Deliberately modify artifacts[0].integrity in the caller-owned fixture so the enclosing test can observe
  * the specified mutation or failure boundary.
  * @responsibility computation
  * @param {unknown} artifacts - Packed tarball metadata including names, versions, paths and integrity.
  * @returns {void} Completes the documented operation; no return value is consumed.
  */ artifacts => { delete artifacts[0].integrity; }]) {
  test("incomplete or mismatched package artifacts block every publish", /**
   * Verify incomplete or mismatched package artifacts block every publish; arrange the scenario and make its
   * single direct assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    const h = harness(); change(h.artifacts);
    assert.throws(/**
     * Exercise publicationActions so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by publicationActions.
     */ () => publicationActions(createPlan(version, {}, parseOptions([])), h.artifacts, {}), /Missing or invalid artifact/);
  });
}
const identity = { tag: "v0.1.0", version: "0.1.0", repository: REPOSITORY, head: "abc", tagged: "abc", onMain: true, clean: true };
test("release identity accepts a clean matching tag on main", /**
 * Verify release identity accepts a clean matching tag on main; arrange the scenario and make its single
 * direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  assert.equal(verifyReleaseIdentity(identity), undefined);
});
for (const change of [{ tag: "v0.2.0" }, { tag: "--help" }, { version: "1.2.3-beta" }, { repository: "someone/fork" }, { head: "" }, { tagged: "changed" }, { onMain: false }, { clean: false }]) {
  test(`release identity rejects ${JSON.stringify(change)}`, /**
   * Verify release identity rejects ${JSON.stringify(change)}; arrange the scenario and make its single direct
   * assertion. Assertion and setup failures propagate to the test runner.
   * @responsibility coordinator
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ () => {
    assert.throws(/**
     * Exercise verifyReleaseIdentity so the enclosing assertion can observe its return value or thrown error.
     * @responsibility coordinator
     * @returns {unknown} The result returned by verifyReleaseIdentity.
     */ () => verifyReleaseIdentity({ ...identity, ...change }), Error);
  });
}
test("CLI invalid arguments exit nonzero without touching manifests", /**
 * Verify CLI invalid arguments exit nonzero without touching manifests; arrange the scenario and make its
 * single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = spawnSync(process.execPath, ["scripts/publish-workspaces.mjs", "--invalid"], { encoding: "utf8" });
  assert.deepEqual([result.status, readFiles()], [1, original]);
});
test("CLI help exits successfully without authenticating or changing versions", /**
 * Verify CLI help exits successfully without authenticating or changing versions; arrange the scenario and
 * make its single direct assertion. Assertion and setup failures propagate to the test runner.
 * @responsibility coordinator
 * @returns {void} Completes the documented operation; no return value is consumed.
 */ () => {
  const result = spawnSync(process.execPath, ["scripts/publish-workspaces.mjs", "--help"], { encoding: "utf8" });
  assert.deepEqual([result.status, result.stdout.includes("--resume"), readFiles()], [0, true, original]);
});
