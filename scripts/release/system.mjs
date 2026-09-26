import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { REGISTRY, WORKSPACES } from "./config.mjs";

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

export function readFiles() {
  return Object.fromEntries(["package.json", "package-lock.json", ...WORKSPACES.map(pkg => pkg.path)].map(path => [path, readFileSync(path, "utf8")]));
}

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

export function systemPorts() {
  let artifactDirectory;
  return {
    readFiles,
    versions: () => Object.fromEntries(WORKSPACES.map(pkg => {
      const value = registryValue(pkg.name, "versions", true);
      const versions = typeof value === "string" ? [value] : value;
      if (!Array.isArray(versions) || versions.some(version => typeof version !== "string")) throw new Error(`Invalid version list for ${pkg.name}.`);
      return [pkg.name, versions];
    })),
    report: plan => console.log(`Release plan: ${plan.current} -> ${plan.version}\n${plan.packages.map(pkg => `    - ${pkg.name}${pkg.published ? " (published; integrity verification required)" : ""}`).join("\n")}`),
    write: (path, content) => writeFileSync(path, content),
    clean: () => { if (command("git", ["status", "--porcelain", "--untracked-files=normal"], true).trim()) throw new Error("Commit or isolate all working-tree changes before publication or dry run."); },
    check: () => command("npm", ["run", "check"]),
    dryRun: () => command("npm", ["pack", "--workspaces", "--dry-run", "--ignore-scripts"]),
    authenticate: options => {
      if (options.trustedPublisher) {
        if (process.env.GITHUB_ACTIONS !== "true" || !process.env.ACTIONS_ID_TOKEN_REQUEST_URL || !process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN) throw new Error("Trusted publication requires GitHub Actions OIDC credentials.");
      } else command("npm", ["whoami", `--registry=${REGISTRY}`], true);
    },
    pack: () => {
      artifactDirectory = mkdtempSync(join(tmpdir(), "vrl-release-"));
      const packed = JSON.parse(command("npm", ["pack", "--workspaces", "--json", "--ignore-scripts", "--pack-destination", artifactDirectory], true));
      return packed.map(pkg => {
        const path = join(artifactDirectory, pkg.filename);
        return { name: pkg.name, version: pkg.version, path, integrity: `sha512-${createHash("sha512").update(readFileSync(path)).digest("base64")}` };
      });
    },
    integrity: plan => Object.fromEntries(plan.packages.filter(pkg => pkg.published).map(pkg => [pkg.name, registryValue(`${pkg.name}@${plan.version}`, "dist.integrity")])),
    publish: (artifact, options) => command("npm", ["publish", artifact.path, "--ignore-scripts", "--access=public", `--registry=${REGISTRY}`, `--provenance=${options.provenance}`, ...(options.otp ? ["--otp", options.otp] : [])]),
    cleanup: () => { if (artifactDirectory) rmSync(artifactDirectory, { recursive: true, force: true }); }
  };
}
