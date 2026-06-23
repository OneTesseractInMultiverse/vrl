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
    symbology: "spanish",
    theme: "light"
  });
}
```

## Options

```js
renderTopoSvg(model, layout, {
  symbology: "federation", // federation, french, or spanish
  theme: "light",          // light or dark
  themeTokens: {
    background: "#eef6f8",
    routeLine: "#111111",
    water: "#1479a6"
  }
});
```

`symbology` controls canyon topo abbreviations. The renderer uses federation-oriented text abbreviations rather than copied artwork.

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
