import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { testSources } from "./testing/test-files.mjs";
import { selectTestFiles, TEST_SUITES } from "./testing/test-suites.mjs";
import { inspectTestPolicy } from "./testing/test-policy.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const sources = testSources(root);
const files = selectTestFiles(sources.filter(/**
 * Evaluate the selection condition file.endsWith(".test.js").
 * @responsibility computation
 * @param {string} file - Repository-relative source path used in discovery or diagnostics.
 * @returns {unknown} The result returned by file.endsWith.
 */ file => file.endsWith(".test.js")));
const consumerSources = testSources(root, join(root, "integration", "consumer"));
const reports = [...sources, ...consumerSources].map(/**
 * Apply inspectTestPolicy to the supplied arguments; retain the callee's return and failure behavior.
 * @responsibility computation
 * @param {string} file - Repository-relative source path used in discovery or diagnostics.
 * @returns {unknown} The result returned by inspectTestPolicy.
 */ file => inspectTestPolicy(readFileSync(join(root, file), "utf8"), file));
const violations = reports.flatMap(/**
 * Project report.violations from the current record.
 * @responsibility computation
 * @param {unknown} report - Structured policy or diagnostic report returned by the preceding check.
 * @returns {unknown} The report.violations value selected or validated above.
 */ report => report.violations);
if (violations.length) throw new Error(violations.join("\n"));
console.log(`Test policy: ${reports.reduce(/**
 * Compute total + report.tests.
 * @responsibility computation
 * @param {number} total - Accumulated numeric total before processing the current entry.
 * @param {unknown} report - Structured policy or diagnostic report returned by the preceding check.
 * @returns {number|string} The + expression's result for these supplied operands.
 */ (total, report) => total + report.tests, 0)} single-assert declarations; ${files.length} files assigned to ${Object.keys(TEST_SUITES).length} suites.`);
