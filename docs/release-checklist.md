# Release Checklist

Use this checklist before publishing npm packages.

1. Confirm package names and npm scope ownership. The project uses the `@subvertic` scope.
2. Confirm repository URLs in all `package.json` files.
3. Confirm npm Trusted Publishers are configured for every package. See [npm trusted publishing](trusted-publishing.md).
4. Run `make ci`.
5. Prepare the release version with `make release-prepare RELEASE=patch`, `make release-prepare RELEASE=minor`, or `make release-prepare VERSION=0.2.0`.
6. Update `CHANGELOG.md`.
7. Run `make check`.
8. Run `make publish-dry-run`.
9. Review generated package file lists from the dry run.
10. Commit the version, lockfile, changelog, and documentation updates.
11. Create and push a release tag that matches the committed package version.
12. Publish the GitHub release. The `.github/workflows/publish.yml` workflow runs `make publish-ci` and publishes the committed version through npm Trusted Publishers.

Local `npm publish --dry-run` can still require npm registry login and registry access. For deterministic local validation, this repository maps `make publish-dry-run` to the workspace package dry-run. The release workflow performs the real publish command from CI.

For first publish of scoped packages, npm requires public access to be explicit. This repository sets `publishConfig.access` to `public` and `publishConfig.provenance` to `true` in each publishable workspace. Trusted CI publishes with provenance enabled and does not require an `NPM_TOKEN` secret. Local `make publish` passes `--provenance=false` unless `PROVENANCE=true` is provided.

Local publish examples:

```sh
make release-prepare RELEASE=patch
make publish
make publish VERSION=0.2.0
make publish RELEASE=minor
make publish OTP=123456
make publish-plan
```

`OTP` is forwarded to each `npm publish` command as `--otp`. If a local publish attempt fails before any package is published, rerun the same target with a fresh OTP. If a later package fails after earlier packages were published, run `make publish-plan` before retrying so the next target version is explicit.
