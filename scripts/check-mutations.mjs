import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { parse } from "acorn";
import { MUTATIONS, applyMutation, escapePattern, probeOutcome } from "./testing/mutations.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "vrl-mutations-"));
try {
  prepareWorkspace(root, temporary);
  for (const mutation of MUTATIONS) verifyMutation(temporary, mutation);
  console.log(`Behavioral sensitivity: ${MUTATIONS.length}/${MUTATIONS.length} selected faults detected by their intended assertions (separate from coverage).`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

/**
 * Create an isolated mutation workspace with copied first-party sources and links to existing dependencies.
 * @responsibility coordinator
 * @param {string} source - Repository directory copied into the isolated mutation workspace.
 * @param {string} target - Owned isolated workspace destination directory.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function prepareWorkspace(source, target) {
  writeFileSync(join(target, "package.json"), '{"type":"module","private":true}');
  for (const directory of ["packages", "tests", "examples"]) cpSync(join(source, directory), join(target, directory), { recursive: true });
  mkdirSync(join(target, "node_modules", "@subvertic"), { recursive: true });
  for (const entry of readdirSync(join(source, "node_modules"), { withFileTypes: true })) {
    if (entry.name === "@subvertic" || entry.name.startsWith(".")) continue;
    symlinkSync(join(source, "node_modules", entry.name), join(target, "node_modules", entry.name), entry.isFile() ? "file" : "junction");
  }
  for (const entry of readdirSync(join(target, "packages"))) {
    const path = join(target, "packages", entry);
    const { name } = JSON.parse(readFileSync(join(path, "package.json"), "utf8"));
    symlinkSync(path, join(target, "node_modules", name), "junction");
  }
}

/**
 * Validate mutation syntax, verify the baseline, require the intended assertion to detect the fault and
 * restore original source in all cases.
 * @responsibility coordinator
 * @param {string} directory - Filesystem directory within the explicitly selected workspace.
 * @param {unknown} mutation - Reviewed deliberate fault and the one test expected to detect it.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function verifyMutation(directory, mutation) {
  const filename = join(directory, mutation.file);
  const original = readFileSync(filename, "utf8");
  const changed = applyMutation(original, mutation);
  parse(changed, { ecmaVersion: "latest", sourceType: "module" });
  requireOutcome(runProbe(directory, mutation), mutation, "passed");
  try {
    writeFileSync(filename, changed);
    requireOutcome(runProbe(directory, mutation), mutation, "detected");
    console.log(`Detected ${mutation.name}: ${mutation.testName}`);
  } finally {
    writeFileSync(filename, original);
  }
}

/**
 * Run exactly the selected mutation test with a fixed replay seed, bounded time and captured output.
 * @responsibility coordinator
 * @param {string} directory - Filesystem directory within the explicitly selected workspace.
 * @param {unknown} mutation - Reviewed deliberate fault and the one test expected to detect it.
 * @returns {unknown} The result returned by spawnSync.
 */
function runProbe(directory, mutation) {
  return spawnSync(process.execPath, ["--test", "--test-reporter=tap", `--test-name-pattern=^${escapePattern(mutation.testName)}$`, mutation.testFile],
    { cwd: directory, encoding: "utf8", timeout: 30_000, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, VRL_TEST_SEED: "1448234018" } });
}

/**
 * Classify the test process outcome and reject crashes, timeouts or unrelated failures as evidence of mutation
 * detection.
 * @responsibility coordinator
 * @param {Object} result - Captured process status, streams and optional error/signal.
 * @param {unknown} mutation - Reviewed deliberate fault and the one test expected to detect it.
 * @param {unknown} expected - Independently specified expected result or classification.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
function requireOutcome(result, mutation, expected) {
  const outcome = probeOutcome(result, mutation.testName);
  if (outcome !== expected) throw new Error(`${mutation.name}: expected ${expected}, got ${outcome}.\n${result.stdout}\n${result.stderr}\n${result.error ?? result.signal ?? ""}`);
}
