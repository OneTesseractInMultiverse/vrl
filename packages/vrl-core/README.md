# @subvertic/core

Framework-free core for Vertical Route Language.

This package parses compact VRL source, validates route semantics, normalizes route models, computes elevation-aware vertical layout data, and exports JSON. It has no framework, DOM, file-system, or network dependencies.

## Install

```sh
npm install @subvertic/core
```

## Usage

```js
import { compileRoute, formatDiagnostic } from "@subvertic/core";

const source = `
route "Quebrada Gata"
metadata entrance_elevation=1300m exit_elevation=1100m difficulty="V3 A4 III"
start "Quebrada Pilas entrance"
rappel "R1" height=28m rope=60m anchor=bolts inclination=90%
pool type=shallow
exit "Old metal ladder"
`;

const result = compileRoute(source, {
  layout: {
    width: 900,
    horizontalScale: 1.15,
    pixelsPerMeter: 6,
    minNodeGap: 68
  }
});

if (result.ok === false) {
  console.error(result.diagnostics.map(formatDiagnostic).join("\n"));
} else {
  console.log(result.model.summary.requiredRopeMeters);
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
} from "@subvertic/core";
```

- `parseVrl(source)` returns `{ ast, diagnostics }`.
- `validateRoute(ast)` returns semantic diagnostics.
- `normalizeRoute(ast)` returns a deterministic route model with unique element IDs and summary fields.
- `computeVerticalLayout(model, options)` computes SVG-ready node positions.
- `compileRoute(source, options)` runs the full parser, validation, normalization, layout, and JSON export pipeline.
- `createRouteCompiler(overrides)` creates an injectable compiler for tests or alternate ports.
- `exportRouteJson(model)` serializes normalized route data.

Element IDs share one case-sensitive namespace across every element type in a route. All explicit IDs are reserved before generation, including later declarations and IDs resembling another type’s prefix. Repeated or blank explicit IDs are validation errors; duplicate diagnostics identify both declarations. `normalizeRoute` also rejects invalid IDs with `RangeError` when called directly. Generated numbering is reproducible for the same input but may change across edits; explicit IDs are the author-controlled option for persistent references. The standalone `normalizeElement(element, counters)` helper only sees one element and cannot guarantee collection-wide uniqueness. Use `normalizeRoute` for collections. See the [identifier contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/language-reference.md#element-identifiers) and [normalization API](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#element-identity-and-normalization).

Normalized models include `traversal.points` and `traversal.segments`: domain-owned endpoint references, technical element ownership, direction, and signed physical elevation changes. Positive deltas mean ascent; negative deltas mean descent. Intermediate boundaries keep adjacent descents and climbs separate, and outer boundaries preserve leading/trailing technical features. They do not add source elements. `traversal.annotations` attaches notes and hazards to physical boundaries by `{ elementIndex, pointIndex }`, with a null point only for annotation-only documents. They do not add progression or absorb residual elevation.

Layouts retain one `nodes` entry per route element in source order. Annotation nodes include `anchorPointIndex` and their anchor's measured elevation when available; their symbols are offset independently. Traversal `points` and positioned `segments` contain only physical progression and implicit boundaries. Renderers should use the latter instead of choosing a technical owner from neighboring nodes. `validateGeometry(model)` checks normalized elevation constraints; compilation calls this injectable port before layout/export. Missing measurements and underdetermined profiles are diagnosed, and inconsistent technical-only profiles block compilation. At most one start/exit is allowed, and these must enclose all progression; annotations may appear outside them. Endpoint metadata binds to these explicit markers or implicit outer boundaries when omitted. A trailing note cannot move the exit elevation. Direct layouts also reject invalid boundary declarations. See the repository API reference for the complete contract and custom renderer migration.

Layout dimensions are provisional framing values. Complete canvas fitting belongs to the renderer, which accounts for its own fonts, labels, decorations, and legend without changing core coordinates. For SVG output, use `computeTopoScene` from `@subvertic/render-svg` or the rendered SVG dimensions when sizing an embedding surface.

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

Use `formatDiagnostic(diagnostic)` for readable CLI, build, or editor output. Conflicts add optional `relatedLocations: [{ message, location }]` alongside the primary location; the formatter includes every related coordinate. `createDiagnostic` accepts these as an optional sixth argument and preserves the original record shape when the list is empty.

## Document Order and Repeated Keys

Documents require one route declaration first, then zero or more metadata lines, then elements. Notes and hazards begin the element phase too. Metadata lines can introduce distinct keys before that phase; they cannot resume afterward. Repeated route declarations and duplicate attribute keys are syntax errors even when values match. Keys are case-sensitive and scoped to one element or the document-wide metadata map. There is no override syntax. Route names and free-form note text still treat assignment-shaped tokens as text.

The parser retains first accepted values only for error recovery and reports both source locations for conflicts. Invalid ordering statements do not enter the partial AST. Compilation returns no model, layout, or JSON after a blocking diagnostic; manual consumers must inspect diagnostics before normalizing. `parseVrl` expects a document; use `lexVrlLine` or `parseAttributeTokens` for isolated fragments. The latter retains `{ attributes, diagnostics }`, with first values and duplicate diagnostics.

Braces remain cosmetic: one final standalone `{` token is removed, and standalone `}` lines are ignored, without balancing or nested scopes. They never reset document order or duplicate-key scope. See the [document grammar](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/language-reference.md#document-order-and-duplicate-keys), [brace rules](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/language-reference.md#provisional-brace-handling), and [recovery API](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#document-grammar-and-conflict-diagnostics).

## Quoted Text and Lexical Tokens

Quoted text preserves equals signs, hashes, Unicode, and interior whitespace. Only `\"` and `\\` are escapes. Unfinished strings, unsupported escapes, and invalid adjacency such as `"A"suffix` produce blocking syntax diagnostics. Assignment separators are recognized outside quotes, so `start "A=B"` retains its label. Empty quoted text is supported where semantic rules permit it; a route name is still required.

`lexVrlLine(line, location)` exposes typed `bare`, `quoted`, and `attribute` tokens with original spelling, decoded values, and end-exclusive source spans. It returns diagnostics instead of throwing for lexical failures. Positions use one-based lines and UTF-16 columns, with a default origin of `{ line: 1, column: 1 }`. `parseVrl` skips invalid lines and continues collecting diagnostics; blocking failures prevent compilation from producing a model, layout, or JSON.

The existing `tokenize` and `stripComment` helpers use the same rules and throw `SyntaxError` with a `diagnostics` array for malformed input. Valid `tokenize` results remain raw strings; outside comments are omitted. See the [language rules](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/language-reference.md#quoted-text-escapes-and-token-boundaries) and [token API](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#lexical-tokens-and-syntax-failures) for compatibility details.

## Layout Options

Source measurements support at most six fractional digits and an absolute magnitude up to `1000000000m`. Lengths must be positive; entrance/exit elevations may be zero or negative. Inclination is greater than zero and at most 100%, and anchor counts must be positive safe integers. These numeric rules also apply to metadata and non-technical elements. Unsupported source values produce blocking validation diagnostics. Use descriptive metadata such as `rope_inventory="1x60m"` for free text instead of the numeric `rope` field.

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
