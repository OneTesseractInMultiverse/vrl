# @subvertic/render-svg

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
