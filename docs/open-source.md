# Open Source Project Practices

VRL is prepared as an MIT-licensed open source project with community governance, contribution guidelines, a security policy, package metadata, CI, and release documentation.

## Package Scope

The package names use the `@subvertic` npm scope for the VRL project family. Before publishing, confirm that the npm organization owns this scope and that trusted maintainers have appropriate publishing access.

## Community Maintenance

The project should welcome international contributors across canyoneering, canyoning, barranquismo, cave, rescue, and web tooling communities. Contributions should be evaluated on technical merit, domain accuracy, test coverage, documentation quality, and alignment with the architecture.

## Supply Chain

Published packages should use npm Trusted Publishers and provenance from trusted CI. Release builds should avoid dependency caches during publishing, run from a clean checkout, and avoid long-lived npm publish tokens. See [npm trusted publishing](trusted-publishing.md) for setup.
