import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "vrl-consumer-"));
try {
  const packages = JSON.parse(run("npm", ["pack", "--workspaces", "--json", "--pack-destination", temporary], root));
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const lock = JSON.parse(readFileSync(join(root, "package-lock.json"), "utf8"));
  const consumer = consumerManifest(packages, manifest.devDependencies);
  writeFileSync(join(temporary, "package.json"), JSON.stringify(consumer));
  writeFileSync(join(temporary, "package-lock.json"), JSON.stringify(consumerLock(packages, consumer, lock)));
  cpSync(join(root, "tests/types"), join(temporary, "types"), { recursive: true });
  const examples = documentationExamples(readFileSync(join(root, "docs/public-contracts.md"), "utf8"));
  examples.forEach(/**
   * Apply writeFileSync to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility coordinator
   * @param {string} source - Exact source text inspected or transformed without execution.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result returned by writeFileSync.
   */ (source, index) => writeFileSync(join(temporary, `types/documentation-${index}.ts`), source));
  const cache = run("npm", ["config", "get", "cache"], root).trim();
  run("npm", ["ci", "--offline", "--ignore-scripts", "--legacy-peer-deps", "--no-audit", "--no-fund", "--cache", cache], temporary);
  run(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "types/tsconfig.json"], temporary);
  examples.forEach(/**
   * Apply run to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility coordinator
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result returned by run.
   */ (_, index) => run(process.execPath, [`types/documentation-${index}.ts`], temporary));
  run(process.execPath, ["--input-type=module", "-e", "import {createDiagramState} from '@subvertic/vrl-diagram'; const state = createDiagramState('route Consumer\\nstart\\nexit'); if (!state.ok || !state.svg.startsWith('<svg ')) throw new Error('Packed facade failed');"], temporary);
  console.log(`Checked declarations, ${examples.length} documentation examples, and runtime entry points from ${packages.length} packed packages in an isolated offline consumer.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

/**
 * Build an isolated package consumer manifest referencing local tarballs and locked declaration-check
 * dependencies.
 * @responsibility computation
 * @param {Object[]} packages - Packed first-party package records with tarball identity, filename and integrity.
 * @param {unknown} development - Locked development dependency versions from the root manifest.
 * @returns {Object} A record containing name, version, private, type, dependencies, devDependencies.
 */
function consumerManifest(packages, development) {
  return {
    name: "vrl-contract-consumer", version: "0.0.0", private: true, type: "module",
    dependencies: Object.fromEntries(packages.map(/**
     * Project the current entry into an ordered tuple for packages.map.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {unknown} input1.name - Field, port, fixture or other named subject selected by the surrounding operation.
     * @param {string} input1.filename - Filesystem or repository-relative filename used by the adapter.
     * @returns {Array} The ordered records or values assembled above.
     */ ({ name, filename }) => [name, `file:./${filename}`])),
    devDependencies: { typescript: development.typescript, svelte: development.svelte, "@types/react": development["@types/react"] }
  };
}

/**
 * Replace workspace links with packed artifacts while preserving locked third-party registry resolutions.
 * Preserve locked registry resolutions; replace workspace links with the tarballs under test.
 * @responsibility computation
 * @param {Object[]} packages - Packed first-party package records with tarball identity, filename and integrity.
 * @param {Object} manifest - Parsed package manifest.
 * @param {Object} lock - Parsed npm lockfile whose registry resolutions must be preserved.
 * @returns {Object} A record containing name, version, lockfileVersion, requires, packages.
 */

function consumerLock(packages, manifest, lock) {
  const entries = Object.fromEntries(Object.entries(lock.packages).filter(/**
   * Evaluate the selection condition path.startsWith("node_modules/") && !entry.link.
   * @responsibility computation
   * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
   * @param {unknown} input1[0] - Tuple member bound as path: the ordered input consumed below.
   * @param {unknown} input1[1] - Tuple member bound as entry: the ordered input consumed below.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ ([path, entry]) => path.startsWith("node_modules/") && !entry.link));
  for (const { name, filename, integrity } of packages) {
    const key = `node_modules/${name}`;
    const workspace = lock.packages[lock.packages[key].resolved];
    entries[key] = { ...workspace, resolved: `file:${filename}`, integrity };
  }
  return { name: manifest.name, version: manifest.version, lockfileVersion: lock.lockfileVersion, requires: true, packages: { "": manifest, ...entries } };
}

/**
 * Extract executable JavaScript/TypeScript fenced bodies from the public-contract guide for packed-package
 * checks.
 * @responsibility computation
 * @param {string} markdown - Repository Markdown text to inspect without executing its contents.
 * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function documentationExamples(markdown) {
  return [...markdown.matchAll(/```(?:js|ts)\n([\s\S]*?)```/g)].map(/**
   * Project match.1 from the current record.
   * @responsibility computation
   * @param {unknown} match - Regular-expression match including the capture groups consumed below.
   * @returns {unknown} The match.1 value selected or validated above.
   */ (match) => match[1]);
}

/**
 * Execute the requested verification command in its working directory and propagate process or nonzero-exit
 * failures.
 * @responsibility coordinator
 * @param {unknown} command - Executable name or path of the verification command.
 * @param {unknown} args - Ordered command-line arguments; no shell interpolation is performed by process adapters.
 * @param {string} cwd - Working directory for the child process.
 * @returns {unknown} The result.stdout value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
