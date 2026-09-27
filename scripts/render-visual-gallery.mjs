import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { visualArtifacts } from "./visual/gallery.mjs";
const root = new URL("../", import.meta.url), destination = new URL("docs/assets/visual/", root);
const check = process.argv.includes("--check"), files = visualArtifacts(root);
if (!check) mkdirSync(destination, { recursive: true });
for (const [name, contents] of files) {
  const path = new URL(name, destination);
  if (check) { if (readFileSync(path, "utf8") !== contents) throw new Error(`Stale visual baseline: ${name}`); }
  else writeFileSync(path, contents);
}
for (const name of readdirSync(destination)) if (!files.has(name)) throw new Error(`Unregistered visual baseline: ${name}`);
console.log(`${check ? "Checked" : "Generated candidates for"} ${files.size} visual specification artifacts. Review SVG diffs and independent facts before accepting changes.`);
