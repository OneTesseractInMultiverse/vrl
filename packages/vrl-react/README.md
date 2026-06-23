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
  return <VrlDiagram source={source} options={{ symbology: "spanish" }} />;
}

export function RoutePreview({ source }) {
  const diagram = createVrlReactDiagramState(source, { symbology: "spanish" });
  return <VrlDiagram diagram={diagram} className="route-preview" />;
}
```

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
