# Open Source Project Practices

VRL is prepared as an MIT-licensed open source project with community governance, contribution guidelines, a security policy, package metadata, CI, and release documentation.

## Package Scope

The current package names use the `@vrl` npm scope. Before publishing, confirm that this scope is available or replace it with the organization-owned scope that will maintain the project.

## Community Maintenance

The project should welcome international contributors across canyoneering, canyoning, barranquismo, cave, rescue, and web tooling communities. Contributions should be evaluated on technical merit, domain accuracy, test coverage, documentation quality, and alignment with the architecture.

## Supply Chain

Published packages should use npm provenance from trusted CI. Release builds should avoid dependency caches during publishing and should run from a clean checkout.
