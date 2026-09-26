import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { iconManifest, renderIcon } from "@subvertic/vrl-icons";
import { createDiagramState } from "@subvertic/vrl-diagram";

const root = new URL("../", import.meta.url);
const check = process.argv.includes("--check");
const files = new Map([["packages/vrl-icons/manifest.json", `${JSON.stringify(iconManifest, null, 2)}\n`]]);
let cards = "";
for (const icon of iconManifest.icons) {
  const markup = renderIcon(icon.id);
  files.set(`packages/vrl-icons/${icon.asset}`, `${markup}\n`);
  cards += `<figure>${renderIcon(icon.id, { size: 24 })}${markup}${renderIcon(icon.id, { size: 48 })}<figcaption>${icon.id}</figcaption></figure>`;
}
const source = readFileSync(new URL("examples/soft-terrain-canyon.vrl", root), "utf8");
let comparisons = "";
for (const theme of ["light", "dark"]) for (const symbols of ["annotations", "minimal"]) {
  const result = createDiagramState(source, { style: "soft-terrain", symbols, theme, idPrefix: `${theme}-${symbols}`, layout: { width: 736 } });
  if (!result.ok) throw new Error("The fictional canyon icon fixture must compile.");
  const svg = result.svg.replace(/[ \t]+$/gm, "");
  files.set(`docs/assets/icons-${theme}-${symbols}.svg`, svg + "\n");
  comparisons += `<article><h2>${theme}: ${symbols}</h2>${svg}</article>`;
}
files.set("docs/assets/canyoning-icons.html", `<!doctype html><html lang="en"><meta charset="utf-8"><title>VRL canyon icon comparison</title><style>body{font:16px system-ui;margin:24px;background:#ecefed;color:#192c28}h1,h2{font-weight:600}.comparisons{display:grid;grid-template-columns:repeat(2,minmax(600px,1fr));gap:24px;overflow:auto}article{background:white;padding:16px}section{display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;padding:16px;background:white;min-width:144px}figure svg{margin:4px}figcaption{font:12px system-ui}</style><h1>Fictional canyon: selective pictograms and identical minimal layout</h1><p>Schematic profile. Rope lengths are declarations, not equipment requirements. Original project pictograms; practitioner recognition review is pending.</p><div class="comparisons">${comparisons}</div><h2>Exact icon catalog at 24, 32 and 48 pixels</h2><section>${cards}</section></html>\n`);
for (const [path, expected] of files) {
  const url = new URL(path, root);
  if (check) {
    if (readFileSync(url, "utf8") !== expected) throw new Error(`Stale icon artifact: ${path}. Run npm run icons:build.`);
  } else {
    mkdirSync(new URL(".", url), { recursive: true });
    writeFileSync(url, expected);
  }
}
const expectedNames = new Set(iconManifest.icons.map(/**
 * Project the exact expected SVG asset filename from a canonical registry ID.
 * @responsibility computation
 * @param {Object} icon - Immutable icon definition with original path and optional stroke data.
 * @returns {string} Expected standalone filename, including the .svg extension.
 */ icon => `${icon.id}.svg`));
for (const name of readdirSync(new URL("packages/vrl-icons/svg/", root))) {
  if (!expectedNames.has(name)) throw new Error(`Unexpected icon asset: ${name}`);
}
console.log(`${check ? "Checked" : "Generated"} ${files.size} icon and comparison artifacts.`);
