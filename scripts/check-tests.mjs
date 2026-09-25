import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { testSources } from "./testing/test-files.mjs";
import { selectTestFiles, TEST_SUITES } from "./testing/test-suites.mjs";
import { inspectTestPolicy } from "./testing/test-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sources = testSources(root);
const files = selectTestFiles(sources.filter(file => file.endsWith(".test.js")));
const reports = sources.map(file => inspectTestPolicy(readFileSync(join(root, file), "utf8"), file));
const violations = reports.flatMap(report => report.violations);
if (violations.length) throw new Error(violations.join("\n"));
console.log(`Test policy: ${reports.reduce((total, report) => total + report.tests, 0)} single-assert declarations; ${files.length} files assigned to ${Object.keys(TEST_SUITES).length} suites.`);
