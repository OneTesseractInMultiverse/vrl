# @subvertic/vrl-core

Bundled declarations cover every public export. See the [API stability, typed contracts, and revision policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/public-contracts.md). See the model migration below for extension-field paths.

Framework-free core for Vertical Route Language.

This package parses compact VRL source, validates route semantics, normalizes route models, computes elevation-aware vertical layout data, and exports JSON. It has no framework, DOM, file-system, or network dependencies.

This source README may include unreleased behavior. Check the [changelog](https://github.com/OneTesseractInMultiverse/vrl/blob/main/CHANGELOG.md) against your installed version. The quick start uses a fictional canyon fixture.

## Install

```sh
npm install @subvertic/vrl-core
```

## Usage

```js
import { compileRoute, formatDiagnostic, summarizeRouteMeasurements } from "@subvertic/vrl-core";

const source = `route "Synthetic two-rappel canyon"
start "Entry"
rappel R1 height=18m rope=40m anchor=bolts anchor_count=2 station=right
pool P1 type=unknown
walk W1 distance=120m
rappel R2 height=12m rope=30m anchor=tree
hazard H1 type=slippery note="Slippery landing"
exit "Exit"`;

const result = compileRoute(source, {
  layout: {
    width: 900,
    horizontalScale: 1.15,
    pixelsPerMeter: 6,
    minNodeGap: 68
  }
});

for (const diagnostic of result.diagnostics) console.error(formatDiagnostic(diagnostic));
if (result.ok) {
  const observations = summarizeRouteMeasurements(result.model.elements, result.model.metadata);
  console.log(observations.maximumDeclaredRopeMeters); // null if absent; a declaration, not an equipment requirement
  console.log(result.layout.nodes.length);
  console.log(result.json);
}
```

## Main Exports

```js
import {
  parseVrl,
  validateRoute,
  normalizeRoute,
  computeVerticalLayout,
  compileRoute,
  createRouteCompiler,
  exportRouteJson
} from "@subvertic/vrl-core";
```

- `parseVrl(source, options)` returns `{ ast, diagnostics }`; optional `options.limits` controls document budgets.
- `validateRoute(ast)` returns semantic diagnostics.
- `normalizeRoute(ast)` returns a deterministic route model with unique element IDs and summary fields.
- `computeVerticalLayout(model, options)` positions canonical traversal points, segments and annotation nodes.
- `compileRoute(source, options)` runs the full parser, validation, normalization, layout, and JSON export pipeline.
- `createRouteCompiler(overrides)` creates an injectable compiler for tests or alternate ports.
- `exportRouteJson(model)` serializes normalized route data.
- `summarizeRouteMeasurements(elements, metadata?)` keeps declared totals, observed walk/rope measurements and null unknowns separate. Existing model summaries and JSON remain unchanged. See [summary provenance and conflicts](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/route-summary.md).

Compiler wiring lives in a composition module; the application coordinator depends only on its contracts and domain policies. JSON serialization is a separate output adapter. All ports are synchronous. Invalid wiring throws at configuration time, malformed results throw a port-specific `TypeError` before later stages, and adapter exceptions propagate unchanged. The public `compileRouteWithDependencies(source, options, dependencies)` helper retains its optional default geometry validator; its other ports are required. See the [compiler contracts and example](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/compiler-ports.md) for result shapes, error ordering, and compatibility.

Element IDs share one case-sensitive namespace across every element type in a route. All explicit IDs are reserved before generation, including later declarations and IDs resembling another type’s prefix. Repeated or blank explicit IDs are validation errors; duplicate diagnostics identify both declarations. `normalizeRoute` also rejects invalid IDs with `RangeError` when called directly. Generated numbering is reproducible for the same input but may change across edits; explicit IDs are the author-controlled option for persistent references. The standalone `normalizeElement(element, counters)` helper only sees one element and cannot guarantee collection-wide uniqueness. Use `normalizeRoute` for collections. See the [identifier contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/language-reference.md#element-identifiers) and [normalization API](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#element-identity-and-normalization).

Normalized models include `traversal.points` and `traversal.segments`: domain-owned endpoint references, technical element ownership, direction, and signed physical elevation changes. Positive deltas mean ascent; negative deltas mean descent. Intermediate boundaries keep adjacent descents and climbs separate, and outer boundaries preserve leading/trailing technical features. They do not add source elements. `traversal.annotations` attaches notes and hazards to physical boundaries by `{ elementIndex, pointIndex }`, with a null point only for annotation-only documents. They do not add progression or absorb residual elevation.

Layouts retain one `nodes` entry per route element in source order. Annotation nodes include `anchorPointIndex` and their anchor's measured elevation when available; their symbols are offset independently. Traversal `points` and positioned `segments` contain only physical progression and implicit boundaries. Renderers should use the latter instead of choosing a technical owner from neighboring nodes. `validateGeometry(model)` checks normalized elevation constraints; compilation calls this injectable port before layout/export. Missing measurements and underdetermined profiles are diagnosed, and inconsistent technical-only profiles block compilation. At most one start/exit is allowed, and these must enclose all progression; annotations may appear outside them. Endpoint metadata binds to these explicit markers or implicit outer boundaries when omitted. A trailing note cannot move the exit elevation. Direct layouts also reject invalid boundary declarations. See the repository API reference for the complete contract and custom renderer migration.

Layout dimensions are provisional framing values. Complete canvas fitting belongs to the renderer, which accounts for its own fonts, labels, decorations, and legend without changing core coordinates. For SVG output, use `computeTopoScene` from `@subvertic/vrl-render-svg` or the rendered SVG dimensions when sizing an embedding surface.

## AST and Normalized Records

AST metadata/attributes contain decoded strings. Normalized `metadata` and element `attributes` contain only applicable, validated known fields; descriptive text lives in separate route/element `extensions` maps. Note text is `element.extensions.text`; descriptive hazard kind is `element.extensions.type`. `normalizeRoute` and `normalizeElement` reject malformed records and invalid known fields. The legacy `normalizeAttributes` utility remains permissive token conversion, not a domain validity guarantee.

This changes the model/JSON paths for extensions; known metric and enum paths remain unchanged. See the [contracts, invariant ownership, and migration](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/domain-model.md). Traversal and summaries retain their physical meaning and the renderer accepts both current and older supplied models.

## Processing Limits

`compileRoute` and standalone `parseVrl` accept `options.limits`: `maxSourceBytes` (1 MiB), `maxLines` (20,000), `maxLineBytes` (16 KiB), `maxElements` (10,000), and `maxListEntries` (1,024 per stage/redirection attribute). Overrides must be positive safe integers; omitted fields use defaults. Source and line sizes count UTF-8 bytes, with LF/CRLF excluded from per-line size. Exact boundaries are accepted.

Over-budget input produces a structured `limit` error; compilation returns no model, layout, or JSON and does not continue downstream. Source preflight runs before parser allocations; element/list overflow stops parsing with only a recovery prefix. Invalid configuration and unrelated exceptions still throw. Parser ports receive `parse(source, { limits })`; returned AST counts/lists are checked before semantic validation. Direct token, validation, normalization, and layout helpers remain caller-sized. See the [complete budget contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#document-processing-limits).

## Known Fields

Validation and normalization share a domain-owned field specification. Numeric fields follow the same units and ranges in metadata and every element; categorical fields follow explicit contexts, including exposure on both downclimbs and climbs. Unknown extensions remain text. Empty applicable enums and empty entries in stage/redirection lists are errors. Inclination accepts values greater than 0% through 100%, with at most six fractional digits.

Stage totals use exact comparison at source precision: `0.1m+0.2m` matches `0.3m`, while a difference of `0.000001m` warns. Known value representations and floating-point geometry are preserved. Token-only conversion helpers preserve invalid raw values; strict route/element normalization rejects invalid known fields. See the [field and list contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/language-reference.md#known-fields-and-extensions).

## Diagnostics

Diagnostics are plain objects:

```js
{
  kind: "syntax",
  severity: "error",
  message: "Unknown statement \"teleport\".",
  location: { line: 3, column: 1 },
  suggestion: "Use route, metadata, start, walk, rappel, downclimb, climb, pool, hazard, note, or exit."
}
```

Use `formatDiagnostic(diagnostic)` for readable CLI, build, or editor output. Conflicts add optional `relatedLocations: [{ message, location, span? }]` alongside the primary location; the formatter includes every related coordinate. `createDiagnostic` accepts these as an optional sixth argument; its seventh argument accepts optional `{ code, span }`. Existing calls retain their original shape when those fields are omitted.

Built-in diagnostics have stable codes and precise source ranges when available. `ast.sourceMap` retains route, metadata, and element declarations plus attribute key/value spans. Field errors select the original value; missing fields select their declaration. `validateElement(element, sourceRecord)` and `validateGeometry(model, sourceMap)` accept optional provenance separately from domain data; compilation supplies it automatically. Legacy ASTs retain point-location fallbacks. Source-map data stays outside normalized route facts. See the [source-map contract and code catalog](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/diagnostics.md).

## Document Order and Repeated Keys

Documents require one route declaration first, then zero or more metadata lines, then elements. Notes and hazards begin the element phase too. Metadata lines can introduce distinct keys before that phase; they cannot resume afterward. Repeated route declarations and duplicate attribute keys are syntax errors even when values match. Keys are case-sensitive and scoped to one element or the document-wide metadata map. There is no override syntax. Route names and free-form note text still treat assignment-shaped tokens as text.

The parser retains first accepted values only for error recovery and reports both source locations for conflicts. Invalid ordering statements do not enter the partial AST. Compilation returns no model, layout, or JSON after a blocking diagnostic; manual consumers must inspect diagnostics before normalizing. `parseVrl` expects a document; use `lexVrlLine` or `parseAttributeTokens` for isolated fragments. The latter retains `{ attributes, diagnostics }`, with first values and duplicate diagnostics.

Braces remain cosmetic: one final standalone `{` token is removed, and standalone `}` lines are ignored, without balancing or nested scopes. They never reset document order or duplicate-key scope. See the [document grammar](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/language-reference.md#document-order-and-duplicate-keys), [brace rules](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/language-reference.md#provisional-brace-handling), and [recovery API](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#document-grammar-and-conflict-diagnostics).

## Quoted Text and Lexical Tokens

Quoted text preserves equals signs, hashes, Unicode, and interior whitespace. Only `\"` and `\\` are escapes. Unfinished strings, unsupported escapes, and invalid adjacency such as `"A"suffix` produce blocking syntax diagnostics. Assignment separators are recognized outside quotes, so `start "A=B"` retains its label. Empty quoted text is supported where semantic rules permit it; a route name is still required.

`lexVrlLine(line, location)` exposes typed `bare`, `quoted`, and `attribute` tokens with original spelling, decoded values, and end-exclusive source spans. It returns diagnostics instead of throwing for lexical failures. Positions use one-based lines and UTF-16 columns, with a default origin of `{ line: 1, column: 1 }`. `parseVrl` skips invalid lines and continues collecting diagnostics; blocking failures prevent compilation from producing a model, layout, or JSON.

The existing `tokenize` and `stripComment` helpers use the same rules and throw `SyntaxError` with a `diagnostics` array for malformed input. Valid `tokenize` results remain raw strings; outside comments are omitted. See the [language rules](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/language-reference.md#quoted-text-escapes-and-token-boundaries) and [token API](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#lexical-tokens-and-syntax-failures) for compatibility details.

## Layout Options

Source measurements support at most six fractional digits and an absolute magnitude up to `1000000000m`. Lengths must be positive except pool-only depth, which permits zero; entrance/exit elevations may be zero or negative. Inclination is greater than zero and at most 100%, and anchor counts must be positive safe integers. These numeric rules also apply to metadata and non-technical elements, except `depth`, which is known only on pools. Unsupported source values produce blocking validation diagnostics. Use descriptive metadata such as `rope_inventory="1x60m"` for free text instead of the numeric `rope` field. On rappels only, `rope=unknown` explicitly retains a missing length and produces `VRL_ROPE_LENGTH_UNKNOWN`; the normalized rope is a `Measurement | "unknown"` union retained under model revision 5. Omitted rope remains an error; rappel height supports explicit unknown with the separate geometry/profile rules. Narrow the rope union before reading `.meters`; the explicit summary excludes unknown ropes from numeric counts/maxima. See [the migration guide](../../docs/unknown-rope.md); this feature is scheduled for the next minor release.

Computed model/layout numbers must be finite with absolute magnitude at most `Number.MAX_SAFE_INTEGER`; unsupported results throw `RangeError`. This includes individually valid layout options whose combination produces excessive coordinates and numeric contract violations from custom compiler ports. JSON export rejects unsupported numbers instead of converting them to `null`. Arithmetic uses JavaScript's binary floating-point representation; derived decimals are not silently rounded to source precision. See the [numeric contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#numeric-integrity).

```js
compileRoute(source, {
  layout: {
    width: 900,
    spineX: 120,
    horizontalScale: 1.15,
    marginY: 120,
    marginBottom: 80,
    pixelsPerMeter: 6,
    minNodeGap: 68
  }
});
```

`horizontalScale` controls how far route nodes advance across the canvas. Values above `1` use more horizontal space while preserving the vertical profile. `minNodeGap` keeps dense elevation-aware diagrams readable by adding visual spacing when nearby route nodes would overlap. Set it to `0` for strict elevation scale.

Layout options must be a plain object with known keys. All values must be finite JavaScript numbers no greater than `Number.MAX_SAFE_INTEGER`; numeric strings and explicit `null` are rejected. `width`, `baseSpacing`, `horizontalScale`, and `pixelsPerMeter` must be positive; `spineX`, `marginY`, `marginBottom`, and `minNodeGap` may be zero. Omitted or `undefined` values use defaults. `baseSpacing` defaults to `68` for schematic layouts.

Invalid types or keys throw `TypeError`; invalid numeric ranges throw `RangeError` when the layout stage is reached. Invalid horizontal scales no longer silently fall back to `1`. These exceptions are separate from source diagnostics and propagate to callers. `validateLayoutOptions(options)` exposes the validation and returns a shallow copy. See the repository's [API reference](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#configuration-validation) for defaults and compatibility details.

## License

MIT. Copyright (c) 2026 Pedro Guzmán.

Rappel `height=unknown` retains null physical motion and permits schematic output. Complete endpoint profiles and positioned stage/redirection details require known height. Narrow `RappelHeightDeclaration` before numeric access; [semantics and migration](../../docs/unknown-height.md) describe proper failures and legacy partial maxima.

Optional pool-only `depth` accepts nonnegative metrics or exact `unknown`; absence stays absent and other scopes retain literal extensions. Model revision 4 exports `PoolDepthDeclaration`. Depth supplies no movement, elevation or summary total. Review [depth migration](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/pool-depth.md) before recompiling old pool prose.

AST revision 2 / model revision 5 adds `swim` with separate SW identity and optional positive metric distance. Omitted distance is unknown; no pool relation, vertical motion or walking-total contribution is inferred. See [semantics and migration](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/swimming.md).
