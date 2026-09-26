import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

/**
 * Recursively discover Markdown files below a directory while excluding dependency directories.
 * @responsibility coordinator
 * @param {string} directory - Filesystem directory within the explicitly selected workspace.
 * @returns {Array} The result returned by readdirSync(directory, { withFileTypes: true }).flatMap.
 */
function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(/**
   * Recurse into nondependency directories and retain only Markdown files, ignoring other filesystem entries.
   * @responsibility coordinator
   * @param {unknown} entry - Current collection entry before projection or validation.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() && entry.name !== "node_modules" ? markdownFiles(path) : entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

/**
 * Read deterministic repository-relative Markdown records from root, docs, examples and first-party packages.
 * Deliberate scope excludes generated consumers, dependencies and local caches.
 * @responsibility coordinator
 * @param {string} root - Absolute repository root used to resolve owned filesystem paths.
 * @returns {Array} The result returned by files.map.
 */

export function readDocumentation(root) {
  const topLevel = readdirSync(root, { withFileTypes: true }).filter(/**
   * Evaluate the selection condition entry.isFile() && entry.name.endsWith(".md").
   * @responsibility computation
   * @param {unknown} entry - Current collection entry before projection or validation.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ entry => entry.isFile() && entry.name.endsWith(".md")).map(/**
   * Apply join to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} entry - Current collection entry before projection or validation.
   * @returns {unknown} The result returned by join.
   */ entry => join(root, entry.name));
  const files = [...topLevel, ...markdownFiles(join(root, "docs")), ...markdownFiles(join(root, "examples")), ...markdownFiles(join(root, "packages"))].sort();
  return files.map(/**
   * Project file, markdown into the record required by files.map.
   * @responsibility computation
   * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper.
   * @returns {Object} A record containing file, markdown.
   */ path => ({ file: relative(root, path).split(sep).join("/"), markdown: readFileSync(path, "utf8") }));
}
