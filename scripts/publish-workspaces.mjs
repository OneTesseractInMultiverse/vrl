import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const WORKSPACES = [
  { name: "@subvertic/core", path: "packages/vrl-core/package.json" },
  { name: "@subvertic/render-svg", path: "packages/vrl-render-svg/package.json" },
  { name: "@subvertic/react", path: "packages/vrl-react/package.json" },
  { name: "@subvertic/svelte", path: "packages/vrl-svelte/package.json" },
  { name: "@subvertic/sveltekit", path: "packages/vrl-sveltekit/package.json" }
];

const DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"];

const args = parseArgs(process.argv.slice(2));
const rootManifestPath = "package.json";
const rootManifest = readJson(rootManifestPath);
const workspaceManifests = WORKSPACES.map((workspace) => ({
  ...workspace,
  manifest: readJson(workspace.path)
}));
const internalPackageNames = new Set(workspaceManifests.map((workspace) => workspace.manifest.name));
const currentVersion = assertSharedVersion(rootManifest, workspaceManifests);
const publishedVersions = args.skipRegistry ? emptyPublishedVersions() : listPublishedVersions(workspaceManifests);
const targetVersion = resolveTargetVersion(currentVersion, publishedVersions, args);

assertTargetVersionIsPublishable(targetVersion, publishedVersions, args);
printPlan(currentVersion, targetVersion, args);

if (args.plan === true) {
  process.exit(0);
}

updateVersions(rootManifest, workspaceManifests, targetVersion, internalPackageNames);
writeJson(rootManifestPath, rootManifest);
for (const workspace of workspaceManifests) {
  writeJson(workspace.path, workspace.manifest);
}
updatePackageLock(targetVersion, internalPackageNames);

if (args.prepare === true) {
  console.log(
    `Prepared release ${targetVersion}. Review and commit package.json, package-lock.json, and workspace package.json files before publishing.`
  );
  process.exit(0);
}

if (args.skipCheck === false) {
  run("npm", ["run", "check"]);
}

for (const workspace of WORKSPACES) {
  const publishArgs = [
    "publish",
    "--workspace",
    workspace.name,
    "--access",
    "public",
    args.provenance === true ? "--provenance" : "--provenance=false"
  ];

  if (args.dryRun === true) {
    publishArgs.push("--dry-run");
  }

  if (args.otp !== "") {
    publishArgs.push("--otp", args.otp);
  }

  run("npm", publishArgs);
}

