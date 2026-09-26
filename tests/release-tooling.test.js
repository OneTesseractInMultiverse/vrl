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
const names = WORKSPACES.map(pkg => pkg.name);
const nextVersion = version.split(".").map((part, index) => index === 2 ? Number(part) + 1 : part).join(".");
function changedFile(path, change) {
  const files = { ...original }, value = JSON.parse(files[path]);
  change(value); files[path] = JSON.stringify(value); return files;
}
function harness(overrides = {}) {
  const calls = [], writes = {}, attempted = [];
  const artifacts = names.map(name => ({ name, version, integrity: `sha512-${name}`, path: `/temporary/${name}.tgz` }));
  const ports = {
    readFiles: () => { calls.push("read"); return { ...original }; },
    versions: () => { calls.push("versions"); return {}; },
    report: () => calls.push("report"),
    write: (path, content) => { calls.push("write"); writes[path] = content; },
    clean: () => calls.push("clean"), check: () => calls.push("check"),
    dryRun: () => calls.push("dry-run"), authenticate: () => calls.push("authenticate"),
    pack: () => { calls.push("pack"); return artifacts; },
    integrity: () => { calls.push("integrity"); return {}; },
    publish: artifact => { calls.push("publish"); attempted.push(artifact.name); },
    cleanup: () => calls.push("cleanup"), ...overrides
  };
  return { ports, calls, writes, attempted, artifacts };
}

