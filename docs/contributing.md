# Contributing

VRL code should keep the architecture boundary clear. Domain code must remain independent from UI frameworks, browser APIs, file systems, HTTP clients, local storage, package managers, and services. Application services may coordinate computations and ports, but they should not inline parser rules, validation rules, layout math, or SVG path construction.

Every function should have one reason to change. Measurement parsing should not know about SVG. Validation should not draw. React and Svelte adapters should not implement route semantics. Renderers should not parse source text.

Tests must be self-contained. They should not require network access, databases, secrets, local configuration, browser state, or manual setup. Each test function should contain exactly one assertion. Split behavior checks into separate tests with focused names.

Documentation examples should stay executable or parseable. When adding a VRL snippet, add a test fixture or parser test so docs cannot drift away from implementation.

Renderer changes must preserve the separation between scene computations and SVG encoding. Add or update pure scene records for geometry and labels, and let serializers consume them without reconstructing domain facts from display text. Test scene coordinates and category/value invariants independently of XML, then verify complete output and failure behavior through public boundaries. See [rendering scenes](rendering-scene.md).

## Public contract checks

Run `npm run check:types` for consumer success/failure examples and `npm run check:packed` to test the actual packages in an isolated offline consumer after `npm ci`. Both are included in `make check`. Maintain the export inventory and contract revisions described in [public contracts](public-contracts.md). Treat new declarations, nullability, units, source provenance, and override preconditions as API behavior; retain saved compatibility fixtures and explain migrations.


## Behavioral verification

Register every new workspace test file in `scripts/testing/test-suites.mjs` under its primary domain, parsing, compilation, layout, serialization, adapter, or tooling responsibility. `npm run check:tests` verifies the inventory and parses test callbacks to enforce one direct strict assertion per test; helpers return observations instead of asserting. Keep the regression with each defect fix and state the expected result or precise failure, including suppressed downstream effects where relevant.

Use `npm test -- --suite layout` for focused work and `make check` before opening a PR. The full gate retains 100% configured JavaScript coverage and separately runs selected mutation probes. Generated failures carry replay seeds, case indexes, and source; preserve a reduced named regression when one exposes a defect. See [the testing guide](testing.md) for the invariant matrix, seed controls, mutation workflow, and verification limits.

## Framework consumers

Keep framework test dependencies and HTTP/browser effects in the isolated consuming applications, outside domain and application packages. Add adapter success, update and precise failure cases under `integration/consumer`; its `.test.mjs` files follow the same single-assert convention but run through the [separate compatibility matrix](framework-compatibility.md). Update locked profiles and documentation together, and verify strict peer installation plus production build/SSR/hydration whenever a framework or package export changes.
