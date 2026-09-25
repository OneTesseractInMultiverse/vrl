# Behavioral verification

Coverage records execution, not correctness. A passing test must establish an observable contract: retained route facts, correct coordinates and identifiers, complete serialized content, or a precise failure that blocks downstream work. Keep the regression test with each defect fix. Do not replace expected values with a weaker length, substring, or snapshot check merely to reach a coverage threshold.

## Quality gate and suites

After `npm ci`, run `make check`. It runs the test convention/inventory check, consumer type checks, all behavioral suites with the existing 100% JavaScript line/branch/function thresholds, selected mutation probes, package dry runs, and an isolated offline tarball consumer. CI runs the same command. Test output reports behavioral results and mutation detection separately from the coverage table.

The executable inventory is [`scripts/testing/test-suites.mjs`](../scripts/testing/test-suites.mjs). Every `.test.js` file must belong to exactly one primary suite. Missing, duplicate, or unassigned files fail the gate, so new regressions cannot accidentally disappear from a selected suite. Files remain in `tests/` to preserve fixture and source references; the inventory supplies their logical organization.

| Suite | Responsibilities and representative regressions |
| --- | --- |
| `domain` | Known fields, numeric boundaries, normalized records, ID reservation/uniqueness, technical ownership; `domain-model`, `element-identifiers`, `numeric-integrity`, `invariants-domain` |
| `parsing` | Lexical recovery, declaration order, source ranges, seeded malformed input, whitespace/comment transformations; `lexer`, `document-grammar`, `source-diagnostics`, `invariants-parsing` |
| `compilation` | Port order, short-circuiting, failure contracts, budgets, public types/exports; `compiler-ports`, `processing-limits`, `public-contracts`; the original cross-layer `vrl.test.js` remains here as a compatibility suite |
| `layout` | Endpoint binding, adjacent technical events, ascent/descent direction, annotations independent of physical progression; `technical-segments`, `route-boundaries`, `invariants-layout` |
| `serialization` | XML encoding, complete scene bounds, preserved stages/redirections/anchors, option validation and determinism; `xml-text`, `scene-fitting`, `technical-annotations`, `invariants-serialization` |
| `adapters` | Full state and failure output, real framework server rendering, warning visibility and escaped diagnostics; `diagram-state`, `warning-presentation` |
| `tooling` | Dependency directions, assertion policy, generator replay, suite inventory, and mutation result classification |

```sh
npm test
npm test -- --suite layout
npm test -- --suite serialization --test-name-pattern='scene bounds'
npm run check:tests
npm run check:mutations
npm run coverage
```

Focused suites are for development; the full gate remains required before a PR. A focused test count or a filtered coverage run is not evidence that every package meets its threshold.

## Reproducible generated cases

[`tests/helpers/seeded-cases.js`](../tests/helpers/seeded-cases.js) uses a fixed 32-bit generator, with default seed `1448234018` (`0x56524c22`). It builds a bounded corpus of 24 route cases and 16 batches of seven deliberate source mutations. Every generated test name includes the seed and case index; source-bearing assertion messages include the exact document. No clock, network, global random source, or production parser/geometry helper computes the expected route facts.

Cases vary measured technical sequences, explicit and implicit boundaries, ascent/descent, inclinations, stage lengths, redirection sides, shapes, reserved IDs, annotation placement, negative elevations, narrow widths, readable gaps, and hostile/entity-looking text. Expected technical motion comes from independent integer source facts. Whitespace/comment transformations compare semantic data after explicitly removing source locations, which are expected to change. Separate fixed tests retain minimum/maximum numeric and invalid Unicode boundaries.

Replay one failing case or explore an additional seed:

```sh
VRL_TEST_SEED=1448234018 npm test -- --suite layout --test-name-pattern='case=0$'
VRL_TEST_SEED=0xffffffff npm test -- --test-name-pattern='seed='
```

Seeds must be unsigned 32-bit integers in decimal or hexadecimal. Invalid seeds fail clearly rather than falling back silently. Mutation probes deliberately pin the default seed so their reviewed witness names remain stable. When a generated case exposes a defect, preserve the printed source as a small named regression alongside the fix; reduce it manually if helpful. There is no automatic shrinking or claim of exhaustive fuzzing.

## Contract oracles and failure boundaries

