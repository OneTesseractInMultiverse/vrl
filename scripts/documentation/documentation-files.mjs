import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

function markdownFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() && entry.name !== "node_modules" ? markdownFiles(path) : entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
  });
}

/** Deliberate scope excludes generated consumers, dependencies and local caches. */
export function readDocumentation(root) {
  const topLevel = readdirSync(root, { withFileTypes: true }).filter(entry => entry.isFile() && entry.name.endsWith(".md")).map(entry => join(root, entry.name));
  const files = [...topLevel, ...markdownFiles(join(root, "docs")), ...markdownFiles(join(root, "packages"))].sort();
  return files.map(path => ({ file: relative(root, path).split(sep).join("/"), markdown: readFileSync(path, "utf8") }));
}
