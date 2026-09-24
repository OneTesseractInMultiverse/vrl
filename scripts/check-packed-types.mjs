import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), "vrl-consumer-"));
try {
  const packages = JSON.parse(run("npm", ["pack", "--workspaces", "--json", "--pack-destination", temporary], root));
  const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  writeFileSync(join(temporary, "package.json"), JSON.stringify(consumerManifest(packages, manifest.devDependencies)));
  cpSync(join(root, "tests/types"), join(temporary, "types"), { recursive: true });
  const examples = documentationExamples(readFileSync(join(root, "docs/public-contracts.md"), "utf8"));
  examples.forEach((source, index) => writeFileSync(join(temporary, `types/documentation-${index}.ts`), source));
  run("npm", ["install", "--offline", "--ignore-scripts", "--legacy-peer-deps", "--no-audit", "--no-fund", "--cache", join(root, ".npm-cache")], temporary);
  run(process.execPath, ["node_modules/typescript/bin/tsc", "-p", "types/tsconfig.json"], temporary);
  examples.forEach((_, index) => run(process.execPath, [`types/documentation-${index}.ts`], temporary));
  run(process.execPath, ["--input-type=module", "-e", "import {createDiagramState} from '@subvertic/diagram'; const state = createDiagramState('route Consumer\\nstart\\nexit'); if (!state.ok || !state.svg.startsWith('<svg ')) throw new Error('Packed facade failed');"], temporary);
  console.log(`Checked declarations, ${examples.length} documentation examples, and runtime entry points from ${packages.length} packed packages in an isolated offline consumer.`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}

function consumerManifest(packages, development) {
  return {
    private: true, type: "module",
    dependencies: Object.fromEntries(packages.map(({ name, filename }) => [name, `file:./${filename}`])),
    devDependencies: { typescript: development.typescript, svelte: development.svelte, "@types/react": development["@types/react"] }
  };
}

function documentationExamples(markdown) {
  return [...markdown.matchAll(/```(?:js|ts)\n([\s\S]*?)```/g)].map((match) => match[1]);
}

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
