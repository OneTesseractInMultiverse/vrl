.PHONY: help install ci test coverage check run pack-dry-run publish-dry-run clean

help:
	@printf '%s\n' 'Available targets:'
	@printf '  %-18s %s\n' 'make install' 'Install workspace dependencies'
	@printf '  %-18s %s\n' 'make ci' 'Install from package-lock.json'
	@printf '  %-18s %s\n' 'make test' 'Run unit tests'
	@printf '  %-18s %s\n' 'make coverage' 'Run tests with 100% coverage thresholds'
	@printf '  %-18s %s\n' 'make check' 'Run coverage and npm package dry-run checks'
	@printf '  %-18s %s\n' 'make run' 'Run local example renderer'
	@printf '  %-18s %s\n' 'make pack-dry-run' 'Inspect npm package contents without writing tarballs'
	@printf '  %-18s %s\n' 'make publish-dry-run' 'Validate npm publish file lists without registry login'
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

pack-dry-run:
	npm run pack:dry-run

publish-dry-run:
	npm run publish:dry-run

clean:
	rm -rf coverage .coverage
