import { readFileSync } from "node:fs";

import { compileRoute } from "@vrl/core";
import { renderTopoSvg } from "@vrl/render-svg";

const source = readFileSync(new URL("../examples/rio-azul.vrl", import.meta.url), "utf8");
const result = compileRoute(source, { symbology: "federation" });

if (result.ok === false) {
  console.error(result.diagnostics);
  process.exitCode = 1;
} else {
  console.log(renderTopoSvg(result.model, result.layout, { symbology: "federation" }));
}
