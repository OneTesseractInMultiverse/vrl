import { command, readFiles } from "./release/system.mjs";
import { validateManifests } from "./release/planning.mjs";
import { verifyReleaseIdentity } from "./release/verification.mjs";

try {
  const version = validateManifests(readFiles());
  const tag = process.env.RELEASE_TAG;
  // Validate before passing the tag to git, including option-like values.
  if (tag !== `v${version}`) throw new Error(`Release tag must exactly match v${version}.`);
  const head = command("git", ["rev-parse", "HEAD"], true).trim();
  const tagged = command("git", ["rev-parse", `refs/tags/${tag}^{commit}`], true).trim();
  const ancestor = command("git", ["merge-base", "HEAD", "origin/main"], true).trim();
  verifyReleaseIdentity({ tag, version, repository: process.env.GITHUB_REPOSITORY, head, tagged, onMain: ancestor === head, clean: command("git", ["status", "--porcelain"], true).trim() === "" });
  console.log(`Verified ${tag} at ${head}.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
