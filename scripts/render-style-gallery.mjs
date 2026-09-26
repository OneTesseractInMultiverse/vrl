import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { compileRoute } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";

const root = new URL("../", import.meta.url);
const profiles = JSON.parse(readFileSync(new URL("examples/style-gallery.json", root), "utf8"));
const destination = new URL("docs/assets/soft-terrain/", root);
mkdirSync(destination, { recursive: true });
for (const profile of profiles) {
  const source = readFileSync(new URL(profile.source, root), "utf8");
  const result = compileRoute(source, { layout: profile.layout });
  if (!result.ok) throw new Error(`Gallery fixture failed: ${profile.source}`);
  writeFileSync(new URL(`${profile.name}.svg`, destination), renderTopoSvg(result.model, result.layout, profile.render).replace(/^[ \t]+$/gm, "") + "\n");
  console.log(`Rendered ${profile.name}; review its SVG before accepting the baseline.`);
}