for (const args of [["--unknown"], ["--version"], ["--version", "--plan"], ["--release", "next"], ["--version", "1.0.0", "--release", "current"], ["--plan", "--prepare"], ["--prepare", "--dry-run"], ["--plan", "--otp", "123456"], ["--trusted-publisher", "--otp", "123456"], ["--skip-registry"], ["--resume", "--prepare"], ["--resume", "--skip-registry", "--plan"], ["--resume", "--dry-run"], ["--trusted-publisher", "--prepare"]]) {
  test(`invalid release options fail before effects: ${args.join(" ")}`, () => {
    assert.throws(() => parseOptions(args), Error);
  });
}
test("default publication uses the committed current version", () => {
  assert.deepEqual([parseOptions([]).release, parseOptions(["--provenance", "--provenance=false"]).provenance], ["current", false]);
});
for (const candidate of ["1.2", "v1.2.3", "01.2.3", "1.2.3-beta", "1.2.3\n", "9007199254740992.0.0", null]) {
  test(`unsupported release version is rejected: ${candidate}`, () => {
    assert.throws(() => requireVersion(candidate), Error);
  });
}
test("repository manifests have consistent identity and dependency pins", () => {
  assert.equal(validateManifests(original), version);
});
for (const [name, path, mutate] of [
  ["public root", "package.json", value => { value.private = false; }],
  ["root lock version", "package-lock.json", value => { value.version = "9.9.9"; }],
  ["workspace identity", WORKSPACES[0].path, value => { value.name = "wrong"; }],
  ["workspace version", WORKSPACES[0].path, value => { value.version = "9.9.9"; }],
  ["private workspace", WORKSPACES[0].path, value => { value.private = true; }],
  ["wrong provenance repository", WORKSPACES[0].path, value => { value.repository.url = "git+https://github.com/wrong/repo.git"; }],
  ["wrong repository directory", WORKSPACES[0].path, value => { value.repository.directory = "elsewhere"; }],
  ["restricted publish", WORKSPACES[0].path, value => { value.publishConfig.access = "restricted"; }],
  ["foreign registry", WORKSPACES[0].path, value => { value.publishConfig.registry = "https://example.com"; }],
  ["missing locked workspace", "package-lock.json", value => { delete value.packages[WORKSPACES[0].directory]; }],
  ["wrong internal pin", WORKSPACES[1].path, value => { value.dependencies[names[0]] = "^0.1.0"; }],
  ["wrong locked pin", "package-lock.json", value => { value.packages[WORKSPACES[1].directory].dependencies[names[0]] = "^0.1.0"; }]
]) {
  test(`${name} blocks release validation`, () => {
    assert.throws(() => validateManifests(changedFile(path, mutate)), Error);
  });
}
for (const [args, expected] of [[["--plan", "--release", "minor"], "0.2.0"], [["--plan", "--release", "major"], "1.0.0"], [["--plan", "--release", "patch"], "0.1.1"], [["--plan", "--version", "2.3.4"], "2.3.4"]]) {
  test(`release planning resolves ${args.join(" ")}`, () => {
    assert.equal(createPlan("0.1.0", {}, parseOptions(args)).version, expected);
  });
}
test("automatic preparation skips versions used by any workspace", () => {
  assert.equal(createPlan("0.1.0", { a: ["0.1.0"], b: ["0.1.1"] }, parseOptions(["--prepare", "--release", "auto"])).version, "0.1.2");
});
test("publication never bumps versions implicitly", () => {
  assert.throws(() => createPlan("0.1.0", {}, parseOptions(["--release", "minor"])), /never change versions/);
});
test("already published versions require explicit resume", () => {
  assert.throws(() => createPlan(version, { [names[0]]: [version] }, parseOptions([])), /--resume/);
});
test("preparation updates all version and lock records without mutating input", () => {
  const before = JSON.stringify(original), prepared = prepareFiles(original, nextVersion);
  assert.deepEqual([validateManifests(prepared), JSON.parse(prepared["package-lock.json"]).version, JSON.stringify(original)], [nextVersion, nextVersion, before]);
});
test("planning only reads and reports without writing or running checks", () => {
  const h = harness(); runRelease(parseOptions(["--plan", "--skip-registry"]), h.ports);
  assert.deepEqual(h.calls, ["read", "report"]);
});
test("preparation only writes projected version files", () => {
  const h = harness(); runRelease(parseOptions(["--prepare", "--skip-registry", "--version", nextVersion]), h.ports);
  assert.deepEqual([h.calls, validateManifests(h.writes)], [["read", "report", ...Array(8).fill("write")], nextVersion]);
});
for (let failAt = 0; failAt < Object.keys(original).length; failAt++) {
  test(`failed preparation write ${failAt} restores every attempted file`, () => {
    const files = { ...original }, updated = prepareFiles(files, nextVersion); let calls = 0, message;
    try { writePreparedFiles(files, updated, { write: (path, content) => { files[path] = content; if (calls++ === failAt) throw new Error("disk failure"); } }); } catch (error) { message = error.message; }
    assert.deepEqual([message, files], ["disk failure", original]);
  });
}
test("restoration failure reports the exact file and original error", () => {
  assert.throws(() => writePreparedFiles({ a: "old" }, { a: "new" }, { write: () => { throw new Error("disk failure"); } }), /Restoration also failed: a: disk failure/);
});
test("unchanged preparation does not write files", () => {
  const writes = []; writePreparedFiles({ a: "same" }, { a: "same" }, { write: path => writes.push(path) });
  assert.deepEqual(writes, []);
});
test("dry run never queries, authenticates, writes, packs or publishes", () => {
  const h = harness(); runRelease(parseOptions(["--dry-run"]), h.ports);
  assert.deepEqual(h.calls, ["read", "report", "clean", "check", "dry-run"]);
});
test("successful publication validates all artifacts before publishing in dependency order", () => {
  const h = harness(), result = runRelease(parseOptions([]), h.ports);
  assert.deepEqual([h.calls, h.attempted, h.writes, result.published], [["read", "versions", "report", "clean", "check", "authenticate", "pack", "integrity", ...Array(6).fill("publish"), "cleanup"], names, {}, names]);
});
for (const stage of ["versions", "clean", "check", "authenticate", "pack", "integrity"]) {
  test(`failure during ${stage} prevents all publication and version writes`, () => {
    const h = harness({ [stage]: () => { throw new Error(`${stage} failed`); } }); let message;
    try { runRelease(parseOptions([]), h.ports); } catch (error) { message = error.message; }
    assert.deepEqual([message.includes(`${stage} failed`), h.attempted, h.writes, h.calls.includes("cleanup")], [true, [], {}, ["pack", "integrity"].includes(stage)]);
  });
}
for (const completed of [0, 1, 3, 5]) {
  test(`publication failure after ${completed} packages retains progress and command exit status`, () => {
    let count = 0, failure; const h = harness({ publish: () => { if (count++ === completed) { const error = new Error("command failed"); error.exitCode = 17; throw error; } } });
    try { runRelease(parseOptions([]), h.ports); } catch (error) { failure = error; }
    assert.deepEqual([failure.exitCode, failure.message.includes(`Confirmed published: ${names.slice(0, completed).join(", ") || "none"}.`), h.writes, h.calls.at(-1)], [17, true, {}, "cleanup"]);
  });
}
test("resume skips only identical published packages and publishes missing dependencies in order", () => {
  const h = harness({ versions: () => ({ [names[0]]: [version], [names[1]]: [version] }), integrity: () => ({ [names[0]]: `sha512-${names[0]}`, [names[1]]: `sha512-${names[1]}` }) });
  const result = runRelease(parseOptions(["--resume", "--skip-check"]), h.ports);
  assert.deepEqual([result.skipped, h.attempted, h.calls.includes("check")], [names.slice(0, 2), names.slice(2), false]);
});
test("resume is idempotent when every published artifact matches", () => {
  const h = harness({ versions: () => Object.fromEntries(names.map(name => [name, [version]])), integrity: () => Object.fromEntries(names.map(name => [name, `sha512-${name}`])) });
  const result = runRelease(parseOptions(["--resume"]), h.ports);
  assert.deepEqual([result.skipped, result.published, h.attempted], [names, [], []]);
});
for (const integrity of ["sha512-different", undefined]) {
  test(`resume rejects unverified artifacts before publishing anything: ${integrity}`, () => {
    const h = harness({ versions: () => ({ [names[5]]: [version] }), integrity: () => ({ [names[5]]: integrity }) }); let failed = false;
    try { runRelease(parseOptions(["--resume"]), h.ports); } catch { failed = true; }
    assert.deepEqual([failed, h.attempted, h.calls.at(-1)], [true, [], "cleanup"]);
  });
}
for (const change of [artifacts => artifacts.pop(), artifacts => { artifacts[0].version = "9.9.9"; }, artifacts => { delete artifacts[0].integrity; }]) {
  test("incomplete or mismatched package artifacts block every publish", () => {
    const h = harness(); change(h.artifacts);
    assert.throws(() => publicationActions(createPlan(version, {}, parseOptions([])), h.artifacts, {}), /Missing or invalid artifact/);
  });
}
const identity = { tag: "v0.1.0", version: "0.1.0", repository: REPOSITORY, head: "abc", tagged: "abc", onMain: true, clean: true };
test("release identity accepts a clean matching tag on main", () => {
  assert.equal(verifyReleaseIdentity(identity), undefined);
});
for (const change of [{ tag: "v0.2.0" }, { tag: "--help" }, { version: "1.2.3-beta" }, { repository: "someone/fork" }, { head: "" }, { tagged: "changed" }, { onMain: false }, { clean: false }]) {
  test(`release identity rejects ${JSON.stringify(change)}`, () => {
    assert.throws(() => verifyReleaseIdentity({ ...identity, ...change }), Error);
  });
}
test("CLI invalid arguments exit nonzero without touching manifests", () => {
  const result = spawnSync(process.execPath, ["scripts/publish-workspaces.mjs", "--invalid"], { encoding: "utf8" });
  assert.deepEqual([result.status, readFiles()], [1, original]);
});
test("CLI help exits successfully without authenticating or changing versions", () => {
  const result = spawnSync(process.execPath, ["scripts/publish-workspaces.mjs", "--help"], { encoding: "utf8" });
  assert.deepEqual([result.status, result.stdout.includes("--resume"), readFiles()], [0, true, original]);
});
