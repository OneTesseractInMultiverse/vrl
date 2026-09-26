# Release Checklist

## Prepare and review

1. Confirm the six current `@subvertic/*` package names, organization ownership, repository URLs and per-package trusted publisher settings. See [initial publication and npm configuration](trusted-publishing.md).
2. Start from current `main` in an isolated checkout and run `npm ci`.
3. Inspect the read-only plan: `make publish-plan RELEASE=minor` or `make publish-plan VERSION=0.2.0`.
4. Prepare explicitly: `make release-prepare RELEASE=minor` or `make release-prepare VERSION=0.2.0`. Preparation updates only root/workspace manifests and the lockfile, including its top-level version and internal dependency pins. It does not publish or run the quality gate.
5. Update `CHANGELOG.md` and documentation. Review [public contracts](public-contracts.md), [documentation expectations](documentation-contracts.md), migrations and saved compatibility fixtures.
6. Run `make check` and require the [packed framework consumer matrix](framework-compatibility.md) to pass for the release commit. `make publish-dry-run` reviews npm file lists without registry access, authentication or version changes.
7. Review and commit all changes. Merge the release PR, then create and push the matching `vX.Y.Z` tag on that exact `main` commit. Never reuse or move a published version tag.

## Validate and publish

8. In GitHub Actions, choose **Publish → Run workflow**, select `main`, enter the existing tag and choose `dry-run`. All release checks run; no package is published.
9. Publish the matching GitHub Release, or choose the manual `publish` operation. Both paths publish the committed version only, through trusted OIDC with provenance, after verification and consumer tests.
10. Verify all six registry versions, provenance and package installation. If interrupted, follow [partial-publication recovery](trusted-publishing.md#partial-publication-recovery) using the same tag and `resume`.

Initial publication is a separate prerequisite when the package names do not yet exist. Complete the local bootstrap and per-package npm configuration before triggering a GitHub release.

## Command semantics and failures

| Command | Registry reads | File writes | Publication |
| --- | --- | --- | --- |
| `make publish-plan` | Yes | None | None |
| `make release-prepare RELEASE=minor` | Yes | Version manifests and lockfile only | None |
| `make publish-dry-run` | No | None | None; inspect package file lists |
| `make publish` | Yes | None | Current committed version after checks |
| `make publish RESUME=true` | Yes, including existing integrity | None | Only missing packages; identical packages skipped |
| `make publish-ci` | Yes | None | Current committed version, OIDC and provenance |

The default version strategy is `current`. `auto`, `patch`, `minor`, `major` and `VERSION` remain available for planning/preparation, but publication refuses any strategy that would change the version. Prepare and commit first. `--skip-registry` is restricted to planning, preparation and dry run. `--skip-check` is for a commit already validated by the complete release gate, such as the final workflow job.

Planning/validation failures make no file or registry changes. Preparation computes and validates the complete file set before writing; a failed write restores every attempted file from the in-memory snapshot. If restoration itself fails, the error identifies the affected paths for manual recovery. Abrupt process termination, filesystem failure that prevents restoration, and concurrent external edits are outside this rollback guarantee; use an isolated checkout and review `git diff` before continuing.

Publication requires a clean checkout. Checks, authentication, packing and all existing-artifact comparisons precede the first publish. Tarballs live in a temporary directory and are removed on success or caught failure. A publishing command failure retains its exit status and identifies confirmed progress; a retry must query actual registry state because a network failure can hide a successful publish. No version files are rewritten and no registry operation is rolled back.

Local bootstrapping uses `npm login --auth-type=web`; `make publish OTP=123456` can forward an interactive one-time code when required. Codes expire, so repeat with a fresh code and `RESUME=true` after inspecting an interrupted release. Local publication disables provenance; CI enables it. Never commit credentials, codes or npm tokens.

Pure release options, validation, version projection and artifact comparisons live in `scripts/release/`. The coordinator depends on injected filesystem, registry and command ports; `system.mjs` implements those adapters. `tests/release-tooling.test.js` verifies order, absent side effects, rollback, failure status, partial progress and idempotent retry with fake publishers. Tests never perform actual publication. Package coverage remains a separate configured gate; behavioral release tests validate operational failure contracts.
