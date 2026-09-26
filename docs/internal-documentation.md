# Function documentation and responsibility

Every authored function needs adjacent JSDoc describing its responsibility, parameters and result. This includes public APIs, private helpers, returned closures, object/class methods, callbacks, test doubles, test bodies, release tooling, consumer fixtures and Svelte script functions. Document each public declaration overload as well as its implementation so installed-package editors expose the contract. Callable port/type declarations describe the expected responsibility at the boundary; an implementation still needs its own documentation.

Use exactly one `@responsibility coordinator` or `@responsibility computation` tag. The tag describes the function's actual work, not its directory, visibility, name or whether it is async.

- A **coordinator** sequences or delegates independently owned operations: application ports, parser stages, preparation/serialization, framework calls, I/O, lifecycle handling or test setup/assertions. Its documentation explains ordering, short-circuiting, effects, ownership and exception propagation. It must not also own grammar, geometry or domain rules that belong in computation units.
- A **computation** owns one rule or transformation: token decoding, validation predicates, numeric calculations, record projection, geometry, formatting or serialization. It may call focused computation helpers. Local accumulators are compatible with this role; mutating caller-owned input or captured state must be stated explicitly. Computation does not imply an absence of exceptions, and the tag alone is not a proof of purity.

If a function both manages an external workflow and implements a separate domain calculation, split those responsibilities before assigning the tags. The compiler workflow, domain model and framework boundaries remain governed by [hexagonal architecture](architecture.md) and SOLID; this convention does not justify extra layers or changes to public APIs.

## Writing useful contracts

Start with what the function is responsible for and the rules that matter to its caller. Describe every parameter in signature order with `@param {Type} name - Description`. Include units, accepted shape, optional/default behavior, ownership and relevant preconditions. Name every destructured input using its positional root (`input1`, `input2`, etc.) followed by its field paths; aliases document the public key, and array patterns document occupied indices. Use the precise published types in declaration files. Internal `unknown` inputs are appropriate when the function intentionally checks or adapts arbitrary values; the prose must still describe acceptance and failure behavior.

Always include `@returns`, including `{void}` for a synchronous guard, `{Promise<void>}` for an asynchronous operation without a result, and `{never}` only when there is no normal return path. Explain empty, null, failure-result and sentinel cases. Use `@throws` for deliberate exceptions and describe propagated dependency failures. State mutation, I/O, captured state and trusted markup in the prose where applicable. Never describe a test double as publishing, authenticating or reading the real registry when it only records an in-memory call.

```js
/**
 * Compute the signed vertical change of one already validated technical event.
 * @responsibility computation
 * @param {number} meters - Nonnegative declared vertical distance in meters.
 * @param {boolean} ascending - Whether traversal increases physical elevation.
 * @returns {number} Positive ascent or negative descent in meters.
 */
function signedVerticalChange(meters, ascending) {
  return ascending ? meters : -meters;
}
```

Place a callback's block immediately before its function expression. Place a method's block before its property/method name. For a directly returned closure, place the block **before `return`**: putting a multiline comment between `return` and the expression can change behavior through automatic semicolon insertion.

```js
/**
 * Capture an emitter for later delivery; this factory does not perform I/O itself.
 * @responsibility coordinator
 * @param {Function} emit - Synchronous output port accepting the supplied text.
 * @returns {Function} Delivery callback retaining the selected port.
 */
function bindOutput(emit) {
  /**
   * Deliver the supplied text through the captured output port.
   * @responsibility coordinator
   * @param {string} text - Exact message to pass to the output port.
   * @returns {void} Completes after delivery; port exceptions propagate unchanged.
   */
  return text => { emit(text); };
}
```

Test callbacks describe the behavior or failure being verified, retain the single direct assertion, and document fixture helpers separately. Internal docs supplement assertions about correctness; they do not replace behavioral tests or make coverage a correctness oracle.

## Verification and limits

Run `npm run check:function-docs` for the focused structural gate. It is included in `npm run check:docs` and `make check`, so existing workspace CI enforces it.

Discovery covers root JavaScript/TypeScript/Svelte files and nested `packages/`, `scripts/`, `tests/` and `integration/` source trees. Dependencies, hidden caches, generated consumer directories, source-code strings used as test data, Markdown snippets and third-party/generated code are outside that implementation inventory. Svelte module and instance scripts retain original line numbers; authored template callbacks must be moved to documented named script handlers. This avoids counting compiler-generated functions or silently missing executable template callbacks.

The checker parses JavaScript with the existing development parser and erases TypeScript with the workspace Node runtime without executing it. Public declaration overloads use the repository's single-line `export function ...;` convention and are inspected through inert, uniquely named stubs; unsupported declaration formatting fails rather than disappearing during type erasure. Callable interface/type signatures are reviewed as boundary documentation, while `check:types` continues to validate their types. An immediately adjacent `@ts-expect-error` line may sit between a docblock and the deliberate negative fixture it describes.

The gate rejects missing blocks/summaries, missing or conflicting roles, absent or duplicate return contracts, malformed parameter tags, stale names and missing destructured members. It does **not** establish that a description is true, a type is precise, a role follows SRP, a computation is deterministic or a test proves the intended behavior. Review those claims against the implementation. Keep focused success/failure, dependency, type, mutation and consumer tests authoritative for their existing contracts.

Documentation tooling belongs outside published packages, uses existing development dependencies and adds no runtime dependencies. When a comment-only edit touches many functions, compare executable syntax before/after and run the ordinary quality gate; comments around `return`, type-error directives and string-based mutation targets can still affect verification or behavior.