| Invariant | Positive and boundary evidence | Invalid case and blocked effects |
| --- | --- | --- |
| Finite values and JSON fidelity | Walk all public numeric leaves and compare parsed JSON with the model; smallest supported measurement and maximum magnitude | Nonfinite custom layout values throw `RangeError` before export; numeric-integrity regressions cover source overflow and derived coordinate overflow |
| Unique IDs | Reserve a later explicit `R1` before allocating the first unnamed rappel; preserve each supplied technical owner | Duplicate identifiers produce `VRL_IDENTIFIER_DUPLICATE`; normalization, geometry, layout and export spies remain untouched |
| Technical event conservation | Compare the exact ordered owner, direction and signed motion of mixed climbs/descents; retain standalone and adjacent-event regressions | Zero heights and unsupported fields have exact diagnostic codes and block normalization onward |
| Endpoints | First/last elevations equal declared source facts; each technical segment changes elevation by its own declaration; tiny motions remain in dedicated regressions | Contradictory technical-only endpoint data produces `VRL_GEOMETRY_ELEVATIONS_INCONSISTENT` before layout/export |
| XML validity and text fidelity | Independent XML parsing, SVG namespace/title checks and reassembled note rows; check emitted entity references independently because the XML parser accepts bare ampersands | XML-invalid characters throw `TypeError` without a partial SVG; renderer configuration/XML regression suites retain invalid paint, injection and geometry cases |
| Complete scene bounds | Check scene/panel envelopes and independently inspect emitted paths, lines, circles, rectangles and text under narrow widths and zero margins | Scene-fitting/configuration regressions reject invalid/nonfinite dimensions; a deliberately clipped viewport must fail the generated bounds oracle |
| Annotation preservation | Notes survive traversal and layout; inserting annotations leaves physical points unchanged; exact stage/redirection labels survive all technical shapes | Invalid stage lengths and redirection positions produce diagnostics, suppress derived output and prevent downstream effects in `technical-annotations` regressions |

The independent SVG primitive inspector lives in [`tests/helpers/svg-bounds.js`](../tests/helpers/svg-bounds.js) and is shared with the earlier clipping regressions. Its text envelope is a conservative test approximation, not browser font measurement. The entity check applies to VRL's emitted SVG, which does not contain CDATA or a DTD. Scene and XML assertions complement each other; neither replaces visual inspection, browser rendering, accessibility testing, or the dedicated visual fixture work.

## Single-assert convention

`check:tests` parses JavaScript with Acorn (a root development dependency). It checks inline `node:test` callbacks, including parameterized registrations, and requires exactly one imported strict assertion as a direct expression in the callback body. Awaited assertions and concise arrow callbacks are supported. Assertions hidden in conditionals, loops, delegated helpers, or outside tests fail the check; assertion-like text in comments/strings does not count. The tool's own success and failure fixtures exercise these rules.

Keep setup inside the callback and put one behavior-focused assertion after it. A structured comparison may express one coherent contract, such as a failed result together with its diagnostic and untouched downstream ports. Split unrelated behaviors into separate tests. Observation helpers return facts and contain no assertions. The AST check enforces this repository convention; it is not general control-flow proof or a substitute for reviewing assertion quality.

## Selected mutation probes

[`scripts/testing/mutations.mjs`](../scripts/testing/mutations.mjs) pairs nine reviewed faults with specific public-behavior witnesses: finite-number guarding, explicit ID reservation, climb direction, endpoint binding, annotation attachment, XML ampersand encoding, right-hand canvas fitting, rope-stage preservation, and duplicate-field rejection.

`check:mutations` copies packages and tests into an owned temporary workspace, connects first-party package imports to those copies, and links the already installed development modules. For each fault it first runs the unmodified witness, requires a passing assertion, changes exactly one reviewed source fragment, and requires the intended test to fail with `ERR_ASSERTION`. It restores that copied file before proceeding and removes the temporary workspace on completion/failure. It never edits the checkout or installs packages.

A surviving fault fails the gate. Syntax/import errors, timeouts, signals, zero selected tests, an unrelated witness, ambiguous replacement targets, or an already-failing baseline also fail the gate; none counts as successful detection. Each subprocess has a 30-second timeout and bounded output. The probes validate test sensitivity to these selected faults, not a universal mutation score. When implementation refactoring moves a target, update its reviewed replacement while preserving the behavioral witness and baseline/detection checks.
