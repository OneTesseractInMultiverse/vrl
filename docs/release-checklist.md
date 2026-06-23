# Release Checklist

Use this checklist before publishing npm packages.

1. Confirm package names and npm scope ownership. The project uses the `@subvertic` scope.
2. Confirm repository URLs in all `package.json` files.
3. Run `make ci`.
4. Run `make check`.
5. Run `make publish-dry-run`.
6. Review generated package file lists from the dry run.
7. Update `CHANGELOG.md`.
8. Create and push a signed release tag when project policy requires it.
9. Publish with `make publish` after local npm login, or publish from trusted CI with npm provenance enabled.
10. If npm returns `E403` requiring two-factor authentication, generate a fresh npm one-time password and rerun with `make publish OTP=123456`.

Local `npm publish --dry-run` can still require npm registry login and registry access. For deterministic local validation, this repository maps `make publish-dry-run` to the workspace package dry-run. The release workflow performs the real publish command from CI.

For first publish of scoped packages, npm requires public access to be explicit. This repository sets `publishConfig.access` to `public` and `publishConfig.provenance` to `true` in each publishable workspace. Local `make publish` passes `--provenance=false` unless `PROVENANCE=true` is provided.

Local publish examples:

```sh
make publish
make publish VERSION=0.2.0
make publish RELEASE=minor
make publish OTP=123456
make publish-plan
```

`OTP` is forwarded to each `npm publish` command as `--otp`. If a publish attempt fails before any package is published, rerun the same target with a fresh OTP. If a later package fails after earlier packages were published, run `make publish-plan` before retrying so the next target version is explicit.
