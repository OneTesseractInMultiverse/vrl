import { readFileSync, writeFileSync } from "node:fs";

import { compileRoute, formatDiagnostic } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";

const source = readFileSync(new URL("../examples/quebrada-gata.vrl", import.meta.url), "utf8");
const profile = JSON.parse(readFileSync(new URL("../examples/quebrada-gata.render.json", import.meta.url), "utf8"));
const result = compileRoute(source, { layout: profile.layout });
const outputPath = process.argv[2];
for (const diagnostic of result.diagnostics) console.error(formatDiagnostic(diagnostic));

if (result.ok === false) {
  process.exitCode = 1;
} else {
  const svg = renderTopoSvg(result.model, result.layout, profile.render).replace(/^[ \t]+$/gm, "");

  if (outputPath === undefined) {
    console.log(svg);
  } else {
    writeFileSync(outputPath, `${svg}\n`);
  }
}
