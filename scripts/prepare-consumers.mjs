import { cpSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { refreshPackedEntries } from "./testing/consumer-lock.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const profile = process.argv[2];
if (!["minimum", "current"].includes(profile)) throw new Error("Choose consumer profile: minimum or current");
const refresh = process.argv.includes("--refresh-lock");
const fixture = join(root, "integration", "profiles", profile);
const directory = join(root, ".consumers", profile);
rmSync(directory, { recursive: true, force: true });
mkdirSync(join(directory, "tarballs"), { recursive: true });
cpSync(join(root, "integration", "consumer"), directory, { recursive: true });
const manifest = JSON.parse(readFileSync(join(fixture, "package.json"), "utf8"));
writeFileSync(join(directory, "package.json"), JSON.stringify(manifest, null, 2) + "\n");
const packages = JSON.parse(run(["pack", "--workspaces", "--json", "--pack-destination", join(directory, "tarballs")], root));
for (const item of packages) renameSync(join(directory, "tarballs", item.filename), join(directory, "tarballs", `${item.name.split("/")[1]}.tgz`));
const cache = run(["config", "get", "cache"], root).trim();
writeFileSync(join(directory, ".npmrc"), `legacy-peer-deps=false\nstrict-peer-deps=true\nengine-strict=true\naudit=false\nfund=false\ncache=${cache}\n`);
if (refresh) {
  run(["install", "--package-lock-only", "--ignore-scripts"], directory);
} else {
  const template = JSON.parse(readFileSync(join(fixture, "package-lock.json"), "utf8"));
  const packed = packages.map(item => ({ ...item,
    manifest: JSON.parse(readFileSync(join(root, "packages", `vrl-${item.name.split("/")[1]}`, "package.json"), "utf8"))
  }));
  const lock = refreshPackedEntries(template, packed);
  writeFileSync(join(directory, "package-lock.json"), JSON.stringify(lock, null, 2) + "\n");
}
run(["ci", "--strict-peer-deps", "--legacy-peer-deps=false", "--engine-strict"], directory);
if (refresh) cpSync(join(directory, "package-lock.json"), join(fixture, "package-lock.json"));
console.log(`Prepared ${profile} consuming application from six current tarballs with strict peers and locked dependencies.`);

function run(args, cwd) {
  const result = spawnSync("npm", args, { cwd, encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`npm ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
