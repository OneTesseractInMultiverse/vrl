# Contributing

Thank you for helping improve Vertical Route Language. VRL is a domain-specific language for technical route documentation, so changes should favor clarity, safety, testability, and long-term maintainability.

## Development

Use the Makefile as the entry point for local workflows:

```sh
make install
make test
make coverage
make check
make run
```

`make check` is the local gate before opening a pull request. It runs the 100 percent coverage gate and npm package dry-run checks.

## Architecture Rules

Core domain and application code must remain framework-free. Domain code must not import React, Svelte, browser APIs, file systems, network services, storage, or package tooling. Application services may coordinate parser, validator, normalizer, layout, and export ports, but should not inline their rules.

Each function should have one responsibility. Parser code parses. Validation code validates. Layout code computes positions. Renderers render already-normalized data. Framework adapters adapt.

## Tests

Tests must be self-contained. They must not require network access, external services, local secrets, databases, manual setup, or a specific machine state.

Each test function should contain exactly one assertion. Split behavior checks into separate focused tests.

## Pull Requests

Pull requests should include a clear description, a rationale, tests for behavior changes, and any documentation updates needed by users or contributors. Keep unrelated refactors out of feature and bug-fix pull requests.

## Safety and Domain Accuracy

VRL renders route documentation; it does not certify route safety. Avoid adding guidance that could imply equipment, water, anchor, rescue, or hazard safety without a clear source and review path.
