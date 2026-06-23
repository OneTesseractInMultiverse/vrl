# Release Checklist

Use this checklist before publishing npm packages.

1. Confirm package names and npm scope ownership. The project uses the `@stev` scope for Sociedad Técnica de Exploración Vertical.
2. Confirm repository URLs in all `package.json` files.
3. Run `make ci`.
4. Run `make check`.
5. Run `make publish-dry-run`.
6. Review generated package file lists from the dry run.
7. Update `CHANGELOG.md`.
8. Create and push a signed release tag when project policy requires it.
9. Publish from trusted CI with npm provenance enabled.

Local `npm publish --dry-run` can still require npm registry login and registry access. For deterministic local validation, this repository maps `make publish-dry-run` to the workspace package dry-run. The release workflow performs the real publish command from CI.

For first publish of scoped packages, npm requires public access to be explicit. This repository sets `publishConfig.access` to `public` and `publishConfig.provenance` to `true` in each publishable workspace.
