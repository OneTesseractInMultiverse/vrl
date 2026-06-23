# @subvertic/render-svg

SVG renderer adapter for Vertical Route Language.

This package renders normalized VRL route models and layout data as accessible SVG topo diagrams. It also provides federation-oriented symbology profiles and the VRL tropical snake hazard extension.

## Install

```sh
npm install @subvertic/render-svg
```

## Usage

```js
import { renderTopoSvg } from "@subvertic/render-svg";

const svg = renderTopoSvg(model, layout, { symbology: "federation" });
```

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
