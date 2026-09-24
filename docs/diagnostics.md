# Source Provenance and Diagnostic Codes

See the [public API classifications, typed contracts, and revision policy](public-contracts.md).

Built-in diagnostics expose stable `code` strings for tooling, readable `message` and `suggestion` text, a `kind`, `severity`, and a primary `location`. A diagnostic includes `span` when a complete source range is available. Conflict diagnostics retain `relatedLocations`, whose entries can also include a `span`. Only error severity blocks compilation; warnings remain nonblocking.

A span has `{ start: { line, column }, end: { line, column } }`. Lines and columns are one-based; columns count UTF-16 code units, and the end is exclusive. Tabs count as one column and astral characters as two. CRLF and LF produce identical line/column coordinates for the same line contents. Ranges refer to original spelling, including quote delimiters and escape sequences, before text decoding. A diagnostic's `location` is its span's start when a span is present.

For example, this invalid metadata value is on line 4:

```text
# Survey
  route "🧗"
metadata region=CR
	metadata entrance_elevation="high" exit_elevation=-5m
```

With one literal tab before `metadata`, compilation reports `VRL_FIELD_MEASUREMENT_SYNTAX` at line 4, column 30, with a span ending at column 36. The highlighted source is `"high"`. The original field message and measurement suggestion remain readable. Compilation returns no model, layout, or JSON.

## AST Source Map

`parseVrl` and `createEmptyRoute` include this additional AST property:

```js
sourceMap: {
  route: null,   // Or a route declaration record
  metadata: [],  // Accepted metadata declaration records, in source order
  elements: []   // One record per AST element, at the same index
}
```

Every declaration record contains `span`, `keywordSpan`, and `attributeSpans`. The declaration span runs from the first token to the end of the last retained token, excluding indentation, comments, and a cosmetic trailing brace. `attributeSpans` is an own-property record keyed by accepted attribute name; each entry contains the full attribute `span`, `keySpan`, and `valueSpan`. Extension keys such as `__proto__` remain ordinary own data properties.

Route records also have `nameSpan` (null when absent). Ordinary element records have `idSpan` and `labelSpan`, each null when absent. Notes instead have `textSpan`, null for an empty note; their text is not an attribute declaration. Multi-token names, identities, and labels use a range encompassing their original tokens and intervening whitespace.

The recovery contract is unchanged: only accepted declarations and first accepted attribute values are retained. Repeated metadata statements have distinct records. A rejected duplicate attribute appears in diagnostics with its key span and the first key's related span; it does not replace the original value or its provenance. Out-of-order or lexically invalid statements do not enter the source map. A declaration stopped by an element/list budget is also omitted. Source preflight failures return an empty source map with the original source string retained in the AST.

Source maps are syntax provenance, not route facts. Normalized models, layouts, and exported model JSON do not acquire this map or attribute ranges. The existing element `sourceLocation` remains available as a fallback. Parsing, validation, and normalization do not share mutable provenance state across calls.

## Selecting Diagnostic Ranges

- Known-field syntax, ranges, vocabularies, and relationship checks highlight the offending value, including quotes. Stage and redirection failures highlight the entire attribute value, not an individual list entry.
- Missing required fields highlight the owning declaration. A missing/empty route name highlights the name when present, otherwise its declaration; an entirely missing route falls back to `1:1`.
- Duplicate attribute diagnostics highlight both key spans. Document-order conflicts highlight keyword spans. Duplicate identifiers highlight both explicit identity spans. Duplicate start/exit boundaries highlight both declarations.
- Missing technical heights and boundary-order errors highlight their element declarations. Elevation consistency/estimation diagnostics highlight `exit_elevation`; this locates the constraint and does not claim that this field alone must be corrected. Unsupported programmatic geometry numbers use the route declaration when known.
- Lexical failures and processing limits retain their existing point locations when no complete range is available. `span` is optional, not a fabricated zero-length range.

`validateRoute(ast)` consumes `ast.sourceMap` automatically. `validateElement(element, sourceRecord)` accepts the corresponding element record as an optional second argument. `validateGeometry(model, sourceMap)` accepts the full map separately. Compilation supplies that second argument to the geometry-validation port; existing one-argument implementations remain compatible. This keeps syntax data out of the normalized domain model.

Legacy/programmatic ASTs without provenance continue to work. Missing field ranges fall back to a known declaration, then the element's `sourceLocation`. Route/metadata checks with neither source map nor point location use `1:1`. Consumers that construct or edit ASTs own the correspondence between their values and optional provenance; after editing source text, reparse it rather than reusing stale ranges.

## Stable Code Catalog

Code meanings are stable independently of human-readable wording. Do not match `message` text to identify a condition. Additional codes may be introduced; consumers should display unknown codes using the supplied severity, message, location, and optional span. Existing codes will not be reassigned to different conditions; removing or changing their meaning is a compatibility change.

