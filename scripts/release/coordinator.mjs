import { createPlan, prepareFiles, publicationActions, validateManifests } from "./planning.mjs";

/** Ports own filesystem, registry and commands; this coordinator has no concrete I/O. */
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
