# Compiler Ports and Composition

The compiler is synchronous. `compileRoute(source, options)` remains the convenient default entry point. `createRouteCompiler(overrides)` substitutes selected implementations and captures a shallow, immutable wiring snapshot without freezing the caller's object. All six ports are functions; extra configuration properties are preserved but do not create additional stages. A missing, `undefined`, or `null` geometry validator uses the existing default. Explicit nonfunctions for other ports, or nonfunction non-null geometry overrides, throw `TypeError` when configuring the compiler.

`compileRouteWithDependencies(source, options, dependencies)` remains available for callers supplying their own wiring. It requires `parse`, `validate`, `normalize`, `layout`, and `exportJson`, and retains its legacy default for an omitted/nullish `validateGeometry`. This compatibility default lives in composition. The internal application coordinator always receives six complete ports and has no concrete fallback.

The composition module, application contracts/coordinator, and JSON adapter are internal modules. Existing package-root export names and argument order are preserved; no new public exports or runtime dependencies are introduced.

## Contracts

`application/compiler-ports.js` owns the structural contracts and runtime checks. These are integration seams for the six compiler stages, not interfaces for every domain calculation.

| Port | Arguments | Result |
| --- | --- | --- |
| `parse` | Source string; `{ limits }` containing the immutable, resolved processing budgets | `{ ast, diagnostics }` |
| `validate` | The parser's AST | Diagnostic array |
| `normalize` | The same AST, after nonblocking syntax/semantic validation | Model record |
| `validateGeometry` | Model; optional AST `sourceMap` passed separately | Diagnostic array |
| `layout` | Model; caller's `options.layout` (possibly undefined) | Layout record |
| `exportJson` | Model | String |

Records must be synchronous plain objects, with `Object.prototype` or null as their prototype. Arrays, dates, promises, and objects with a callable `then` are rejected where records are required. Promise results are never awaited. Diagnostic arrays with a callable `then` are also rejected.

Default normalization applies the stricter [raw-input and normalized model contracts](domain-model.md), including string values and separate extension maps. Alternate model-producing ports remain responsible for preserving the contracts of their consumers.

The parser must return a recovery AST even for invalid source. The checked envelope requires a metadata record and a dense array of element records, each with an attributes record. Diagnostic arrays must be dense; each item has string `kind`/`message`, `severity` equal to `error` or `warning`, and a location with positive safe-integer `line`/`column`. Optional diagnostic fields, including codes, spans, suggestions, and related locations, retain their documented meanings and are passed through. Custom kinds and codes are allowed.

These checks establish the envelope used by orchestration, not all domain invariants. Default semantic/normalization/layout implementations still require the documented VRL AST/model contracts, including element types, identities, values, and valid optional provenance. A set of alternate implementations may agree on additional or different model/layout fields, provided their records satisfy the numeric policy and every downstream consumer understands them. For example, a custom layout used with the SVG renderer must still satisfy that renderer's layout contract.

Numbers in successful models/layouts must be finite and have absolute magnitude at most `Number.MAX_SAFE_INTEGER`. The default geometry validator can report invalid model numbers as blocking diagnostics; if a custom geometry validator permits them, the application's numeric guard throws `RangeError` before layout. Layout numeric failures throw before export.

Custom exporters own their format, so the coordinator checks for a string without reparsing or rewriting it. The default JSON adapter preserves two-space indentation, native JSON serialization behavior, and the supported-number guard, including values returned by `toJSON`. Native serialization failures, such as cycles and `BigInt`, remain exceptions. The standalone `exportRouteJson` helper retains its existing behavior for caller-supplied values.

## Ordering and Failure

The stages run in this order:

1. Resolve limits and check source budgets, before calling any adapter.
2. Parse and validate the returned envelope. A blocking parser `limit` diagnostic stops immediately.
3. Check AST element/list budgets before semantic validation.
4. Validate the recovery AST. Syntax and semantic diagnostics are combined in that order; any error stops before normalization. This deliberately preserves collection of semantic errors alongside non-limit syntax errors.
5. Normalize, then validate geometry using the original provenance. Geometry errors stop before layout/export.
6. Check model numbers, compute and check layout, then export text.

A source diagnostic failure returns `{ ok: false, ast, diagnostics, model: null, layout: null, json: null }`. Warnings remain nonblocking and preserve parser, semantic, then geometry order. Success retains the same result shape and the stage results. Diagnostic accumulation does not modify adapter-owned arrays.

Malformed port results throw a `TypeError` naming the responsible port before a later port is called. Invalid wiring fails at configuration time, even if a later compilation would fail source preflight. Unsupported numeric values throw `RangeError` as described above. Exceptions thrown by adapters propagate unchanged; the coordinator does not turn programming, configuration, or I/O failures into source diagnostics or successful partial outputs. No retry or asynchronous scheduling occurs.

Adapters should treat supplied ASTs, models, provenance, and options as read-only and return deterministic values for unchanged inputs. They receive those values directly rather than deep clones. The compiler cannot enforce determinism in caller-owned closures or undo adapter side effects. Invalid or stale provenance remains the adapter's responsibility. See [diagnostics](diagnostics.md) and [processing budgets](api-reference.md#document-processing-limits) for their complete contracts.

## Example

An application can keep the default parser, validation, normalization, and layout while choosing its own export representation:

```js
import { createRouteCompiler } from "@subvertic/core";

const compile = createRouteCompiler({
  exportJson: (model) => JSON.stringify({
    name: model.name,
    ids: model.elements.map((element) => element.id)
  })
});

const result = compile('route "Custom JSON"\nwalk distance=1m');
// result.ok === true
// result.json === '{"name":"Custom JSON","ids":["W1"]}'
```

## Dependency Boundary

`composition/route-compiler.js` owns concrete defaults and public compiler factories. `application/compile-route.js` coordinates contracts and domain policies; it imports no parser, validator, layout, serializer, composition module, or package-root barrel. `adapters/json/export-route-json.js` owns JSON serialization and depends inward on the numeric policy. Domain modules remain framework- and infrastructure-free.

`tests/dependency-boundaries.test.js` checks static ESM imports and re-exports in every core source module, including the public entry point. Domain imports stay within domain; application imports stay within application/domain. Parser and validation depend on their own layers and domain; the parser may also import the specific application-owned `route-ast.js` record factories. Layout may also use the existing validation layer for standalone geometry guards. Adapters depend inward on application/domain; composition can wire concrete implementations. Imports outside core and runtime module loading are prohibited in these source modules. This is a focused source-boundary check, not a general JavaScript security sandbox; changes to module-loading syntax require updating the check.

Contract tests exercise an independent alternate syntax and model, input/output composition, call order, warning aggregation, every failure stage, malformed results, synchronous behavior, compatibility fallbacks, and wiring isolation. The full suite and boundary check run under `make check`; coverage supplements those behavioral assertions.
