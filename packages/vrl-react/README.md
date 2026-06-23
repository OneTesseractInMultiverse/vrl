# @subvertic/react

React adapter for Vertical Route Language.

This package exposes a dependency-injected React component factory and a framework-neutral diagram state helper. It keeps React as a peer dependency and delegates parsing, validation, layout, and SVG rendering to the core and renderer packages.

## Install

```sh
npm install @subvertic/react @subvertic/core @subvertic/render-svg react
```

## Usage

```jsx
import React from "react";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/react";

const VrlDiagram = createVrlDiagramComponent(React);

export function RouteDiagram({ source }) {
  return (
    <VrlDiagram
      source={source}
      options={{ symbology: "spanish", layout: { pixelsPerMeter: 6 } }}
    />
  );
}

export function RoutePreview({ source }) {
  const diagram = createVrlReactDiagramState(source, {
    symbology: "spanish",
    layout: { pixelsPerMeter: 6 }
  });
  return <VrlDiagram diagram={diagram} className="route-preview" />;
}
```

## Component Props

```js
{
  source: string,
  options: object,
  diagram: object | null,
  className: string,
  diagnosticsClassName: string,
  role: string,
  containerProps: object,
  diagnosticsProps: object
}
```

Pass `source` and `options` for simple rendering. Pass `diagram` when the parent component owns memoization, caching, or server-provided compiler state.

Compiler layout options live under `options.layout`. Renderer options such as `symbology`, `theme`, and `themeTokens` live at the top level.

```jsx
const VrlDiagram = createVrlDiagramComponent(React, {
  options: { symbology: "federation" },
  className: "route-diagram"
});

<VrlDiagram
  source={source}
  containerProps={{ "data-route": "quebrada-gata" }}
  diagnosticsProps={{ "aria-live": "polite" }}
/>;
```

`createVrlReactDiagramState(source, options)` returns `{ ok, ast, diagnostics, diagnosticsText, model, layout, json, svg }`. Invalid sources return `ok: false`, formatted `diagnosticsText`, and an empty SVG string.

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
