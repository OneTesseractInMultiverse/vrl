import { createPlan, prepareFiles, publicationActions, validateManifests } from "./planning.mjs";

/**
 * Coordinate planning, preparation or publication through injected filesystem, registry and command ports;
 * publication never edits versions. Ports own filesystem, registry and commands; this coordinator has no
 * concrete I/O.
 * @responsibility coordinator
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Contains validated release mode, version, registry and authentication flags.
 * @param {Object<string, Function>} ports - Application-owned port implementations supplied by composition or a test harness.
 * @returns {unknown} A record containing plan, published, skipped. The result returned by publishPrepared.
 */

export function runRelease(options, ports) {
  const files = ports.readFiles();
  const current = validateManifests(files);
  const published = options.skipRegistry || options.dryRun ? {} : ports.versions();
  const plan = createPlan(current, published, options);
  ports.report(plan);
  if (options.plan) return { plan, published: [], skipped: [] };
  if (options.prepare) {
    writePreparedFiles(files, prepareFiles(files, plan.version), ports);
    return { plan, published: [], skipped: [] };
  }
  ports.clean();
  if (!options.skipCheck) ports.check();
  if (options.dryRun) { ports.dryRun(); return { plan, published: [], skipped: [] }; }
  ports.authenticate(options);
  return publishPrepared(plan, options, ports);
}

/**
 * Write changed preparation files through the port and restore attempted files on failure; report restoration
 * failures alongside the original error.
 * @responsibility coordinator
 * @param {Object<string, string>} before - Original file text retained for rollback.
 * @param {Object<string, string>} after - Prepared file text to compare and write.
 * @param {Object<string, Function>} ports - Application-owned port implementations supplied by composition or a test harness.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function writePreparedFiles(before, after, ports) {
  const snapshot = { ...before };
  const attempted = [];
  try {
    for (const [path, content] of Object.entries(after)) {
      if (content === before[path]) continue;
      attempted.push(path);
      ports.write(path, content);
    }
  } catch (error) {
    const rollbackErrors = [];
    for (const path of attempted.reverse()) {
      try { ports.write(path, snapshot[path]); } catch (rollback) { rollbackErrors.push(`${path}: ${rollback.message}`); }
    }
    if (rollbackErrors.length) throw new Error(`Preparation failed: ${error.message}. Restoration also failed: ${rollbackErrors.join("; ")}. Restore these files from your pre-preparation snapshot.`, { cause: error });
    throw error;
  }
}

/**
 * Pack artifacts, verify registry integrity, publish pending packages in order and always clean temporary
 * files; partial failures retain confirmed progress.
 * @responsibility coordinator
 * @param {Object} plan - Validated release plan containing the shared version and package publication status.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Contains validated release mode, version, registry and authentication flags.
 * @param {Object<string, Function>} ports - Application-owned port implementations supplied by composition or a test harness.
 * @returns {Object} A record containing plan, published, skipped.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
function publishPrepared(plan, options, ports) {
  const published = [], skipped = [];
  try {
    const artifacts = ports.pack();
    const integrity = ports.integrity(plan);
    const actions = publicationActions(plan, artifacts, integrity);
    for (const artifact of actions) {
      if (artifact.skip) skipped.push(artifact.name);
      else { ports.publish(artifact, options); published.push(artifact.name); }
    }
    return { plan, published, skipped };
  } catch (error) {
    const failure = new Error(`Release ${plan.version} stopped. Confirmed published: ${published.join(", ") || "none"}. The failed request may have reached npm; inspect registry state and retry the same committed version with --resume. ${error.message}`, { cause: error });
    failure.exitCode = error.exitCode ?? 1;
    throw failure;
  } finally { ports.cleanup(); }
}
