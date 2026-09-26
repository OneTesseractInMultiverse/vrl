import { requireVersion } from "./planning.mjs";
import { REPOSITORY } from "./config.mjs";

/**
 * Require matching version tag, repository, checkout, main ancestry and clean status before trusted release
 * execution.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {unknown} input1.tag - Parsed tag or requested release tag as specified by the operation.
 * @param {string} input1.version - Stable x.y.z package version.
 * @param {unknown} input1.repository - Repository identity expected by the release provenance contract.
 * @param {unknown} input1.head - Commit identity of the current release checkout.
 * @param {unknown} input1.tagged - Commit identity resolved from the requested release tag.
 * @param {unknown} input1.onMain - Whether the requested release commit is reachable from origin/main.
 * @param {unknown} input1.clean - Whether the checked-out working tree is free of changes.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function verifyReleaseIdentity({ tag, version, repository, head, tagged, onMain, clean }) {
  requireVersion(version);
  if (tag !== `v${version}`) throw new Error(`Release tag must exactly match v${version}.`);
  if (repository !== REPOSITORY) throw new Error("Release repository does not match package provenance.");
  if (!head || head !== tagged) throw new Error("Checkout does not match the requested release tag.");
  if (!onMain) throw new Error("Release commit must be reachable from origin/main.");
  if (!clean) throw new Error("Release checkout must be clean.");
}
