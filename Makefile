RELEASE ?= auto
PROVENANCE ?= false
PUBLISH_ARGS = $(if $(VERSION),--version $(VERSION),--release $(RELEASE)) $(if $(OTP),--otp $(OTP),) $(if $(filter true,$(PROVENANCE)),--provenance,)

.PHONY: help install ci test coverage check run render-assets pack-dry-run publish-dry-run publish-plan release-prepare publish publish-ci clean

help:
	@printf '%s\n' 'Available targets:'
	@printf '  %-18s %s\n' 'make install' 'Install workspace dependencies'
	@printf '  %-18s %s\n' 'make ci' 'Install from package-lock.json'
	@printf '  %-18s %s\n' 'make test' 'Run unit tests'
	@printf '  %-18s %s\n' 'make coverage' 'Run tests with 100% coverage thresholds'
	@printf '  %-18s %s\n' 'make check' 'Run coverage and npm package dry-run checks'
	@printf '  %-18s %s\n' 'make run' 'Run local example renderer'
	@printf '  %-18s %s\n' 'make render-assets' 'Regenerate checked-in documentation SVG assets'
	@printf '  %-18s %s\n' 'make pack-dry-run' 'Inspect npm package contents without writing tarballs'
	@printf '  %-18s %s\n' 'make publish-dry-run' 'Validate npm publish file lists without registry login'
	@printf '  %-18s %s\n' 'make publish-plan' 'Show the next local npm publish plan'
	@printf '  %-18s %s\n' 'make release-prepare' 'Update workspace versions before cutting a GitHub release'
	@printf '  %-18s %s\n' 'make publish' 'Publish workspaces to npm; use OTP=123456 when npm 2FA is required'
	@printf '  %-18s %s\n' 'make publish-ci' 'Publish the committed version from trusted GitHub Actions'
	@printf '  %-18s %s\n' 'make clean' 'Remove generated local artifacts'

install:
	npm install

ci:
	npm ci

test:
	npm test

coverage:
	npm run coverage

check:
	npm run check

run:
	npm run example

render-assets:
	npm run example:svg

pack-dry-run:
	npm run pack:dry-run

publish-dry-run:
	npm run publish:dry-run

publish-plan:
	npm run release:publish -- --plan $(PUBLISH_ARGS)

release-prepare:
	npm run release:publish -- --prepare $(PUBLISH_ARGS)

publish:
	npm run release:publish -- $(PUBLISH_ARGS)

publish-ci:
	npm run release:publish -- --release current --provenance --trusted-publisher

clean:
	rm -rf coverage .coverage
