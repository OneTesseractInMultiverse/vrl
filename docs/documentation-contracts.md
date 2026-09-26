# Maintaining executable documentation

Documentation changes are part of implementation work. Update the language/API rule, its example and its expected behavior in the same change. Run `npm run check:docs` for focused feedback and `make check` before a PR. Both documentation suites are in the executable test inventory and run under coverage in CI; each test has one direct assertion.

## Scope and evidence

Discovery reads all root Markdown files, all nested `docs/` Markdown, and Markdown in first-party `packages/`, excluding dependency directories. Every `vrl` fence in that scope must carry an example ID and kind. No manually maintained list of documentation filenames can silently omit a new guide. Generated consumers, caches, third-party files and this guide's illustrative code fences are outside the example corpus.

The contracts in [`tests/fixtures/documentation-examples.json`](../tests/fixtures/documentation-examples.json) are reviewed expectations, not output regenerated from the compiler during a test. Tests extract the actual Markdown source, compile it through the public facade, and compare:

- Selected normalized facts addressed by JSON pointers, including decoded text, measurements/units, extension classification, declared rope/stage values and stable IDs.
- Every diagnostic's kind, severity, code, and one-based source line/UTF-16 column, in order. Related locations and spans are checked explicitly where relevant. Human-facing message wording is not snapshotted.
- Every physical point's owning ID, every technical segment's owner/direction/signed vertical meters, annotation-to-boundary references, and first/last measured elevations. Selected intermediate elevations protect the adjacent descent/ascent and exit-annotation examples.
- Presence of all derived outputs for success and absence of model/layout/JSON for blocking errors. Warning examples remain successful and retain the declared facts.

The source fingerprint makes any example edit require a fresh review even if that edit leaves selected facts unchanged. It does not establish correctness by itself. Expected facts and geometry must be reasoned from the declared route, never copied unquestioningly from current output. Standard binary floating-point results remain visible in fixtures; they are not silently rounded by the documentation checker.

Four marked normative tables in the language reference check processing defaults, numeric ranges/precision, enum applicability/vocabularies, and element ID prefixes against their domain owners. Deliberate acceptance/failure examples independently exercise those rules. Changing either a documented table or its implemented policy requires resolving the mismatch, not merely updating an unrelated snapshot.

Existing [public API contracts](public-contracts.md) separately protect runtime exports, declaration inventories, saved model compatibility and failure behavior. Their JavaScript/TypeScript examples are compiled and executed from installed tarballs by `check:packed`. [Dependency-boundary tests](../tests/dependency-boundaries.test.js) enforce the architecture's import direction. [Framework consumer jobs](framework-compatibility.md) separately establish real build/SSR/hydration behavior. The VRL-fence checker does not execute arbitrary prose, inline snippets, shell commands, JSX, or all embedded JavaScript strings; those require their own explicit test owner. It is not a formal proof of the complete language, visual layout or field safety.

## Tagging examples

Use lowercase fence metadata in this exact form. IDs must be unique across the corpus and use lowercase letters, digits and hyphens, beginning with a letter.

````text
```vrl example=your-stable-id kind=document
route "Your route"
start
exit
```
````

Kinds:

- `document`: the exact fenced source must compile successfully. Expected warnings must be listed; unexpected warnings fail the test.
- `fragment`: the expectation supplies a `prefix` ending in a newline, and optionally a `suffix` starting with a newline. Describe that context next to the example. Do not invent hidden context to excuse an incorrect documented rule.
- `invalid`: a complete source example deliberately produces blocking diagnostics and no derived outputs. Document the reason for failure and any nondefault compiler options. Invalid source is data and must not be executed as JavaScript.

The repository uses standalone fenced blocks with zero to three leading spaces. The extractor handles backticks or tildes, matching marker lengths, longer closing fences and CRLF. It removes the opening indentation from content, normalizes CRLF to LF, and joins body lines without adding a final newline. Interior whitespace, quotes, backslashes and hashes remain literal. Fences inside another fenced block are illustrative text, not nested examples. List/blockquote-nested examples are outside this supported authoring convention; place executable examples in standalone blocks.

Test names include the Markdown path, the first source line, and the example ID. Diagnostic coordinates are relative to the compiled VRL document, including explicit fragment context; they are not Markdown line numbers. A fingerprint failure prints the changed source and expected/actual digest. A behavior failure shows the structured comparison. Unterminated/malformed tags, duplicate IDs, missing cases, orphan expectations, absent facts and invalid failure classifications fail the gate.

## Adding or changing a contract

1. Write the rule and source in the most relevant guide; tag the fence and explain whether it is complete, a fragment, or deliberately invalid.
2. Add its expectation under the same ID. Set `kind`, optional fragment context, and optional compiler `options`. For valid examples include meaningful `expected.facts`; for invalid ones require the precise blocking diagnostic, not an arbitrary exception.
3. Fill `expected.geometry` from the route's physical progression and annotations. Set it to `null` for failures, and set `expected.outputs` to three false values. Keep every diagnostic, including warnings. Preserve source ranges or related locations with additional fact pointers when they are the lesson of the example.
4. Review source and expected outcomes together. Record the SHA-256 digest of the extracted source as `sha256`; the focused test's mismatch reports the digest for an intentional edit. Do not update expectations merely to make a failing implementation pass. Add or retain a focused defect regression when behavior is wrong.
5. Run the focused documentation check and full quality gate. Update contract revisions or migrations when a public behavior changes, and inspect any rendered example whose appearance changed.

Missing JSON-pointer paths are errors, including inherited object properties. `~1` and `~0` escape `/` and `~` in pointer keys. Expectations are deliberately ordinary reviewed JSON and have no executable expressions. There is no automatic “accept all current output” command.

The scanner, inventory checks, observation projection and marked-table parser are pure tooling computations. File discovery is a separate filesystem adapter; tests coordinate discovery, public compilation and comparisons. Published domain/application/renderer packages do not import documentation tooling or gain dependencies from it.
