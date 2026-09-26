# npm Trusted Publishing

VRL publishes six public packages from `OneTesseractInMultiverse/vrl` through `.github/workflows/publish.yml`. GitHub Actions supplies an OIDC identity; the workflow does not need an `NPM_TOKEN` secret. Every package's repository URL must match this exact repository, including case.

## Package identity and first publication

The canonical names are `@subvertic/vrl-core`, `@subvertic/vrl-render-svg`, `@subvertic/vrl-diagram`, `@subvertic/vrl-react`, `@subvertic/vrl-svelte` and `@subvertic/vrl-sveltekit`. `subvertic` is the organization scope; `vrl-` identifies the project inside that organization.

Version 0.2.0 used incorrect names without the `vrl-` prefix. Version 0.2.1 restores the canonical identities and internal dependency names. Existing `@subvertic/vrl-*` packages retain their earlier release history; `@subvertic/vrl-diagram` is a new package. Consumers of 0.2.0 must update all six dependency/import names together. npm cannot rename a published package, and trusted-publisher settings do not transfer between names. Configure only the canonical identities below.

npm requires a package to exist before a trusted publisher can be configured. For unpublished names:

1. Confirm ownership of the `@subvertic` npm organization and write access for the publishing account.
2. Prepare and merge the release commit, including versions and changelog. Verify the workspace gate and framework consumer matrix.
3. In a clean checkout of that commit, authenticate the npm CLI with `npm login --auth-type=web --registry=https://registry.npmjs.org`. A browser session by itself does not authenticate the CLI. Complete npm's authentication challenge interactively; do not store an OTP in source or CI secrets.
4. Review `make publish-plan` and `make publish-dry-run`.
5. Publish the prepared workspace set, including any new package identities, using `make publish` (local provenance is disabled). If interrupted, follow the recovery procedure below. This is a real public release, not a placeholder package.
6. Configure trusted publishing on each newly created package. Subsequent versions can publish from GitHub with provenance.

Do not create a public GitHub release before bootstrap and trusted-publisher setup are complete: the release event initiates publication immediately. A local bootstrap does not acquire GitHub provenance retroactively; the first subsequent CI-published version will have it.

## npm settings

For each of the six current package names, open **Settings → Trusted Publisher → GitHub Actions** and enter:

| Setting | Exact value |
| --- | --- |
| Organization or user | `OneTesseractInMultiverse` |
| Repository | `vrl` |
| Workflow filename | `publish.yml` |
| Environment name | Leave empty; the workflow does not use a deployment environment |
| Allowed action | Enable direct `npm publish` |

Save the configuration and complete npm's authentication challenge. The workflow uses direct publication, so a publisher that only permits staging will not work. npm does not validate the repository/workflow combination when settings are saved; a successful CI publication is the end-to-end authentication check.

Alternatively, npm CLI 11.15+ supports an interactive configuration command per existing package:

```sh
npm trust github @subvertic/vrl-core --repo OneTesseractInMultiverse/vrl --file publish.yml --allow-publish
npm trust list @subvertic/vrl-core
```

Repeat for every current package name. Inspect existing connections before adding another; do not revoke unrelated publishers or tokens. Once the new flow is verified, package maintainers may choose the restrictive 2FA/token policy in npm settings. It does not disable OIDC publishing.

## GitHub release flow

The workflow has three stages:

1. **Verify:** accept only `vX.Y.Z` matching every committed manifest and lockfile; require the tag's exact commit to be reachable from `origin/main`, a clean checkout, correct provenance repository and exact internal dependency pins. Run `make check` without OIDC permission.
2. **Consumers:** verify the same captured commit with packed React/Svelte/SvelteKit consumers on the supported Node/framework matrix.
3. **Publish:** check out that verified commit, recheck tag identity, pack all packages, then publish tarballs in dependency order with OIDC and provenance. Only this job has `id-token: write`. Packages require no build or dependency installation in this job; package lifecycle scripts are disabled.

All jobs use hosted runners, bounded timeouts and no package cache. A repository-wide concurrency group serializes release workflows without cancelling an active publication. No secret token is passed to any job. The pinned Node release includes a compatible npm CLI (OIDC requires npm 11.5.1+ and Node 22.14+).

Publishing a GitHub Release triggers publication. The **Publish → Run workflow** action on `main` also accepts an existing version tag and one operation:

- `dry-run` (default): run all verification and consumer checks, without requesting OIDC or publishing.
- `publish`: publish the checked committed version; fail if it already exists for any package.
- `resume`: verify already-published tarball integrity and publish only missing packages at that same version.

The workflow must be merged into `main`, and the release tag must contain it and the corresponding scripts. Validation does not create tags, change versions, merge pull requests or create GitHub Releases. Dry runs cannot prove npm permissions or provenance; only actual publication does.

## Partial-publication recovery

Publication cannot be atomic across six registry packages. A failure reports packages whose publish commands completed, but a failed network response can still mean npm accepted the last request. Do not assume the failed package is absent, unpublish successful packages, or move an existing tag.

1. Keep the exact source commit and version. Inspect npm versions and the workflow failure.
2. Fix external authorization or registry availability without editing release files.
3. Run the workflow on `main` with the same tag and `resume`, or locally use `make publish-plan RESUME=true` followed by `make publish RESUME=true`.
4. The tool packs all artifacts and compares SHA-512 integrity for every already-published package before publishing anything. Matching packages are skipped; missing packages retain dependency order. A complete retry is a no-op.
5. If any existing tarball differs or has no usable integrity, stop and prepare a new version for all packages. Never overwrite or unpublish as a recovery strategy. Dist-tags are not modified for skipped versions.

A permissions failure on an unpublished name may appear as an npm 404; verify ownership and authentication before interpreting that as permission to publish. OIDC mismatches, missing direct-publish permission, unsupported CLI versions and incorrect `repository.url` are common configuration failures.

References: [npm trusted publishers](https://docs.npmjs.com/trusted-publishers/), [npm trust CLI](https://docs.npmjs.com/cli/v11/commands/npm-trust/), [npm provenance](https://docs.npmjs.com/generating-provenance-statements/).
