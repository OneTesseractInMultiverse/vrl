# API Reference

VRL is split into small packages so consumers can choose the layer they need. The core package is framework-free. Renderers and framework adapters depend inward on the core.

## @subvertic/core

Install:

```sh
npm install @subvertic/core
```

Common imports:

```js
import {
  compileRoute,
  parseVrl,
  validateRoute,
  normalizeRoute,
  computeVerticalLayout,
  exportRouteJson
} from "@subvertic/core";
```

`compileRoute(source, options)` is the main use case. It parses source, validates it, normalizes the route model, computes layout, and exports JSON.

```js
const result = compileRoute(source, {
  layout: {
    width: 900,
    spineX: 120,
    horizontalScale: 1.15,
    pixelsPerMeter: 6,
    minNodeGap: 68,
    marginY: 120,
    marginBottom: 80
  }
});

if (result.ok === false) {
  for (const diagnostic of result.diagnostics) {
    console.error(diagnostic.message);
  }
} else {
  console.log(result.model.summary.requiredRopeMeters);
  console.log(result.json);
}
```

Layout options are nested under `options.layout`. `horizontalScale` widens or tightens route progression while keeping the same vertical elevation model. `minNodeGap` keeps dense elevation-aware nodes readable when small real elevation changes would otherwise place symbols on top of each other; set it to `0` for strict elevation scale. Technical element lines in elevation-aware diagrams use `height * inclination * pixelsPerMeter`, and any additional spacing from `minNodeGap` is rendered as a connector. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` are consumed by renderer and framework packages at the top level.

Returned shape:

```js
{
  ok: true,
  ast,
  diagnostics,
  model,
  layout,
  json
}
```

When syntax or validation blocks compilation, `ok` is `false`; `diagnostics` contains structured diagnostic objects with `kind`, `severity`, `message`, `location`, and `suggestion`. Declaration conflicts additionally include optional `relatedLocations`, as described below.

Lower-level functions are available for tooling:

```js
const { ast, diagnostics: syntaxDiagnostics } = parseVrl(source);
const validationDiagnostics = validateRoute(ast);
const model = normalizeRoute(ast);
const layout = computeVerticalLayout(model);
const json = exportRouteJson(model);
```

Use `createRouteCompiler(overrides)` when an application needs to inject custom parser, validator, layout, normalization, or JSON export ports for tests or integration.

### Lexical tokens and syntax failures

`lexVrlLine(line, location = { line: 1, column: 1 })` scans one physical line without dependencies or I/O. It returns `{ tokens, diagnostics, commentStart }`. A token has `kind: "bare" | "quoted" | "attribute"`, its original `raw` spelling, its decoded `value`, and a `span: { start, end }`. Attribute tokens also have `key`, `valueForm: "bare" | "quoted"`, `keySpan`, and `valueSpan`. Their key/value spans exclude the `=` separator; quoted token/value spans include the delimiters. All spans are end-exclusive, with one-based source lines and UTF-16 columns relative to the supplied origin. Tabs count as one code unit. `commentStart` is the zero-based UTF-16 offset of an outside `#` in the supplied line, or `null`.

```js
import { lexVrlLine } from "@subvertic/core";

const result = lexVrlLine('start "A=B"', { line: 4, column: 1 });
// result.tokens[1]:
// { kind: "quoted", value: "A=B", raw: '"A=B"',
//   span: { start: { line: 4, column: 7 }, end: { line: 4, column: 12 } } }
```

The lexer reports the first lexical error on a line and retains only complete preceding tokens for tooling. `parseVrl` consumes typed tokens directly, discards the entire invalid line, and continues with later lines. Lexical diagnostics retain the existing `{ kind, severity, message, location, suggestion }` shape. Unterminated quotes point to the opening quote, escape errors to the backslash, and adjacency errors to the unexpected character. Missing values point just after `=` (which may be one column past the line end). The AST still stores statement-level element locations; lexical spans are exposed by the lexer rather than added to the normalized model.

