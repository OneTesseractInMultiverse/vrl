import { DEPENDENCY_FIELDS, REPOSITORY, WORKSPACES } from "./config.mjs";

export function validateManifests(files) {
  const root = JSON.parse(files["package.json"]);
  requireVersion(root.version);
  if (root.private !== true) throw new Error("The monorepo root must remain private.");
  const lock = JSON.parse(files["package-lock.json"]);
  if (lock.version !== root.version || lock.packages?.[""]?.version !== root.version) throw new Error("Root lockfile version differs from package.json.");
  for (const workspace of WORKSPACES) validateWorkspace(JSON.parse(files[workspace.path]), workspace, root.version, lock);
  return root.version;
}

function validateWorkspace(manifest, workspace, version, lock) {
  if (manifest.name !== workspace.name || manifest.version !== version || manifest.private === true) throw new Error(`Invalid name, version or visibility for ${workspace.name}.`);
  if (manifest.repository?.url !== `git+https://github.com/${REPOSITORY}.git` || manifest.repository.directory !== workspace.directory) throw new Error(`Repository provenance mismatch for ${workspace.name}.`);
  if (manifest.publishConfig?.access !== "public" || manifest.publishConfig.registry && manifest.publishConfig.registry !== "https://registry.npmjs.org") throw new Error(`Invalid publish configuration for ${workspace.name}.`);
  const locked = lock.packages?.[workspace.directory];
  if (locked?.version !== version) throw new Error(`Missing or inconsistent lockfile entry for ${workspace.name}.`);
  for (const field of DEPENDENCY_FIELDS) {
    for (const dependency of WORKSPACES) {
      const pin = manifest[field]?.[dependency.name];
      if (pin !== undefined && (pin !== version || locked[field]?.[dependency.name] !== pin)) throw new Error(`Inconsistent internal dependency ${dependency.name} in ${workspace.name}.`);
    }
  }
}

export function requireVersion(version) {
  if (typeof version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) || version.split(".").some(value => !Number.isSafeInteger(Number(value)))) throw new Error(`Expected a stable x.y.z version, got: ${version}`);
  return version;
}

export function resolveVersion(current, published, options) {
  if (options.version) return requireVersion(options.version);
  if (options.release === "current") return current;
  if (options.release === "auto") return nextPatch(current, published);
  const next = bump(current, options.release);
  return options.release === "patch" ? nextPatch(next, published) : next;
}

function bump(version, release) {
  const [major, minor, patch] = version.split(".").map(Number);
  return requireVersion(release === "major" ? `${major + 1}.0.0` : release === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`);
}
function nextPatch(version, published) {
  let candidate = version;
  while (Object.values(published).some(versions => versions.includes(candidate))) candidate = bump(candidate, "patch");
  return candidate;
}

export function createPlan(current, published, options) {
  const version = resolveVersion(current, published, options);
  if (!(options.plan || options.prepare) && version !== current) throw new Error("Publication and dry runs never change versions. Run --prepare, review and commit first.");
  const packages = WORKSPACES.map(workspace => ({ ...workspace, published: (published[workspace.name] ?? []).includes(version) }));
  if (packages.some(pkg => pkg.published) && !options.resume) throw new Error(`Version ${version} is already published for some packages. Use --resume with unchanged sources, or prepare a new version.`);
  return { current, version, packages };
}

export function prepareFiles(files, version) {
  requireVersion(version);
  const updated = structuredClone(files);
  for (const path of ["package.json", ...WORKSPACES.map(workspace => workspace.path)]) {
    const manifest = JSON.parse(files[path]);
    manifest.version = version;
    updatePins(manifest, version);
    updated[path] = json(manifest);
  }
  const lock = JSON.parse(files["package-lock.json"]);
  lock.version = version;
  lock.packages[""].version = version;
  for (const workspace of WORKSPACES) { lock.packages[workspace.directory].version = version; updatePins(lock.packages[workspace.directory], version); }
  updated["package-lock.json"] = json(lock);
  validateManifests(updated);
  return updated;
}
function updatePins(manifest, version) {
  for (const field of DEPENDENCY_FIELDS) for (const workspace of WORKSPACES) {
    if (Object.hasOwn(manifest[field] ?? {}, workspace.name)) manifest[field][workspace.name] = version;
  }
}
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }

export function publicationActions(plan, artifacts, registryIntegrity) {
  return plan.packages.map(pkg => {
    const artifact = artifacts.find(item => item.name === pkg.name);
    if (!artifact || artifact.version !== plan.version || !artifact.integrity) throw new Error(`Missing or invalid artifact for ${pkg.name}.`);
    if (pkg.published && registryIntegrity[pkg.name] !== artifact.integrity) throw new Error(`Published artifact differs for ${pkg.name}@${plan.version}. Stop and prepare a new version; do not overwrite or unpublish.`);
    return { ...artifact, skip: pkg.published };
  });
}
