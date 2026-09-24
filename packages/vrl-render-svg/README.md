# @subvertic/render-svg

Bundled declarations cover every public export. See the [API stability, typed contracts, and revision policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/public-contracts.md). Runtime entry points and serialized output are unchanged.

Shared themes, symbol profiles, and localization dictionaries (including nested labels/values) are frozen and typed read-only. Strict-mode writes throw `TypeError`. Customize each render through `themeTokens`, `theme`, `language`/`locale`, and the registered `symbology` profiles. `resolveTheme` returns an owned mutable copy without changing defaults; custom symbol/localization dictionaries are not renderer options. Unknown selectors, including prototype-property names, use the documented fallback. See [mutation behavior and migration](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#shared-rendering-definitions-and-customization).

Technical routes are rendered from the core layout's explicit `segments`, including separate endpoints for adjacent descents and climbs and for first/last technical elements. The core owns direction, physical deltas, and annotation ownership; SVG consumes positioned endpoints and pixel deltas. This package depends on the first-party `@subvertic/core` package and has no third-party runtime dependencies.

Recompute older node-only layouts with `computeVerticalLayout` before rendering. For custom renderers, iterate `layout.segments` and pass each positioned segment to the technical geometry helpers. The legacy single-owner helper rejects ambiguous descent/climb pairs rather than choosing one event. See `docs/api-reference.md` for the traversal contract and compatibility details.

SVG renderer adapter for Vertical Route Language.

This package renders normalized VRL route models and layout data as accessible SVG topo diagrams. Descriptive values now come from route/element `extensions` maps; known measurements and enums stay in `metadata`/`attributes`. Older supplied models with descriptions in the original bags remain readable. See the [model migration](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/domain-model.md). It also provides federation-oriented symbology profiles and the VRL tropical snake hazard extension.

## Install

```sh
npm install @subvertic/core @subvertic/render-svg
```

## Usage

```js
import { compileRoute } from "@subvertic/core";
import { renderTopoSvg } from "@subvertic/render-svg";

const result = compileRoute(source, { layout: { pixelsPerMeter: 6 } });

if (result.ok) {
  const svg = renderTopoSvg(result.model, result.layout, {
    language: "es",
    symbology: "spanish",
    theme: "light"
  });
}
```

## Options

```js
renderTopoSvg(model, layout, {
  language: "es",           // en or es
  symbology: "federation", // federation, french, or spanish
  legend: true,            // default; set false when the container provides its own legend
  theme: "light",          // light or dark
  themeTokens: {
    background: "#eef6f8",
    routeLine: "#111111",
    water: "#1479a6"
  }
});
```

`language` controls diagram labels, the built-in legend, and common detail values. `symbology` controls canyon topo abbreviations and the symbol key shown in the legend. Generic progression nodes use the compact symbol marker only, avoiding redundant visible labels such as `Pool P1` or `Poza P1`. When the layout includes elevation metadata, the renderer scales the technical part of each rappel, downclimb, or climb from `height * inclination * pixelsPerMeter`; connector lines absorb any extra spacing needed to keep symbols readable. The renderer labels ambiguous values such as `flow: medium` and `exposure: medium`; flow, exposure, hazard severity, and inclination values render as category-colored badges. Values such as `dry`, `low`, `medium`, and `high` share the color of their field category. The renderer uses federation-oriented text abbreviations rather than copied artwork. When `language` is not set, `symbology: "spanish"` selects Spanish text by default.

## Structured Presentation

The complete renderer computes a scene once, then serializes prepared geometry and labels. Flow, exposure, hazard severity, and inclination badges come from normalized fields; translating their labels cannot change their category. Notes such as `flow: high` or `80%` remain literal text, including literal ` / ` separators inside a descriptive field.

`computeTopoScene(...).nodes[].drawing.detailRecords` exposes typed text/badge rows; `drawing.details` contains the placed text and badge rectangles shared by fitting and serialization. The scene also carries technical annotations, paths, station ticks, symbol geometry, and placed summary/legend entries. Existing scene fields and package exports remain available. Treat records as read-only inspection snapshots and recompute after input changes.

`formatTopoDetail` remains a display-string helper. The historical `renderDetailLine` string API and explicit `renderNode` detail overrides retain formatted-label recognition for compatibility; default node and complete rendering use structured records. See the [scene contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/rendering-scene.md) for examples, record shapes, boundary failures, and migration guidance.

## Technical Annotations

Stage lengths, stage boundary marks, and redirection anchors render for all three supported shapes: `ladder`, `direct`, and `slab`. Direct/slab lines omit rungs but preserve the same annotation values, positions, language, and accessible redirection names. Canvas fitting includes these labels for every shape. The top-level accessible SVG description includes the declared stage/redirection values with the owning feature ID in the selected language. Annotations follow the measured technical slope, excluding extra connector spacing; existing schematic endpoint clearance and stage-total warnings are preserved.

`renderDirectTechnicalSegment(previous, node, theme, element, layout, language)` adds an optional final language argument, defaulting to English, without moving the existing layout argument. The ladder helper retains its existing argument order. Both use shared annotation rendering. Source validation remains in core; custom helper callers must supply valid normalized attributes and geometry. See the [annotation contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#technical-annotations-across-line-shapes).

## Anchor Counts

Rappel details, anchor accessibility labels, and the top-level SVG description preserve the full declared `anchor_count`. The visual shorthand draws at most four circles, then shows `+N` for the remainder: `anchor_count=5` displays `5 anchors` (or `5 anclajes`) with four marks and `+1`. Counts are never inferred from anchor type. Missing counts produce no count display; invalid source counts, including zero, are rejected by core validation.

The existing `anchorMarkCount` export reports only the capped drawing count. `renderAnchorMarks` retains its argument order and supports left/right placement; complete diagrams use the left side and include overflow text in canvas fitting. The cap does not alter the model or JSON, and the maximum supported count still draws only four circles. See the [quantity and display contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#anchor-quantities-and-display-limits).

## Canvas Fitting

The final SVG grows to contain the complete route, symbols, labels, technical details, summary, and optional legend. Core layout width/height are minimum framing dimensions. The final `viewBox` can have a negative origin; physical coordinates and elevations are preserved. The summary appears above route content, and the legend follows its lowest label. Long unbroken text expands the canvas, while detail rows wrap once at the requested width.

`computeTopoScene(model, layout, options)` returns the prepared presentation and final `viewBox: { x, y, width, height }` without producing SVG. Use this viewport or the rendered SVG dimensions when framing output. Treat scene records as read-only snapshots and recompute them after input changes. The legacy `topoLegendHeight` helper remains available but does not predict the full diagram height.

Fitting uses conservative text envelopes without browser APIs or font dependencies. It reserves 1.25 em per UTF-16 unit plus vertical/stroke clearance. Custom CSS that changes font metrics or transforms requires independent fitting. Impossible derived dimensions throw `RangeError` rather than emitting invalid bounds. This policy grows the canvas; it does not paginate routes or eliminate symbol overlap caused by deliberately small node spacing. See the [complete bounds contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#complete-diagram-bounds).

## Configuration and Markup Contract

Renderer options must be a plain object. `theme` accepts only `light` or `dark`, and `legend` must be a boolean when supplied. Theme overrides must use known token names and supported paint strings: CSS named colors, `transparent`, `currentColor`, `none`, hex colors, or comma-separated `rgb`, `rgba`, `hsl`, and `hsla` within the documented numeric ranges. Resource references (`url(...)`, even local fragments), CSS variables, expressions, and other color syntaxes are rejected. Omit a token to inherit it; explicit `undefined` or `null` token values are invalid.

The renderer checks finite numeric canvas dimensions and positioned coordinates and encodes every dynamic SVG attribute. Invalid configuration throws `TypeError` or `RangeError`. Low-level helpers encode attributes and validate paint, while callers remain responsible for valid geometry. This package does not sanitize arbitrary SVG.

React and Svelte accept caller-provided `diagram.svg` as trusted markup and bypass rendering when it is supplied. The embedding application owns that trust decision. See the [API reference](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#renderer-configuration-and-svg-attributes) for the full paint grammar, numeric limits, and precomputed-state contract.

## Text and XML

The summary heading is uppercased before XML encoding, so names such as `R&D <Canyon>` produce valid standalone SVG. The accessible title and description preserve original case. `computeTopoScene(...).infoBox.lines` contains the display text, including the uppercase heading, before escaping.

`escapeXml` converts its input to a string and rejects XML 1.0-invalid characters with `TypeError`: forbidden C0 controls, unpaired surrogates, U+FFFE, and U+FFFF. Tabs, line feeds, carriage returns, and valid Unicode pairs remain supported. Carriage returns are encoded as character references to preserve them across XML parsing. Text and attributes use the same character policy, and original detail text is checked independently of wrapping. No invalid characters are silently replaced or stripped. Pass raw text, including literal entity-looking strings such as `&amp;`, rather than pre-escaped markup.

These restrictions belong to rendering; core model/JSON consumers remain independent of XML. Framework state factories propagate rendering exceptions. See the [text contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#xml-text-and-route-titles) for character ranges and failure behavior.

## Useful Exports

```js
import {
  renderTopoSvg,
  computeTopoScene,
  resolveTheme,
  symbolCode,
  resolveSymbolProfile,
  formatTopoLabel,
  formatTopoDetail
} from "@subvertic/render-svg";
```

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