| Code | Condition |
| --- | --- |
| `VRL_LEX_MISSING_KEY` | Assignment has no key |
| `VRL_LEX_MISSING_VALUE` | Assignment has no value token |
| `VRL_LEX_UNFINISHED_ESCAPE` | Backslash at the end of quoted input |
| `VRL_LEX_UNSUPPORTED_ESCAPE` | Unsupported quoted escape |
| `VRL_LEX_UNTERMINATED_STRING` | Quoted text is not closed |
| `VRL_LEX_TOKEN_ADJACENCY` | Missing whitespace between tokens |
| `VRL_SYNTAX_UNKNOWN_STATEMENT` | Unknown statement keyword |
| `VRL_SYNTAX_MISSING_ROUTE_NAME` | Route statement has no name token |
| `VRL_SYNTAX_ROUTE_REQUIRED` | Statement occurs before a route declaration |
| `VRL_SYNTAX_METADATA_ORDER` | Metadata follows an element |
| `VRL_SYNTAX_DUPLICATE_ROUTE` | Repeated route declaration |
| `VRL_SYNTAX_ROUTE_ORDER` | Route is not the first statement |
| `VRL_SYNTAX_EXPECTED_ATTRIBUTE` | Non-attribute token in an attribute list |
| `VRL_SYNTAX_DUPLICATE_ATTRIBUTE` | Repeated key in the same attribute scope |
| `VRL_ROUTE_NAME_REQUIRED` | Route name is absent or empty |
| `VRL_FIELD_REQUIRED` | Required field is absent or empty |
| `VRL_FIELD_MEASUREMENT_SYNTAX` | Invalid metric spelling, magnitude, or precision |
| `VRL_FIELD_MEASUREMENT_RANGE` | Nonpositive length where positivity is required |
| `VRL_FIELD_INCLINATION_SYNTAX` | Invalid percentage spelling, magnitude, or precision |
| `VRL_FIELD_INCLINATION_RANGE` | Inclination outside `(0, 100]` |
| `VRL_FIELD_REDIRECTIONS_SYNTAX` | Invalid redirection list/measurement syntax |
| `VRL_FIELD_STAGES_SYNTAX` | Invalid stage list/measurement syntax or cardinality |
| `VRL_FIELD_UNSUPPORTED_VALUE` | Invalid enum/count, nonpositive list length, or unsupported redirection side |
| `VRL_ROPE_SHORTER_THAN_HEIGHT` | Declared rope is shorter than height (warning) |
| `VRL_REDIRECTION_OUTSIDE_HEIGHT` | Redirection at or beyond declared height |
| `VRL_STAGE_TOTAL_MISMATCH` | Stage total differs from height (warning) |
| `VRL_IDENTIFIER_INVALID` | Explicit identifier is not a nonblank string |
| `VRL_IDENTIFIER_DUPLICATE` | Repeated explicit identifier |
| `VRL_BOUNDARY_DUPLICATE` | Repeated start or exit |
| `VRL_BOUNDARY_ORDER` | Start/exit does not enclose progression |
| `VRL_GEOMETRY_NUMERIC_RANGE` | Unsupported number in a supplied normalized model |
| `VRL_GEOMETRY_HEIGHT_REQUIRED` | Technical height is missing (warning or error according to profile) |
| `VRL_GEOMETRY_ELEVATIONS_ESTIMATED` | Intermediate elevations require schematic estimates (warning) |
| `VRL_GEOMETRY_ELEVATIONS_INCONSISTENT` | Declared motion cannot satisfy endpoint elevations |
| `VRL_LIMIT_MAX_SOURCE_BYTES` | Source byte budget exceeded |
| `VRL_LIMIT_MAX_LINES` | Physical-line budget exceeded |
| `VRL_LIMIT_MAX_LINE_BYTES` | Per-line byte budget exceeded |
| `VRL_LIMIT_MAX_ELEMENTS` | Element budget exceeded |
| `VRL_LIMIT_MAX_LIST_ENTRIES` | Per-attribute list budget exceeded |

The existing `createDiagnostic(kind, severity, message, location, suggestion, relatedLocations)` calls keep their previous shape. Its optional seventh argument is `{ code, span }`; omitted properties are not emitted. Custom diagnostics and injected ports may omit codes/spans. Custom applications should use their own code prefix instead of the reserved `VRL_` prefix.

`formatDiagnostic` preserves the existing readable format; it prints the now-accurate primary and related coordinates without requiring codes or ranges. React, Svelte, and SvelteKit expose the same structured diagnostics unchanged. Editors can read `code`/`span` directly without parsing that formatted text.

This is an additive AST/diagnostic contract change. Consumers with exact property allowlists or serialized snapshots must allow `sourceMap`, `code`, diagnostic `span`, and related-location `span`. Field/identity columns are intentionally more precise than earlier statement-level locations. Source-map data remains outside model/layout/JSON route facts; see the current [normalized model contract](domain-model.md) for known fields and extensions.
