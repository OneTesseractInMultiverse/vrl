import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { REGISTRY, WORKSPACES } from "./config.mjs";

/**
 * Run a synchronous external command with captured or inherited streams and propagate process failure with its
 * exit code.
 * @responsibility coordinator
 * @param {string} program - Executable name or path invoked without shell expansion.
 * @param {unknown} args - Ordered command-line arguments; no shell interpolation is performed by process adapters.
 * @param {boolean} capture - Whether to capture process streams instead of inheriting them; defaults to false.
 * @returns {unknown} The result.stdout value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function command(program, args, capture = false) {
  const result = spawnSync(program, args, { encoding: "utf8", stdio: capture ? "pipe" : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const error = new Error(`${program} failed${capture ? `: ${result.stderr.trim()}` : "."}`);
    error.exitCode = result.status ?? 1;
    throw error;
  }
  return result.stdout;
}

/**
 * Read root and workspace manifest/lockfile text into the release planner's path-to-content input.
 * @responsibility coordinator
 * @returns {unknown} The result returned by Object.fromEntries.
 */
export function readFiles() {
  return Object.fromEntries(["package.json", "package-lock.json", ...WORKSPACES.map(/**
   * Project pkg.path from the current record.
   * @responsibility computation
   * @param {unknown} pkg - Configured, packed or installed package record.
   * @returns {unknown} The pkg.path value selected or validated above.
   */ pkg => pkg.path)].map(/**
   * Project the current entry into an ordered tuple for ["package.json", "package-lock.json",
   * ...WORKSPACES.map(pkg => pkg.path)].map.
   * @responsibility computation
   * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
   * @returns {Array} The ordered records or values assembled above.
   */ path => [path, readFileSync(path, "utf8")]));
}

/**
 * Query the fixed npm registry for JSON metadata, accepting E404 only when explicitly allowed and rejecting
 * other failures.
 * @responsibility coordinator
 * @param {unknown} spec - Package/version specifier sent to the fixed npm registry.
 * @param {unknown} field - Field name selected from the declared contract.
 * @param {unknown} missingAllowed - Whether a registry E404 is an accepted empty result; defaults to false.
 * @returns {unknown} The ordered records or values assembled above. The value value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
function registryValue(spec, field, missingAllowed = false) {
  const result = spawnSync("npm", ["view", spec, field, "--json", `--registry=${REGISTRY}`, `--@subvertic:registry=${REGISTRY}`], { encoding: "utf8" });
  if (result.error) throw result.error;
  let value;
  try { value = JSON.parse(result.stdout); } catch { throw new Error(`Invalid registry response for ${spec}.`); }
  if (result.status !== 0) {
    if (missingAllowed && value.error?.code === "E404") return [];
    throw new Error(`Registry query failed for ${spec}: ${value.error?.code ?? result.status}.`);
  }
  return value;
}

/**
 * Construct concrete release ports for commands, filesystem, authentication, npm registry access and temporary
 * artifact cleanup.
 * @responsibility coordinator
 * @returns {Object} A record containing readFiles, versions, report, write, clean, check, dryRun, authenticate, pack, integrity, publish, cleanup.
 */
