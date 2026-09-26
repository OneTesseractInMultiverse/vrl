import { DEPENDENCY_FIELDS, REPOSITORY, WORKSPACES } from "./config.mjs";

/**
 * Validate root and workspace version, visibility, provenance and dependency pins against the lockfile.
 * @responsibility coordinator
 * @param {Object<string, string>} files - Root/workspace manifest and lockfile text indexed by repository-relative path.
 * @returns {unknown} The root.version value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function validateManifests(files) {
  const root = JSON.parse(files["package.json"]);
  requireVersion(root.version);
  if (root.private !== true) throw new Error("The monorepo root must remain private.");
  const lock = JSON.parse(files["package-lock.json"]);
  if (lock.version !== root.version || lock.packages?.[""]?.version !== root.version) throw new Error("Root lockfile version differs from package.json.");
  for (const workspace of WORKSPACES) validateWorkspace(JSON.parse(files[workspace.path]), workspace, root.version, lock);
  return root.version;
}

/**
 * Check one package's identity, shared version, public registry configuration, provenance and locked internal
 * dependency pins.
 * @responsibility computation
 * @param {Object} manifest - Parsed package manifest.
 * @param {Object} workspace - Configured first-party package identity and paths.
 * @param {string} version - Stable x.y.z package version.
 * @param {Object} lock - Parsed npm lockfile whose registry resolutions must be preserved.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
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

/**
 * Accept stable three-part numeric versions within safe-integer limits and reject unsupported spelling.
 * @responsibility computation
 * @param {string} version - Stable x.y.z package version.
 * @returns {unknown} The version value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function requireVersion(version) {
  if (typeof version !== "string" || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version) || version.split(".").some(/**
   * Evaluate the selection condition !Number.isSafeInteger(Number(value)).
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ value => !Number.isSafeInteger(Number(value)))) throw new Error(`Expected a stable x.y.z version, got: ${version}`);
  return version;
}

/**
 * Select explicit, current, automatic or bumped release versions according to validated options and observed
 * publications.
 * @responsibility computation
 * @param {string} current - Current committed workspace version.
 * @param {Object<string, string[]>} published - Observed registry version lists keyed by first-party package name.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Contains validated release mode, version, registry and authentication flags.
 * @returns {unknown} The result returned by requireVersion. The current value selected or validated above. The result returned by nextPatch. The selected result, including the documented absent-value fallback.
 */
export function resolveVersion(current, published, options) {
  if (options.version) return requireVersion(options.version);
  if (options.release === "current") return current;
  if (options.release === "auto") return nextPatch(current, published);
  const next = bump(current, options.release);
  return options.release === "patch" ? nextPatch(next, published) : next;
}

/**
 * Increment the requested stable version component and reset lower components, rejecting numeric overflow.
 * @responsibility computation
 * @param {string} version - Stable x.y.z package version.
 * @param {string} release - Requested current, auto, patch, minor or major version strategy.
 * @returns {unknown} The result returned by requireVersion.
 */