`compileRoute` returns `ok: false` and null model/layout/JSON for blocking syntax diagnostics. It does not call normalization, geometry validation, layout, or export for those documents. React and Svelte state factories return diagnostics and an empty SVG for invalid source; this differs from exceptions for invalid caller configuration.

The existing `tokenize(line)` helper retains its array of raw token strings for valid input and now omits outside comments. `stripComment(line)` preserves the original spelling and whitespace before an outside comment. Both helpers use the same lexer and throw `SyntaxError` with a `diagnostics` array for malformed input. Call `lexVrlLine` or `parseVrl` for a diagnostic-returning API. `parseAttributeTokens(rawTokens, location)` remains compatible with string arrays: it joins them with single spaces and reports spans relative to that reconstructed line and origin. For original source positions, use `lexVrlLine` or `parseVrl` directly.

Only escaped double quotes and backslashes are supported. Previously accepted unfinished strings, unsupported escapes, quoted keys, and invalid adjacency now fail explicitly. See the [language reference](language-reference.md#quoted-text-escapes-and-token-boundaries) for the complete lexical contract and compatibility text forms.

### Document grammar and conflict diagnostics

`parseVrl` enforces one route declaration first, followed by metadata and then elements. Metadata lines may repeat only with new keys and must precede all elements, including annotations. Repeated route declarations and attribute keys are blocking syntax errors, including equal values. Keys are case-sensitive, scoped to one element or the document-wide metadata map. There is no override syntax or semantic equality comparison. Route-name and note free text retain assignment-shaped tokens literally.

`parseAttributeTokens` uses the same duplicate-key policy and retains its `{ attributes, diagnostics }` return shape. It returns the first value of a repeated key for recovery, along with a diagnostic. Its positions refer to the reconstructed line and supplied origin; `parseVrl` uses original source positions. No internal duplicate-tracking maps are added to the AST or normalized model.

Declaration diagnostics add `relatedLocations: [{ message, location: { line, column } }]` when an earlier declaration or ordering boundary exists. The primary `location` points to the later keyword/key. Related locations point to the first route declaration, first key declaration, first statement, or first element as appropriate. Both use one-based lines and UTF-16 columns. `createDiagnostic(kind, severity, message, location, suggestion = "", relatedLocations = [])` accepts this optional sixth argument and omits the property when the list is empty. `formatDiagnostic` appends each related message and coordinate after the existing message/suggestion text.

```js
const result = parseVrl('route "Canyon"\nrappel height=30m height=5m rope=10m');
const conflict = result.diagnostics[0];
// conflict.location: { line: 2, column: 19 }
// conflict.relatedLocations:
// [{ message: "First declaration of this key", location: { line: 2, column: 8 } }]
```

Recovery is deterministic and does not imply a valid route:

- Lexically invalid lines and unrecognized statements do not reserve declarations, metadata keys, or ordering boundaries; their errors still block compilation.
- Recognized statements advance ordering state even when misplaced. Misplaced route/metadata/element statements are excluded from the partial AST. A late route is not adopted as the name.
- A first route statement with a missing or empty name still reserves the route declaration. A later route cannot replace it. Existing semantic validation continues to report missing names, including empty documents.
- Duplicate keys retain the first accepted value and source location; further duplicates point back to that first occurrence. Other valid attributes and subsequent statements remain available in the partial AST.

`compileRoute` validates the partial AST for additional diagnostics but never calls normalization, geometry, layout, or export after a blocking grammar error. React, Svelte, and SvelteKit state factories expose the structured/readable diagnostics and no SVG. Manual parser consumers must inspect diagnostics before normalization; a partial AST is not an authorized override or a validated model.

Compatibility: previously accepted repeated/late routes, metadata after elements, and duplicate keys now fail. `parseVrl` expects full documents; use `lexVrlLine` or `parseAttributeTokens` for isolated token/attribute fragments. Cosmetic braces do not affect ordering or duplicate scopes; see the [precise brace rules](language-reference.md#provisional-brace-handling).

### Element identity and normalization

`normalizeRoute(ast)` reserves every explicit `element.id` before generating missing IDs and returns IDs unique across all elements of that route. It preserves valid explicit text, compares IDs case-sensitively without Unicode normalization, and keeps independent per-type counters. Every element consumes one counter step; generated candidates additionally skip reserved IDs. See the [language contract](language-reference.md#element-identifiers) for prefixes and examples. The AST is not mutated, and reservation/counter state is not exposed in the model or retained between calls.

`null`, `undefined`, or an omitted AST `id` requests generation. Any explicit value must be a non-blank string; numbers and other non-string values are not coerced. Empty and whitespace-only strings are errors. `validateRoute(ast)` reports all invalid and duplicate IDs as blocking `validation` diagnostics, using statement-level `sourceLocation`. Each duplicate includes `relatedLocations` pointing to the first declaration. `validateElement(element)` checks an individual ID's validity but cannot detect conflicts with other elements. Parsing preserves duplicate IDs in the AST because uniqueness is a semantic rule.

`compileRoute` returns `ok: false` with null model/layout/JSON and does not invoke normalization or subsequent ports when IDs are invalid. Direct `normalizeRoute` calls throw `RangeError` for the first invalid/duplicate ID, using the same domain policy. This guard enforces identity invariants; it does not replace the other semantic validation required by lower-level consumers. Custom normalizer/validator ports are responsible for preserving these contracts.

`normalizeElement(element, counters)` retains its standalone helper signature and updates the supplied per-type counters, including for explicit IDs. It rejects a blank or non-string explicit ID before updating counters. It only sees that element: repeated calls cannot reserve future IDs or detect collection-wide duplicates. Use `normalizeRoute` rather than mapping this helper over a collection when IDs must be unique.

Model elements, layout nodes, and JSON carry the same allocated ID. Identifiers are scoped to one route, not globally unique and not SVG definition IDs. Identical input generates identical output, but insertion, removal, reordering, or changed reservations may alter sequence-generated IDs. Explicit IDs remain unchanged when the author preserves them. Consumers requiring persistence across revisions should maintain explicit IDs; rebuild cached models after upgrading from collision-prone allocation. No public model fields or exports are added by this change.

### Configuration validation

`computeVerticalLayout` and `computeElevationLayout` validate layout options before computing positions. With the default layout port, `compileRoute` applies the same validation when valid source reaches the layout stage. Options must be plain objects, including objects with a null prototype. Arrays, custom prototypes, unknown layout keys, and `null` are rejected. Omitted options and known properties with value `undefined` use defaults.

| Layout option | Accepted numeric range | Default |
| --- | --- | --- |
| `width` | Greater than zero | `640` |
| `baseSpacing` | Greater than zero | `68` (schematic layout) |
| `horizontalScale` | Greater than zero | `1` |
| `pixelsPerMeter` | Greater than zero | `5.5` (elevation layout) |
| `spineX` | Zero or greater | `96` |
| `marginY` | Zero or greater | `108` |
| `marginBottom` | Zero or greater | `64` |
| `minNodeGap` | Zero or greater | `68` (elevation layout) |

All values must be finite JavaScript numbers no greater than `Number.MAX_SAFE_INTEGER`; fractions are supported. Strings are not coerced, and `NaN` and infinities are rejected. `validateLayoutOptions(options)` exposes this check and returns a shallow copy without modifying the caller's object. `resolveHorizontalScale` follows the same positive-number contract.

Configuration errors throw exceptions: `TypeError` for incorrect types or unsupported keys/values, and `RangeError` for nonfinite or out-of-range numeric values. They are caller configuration errors, not source diagnostics, and framework state factories propagate them. A source error can stop compilation before the layout configuration is inspected. Custom compiler ports own their configuration contracts.

This tightens the previous API: invalid horizontal scales no longer silently fall back to `1`, and numeric strings, negative spacing, unknown layout keys, and explicit `null` values must be corrected by the caller.

### Numeric integrity

`parseMeasurementToken` rejects nonfinite conversions, magnitudes above `1000000000m`, and more than six fractional digits. It preserves valid zero/negative values for elevation fields and canonicalizes negative zero to zero. `parseInclinationToken` applies the same decimal representation bounds before semantic validation limits inclination to greater than zero and at most 100%. Both return `{ ok: false, reason }` for unsupported spellings; neither silently rounds a source value. See the [numeric field contract](language-reference.md#numeric-limits-and-precision).

`validateRoute` checks recognized numeric fields in metadata and every element, including safe integer anchor counts and measurements inside stage/redirection lists. Source failures return structured validation diagnostics before normalization, geometry, layout, and export. Low-level normalization is not a substitute for source validation.

Derived summaries, profiles, technical distances, and layout data require finite numeric values with absolute magnitude no greater than `Number.MAX_SAFE_INTEGER`. Computation helpers and layout entry points throw `RangeError` when a result exceeds that contract. `validateGeometry` returns a blocking geometry diagnostic for unsupported numeric leaves in a supplied normalized model. The compiler also checks model/layout numeric outputs at its boundaries, including outputs of custom ports; a custom port contract violation throws `RangeError` even when another custom port skips validation. Custom exporters remain responsible for their own output format.

`exportRouteJson` rejects unsupported numeric values, including values returned by a serialization hook, instead of serializing nonfinite numbers as `null`. Intentional nulls such as unknown elevations remain valid. The normal model/JSON path retains JavaScript numeric values exactly through JSON round trips; calculations use binary floating-point arithmetic and may have fractional roundoff. Layout rounding remains independent of physical measurement precision.

Compatibility changes: previously accepted huge or overprecise numeric spellings now fail, numeric fields no longer evade validation in metadata or on non-technical elements, and individually valid layout settings may throw when their combined geometry exceeds the supported magnitude. The sample's descriptive `metadata rope="1x60m"` moved to `rope_inventory="1x60m"`; `rope` consistently denotes a measurement.

### Technical traversal and geometry validation

The normalized model contains `traversal: { points, segments, annotations }`. Points contain the index of a progression element in `route.elements`, or `null` for an intermediate/outer boundary. Notes and hazards are excluded from this physical sequence. Each segment contains:

```js
{
  from: 1,                 // index into traversal.points
  to: 2,                   // index into traversal.points
  elementIndex: 1,          // owning route.elements index; null for a connection
  kind: "technical",       // or "connection"
  direction: "down",       // "up" for climbs; null for connections
  verticalDeltaMeters: -30 // positive upward, negative downward; null if unmeasured
}
```

Each annotation is `{ elementIndex, pointIndex }`: the source element index and the physical boundary to which it attaches. Leading annotations attach to point 0; subsequent annotations attach to the boundary reached after the preceding progression feature. A descent uses its lower boundary, a climb its upper boundary, and other progression elements their own point. `pointIndex` is `null` only when the document has no progression. Annotation records contain no coordinates and never create residual capacity.

Connection deltas in the model are zero placeholders, not measured level terrain. Under an elevation profile, their unknown elevation changes can receive a schematic residual; compilation reports a `geometry` warning in that case. Technical deltas remain fixed. A missing downclimb height produces a warning in a schematic route and a blocking error when endpoint elevations require a measured profile. Inconsistent profiles with no eligible connections produce blocking errors. Comparisons tolerate floating-point roundoff, capped below the smallest declared motion so endpoint calibration cannot erase or reverse a feature. A traversal without segments requires exactly equal endpoint elevations.

`validateGeometry(model)` also enforces at most one `start`/`exit`, with start first and exit last among progression elements. These boundary errors include the declaration location and apply to schematic routes too. Missing explicit markers use implicit outer boundaries; annotations may surround either marker. The function returns these diagnostics. `createRouteCompiler({ validateGeometry })` can replace that port. `compileRoute` runs it after normalization and returns `model`, `layout`, and `json` as `null` on an error. Lower-level consumers should call it after `normalizeRoute` and before rendering. `computeVerticalLayout` throws `RangeError` for invalid boundary declarations. `computeElevationLayout` and `elevationSegmentDeltas` throw `RangeError` for inconsistent or unmeasured elevation geometry; the former also requires complete elevation metadata. Without elevation metadata, `elevationSegmentDeltas` returns an empty list.

`layout.nodes` retains one entry per route element in source order. Annotation nodes add `anchorPointIndex` (possibly `null`) and inherit their anchor's `elevationMeters` when available. Their symbols are offset 32 pixels to the left; further annotations at the same boundary are spaced 36 pixels downward. Unanchored annotations use the configured layout origin. These offsets do not change physical progression. The SVG adapter orders labels by visual y position, with progression labels before annotations at equal y, without mutating source-order nodes. `layout.points` contains only positioned progression and implicit boundaries; annotation nodes are not part of that array. `layout.segments` augments each domain segment with `start`, `end`, `element` (the owner or `null`), and `technicalDeltaY` (positive downward in SVG coordinates, negative upward, `null` for connections). `elevationSegmentDeltas` returns descent-positive values in this segment order; its length can exceed or be smaller than `elements.length - 1`. The validated final physical boundary uses the exact supplied exit elevation to avoid cumulative roundoff in its label. Preserve physical `elevationMeters` precision independently of rounded pixel coordinates and readable spacing.

Treat normalized models and layouts as snapshots. Re-normalize cached models produced before annotation separation, and recompute their layouts. Re-normalize after editing source facts, and recompute layouts after changing options. Existing element-only models can still be passed to `computeVerticalLayout`, which derives the canonical traversal.

### Custom renderer migration

Use `layout.segments` to iterate technical events, `segment.element` for feature attributes, and `segment.start` / `segment.end` for endpoints. Do not infer ownership from adjacent entries in `layout.nodes`: a descent followed by a climb has two events in that gap. Node-only cached or custom layouts must be recomputed; `renderRouteSegments` rejects a missing `segments` array with `TypeError` instead of silently losing a feature.

`residualDistributionWeights(elements, baseDeltas)` remains an adjacent-source-pair compatibility helper. It assigns zero weight to pairs involving an annotation or a technical owner, including a zero-net descent/climb pair. It does not reconstruct connections across intervening annotations; use `elevationSegmentDeltas(model)` for the canonical traversal.

`segmentTechnicalElement(previous, node)` remains a compatibility helper for unambiguous pairs and now throws `RangeError` for pairs containing two technical elements. `technicalSegmentDelta(previous, element)` returns the combined descent-positive change for such a pair; a scalar net value is not a replacement for its two events.

For custom geometry, pass a positioned segment as the final argument to `dropLadderGeometry`, `technicalLineVerticalDelta`, or the technical segment render helpers. They consume its `technicalDeltaY` directly. The older elevation-layout overload remains available for callers with an already unambiguous pair, but compiled rendering uses only the positioned segment contract.

## @subvertic/render-svg

Install:

```sh
npm install @subvertic/core @subvertic/render-svg
```

Render a compiled route:

```js
import { compileRoute } from "@subvertic/core";
import { renderTopoSvg } from "@subvertic/render-svg";

const result = compileRoute(source);

if (result.ok) {
  const svg = renderTopoSvg(result.model, result.layout, {
    language: "es",
    symbology: "federation",
    theme: "light"
  });
}
```

Renderer options:

```js
{
  language: "en" | "es",
  locale: "en-US" | "es-CR",
  symbology: "federation" | "french" | "spanish",
  legend: true | false,
  theme: "light" | "dark",
  themeTokens: {
    background: "#eef6f8",
    routeLine: "#111111",
    water: "#1479a6"
  }
}
```

`language` controls diagram text such as element names, route-summary labels, accessibility labels, the legend, and common detail values. `locale` is accepted as an alias. If neither is set, `symbology: "spanish"` selects Spanish text; otherwise English text is used. `legend` defaults to `true`; set it to `false` only when the embedding surface already explains topo abbreviations and detail fields such as flow, exposure, severity, and inclination. Flow, exposure, hazard severity, and inclination values render as category-colored SVG badges and use matching colors in the legend. Lower-level helpers such as `dropLadderGeometry` and `technicalLineVerticalDelta` expose the same scaled technical-line geometry for custom renderers.

Useful helper exports include `resolveTheme`, `symbolCode`, `resolveSymbolProfile`, `formatTopoLabel`, `formatTopoDetail`, and lower-level SVG rendering helpers for custom renderers.

### Complete diagram bounds

`renderTopoSvg` prepares the complete presentation before serializing SVG. Requested `layout.width` and `layout.height` are minimum framing dimensions, not hard crop boundaries. The final canvas grows to include terrain, physical segments, arrowheads, symbols, anchor/station marks, labels, annotations, the route summary, and the optional legend. Its `viewBox` origin may be negative; physical route coordinates and elevation values are unchanged. Intrinsic SVG `width` and `height` match the fitted `viewBox` dimensions.

The route summary occupies a separate row above the route content. The legend follows the lowest route or annotation label, and its columns expand for localized text. Detail rows wrap once using the requested width; fitting does not feed the expanded width back into wrapping. Unbroken labels expand the canvas. This is deterministic growth, not pagination or a guarantee that all symbols remain separated when spacing is deliberately reduced.

Use the additive `computeTopoScene(route, layout, options = {})` export to inspect the same presentation without producing markup:

```js
import { compileRoute } from "@subvertic/core";
import { computeTopoScene } from "@subvertic/render-svg";

const result = compileRoute(source, { layout: { width: 320 } });
if (result.ok) {
  const scene = computeTopoScene(result.model, result.layout, { language: "es" });
  const { x, y, width, height } = scene.viewBox;
  // Frame the diagram with these final dimensions, not result.layout.width/height.
}
```

The returned plain record contains:

- `viewBox: { x, y, width, height }`: integer outer canvas coordinates with 12 pixels of padding.
- `contentBounds` and `bounds`: `{ minX, minY, maxX, maxY }` envelopes, respectively before and after adding the summary and legend.
- `language`: resolved presentation language.
- `nodes`: visual-order records containing the original `node` reference, `placement`, `title`, `detail`, `maxDetailWidth`, and prepared `detailRows`.
- `infoBox`: summary position, dimensions, display-text `lines` (including the uppercase route heading), and bounds. These strings are not XML-encoded.
- `legend`: position, dimensions, title, placed rows, and bounds; `null` when disabled.

Treat these records as read-only snapshots and recompute them after model, layout, or option changes. Scene computation does not mutate its inputs. Core layout remains independent of SVG fonts and decoration sizes; its dimensions are provisional until the renderer prepares the presentation.

Text uses a conservative envelope of 1.25 em per UTF-16 code unit, with vertical and stroke clearance. This intentionally reserves extra space for bold wide glyphs, Unicode, and fallback fonts without browser measurements, DOM access, or third-party runtime dependencies. External CSS that changes fonts, letter spacing, strokes, or transforms can invalidate the envelope and requires independent fitting by the embedding application. Canvas fitting addresses clipping; it does not redesign label spacing within individual detail rows.

Both scene preparation and full rendering validate incoming layout/options. Nonfinite derived bounds, unsafe magnitudes, or a fitted span exceeding `Number.MAX_SAFE_INTEGER` throw `RangeError`, including combinations of individually valid dimensions that leave no room for padding. Invalid types follow the existing `TypeError` contract. Low-level fragment renderers do not fit a complete canvas. The compatibility helper `topoLegendHeight` still returns `156` or `0`; do not add it to core layout height to predict final SVG dimensions.

### Renderer configuration and SVG attributes

`renderTopoSvg` accepts a plain options object. If supplied, `legend` must be a boolean and `theme` must be `"light"` or `"dark"`. Omitted or `undefined` values use defaults; `null` is invalid. The shared options object may also contain compiler options. Existing language, locale, and symbology fallback behavior is unchanged.

`themeTokens` must be a plain object with only keys exported by `LIGHT_THEME` / `DARK_THEME`: `background`, `terrain`, `text`, `mutedText`, `routeLine`, `water`, `hazard`, `warning`, `anchor`, `rappel`, `exit`, `panel`, `flowBadge`, `flowBadgeText`, `exposureBadge`, `exposureBadgeText`, `hazardSeverityBadge`, `hazardSeverityBadgeText`, `inclinationBadge`, `inclinationBadgeText`, `levelBadge`, and `levelBadgeText`. Each supplied token must be a supported paint string; omit a token to inherit it. Token values of `undefined` or `null` are invalid. Overrides are copied and outer whitespace is trimmed.

The paint policy intentionally accepts a subset of [CSS colors](https://www.w3.org/TR/css-color-4/):

- CSS named colors, `transparent`, `currentColor`, and SVG `none`, case-insensitively.
- Hex colors with 3, 4, 6, or 8 digits.
- Comma-separated `rgb(r, g, b)` and `rgba(r, g, b, a)`. All three channels must use either numbers from 0 to 255 or percentages from 0 to 100%.
- Comma-separated `hsl(h, s, l)` and `hsla(h, s, l, a)`. Hue is a finite unitless number in degrees; saturation and lightness are percentages from 0 to 100%.
- Alpha is a number from 0 to 1 or a percentage from 0 to 100%. Components use ordinary decimal notation, optionally signed, without exponents.

Resource references such as `url(...)`, including local fragments, CSS variables/expressions, escaped spellings, declarations, and other color syntaxes are rejected with `TypeError`. Space-separated modern color functions are not supported. This is a compatibility change for previously unchecked CSS strings and unknown theme names or tokens.

The renderer also checks supplied layout dimensions and positioned geometry. `width` must be positive, `height` nonnegative, and both must be finite numbers no greater than `Number.MAX_SAFE_INTEGER`. Node, optional point, and segment endpoint coordinates, plus technical pixel deltas, must be finite numbers with absolute magnitude no greater than that limit. Layouts require `nodes` and `segments` arrays; `points` is optional. Core layout computation rejects derived values above this magnitude even when each option is individually accepted; the renderer independently checks caller-supplied layouts.

Every dynamic SVG attribute is XML-encoded at serialization, including generated path strings, class names, accessibility labels, and paint values. Text and attributes share the XML character policy below; nonfinite numeric attribute values also throw. Lower-level SVG helpers also encode their attributes and validate paint, but callers remain responsible for their geometry and normalized-model contracts. These helpers are not a general SVG sanitizer.

### XML text and route titles

Presentation transforms run on raw text before XML encoding. The summary heading is uppercase, while the accessible SVG title/description and the normalized model retain the original route name. For example, `route "R&D <Canyon>"` renders the heading `R&D <CANYON>` and serializes it as `R&amp;D &lt;CANYON&gt;`. Entity-looking source such as `&amp;` is literal text, not pre-encoded markup. Do not pass already escaped text to a renderer.

`escapeXml(value)` retains its `String(value)` conversion, validates the converted text, and escapes ampersands, angle brackets, and double quotes. It preserves carriage returns using `&#13;` so XML line-ending normalization cannot change recovered text. The attribute serializer additionally encodes tabs and line feeds. These rules follow [XML 1.0 character ranges](https://www.w3.org/TR/xml/#charsets) and [line-ending handling](https://www.w3.org/TR/xml/#sec-line-ends).

Unsupported characters throw `TypeError`: U+0000–U+0008, U+000B–U+000C, U+000E–U+001F, unpaired UTF-16 surrogates, U+FFFE, and U+FFFF. Valid surrogate pairs, combining characters, accents, and other XML-permitted Unicode remain supported. Invalid characters are not replaced or stripped. Original detail text is checked independently of whitespace wrapping, including when prepared rows are supplied. This is character validation for rendered values, not validation of arbitrary supplied SVG.

The rule belongs to the rendering adapter: core compilation and JSON export can still retain text that XML cannot represent. `renderTopoSvg` and low-level XML escaping throw when such text reaches rendering; React, Svelte, and SvelteKit state factories propagate that exception and return no diagram state. It is not a source diagnostic. Precomputed `diagram.svg` still bypasses rendering and remains trusted caller markup.

### Precomputed diagram trust boundary

Caller-provided `diagram.svg` is **trusted markup**. React inserts it with `dangerouslySetInnerHTML`; the Svelte component uses `@html`, and `renderVrlSvelteMarkup` embeds it directly. Supplying `diagram` bypasses compilation, configuration validation, and SVG generation. Use state created by VRL's diagram factories within a trusted application pipeline. If an application accepts arbitrary SVG or precomputed states from another source, it must apply its own appropriate sanitization before passing them to these adapters. Escaping wrapper attributes or diagnostics does not sanitize `diagram.svg`. React's `containerProps` and `diagnosticsProps` are also application-owned component props.

## @subvertic/react

Install:

```sh
npm install @subvertic/react react
```

Create a component with dependency-injected React:

```jsx
import React, { useMemo } from "react";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/react";

const VrlDiagram = createVrlDiagramComponent(React);

export function RouteDiagram({ source }) {
  const diagram = useMemo(
    () => createVrlReactDiagramState(source, {
      language: "es",
      symbology: "spanish",
      layout: { pixelsPerMeter: 6 }
    }),
    [source]
  );

  return <VrlDiagram diagram={diagram} className="route-diagram" />;
}
```

Component props:

```js
{
  source,
  options,
  diagram,
  className,
  diagnosticsClassName,
  role,
  containerProps,
  diagnosticsProps
}
```

Pass `source` and `options` for simple use. Pass `diagram` from `createVrlReactDiagramState` when the parent owns memoization, caching, or server-provided state.

See the [precomputed diagram trust boundary](#precomputed-diagram-trust-boundary) before accepting cached or externally supplied diagram states.

Compiler layout options live under `options.layout`. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` live at the top level.

## @subvertic/svelte

Install:

```sh
npm install @subvertic/svelte svelte
```

Component usage:

```svelte
<script>
  import VrlDiagram from "@subvertic/svelte/VrlDiagram.svelte";

  export let source = "";
</script>

<VrlDiagram {source} options={{ language: "es", symbology: "federation", layout: { pixelsPerMeter: 6 } }} />
```

Server-side markup helper:

```js
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/svelte";

const diagram = createVrlSvelteDiagramState(source, {
  language: "es",
  symbology: "spanish",
  layout: { pixelsPerMeter: 6 }
});
const html = renderVrlSvelteMarkup("", {}, { diagram, className: "route-diagram" });
```

Component props:

```js
{
  source,
  options,
  diagram,
  className,
  diagnosticsClassName,
  role
}
```

Compiler layout options live under `options.layout`. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` live at the top level.

## @subvertic/sveltekit

Install:

```sh
npm install @subvertic/sveltekit @subvertic/svelte @sveltejs/kit svelte
```

Create a reusable load function:

```js
import { createVrlSvelteKitLoad } from "@subvertic/sveltekit";

export const load = createVrlSvelteKitLoad({
  source: async ({ fetch }) => {
    const response = await fetch("/routes/quebrada-gata.vrl");
    return response.text();
  },
  options: { language: "es", symbology: "spanish", layout: { pixelsPerMeter: 6 } }
});
```

Render the loaded data:

```svelte
<script>
  import VrlDiagram from "@subvertic/sveltekit/VrlDiagram.svelte";
  export let data;
</script>

<VrlDiagram {data} />
```

`createVrlSvelteKitLoad({ source, options, key })` accepts `source` and `options` as values or functions. The default returned key is `vrl`. If you use a custom key, pass it to the component:

```js
import { loadRouteSource } from "$lib/routes";

export const load = createVrlSvelteKitLoad({
  key: "diagram",
  source: ({ params }) => loadRouteSource(params.slug)
});
```

```svelte
<VrlDiagram {data} diagramKey="diagram" />
```

## Publishing

Local publishing is centralized through the Makefile:

```sh
make publish-plan
make release-prepare RELEASE=patch
make publish
make publish VERSION=0.2.0
make publish RELEASE=minor
make publish OTP=123456
```

`make release-prepare` updates all workspace versions and internal pins without publishing. Commit those changes before creating the GitHub release. `make publish-ci` is reserved for GitHub Actions and publishes the committed version through npm Trusted Publishers. `make publish` runs checks, updates versions, then publishes locally in dependency order. If npm returns `E403` requiring two-factor authentication during a local publish, rerun with a fresh one-time password: `make publish OTP=123456`.
