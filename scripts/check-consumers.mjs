import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const profile = process.argv[2];
if (!["minimum", "current"].includes(profile)) throw new Error("Choose prepared consumer profile: minimum or current");
const cwd = fileURLToPath(new URL(`../.consumers/${profile}/`, import.meta.url));
for (const script of ["build", "test"]) {
  const result = spawnSync("npm", ["run", script], { cwd, stdio: "inherit", env: { ...process.env, npm_config_offline: "true" } });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
