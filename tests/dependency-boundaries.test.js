import assert from "node:assert/strict";
import test from "node:test";
import { readdirSync, readFileSync } from "node:fs";
import { dependencyViolations } from "./helpers/dependency-boundaries.js";

test("core imports obey inward boundaries including re-exports and composition", () => {
  const root = new URL("../packages/vrl-core/src/", import.meta.url);
  const files = readdirSync(root, { recursive: true }).filter((file) => file.endsWith(".js"));
  assert.deepEqual(files.flatMap((file) => dependencyViolations(file, readFileSync(new URL(file, root), "utf8"))), []);
});

for (const [file, source] of [
  ["application/use-case.js", 'import { parse } from "../parser/line-parser.js";'],
  ["application/use-case.js", 'export { compileRoute } from "../composition/route-compiler.js";'],
  ["application/use-case.js", 'import { exportJson } from "../adapters/json/export-route-json.js";'],
  ["application/use-case.js", 'import { parse } from "../index.js";'],
  ["domain/model.js", 'export * from "../application/compiler-ports.js";'],
  ["domain/model.js", 'import { createEmptyRoute } from "../application/route-ast.js";'],
  ["parser/parser.js", 'import { compileRouteWithPorts } from "../application/compile-route.js";'],
  ["domain/model.js", 'import "react";'],
  ["domain/model.js", 'import fs from "node:fs";'],
  ["domain/model.js", 'import browser from "../../../../vrl-react/src/index.js";'],
  ["validation/check.js", 'import { compileRoute } from "../composition/route-compiler.js";'],
  ["application/use-case.js", 'const module = import("../parser/line-parser.js");'],
  ["domain/model.js", 'const module = require(name);'],
  ["unclassified/new.js", 'import { normalize } from "../domain/model.js";']
]) {
  test(`dependency boundary rejects ${file}: ${source}`, () => {
    assert.equal(dependencyViolations(file, source).length, 1);
  });
}

test("dependency check accepts multiline inward imports and re-exports", () => {
  assert.deepEqual(dependencyViolations("application/use-case.js", 'import {\n  createDiagnostic\n} from "../domain/diagnostics.js";\nexport { compilerPorts } from "./compiler-ports.js";'), []);
});

test("default composition may depend on concrete implementations", () => {
  assert.deepEqual(dependencyViolations("composition/route-compiler.js", 'import { parseVrl } from "../parser/line-parser.js";\nimport { exportRouteJson } from "../adapters/json/export-route-json.js";'), []);
});

test("parser adapters may construct the application-owned syntax records", () => {
  assert.deepEqual(dependencyViolations("parser/parser.js", 'import { createEmptyRoute } from "../application/route-ast.js";'), []);
});
