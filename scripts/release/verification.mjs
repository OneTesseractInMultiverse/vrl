import { requireVersion } from "./planning.mjs";
import { REPOSITORY } from "./config.mjs";

export function verifyReleaseIdentity({ tag, version, repository, head, tagged, onMain, clean }) {
  requireVersion(version);
  if (tag !== `v${version}`) throw new Error(`Release tag must exactly match v${version}.`);
  if (repository !== REPOSITORY) throw new Error("Release repository does not match package provenance.");
  if (!head || head !== tagged) throw new Error("Checkout does not match the requested release tag.");
  if (!onMain) throw new Error("Release commit must be reachable from origin/main.");
  if (!clean) throw new Error("Release checkout must be clean.");
}
