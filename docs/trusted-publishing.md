# npm Trusted Publishing

The preferred release path publishes from GitHub Actions with npm Trusted Publishers. This uses GitHub's OIDC identity instead of a long-lived `NPM_TOKEN`, so the publish is tied to the exact repository workflow that npm trusts.

## Repository Flow

The publish workflow lives at `.github/workflows/publish.yml` and runs when a GitHub Release is published. It uses a GitHub-hosted `ubuntu-latest` runner, requests `id-token: write`, installs with `npm ci`, and runs:

```sh
make publish-ci
```

`make publish-ci` publishes the current committed workspace version with provenance enabled. It does not bump versions in CI. Prepare the version in a pull request before creating the GitHub release:

```sh
make release-prepare RELEASE=patch
make check
git diff
```

Commit the updated `package.json`, workspace `package.json`, `package-lock.json`, and `CHANGELOG.md` files. Then create a GitHub release for the matching version tag. Publishing the GitHub release triggers npm publication.

## npm Setup

Configure a trusted publisher for each package:

- `@subvertic/core`
- `@subvertic/render-svg`
- `@subvertic/react`
- `@subvertic/svelte`
- `@subvertic/sveltekit`

For each package on npmjs.com:

1. Open the package settings and find **Trusted Publisher**.
2. Select **GitHub Actions**.
3. Set **Organization or user** to the GitHub owner that hosts this repository.
4. Set **Repository** to the repository name that contains this workflow.
5. Set **Workflow filename** to `publish.yml`. npm expects only the filename, not `.github/workflows/publish.yml`.
6. Leave **Environment name** empty unless you also add a matching GitHub deployment environment to the workflow.
7. Select **Allowed actions**: `npm publish`.
8. Save the trusted publisher.

Use the exact GitHub owner, repository, and workflow filename. npm treats those fields as case-sensitive.

## Token Policy

Do not add an `NPM_TOKEN` secret for the publish workflow. The publish step is authenticated by OIDC when npm recognizes the configured trusted publisher.

After the trusted publisher flow works, restrict package publishing access on npm:

1. Open each package's **Settings**.
2. Open **Publishing access**.
3. Select **Require two-factor authentication and disallow tokens**.
4. Revoke old automation tokens that were only used for publishing.

If npm does not expose settings for a package that has never been published, do one bootstrap publish with local 2FA or a granular token that is allowed by the npm organization policy, then configure trusted publishing immediately afterward.

## Troubleshooting

- `ENEEDAUTH` usually means npm did not match the trusted publisher. Check the package name, GitHub owner, repository name, workflow filename, and `id-token: write` permission.
- `E403` on CI usually means the trusted publisher was not configured for that exact package, or the package version already exists.
- Self-hosted GitHub runners are not supported for npm trusted publishing. Keep the release job on `ubuntu-latest`.
- Trusted publishing automatically generates npm provenance for public packages from public GitHub repositories, but this repository also passes `--provenance` so the local command remains explicit.

References:

- <https://docs.npmjs.com/trusted-publishers/>
- <https://docs.npmjs.com/generating-provenance-statements/>
