# React Example

The React adapter uses dependency injection so the package can keep React as a peer dependency and stay easy to test.

```jsx
import React from "react";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/react";

const VrlDiagram = createVrlDiagramComponent(React);

const source = `
route "Quebrada Gata"
metadata country="Costa Rica" region="Bajos del Toro" difficulty="V3 A4 III" entrance_elevation=1300m exit_elevation=1100m
start "Quebrada Pilas entrance"
walk distance=80m
rappel "R1" height=28m rope=60m anchor=bolts inclination=90%
pool type=shallow
exit "Old metal ladder"
`;

export function RoutePage() {
  const diagram = createVrlReactDiagramState(source, { theme: "dark" });
  return <VrlDiagram diagram={diagram} />;
}
```

If parsing or validation fails, the component renders formatted diagnostics in a `<pre>` block. If the route is valid, it renders accessible SVG inside a `div` with `role="img"`.

For API-backed routes, load the source string in the parent component and pass it through the same `source` prop, or precompute diagram state with `createVrlReactDiagramState` when the parent owns memoization or caching. Rendering options are plain data, so they can be stored in application settings, CMS fields, or route metadata.

## Props

```jsx
<VrlDiagram
  source={source}
  options={{ language: "es", symbology: "spanish", layout: { pixelsPerMeter: 6 } }}
  className="route-diagram"
  diagnosticsClassName="route-diagram-diagnostics"
  role="img"
  containerProps={{ "data-route": "quebrada-gata" }}
  diagnosticsProps={{ "aria-live": "polite" }}
/>
```

`options` are passed to both the compiler/layout and SVG renderer. Compiler layout options live under `options.layout` and include `width`, `spineX`, `marginY`, `marginBottom`, and `pixelsPerMeter`; renderer options include top-level `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens`. The diagram legend is enabled by default; set `legend: false` when the page provides its own explanation.
