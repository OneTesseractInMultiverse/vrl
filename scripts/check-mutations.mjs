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

function prepareWorkspace(source, target) {
  writeFileSync(join(target, "package.json"), '{"type":"module","private":true}');
  for (const directory of ["packages", "tests"]) cpSync(join(source, directory), join(target, directory), { recursive: true });
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

function runProbe(directory, mutation) {
  return spawnSync(process.execPath, ["--test", "--test-reporter=tap", `--test-name-pattern=^${escapePattern(mutation.testName)}$`, mutation.testFile],
    { cwd: directory, encoding: "utf8", timeout: 30_000, maxBuffer: 2 * 1024 * 1024, env: { ...process.env, VRL_TEST_SEED: "1448234018" } });
}

function requireOutcome(result, mutation, expected) {
  const outcome = probeOutcome(result, mutation.testName);
  if (outcome !== expected) throw new Error(`${mutation.name}: expected ${expected}, got ${outcome}.\n${result.stdout}\n${result.stderr}\n${result.error ?? result.signal ?? ""}`);
}
