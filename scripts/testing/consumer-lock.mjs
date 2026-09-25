/** Refresh only checkout-owned packages; preserve every registry resolution. */
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
