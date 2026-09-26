import { fileURLToPath } from "node:url";
import { readFunctionSources } from "./documentation/source-files.mjs";
import { inspectFunctionDocumentation } from "./documentation/function-contracts.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sources = readFunctionSources(root);
let functions = 0;
const violations = [];
for (const { file, source } of sources) {
  const report = inspectFunctionDocumentation(source, file);
  functions += report.functions;
  violations.push(...report.violations);
}
if (violations.length > 0) throw new Error(violations.join("\n"));
console.log(`Function documentation: ${functions} implementations/declarations in ${sources.length} source units have responsibility, parameter and return contracts.`);
