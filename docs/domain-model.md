# Syntax Inputs and Normalized Routes

See the [public API classifications, typed contracts, and revision policy](public-contracts.md).

Parsing and normalization produce different records. The AST retains decoded text, source coordinates, and recovery data. Normalization establishes known-field and identity invariants, classifies extension text separately, and computes domain traversal and summaries. These operations remain synchronous and have no runtime dependencies.

## Raw AST Contract

`parseVrl` produces a route record with:

```js
{
  name: "Survey",       // null in an incomplete recovery AST
  metadata: { region: "CR", entrance_elevation: "10m" },
  elements: [{
    type: "walk",
    id: null,           // null/undefined requests generation
    label: null,
    attributes: { distance: "3m", note: "Approach" },
    sourceLocation: { line: 3, column: 1 }
  }],
  source: "...",
  sourceMap: { route: null, metadata: [], elements: [] }
}
```

The source-map placeholder above shows its containers; parsed declarations contain the [actual span records](diagnostics.md#ast-source-map). Metadata and attributes are own-property string records. Values have been decoded once by the lexer but have not been converted to measurements, lists, or domain enums. Notes store their complete decoded text in `attributes.text`. The AST does not split known fields from extension keys. Rejected/repeated declarations follow the existing recovery policy, so a returned AST alone does not imply valid source.

`createEmptyRoute` and `createRouteElement` are syntax-record factories owned by `application/route-ast.js`. They intentionally permit incomplete records for parsers, recovery, and tools; they do not validate domain invariants. Public names/signatures are unchanged. The parser may import these application-owned records, while the domain has no dependency on AST factories or application modules.

Programmatic normalization inputs require plain route/element/attribute records (ordinary or null prototypes), a dense element array, and string attribute values. The route name must be a nonempty string; spelling and whitespace are preserved. Supported types are `start`, `exit`, `walk`, `rappel`, `downclimb`, `climb`, `pool`, `hazard`, and `note`. Labels may be omitted/null or strings. An optional source point must contain positive safe-integer line/column coordinates. Optional `source`, `sourceMap`, and additional AST bookkeeping are not copied into route facts. An explicit identifier follows the [shared identifier policy](api-reference.md#element-identity-and-normalization).

## Normalized Contract

Normalized routes contain exactly these top-level fields:

```js
{
  name: "Survey",
  metadata: { entrance_elevation: { value: 10, unit: "m", meters: 10 } },
  extensions: { region: "CR" },
  elements: [{
    type: "walk",
    id: "W1",
    label: null,
    attributes: { distance: { value: 3, unit: "m", meters: 3 } },
    extensions: { note: "Approach" },
    sourceLocation: { line: 3, column: 1 }
  }],
  traversal: { points: [], segments: [], annotations: [] }, // computed for the route
  summary: { /* computed counts, distances, rope and elevation values */ }
}
```

The empty traversal in this schematic example is a shape illustration; normalization computes the actual points/segments. `metadata` and element `attributes` contain **only applicable, validated known fields**. Route and element `extensions` contain the remaining original strings. These maps are disjoint; invalid known values cannot fall back to extensions.

Classification uses the existing [field specification](language-reference.md#known-fields-and-extensions). Numeric fields apply in every declared context. Categorical fields apply only in their documented scopes: for example, pool `type` is validated, while hazard `type` is descriptive extension text. Region/country/difficulty, note content (`text`), per-element free-form `note`, and unknown survey keys are extensions. A key such as `shape` outside technical elements remains extension text even if its spelling matches a recognized enum value. Own keys such as `__proto__`, `constructor`, and `toString` are preserved as ordinary data.

Known values retain their existing representations: metric objects `{ value, unit: "m", meters }`, inclination objects `{ value, unit: "%", percent }`, arrays of stage measurements, redirection entries `{ distance, side }`, and strings for enums and positive safe-integer anchor counts. Required rappel height/rope and climb height must be present and valid. Optional missing values remain absent, never guessed. Redirections must be inside a supplied height. Rope shorter than height and stage totals differing from height remain warnings rather than normalization failures.

Each normalized element has `type`, nonblank `id`, `label` (string/null), `attributes`, `extensions`, and `sourceLocation`. The source point is copied as line/column only; it is undefined for programmatic input without a point and omitted from exported JSON in that case. Normalization preserves input element order and allocates IDs against the complete collection, including forward explicit reservations. It copies no arbitrary AST element properties.

## Invariant Ownership

| Concern | Owner |
| --- | --- |
| Raw syntax construction and recovery containers | `application/route-ast.js` and parser |
| Supported element types and generated ID prefixes | `domain/element-types.js` |
| Raw input shape and route-name predicate | `domain/route-input.js` |
| Field applicability, requiredness, units, vocabulary, ranges | `domain/field-specifications.js` |
| Token conversion and typed value problems | `domain/field-values.js` and its focused token parsers |
| Attribute classification and required-field assessment | `domain/attribute-contract.js` |
| Rope, redirection, and stage relationships | `domain/field-relationships.js`; exact decimal stage comparison in `domain/stage-totals.js` |
| Unique identity validation/allocation | `domain/element-identifiers.js` |
| Strict conversion and extension separation | `domain/normalize-attributes.js` |
| Normalization coordination and explicit element construction | `domain/model.js` |
| Counts and aggregate measurements | `domain/route-summary.js` |
| Technical ownership, direction, motion, annotation attachment | `domain/traversal.js` |
| Located messages and diagnostic codes | Validation modules consuming domain assessments |
| Boundary order and elevation feasibility | Geometry validation, after normalization |

The shared domain assessments feed both source diagnostics and direct normalization, so a custom semantic validator cannot make the default normalizer accept malformed known fields. No domain module imports validators, application code, renderers, or frameworks.

## Technical Meaning and Geometry

`traversal.points` refers to progression elements or implicit boundaries. Technical segments refer to their owning element and carry `direction` plus signed `verticalDeltaMeters`: descents are negative, climbs positive, and optional unmeasured downclimbs remain null. Inclination scales physical vertical motion. Notes/hazards retain their element index and the boundary they annotate without adding physical progression. Drawing shape, language, theme, and layout spacing do not determine ownership or physical motion.

Traversal and summary contracts are unchanged. Summaries use validated known fields, never similarly named extensions. Normalization does not establish boundary/elevation feasibility or renderable layout geometry; `validateGeometry` still owns those later checks. Use `compileRoute` for complete source diagnostics, nonblocking warnings, geometry validation, layout, and export. A direct normalized result may still need geometry corrections.

## Failure, Determinism, and Compatibility

`normalizeRoute` and `normalizeElement` now throw `TypeError` for malformed raw records/types, and `RangeError` for invalid/missing route names, known-field problems, blocking redirection relationships, or invalid identifiers. Numeric computation guards retain their `RangeError` behavior. These functions do not silently retain invalid known tokens. Normalization accepts warning-only conditions; use validation/compilation to retrieve their diagnostic messages.

Inputs are read-only, including frozen records. Each normalization allocates new output maps, typed values, lists, traversal, summaries, and source points. Mutating one returned model does not mutate the AST or change a subsequent normalization. `normalizeElement(element, counters)` retains its explicit caller-owned counter updates after successful validation; it cannot guarantee identity uniqueness across a collection. `normalizeRoute` has no shared counters and remains deterministic for unchanged input.

The legacy `normalizeAttributes` and individual token helpers remain permissive conversion utilities. They do not enforce requiredness, contextual applicability, semantic ranges, or extension separation. Their results are not validated models. Do not pass an already-normalized route back into `normalizeRoute`: reparse retained source or keep the original AST when recomputing.

**Model/JSON migration:** existing readers of descriptive `model.metadata.region` or `element.attributes.note` must now read `model.extensions.region` or `element.extensions.note`. Known field paths such as `element.attributes.height` and `model.metadata.exit_elevation` are unchanged. Note text is `element.extensions.text`; descriptive hazard kind is `element.extensions.type`. Layout nodes/segments reference these normalized elements. Custom exporters receive the new model. Exact snapshots and property allowlists must include `extensions` at route/element level.

The SVG adapter reads separated extensions while still accepting older supplied models with descriptive values in their original bags. When both are supplied by a low-level caller, the original attribute/metadata value takes precedence. Recompile source to migrate stored models; the adapter fallback does not certify old domain values. Default rendered output is preserved.

```js
import { compileRoute } from "@subvertic/core";

const result = compileRoute('route "Survey"\nmetadata region=CR\nwalk distance=3m note="Approach"');
// result.model.metadata is {}
// result.model.extensions.region === "CR"
// result.model.elements[0].attributes.distance.meters === 3
// result.model.elements[0].extensions.note === "Approach"
```
