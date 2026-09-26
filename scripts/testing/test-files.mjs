import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Recursively discover first-party test JavaScript files as repository-relative paths.
 * @responsibility coordinator
 * @param {string} root - Absolute repository root used to resolve owned filesystem paths.
 * @param {string} directory - Filesystem directory within the explicitly selected workspace; defaults to join(root, "tests").
 * @returns {Array} The result returned by readdirSync(directory, { withFileTypes: true }).flatMap(entry => { const path = join(directory, entry.name); return entry.isDirectory() ? testSources(root, path.sort.
 */
export function testSources(root, directory = join(root, "tests")) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(/**
   * Recurse through test directories and return repository-relative JavaScript paths for suite inventory
   * checks.
   * @responsibility coordinator
   * @param {unknown} entry - Current collection entry before projection or validation.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? testSources(root, path) : /\.m?js$/.test(entry.name) ? [relative(root, path).split(sep).join("/")] : [];
  }).sort();
}
