# @vrl/react

React adapter for Vertical Route Language.

This package exposes a dependency-injected React component factory. It keeps React as a peer dependency and delegates parsing, validation, layout, and SVG rendering to the core and renderer packages.

## Install

```sh
npm install @vrl/react @vrl/core @vrl/render-svg react
```

## Usage

```jsx
import React from "react";
import { createVrlDiagramComponent } from "@vrl/react";

const VrlDiagram = createVrlDiagramComponent(React);

export function RouteDiagram({ source }) {
  return <VrlDiagram source={source} options={{ symbology: "spanish" }} />;
}
```

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
