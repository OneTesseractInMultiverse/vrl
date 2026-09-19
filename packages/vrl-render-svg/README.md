# @subvertic/render-svg

Technical routes are rendered from the core layout's explicit `segments`, including separate endpoints for adjacent descents and climbs and for first/last technical elements. The core owns direction, physical deltas, and annotation ownership; SVG consumes positioned endpoints and pixel deltas. This package depends on the first-party `@subvertic/core` package and has no third-party runtime dependencies.

Recompute older node-only layouts with `computeVerticalLayout` before rendering. For custom renderers, iterate `layout.segments` and pass each positioned segment to the technical geometry helpers. The legacy single-owner helper rejects ambiguous descent/climb pairs rather than choosing one event. See `docs/api-reference.md` for the traversal contract and compatibility details.

SVG renderer adapter for Vertical Route Language.

This package renders normalized VRL route models and layout data as accessible SVG topo diagrams. It also provides federation-oriented symbology profiles and the VRL tropical snake hazard extension.

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

## Configuration and Markup Contract

Renderer options must be a plain object. `theme` accepts only `light` or `dark`, and `legend` must be a boolean when supplied. Theme overrides must use known token names and supported paint strings: CSS named colors, `transparent`, `currentColor`, `none`, hex colors, or comma-separated `rgb`, `rgba`, `hsl`, and `hsla` within the documented numeric ranges. Resource references (`url(...)`, even local fragments), CSS variables, expressions, and other color syntaxes are rejected. Omit a token to inherit it; explicit `undefined` or `null` token values are invalid.

The renderer checks finite numeric canvas dimensions and positioned coordinates and encodes every dynamic SVG attribute. Invalid configuration throws `TypeError` or `RangeError`. Low-level helpers encode attributes and validate paint, while callers remain responsible for valid geometry. This package does not sanitize arbitrary SVG.

React and Svelte accept caller-provided `diagram.svg` as trusted markup and bypass rendering when it is supplied. The embedding application owns that trust decision. See the [API reference](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#renderer-configuration-and-svg-attributes) for the full paint grammar, numeric limits, and precomputed-state contract.

## Useful Exports

```js
import {
  renderTopoSvg,
  resolveTheme,
  symbolCode,
  resolveSymbolProfile,
  formatTopoLabel,
  formatTopoDetail
} from "@subvertic/render-svg";
```

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
