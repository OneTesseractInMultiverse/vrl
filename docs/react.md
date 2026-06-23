# React Example

The React adapter uses dependency injection so the package can keep React as a peer dependency and stay easy to test.

```jsx
import React from "react";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/react";

const VrlDiagram = createVrlDiagramComponent(React);

const source = `
route "Rio Azul"
metadata country="Costa Rica" region="Cartago" difficulty="V4 A3 III" entrance_elevation=1240m exit_elevation=1170m
start "Entrance"
walk distance=120m
rappel "R1" height=35m rope=70m anchor=bolts inclination=80%
pool type=deep
exit "Left bank trail"
`;

export function RoutePage() {
  const diagram = createVrlReactDiagramState(source, { theme: "dark" });
  return <VrlDiagram diagram={diagram} />;
}
```

If parsing or validation fails, the component renders formatted diagnostics in a `<pre>` block. If the route is valid, it renders accessible SVG inside a `div` with `role="img"`.

For API-backed routes, load the source string in the parent component and pass it through the same `source` prop, or precompute diagram state with `createVrlReactDiagramState` when the parent owns memoization or caching. Rendering options are plain data, so they can be stored in application settings, CMS fields, or route metadata.
