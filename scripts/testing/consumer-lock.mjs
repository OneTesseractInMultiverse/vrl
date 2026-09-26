/**
 * Refresh only packed first-party lock entries while retaining locked external dependencies and framework
 * versions. Refresh only checkout-owned packages; preserve every registry resolution.
 * @responsibility computation
 * @param {unknown} template - Locked consumer manifest/lockfile template before packed-entry replacement.
 * @param {Object[]} packages - Packed first-party package records with tarball identity, filename and integrity.
 * @returns {unknown} The lock value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */

export function refreshPackedEntries(template, packages) {
  const lock = structuredClone(template);
  for (const { name, version, integrity, manifest } of packages) {
    const key = `node_modules/${name}`;
    const entry = lock.packages[key];
    if (!entry || entry.link) throw new Error(`Missing packed consumer lock entry: ${name}`);
    const { dependencies, peerDependencies, engines } = manifest;
    Object.assign(entry, { version, integrity, dependencies, peerDependencies, engines });
  }
  return lock;
}
