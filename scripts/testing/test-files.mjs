import { readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

export function testSources(root, directory = join(root, "tests")) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? testSources(root, path) : /\.m?js$/.test(entry.name) ? [relative(root, path).split(sep).join("/")] : [];
  }).sort();
}
