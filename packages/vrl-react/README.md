# @subvertic/vrl-react

See the [tested framework/runtime combinations](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/framework-compatibility.md) for packed-application SSR, hydration, updates and compatibility limits.

Bundled declarations cover every public export. See the [API stability, typed contracts, and revision policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/public-contracts.md). Existing runtime entry points and serialized diagram state are unchanged; successful components now show warnings by default.

React adapter for Vertical Route Language.

This package exposes a dependency-injected React component factory and a framework-neutral diagram state helper. It keeps React as a peer dependency and delegates parsing, validation, layout, and SVG rendering to the core and renderer packages.

State creation delegates to the first-party `@subvertic/vrl-diagram` package. Existing factory signatures and `{ ok, ast, diagnostics, diagnosticsText, model, layout, json, svg }` results are unchanged. Warning-only results still render SVG; blocking diagnostics skip rendering. The shared package has no framework peers. See the [state contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/diagram-state.md).

## Install

```sh
npm install @subvertic/vrl-react @subvertic/vrl-core @subvertic/vrl-render-svg react
```

## Usage

```jsx
import React from "react";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/vrl-react";

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
  showWarnings: boolean,
  warningsClassName: string,
  warningsLabel: string,
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

## Successful-state warnings

Successful diagrams show a warning panel by default. `showWarnings` defaults to `true`; set it to `false` when the application supplies its own warning presentation. `warningsClassName` defaults to `"vrl-diagram__warnings"` and `warningsLabel` to `"Route warnings"`. These are display props, not compiler/renderer options. Diagnostics remain in state, and errors still suppress SVG. The warning panel is a sibling of the image, adding an outer wrapper only when warnings are visible. See the [warning presentation policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/warning-presentation.md) for accessibility, localization, and CSS migration details.

## License

MIT. Copyright (c) 2026 Pedro Guzmán.

For multiple inline diagrams, set a stable, document-unique `options.idPrefix` per occurrence. Supplied diagram states preserve their existing IDs. See the [namespace contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/svg-identifiers.md).
