import { readFileSync, writeFileSync } from "node:fs";

import { compileRoute } from "@subvertic/core";
import { renderTopoSvg } from "@subvertic/render-svg";

const source = readFileSync(new URL("../examples/rio-azul.vrl", import.meta.url), "utf8");
const result = compileRoute(source, { symbology: "federation" });
const outputPath = process.argv[2];

if (result.ok === false) {
  console.error(result.diagnostics);
  process.exitCode = 1;
} else {
  const svg = renderTopoSvg(result.model, result.layout, { symbology: "federation" });

  if (outputPath === undefined) {
    console.log(svg);
  } else {
    writeFileSync(outputPath, `${svg}\n`);
  }
}
