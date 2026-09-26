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

`make check` is the local gate before opening a pull request. It runs behavioral and type checks, the configured 100 percent JavaScript coverage gate, mutation probes and packed-package checks. CI also runs the real framework consumers across the [compatibility matrix](docs/framework-compatibility.md); run those checks for framework, packaging or compatibility changes.

## Architecture Rules

Core domain and application code must remain framework-free. Domain code must not import React, Svelte, browser APIs, file systems, network services, storage, or package tooling. Application services may coordinate parser, validator, normalizer, layout, and export ports, but should not inline their rules.

Each function should have one responsibility. Parser code parses. Validation code validates. Layout code computes positions. Renderers render already-normalized data. Framework adapters adapt.

## Tests

Tests must be self-contained. They must not require external services, local secrets, databases, manual interaction, or a specific machine state. Framework consumer preparation downloads locked packages and Chromium; test execution runs offline against an owned local server with isolated browser contexts. See the [reproduction commands](docs/framework-compatibility.md#reproduce-locally).

Each test function should contain exactly one assertion. Split behavior checks into separate focused tests.

## Pull Requests

Pull requests should include a clear description, a rationale, tests for behavior changes, and any documentation updates needed by users or contributors. Keep unrelated refactors out of feature and bug-fix pull requests.

## Safety and Domain Accuracy

VRL renders route documentation; it does not certify route safety. Avoid adding guidance that could imply equipment, water, anchor, rescue, or hazard safety without a clear source and review path.
