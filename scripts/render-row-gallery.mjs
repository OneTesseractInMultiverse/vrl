import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createDiagramState } from "@subvertic/vrl-diagram";
const root = new URL("../", import.meta.url);
const check = process.argv.includes("--check");
const destination = new URL("docs/assets/rows/", root);
const files = new Map();
for (const [name, width, theme, symbols, language, sourceFile] of [
  ["canyon-320",320,"light","annotations","en","soft-terrain-canyon.vrl"],
  ["canyon-736",736,"light","annotations","en","soft-terrain-canyon.vrl"],
  ["canyon-minimal-320",320,"dark","minimal","es","soft-terrain-canyon.vrl"],
  ["technical-320",320,"light","annotations","en","soft-terrain-annotated.vrl"]
]) {
  const source = readFileSync(new URL(`examples/${sourceFile}`, root), "utf8");
  const state = createDiagramState(source, { flow:"rows",style:"soft-terrain",symbols,language,theme,idPrefix:name,layout:{width} });
  if (!state.ok) throw new Error(`Row gallery fixture failed: ${sourceFile}`);
  files.set(`${name}.svg`, state.svg + "\n");
}
for (const [name, svg] of files) {
  const path = new URL(name, destination);
  if (check) {
    if (readFileSync(path, "utf8") !== svg) throw new Error(`Stale row gallery artifact: ${name}`);
  } else {
    mkdirSync(destination, {recursive:true});
    writeFileSync(path, svg);
  }
}
console.log(`${check ? "Checked" : "Generated"} ${files.size} row-layout comparisons.`);