export function systemPorts() {
  let artifactDirectory;
  return {
    readFiles,
    /**
     * Query one package's published versions, normalize a single version to a list and reject malformed registry
     * data.
     * @responsibility coordinator
     * @returns {unknown} The result returned by Object.fromEntries.
     */
    versions: () => Object.fromEntries(WORKSPACES.map(/**
     * Query one package's published versions, normalize a single version to a list and reject malformed registry
     * data.
     * @responsibility coordinator
     * @param {unknown} pkg - Configured, packed or installed package record.
     * @returns {Array} The ordered records or values assembled above.
     * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
     */ pkg => {
      const value = registryValue(pkg.name, "versions", true);
      const versions = typeof value === "string" ? [value] : value;
      if (!Array.isArray(versions) || versions.some(/**
       * Evaluate the selection condition typeof version !== "string".
       * @responsibility computation
       * @param {string} version - Stable x.y.z package version.
       * @returns {boolean} The result of the documented comparison or calculation.
       */ version => typeof version !== "string")) throw new Error(`Invalid version list for ${pkg.name}.`);
      return [pkg.name, versions];
    })),
    /**
     * Write the resolved release plan and publication status to standard output.
     * @responsibility coordinator
     * @param {Object} plan - Validated release plan containing the shared version and package publication status.
     * @returns {unknown} The result returned by console.log.
     */
    report: plan => console.log(`Release plan: ${plan.current} -> ${plan.version}\n${plan.packages.map(/**
     * Format the current entry as the text required by plan.packages.map, preserving supplied values.
     * @responsibility computation
     * @param {unknown} pkg - Configured, packed or installed package record.
     * @returns {string} Formatted text retaining the supplied values and ordering.
     */ pkg => `    - ${pkg.name}${pkg.published ? " (published; integrity verification required)" : ""}`).join("\n")}`),
    /**
     * Write supplied release file content to its configured filesystem path.
     * @responsibility coordinator
     * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
     * @param {unknown} content - Prepared content bounds or file text, according to the consuming adapter.
     * @returns {unknown} The result returned by writeFileSync.
     */
    write: (path, content) => writeFileSync(path, content),
    /**
     * Require an empty tracked and untracked working-tree status before publication or dry run.
     * @responsibility coordinator
     * @returns {void} Returns normally when the documented guard passes; otherwise throws.
     * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
     */
    clean: () => { if (command("git", ["status", "--porcelain", "--untracked-files=normal"], true).trim()) throw new Error("Commit or isolate all working-tree changes before publication or dry run."); },
    /**
     * Run the repository's full quality gate before release publication.
     * @responsibility coordinator
     * @returns {unknown} The result returned by command.
     */
    check: () => command("npm", ["run", "check"]),
    /**
     * Inspect workspace tarball contents through npm without lifecycle scripts or publication.
     * @responsibility coordinator
     * @returns {unknown} The result returned by command.
     */
    dryRun: () => command("npm", ["pack", "--workspaces", "--dry-run", "--ignore-scripts"]),
    /**
     * Require trusted-publisher credentials in the intended environment or verify the local npm identity.
     * @responsibility coordinator
     * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Contains validated release mode, version, registry and authentication flags.
     * @returns {void} Returns normally when the documented guard passes; otherwise throws.
     * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
     */
    authenticate: options => {
      if (options.trustedPublisher) {
        if (process.env.GITHUB_ACTIONS !== "true" || !process.env.ACTIONS_ID_TOKEN_REQUEST_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) throw new Error("Trusted publication requires GitHub Actions OIDC credentials.");
      } else command("npm", ["whoami", `--registry=${REGISTRY}`], true);
    },
    /**
     * Create a temporary artifact directory, pack all workspaces and compute each tarball's SHA-512 integrity.
     * @responsibility coordinator
     * @returns {Array} The result returned by packed.map.
     */
    pack: () => {
      artifactDirectory = mkdtempSync(join(tmpdir(), "vrl-release-"));
      const packed = JSON.parse(command("npm", ["pack", "--workspaces", "--json", "--ignore-scripts", "--pack-destination", artifactDirectory], true));
      return packed.map(/**
       * Read one packed tarball and compute its independent SHA-512 integrity for publication verification.
       * @responsibility coordinator
       * @param {unknown} pkg - Configured, packed or installed package record.
       * @returns {Object} A record containing name, version, path, integrity.
       */ pkg => {
        const path = join(artifactDirectory, pkg.filename);
        return { name: pkg.name, version: pkg.version, path, integrity: `sha512-${createHash("sha512").update(readFileSync(path)).digest("base64")}` };
      });
    },
    /**
     * Read registry integrity values for the plan's already-published package versions.
     * @responsibility coordinator
     * @param {Object} plan - Validated release plan containing the shared version and package publication status.
     * @returns {unknown} The result returned by Object.fromEntries.
     */
    integrity: plan => Object.fromEntries(plan.packages.filter(/**
     * Evaluate the selection condition pkg.published.
     * @responsibility computation
     * @param {unknown} pkg - Configured, packed or installed package record.
     * @returns {unknown} The pkg.published value selected or validated above.
     */ pkg => pkg.published).map(/**
     * Project the current entry into an ordered tuple for plan.packages.filter(pkg => pkg.published).map.
     * @responsibility computation
     * @param {unknown} pkg - Configured, packed or installed package record.
     * @returns {Array} The ordered records or values assembled above.
     */ pkg => [pkg.name, registryValue(`${pkg.name}@${plan.version}`, "dist.integrity")])),
    /**
     * Publish one prepared artifact to the fixed public registry with configured provenance and optional OTP.
     * @responsibility coordinator
     * @param {Object} artifact - Prepared package tarball metadata.
     * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Contains validated release mode, version, registry and authentication flags.
     * @returns {unknown} The result returned by command.
     */
    publish: (artifact, options) => command("npm", ["publish", artifact.path, "--ignore-scripts", "--access=public", `--registry=${REGISTRY}`, `--provenance=${options.provenance}`, ...(options.otp ? ["--otp", options.otp] : [])]),
    /**
     * Remove this release invocation's temporary artifact directory when one was created.
     * @responsibility coordinator
     * @returns {void} Completes the documented operation; no return value is consumed.
     */
    cleanup: () => { if (artifactDirectory) rmSync(artifactDirectory, { recursive: true, force: true }); }
  };
}
