import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { testSources } from "./testing/test-files.mjs";
import { selectTestFiles } from "./testing/test-suites.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
const suiteIndex = args.indexOf("--suite");
const suite = suiteIndex === -1 ? "all" : args.splice(suiteIndex, 2)[1];
if (suite === undefined) throw new Error("--suite requires a suite name");
const coverageIndex = args.indexOf("--coverage");
const coverage = coverageIndex !== -1;
if (coverage) args.splice(coverageIndex, 1);
const files = selectTestFiles(testSources(root).filter(file => file.endsWith(".test.js")), suite);
console.log(`Behavioral verification: ${suite} suite(s), ${files.length} test files. Generated case names include replay seeds.`);
const thresholds = coverage ? ["--experimental-test-coverage", "--test-coverage-lines=100", "--test-coverage-functions=100", "--test-coverage-branches=100", "--test-coverage-include=packages/**/*.js"] : [];
const result = spawnSync(process.execPath, ["--test", ...thresholds, ...args, ...files], { cwd: root, stdio: "inherit" });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
