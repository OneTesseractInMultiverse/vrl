# npm Trusted Publishing

The VRL release workflow is configured to publish seven public packages from `OneTesseractInMultiverse/vrl` through `.github/workflows/publish.yml`. GitHub Actions supplies an OIDC identity; the workflow does not need an `NPM_TOKEN` secret. Every package's repository URL must match this exact repository, including case.

## Package identity and first publication

The canonical names are `@subvertic/vrl-core`, `@subvertic/vrl-icons`, `@subvertic/vrl-render-svg`, `@subvertic/vrl-diagram`, `@subvertic/vrl-react`, `@subvertic/vrl-svelte` and `@subvertic/vrl-sveltekit`. `subvertic` is the organization scope; `vrl-` identifies the project inside that organization.

Version 0.2.0 used incorrect names without the `vrl-` prefix. The 0.2.1 naming correction prepares the canonical identities and internal dependency names. The changelog and actual registry state determine publication; this guide does not establish that bootstrap or trusted-publisher setup is complete. Existing `@subvertic/vrl-*` packages retain their earlier release history; `@subvertic/vrl-diagram` is a new package. Consumers of 0.2.0 must update all six dependency/import names together. npm cannot rename a published package, and trusted-publisher settings do not transfer between names. Configure only the canonical identities below.

npm requires a package to exist before a trusted publisher can be configured. For unpublished names:

1. Confirm ownership of the `@subvertic` npm organization and write access for the publishing account.
2. Prepare and merge the release commit, including versions and changelog. Verify the workspace gate and framework consumer matrix.
3. In a clean checkout of that commit, authenticate the npm CLI with `npm login --auth-type=web --registry=https://registry.npmjs.org`. A browser session by itself does not authenticate the CLI. Complete npm’s authentication challenge in the terminal or browser when prompted.
4. Review `make publish-plan` and `make publish-dry-run`.
5. Publish the prepared workspace set, including any new package identities, using `make publish` (local provenance is disabled). If interrupted, follow the recovery procedure below. This is a real public release, not a placeholder package.
6. Configure trusted publishing on each newly created package. Subsequent versions can publish from GitHub with provenance.

After bootstrap, configure GitHub and npm as described below before dispatching CI publication. The first version published through CI receives GitHub provenance.

## GitHub and npm settings

Protect `main` with reviewed changes in the repository's branch rules. In **Settings → Environments**, create `npm-production`. Under **Deployment branches and tags**, choose **Selected branches and tags** and add the exact branch `main` as the only rule. Leave the tag rules empty and disable administrator bypass. GitHub enforces these restrictions outside the workflow. [GitHub deployment protection rules](https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments#deployment-branches-and-tags)

For each of the seven current package names, open **Settings → Trusted Publisher → GitHub Actions** and enter:

| Setting | Exact value |
| --- | --- |
| Organization or user | `OneTesseractInMultiverse` |
| Repository | `vrl` |
| Workflow filename | `publish.yml` |
| Environment name | `npm-production` |
| Allowed action | Enable direct `npm publish` |

Save the configuration and complete npm's authentication challenge. The workflow uses direct publication, so a publisher that only permits staging will not work. npm does not validate the repository/workflow combination when settings are saved; a successful CI publication is the end-to-end authentication check.

Alternatively, npm CLI 11.15+ supports an interactive configuration command per existing package:

```sh
npm trust github @subvertic/vrl-core --repo OneTesseractInMultiverse/vrl --file publish.yml --environment npm-production --allow-publish
npm trust list @subvertic/vrl-core
```

Repeat for every current package name. Replace any existing publisher for this repository and workflow that has an empty environment. Confirm that each package’s entry for `publish.yml` names `npm-production` before the first dispatch. Once the new flow is verified, package maintainers may choose the restrictive 2FA/token policy in npm settings. It does not disable OIDC publishing.

## GitHub release flow

Choose **Actions → Publish → Run workflow** on protected `main`, enter the release tag and select the operation. Publishing GitHub Release notes is a separate step.

1. **Authorize.** The workflow checks its repository, dispatch branch, branch protection and stable tag syntax. A read-only job checks out the dispatch SHA, resolves the tag to a commit, and uses Git to verify that the commit is an ancestor of that protected main revision. For `publish` and `resume`, the tag must also match the dispatch SHA exactly, because npm records that SHA as the source in its provenance statement. The job passes the approved SHA to the remaining jobs. [npm provenance generation](https://github.com/npm/cli/blob/latest/workspaces/libnpmpublish/lib/provenance.js)
2. **Verify.** Check out the approved SHA, verify the tag, manifests, lockfile, repository identity and clean checkout, then run `make check`.
3. **Consumers.** Check out the same SHA and test packed React, Svelte and SvelteKit packages across the supported matrix.
4. **Publish.** Check out the approved SHA, recheck the tag identity, pack the packages and publish the tarballs in dependency order with provenance. Only this job enters `npm-production` and receives `id-token: write`. Package lifecycle scripts are disabled.

All jobs use hosted runners, bounded timeouts and no package cache. The release workflow pins its actions by commit. A repository-wide concurrency group serializes release workflows. The pinned Node release includes an npm CLI compatible with OIDC.

- `dry-run` (default) runs verification and consumer checks.
- A fresh `publish` dispatch fails if the version already exists for any package. Re-running that workflow uses the recovery procedure below.
- `resume` verifies already-published tarball integrity and publishes the missing packages at that version.

Merge the release workflow into protected `main` and tag a release commit containing the matching manifests and release scripts. Verify npm authentication and provenance on the first actual CI publication.

## Partial-publication recovery

Publication cannot be atomic across seven registry packages. A failure reports packages whose publish commands completed, but a failed network response can still mean npm accepted the last request. Do not assume the failed package is absent, unpublish successful packages, or move an existing tag.

1. Keep the exact source commit and version. Inspect npm versions and the workflow failure.
2. Fix external authorization or registry availability without editing release files.
3. Open the original interrupted publication in GitHub Actions and choose **Re-run failed jobs**. GitHub retains that run’s dispatch SHA even if `main` has advanced. On a rerun the publish step explicitly enables integrity-checked recovery. A fresh `resume` dispatch also works while the release tag is still the tip of `main`. For an interrupted local bootstrap, check out the same release commit, run `make publish-plan RESUME=true` and then `make publish RESUME=true`.
4. The tool packs all artifacts and compares SHA-512 integrity for every already-published package before publishing anything. Matching packages are skipped; missing packages retain dependency order. A complete retry is a no-op.
5. If any existing tarball differs or has no usable integrity, stop and prepare a new version for all packages. Never overwrite or unpublish as a recovery strategy. Dist-tags are not modified for skipped versions.

A permissions failure on an unpublished name may appear as an npm 404; verify ownership and authentication before interpreting that as permission to publish. OIDC mismatches, missing direct-publish permission, unsupported CLI versions and incorrect `repository.url` are common configuration failures.

References: [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/), [npm trust CLI](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [npm provenance](https://docs.npmjs.com/generating-provenance-statements/).

`@subvertic/vrl-icons` is added with the selective annotation work. Configure its package access and trusted publisher before releasing this checkout. This repository change does not establish that the new identity has been bootstrapped or published.