function bump(version, release) {
  const [major, minor, patch] = version.split(".").map(Number);
  return requireVersion(release === "major" ? `${major + 1}.0.0` : release === "minor" ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`);
}
/**
 * Advance patch versions until none of the observed package version lists already contains the candidate.
 * @responsibility computation
 * @param {string} version - Stable x.y.z package version.
 * @param {Object<string, string[]>} published - Observed registry version lists keyed by first-party package name.
 * @returns {unknown} The candidate value selected or validated above.
 */
function nextPatch(version, published) {
  let candidate = version;
  while (Object.values(published).some(/**
   * Evaluate the selection condition versions.includes(candidate).
   * @responsibility computation
   * @param {unknown} versions - Observed published stable version strings for one package.
   * @returns {boolean} The result returned by versions.includes.
   */ versions => versions.includes(candidate))) candidate = bump(candidate, "patch");
  return candidate;
}

/**
 * Resolve the release version and package publication status, refusing version edits during publication and
 * duplicate publication without resume.
 * @responsibility computation
 * @param {string} current - Current committed workspace version.
 * @param {Object<string, string[]>} published - Observed registry version lists keyed by first-party package name.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Contains validated release mode, version, registry and authentication flags.
 * @returns {Object} A record containing current, version, packages.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function createPlan(current, published, options) {
  const version = resolveVersion(current, published, options);
  if (!(options.plan || options.prepare) && version !== current) throw new Error("Publication and dry runs never change versions. Run --prepare, review and commit first.");
  const packages = WORKSPACES.map(/**
   * Project existing fields, published into the record required by WORKSPACES.map.
   * @responsibility computation
   * @param {Object} workspace - Configured first-party package identity and paths.
   * @returns {Object} A record containing the supplied fields, published.
   */ workspace => ({ ...workspace, published: (published[workspace.name] ?? []).includes(version) }));
  if (packages.some(/**
   * Evaluate the selection condition pkg.published.
   * @responsibility computation
   * @param {unknown} pkg - Configured, packed or installed package record.
   * @returns {unknown} The pkg.published value selected or validated above.
   */ pkg => pkg.published) && !options.resume) throw new Error(`Version ${version} is already published for some packages. Use --resume with unchanged sources, or prepare a new version.`);
  return { current, version, packages };
}

/**
 * Return updated manifest/lockfile text with synchronized versions and internal pins; leave the caller's file
 * map unchanged.
 * @responsibility computation
 * @param {Object<string, string>} files - Root/workspace manifest and lockfile text indexed by repository-relative path.
 * @param {string} version - Stable x.y.z package version.
 * @returns {unknown} The updated value selected or validated above.
 */
export function prepareFiles(files, version) {
  requireVersion(version);
  const updated = structuredClone(files);
  for (const path of ["package.json", ...WORKSPACES.map(/**
   * Project workspace.path from the current record.
   * @responsibility computation
   * @param {Object} workspace - Configured first-party package identity and paths.
   * @returns {unknown} The workspace.path value selected or validated above.
   */ workspace => workspace.path)]) {
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
/**
 * Mutate only known internal workspace dependencies in the supplied manifest to the prepared version.
 * @responsibility computation
 * @param {Object} manifest - Parsed package manifest.
 * @param {string} version - Stable x.y.z package version.
 * @returns {void} Completes the documented operation; no return value is consumed.
 */
function updatePins(manifest, version) {
  for (const field of DEPENDENCY_FIELDS) for (const workspace of WORKSPACES) {
    if (Object.hasOwn(manifest[field] ?? {}, workspace.name)) manifest[field][workspace.name] = version;
  }
}
/**
 * Serialize preparation records with two-space indentation and a final newline.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
function json(value) { return `${JSON.stringify(value, null, 2)}\n`; }

/**
 * Match packed artifacts to the plan and verify already-published integrity before returning publish/skip
 * actions.
 * @responsibility computation
 * @param {Object} plan - Validated release plan containing the shared version and package publication status.
 * @param {unknown} artifacts - Packed tarball metadata including names, versions, paths and integrity.
 * @param {unknown} registryIntegrity - Observed registry integrity keyed by package name for resumed publication.
 * @returns {Array} The result returned by plan.packages.map.
 */
export function publicationActions(plan, artifacts, registryIntegrity) {
  return plan.packages.map(/**
   * Match one planned package with its artifact and verify published integrity before marking it safe to skip
   * on resume.
   * @responsibility computation
   * @param {unknown} pkg - Configured, packed or installed package record.
   * @returns {Object} A record containing the supplied fields, skip.
   * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
   */ pkg => {
    const artifact = artifacts.find(/**
     * Evaluate the selection condition item.name === pkg.name.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ item => item.name === pkg.name);
    if (!artifact || artifact.version !== plan.version || !artifact.integrity) throw new Error(`Missing or invalid artifact for ${pkg.name}.`);
    if (pkg.published && registryIntegrity[pkg.name] !== artifact.integrity) throw new Error(`Published artifact differs for ${pkg.name}@${plan.version}. Stop and prepare a new version; do not overwrite or unpublish.`);
    return { ...artifact, skip: pkg.published };
  });
}
