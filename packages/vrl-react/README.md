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
      options={{ language: "es", symbology: "spanish", layout: { pixelsPerMeter: 6 } }}
    />
  );
}

export function RoutePreview({ source }) {
  const diagram = createVrlReactDiagramState(source, {
    symbology: "spanish",
    language: "es",
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

Caller-supplied `diagram.svg` is trusted markup: the component inserts it with `dangerouslySetInnerHTML`, bypassing compilation and renderer validation. Use a trusted state factory result or sanitize arbitrary external SVG in the application before passing it here. `containerProps` and `diagnosticsProps` are also application-owned props.

Invalid layout or renderer configuration throws `TypeError` or `RangeError`; these exceptions are separate from source diagnostics. See the [configuration and paint contracts](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#configuration-validation).

Compiler layout options live under `options.layout`, including `width`, `spineX`, `horizontalScale`, `marginY`, `marginBottom`, `pixelsPerMeter`, and `minNodeGap`. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` live at the top level. The diagram legend is enabled by default; set `legend: false` when the page provides its own explanation.

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