function parseArgs(rawArgs) {
  const parsed = {
    dryRun: false,
    otp: "",
    plan: false,
    prepare: false,
    provenance: false,
    release: "auto",
    skipCheck: false,
    skipRegistry: false,
    trustedPublisher: false,
    version: ""
  };

  for (let index = 0; index < rawArgs.length; index += 1) {
    const arg = rawArgs[index];

    if (arg === "--dry-run") {
      parsed.dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsageAndExit();
    } else if (arg === "--otp") {
      parsed.otp = requireValue(rawArgs, index, arg);
      index += 1;
    } else if (arg === "--plan") {
      parsed.plan = true;
    } else if (arg === "--prepare") {
      parsed.prepare = true;
    } else if (arg === "--provenance") {
      parsed.provenance = true;
    } else if (arg === "--provenance=false") {
      parsed.provenance = false;
    } else if (arg === "--release") {
      parsed.release = requireValue(rawArgs, index, arg);
      index += 1;
    } else if (arg === "--skip-check") {
      parsed.skipCheck = true;
    } else if (arg === "--skip-registry") {
      parsed.skipRegistry = true;
    } else if (arg === "--trusted-publisher") {
      parsed.trustedPublisher = true;
    } else if (arg === "--version") {
      parsed.version = requireValue(rawArgs, index, arg);
      index += 1;
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  validateArgs(parsed);
  return parsed;
}

function requireValue(rawArgs, index, flag) {
  const value = rawArgs[index + 1];
  if (value === undefined || value.startsWith("--")) {
    fail(`${flag} requires a value.`);
  }

  return value;
}

function validateArgs(parsed) {
  if (parsed.version !== "" && parsed.release !== "auto") {
    fail("Use either --version or --release, not both.");
  }

  if (parsed.prepare === true && parsed.dryRun === true) {
    fail("Use either --prepare or --dry-run, not both.");
  }

  if (parsed.prepare === true && parsed.otp !== "") {
    fail("--otp can only be used when publishing.");
  }

  if (parsed.trustedPublisher === true && parsed.otp !== "") {
    fail("--trusted-publisher cannot be combined with --otp.");
  }

  if (parsed.version !== "") {
    assertSimpleSemver(parsed.version);
  }

  if (["auto", "current", "patch", "minor", "major"].includes(parsed.release) === false) {
    fail("--release must be auto, current, patch, minor, or major.");
  }
}

function printUsageAndExit() {
  console.log(`Usage:
  node scripts/publish-workspaces.mjs [options]

Options:
  --release auto|current|patch|minor|major  Version strategy. Default: auto.
  --version x.y.z                           Publish an explicit version.
  --otp 123456                              npm two-factor one-time password.
  --provenance                              Enable npm provenance.
  --dry-run                                 Run npm publish with --dry-run.
  --plan                                    Print the resolved plan without changing files.
  --prepare                                 Update workspace versions without publishing.
  --skip-check                              Skip npm run check.
  --skip-registry                           Do not query existing npm versions.
  --trusted-publisher                       Expect npm Trusted Publisher OIDC auth.`);
  process.exit(0);
}

function assertSharedVersion(root, workspaces) {
  const versions = new Set([root.version, ...workspaces.map((workspace) => workspace.manifest.version)]);
  if (versions.size !== 1) {
    fail(`Expected root and workspace packages to share one version, found: ${[...versions].join(", ")}`);
  }

  assertSimpleSemver(root.version);
  return root.version;
}

function assertSimpleSemver(version) {
  if (/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) === false) {
    fail(`Expected a simple semver version like 1.2.3, got: ${version}`);
  }
}

function listPublishedVersions(workspaces) {
  const versions = new Map();

  for (const workspace of workspaces) {
    const result = spawnSync("npm", ["view", workspace.manifest.name, "versions", "--json"], {
      encoding: "utf8"
    });

    if (result.status !== 0) {
      const output = `${result.stdout}\n${result.stderr}`;
      if (output.includes("E404") || output.includes("404 Not Found")) {
        versions.set(workspace.manifest.name, []);
        continue;
      }

      fail(`Unable to query npm versions for ${workspace.manifest.name}.\n${output.trim()}`);
    }

    versions.set(workspace.manifest.name, parseNpmVersions(result.stdout));
  }

  return versions;
}

function parseNpmVersions(output) {
  const trimmed = output.trim();
  if (trimmed === "") {
    return [];
  }

  const parsed = JSON.parse(trimmed);
  if (Array.isArray(parsed)) {
    return parsed;
  }

  return typeof parsed === "string" ? [parsed] : [];
}

function emptyPublishedVersions() {
  return new Map(WORKSPACES.map((workspace) => [workspace.name, []]));
}

function resolveTargetVersion(currentVersion, publishedVersions, parsed) {
  if (parsed.version !== "") {
    return parsed.version;
  }

  if (parsed.release === "current") {
    return currentVersion;
  }

  if (parsed.release === "auto") {
    if (allPackagesAreUnpublished(publishedVersions)) {
      return currentVersion;
    }

    return nextAvailablePatch(currentVersion, publishedVersions);
  }

  const bumpedVersion = bumpVersion(currentVersion, parsed.release);
  return parsed.release === "patch" ? nextAvailablePatch(bumpedVersion, publishedVersions) : bumpedVersion;
}

function allPackagesAreUnpublished(publishedVersions) {
  return [...publishedVersions.values()].every((versions) => versions.length === 0);
}

function nextAvailablePatch(version, publishedVersions) {
  let candidate = version;

  while (isVersionPublished(candidate, publishedVersions)) {
    candidate = bumpVersion(candidate, "patch");
  }

  return candidate;
}

function isVersionPublished(version, publishedVersions) {
  return [...publishedVersions.values()].some((versions) => versions.includes(version));
}

function bumpVersion(version, release) {
  const [major, minor, patch] = version.split(".").map(Number);

  if (release === "major") {
    return `${major + 1}.0.0`;
  }

  if (release === "minor") {
    return `${major}.${minor + 1}.0`;
  }

  if (release === "patch") {
    return `${major}.${minor}.${patch + 1}`;
  }

  fail(`Unsupported release type: ${release}`);
}

function assertTargetVersionIsPublishable(version, publishedVersions, parsed) {
  if (parsed.skipRegistry === true) {
    return;
  }

  const conflicts = [...publishedVersions.entries()]
    .filter(([, versions]) => versions.includes(version))
    .map(([name]) => name);

  if (conflicts.length > 0) {
    fail(`Version ${version} already exists for: ${conflicts.join(", ")}. Use VERSION=x.y.z or RELEASE=patch.`);
  }
}

function printPlan(currentVersion, targetVersion, parsed) {
  const action = parsed.prepare === true
    ? "Prepare release"
    : parsed.dryRun === true
      ? "Dry-run publish"
      : "Publish";
  console.log(`${action} plan`);
  console.log(`  current version: ${currentVersion}`);
  console.log(`  target version:  ${targetVersion}`);
  console.log(
    `  auth:            ${parsed.trustedPublisher ? "trusted publisher OIDC" : "local npm session or token"}`
  );
  console.log(`  provenance:      ${parsed.provenance ? "enabled" : "disabled"}`);
  console.log(`  npm otp:         ${parsed.otp === "" ? "not provided" : "provided"}`);
  console.log(`  run checks:      ${parsed.prepare || parsed.skipCheck ? "no" : "yes"}`);
  console.log("  order:");
  for (const workspace of WORKSPACES) {
    console.log(`    - ${workspace.name}`);
  }

  if (
    parsed.prepare === false &&
    parsed.dryRun === false &&
    parsed.trustedPublisher === false &&
    parsed.otp === ""
  ) {
    console.log(
      "  note:            npm accounts with publish 2FA must run with --otp, for example: make publish OTP=123456"
    );
  }
}

function updateVersions(root, workspaces, version, internalNames) {
  root.version = version;

  for (const workspace of workspaces) {
    workspace.manifest.version = version;
    updateInternalDependencies(workspace.manifest, version, internalNames);
  }
}

function updateInternalDependencies(manifest, version, internalNames) {
  for (const field of DEPENDENCY_FIELDS) {
    const dependencies = manifest[field];
    if (dependencies === undefined) {
      continue;
    }

    for (const dependencyName of Object.keys(dependencies)) {
      if (internalNames.has(dependencyName)) {
        dependencies[dependencyName] = version;
      }
    }
  }
}

function updatePackageLock(version, internalNames) {
  const lockPath = "package-lock.json";
  const lock = readJson(lockPath);

  if (lock.packages?.[""] !== undefined) {
    lock.packages[""].version = version;
  }

  for (const workspace of WORKSPACES) {
    const packageLockKey = workspace.path.replace(/\/package\.json$/, "");
    const lockEntry = lock.packages?.[packageLockKey];

    if (lockEntry === undefined) {
      continue;
    }

    lockEntry.version = version;
    updateInternalDependencies(lockEntry, version, internalNames);
  }

  writeJson(lockPath, lock);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
