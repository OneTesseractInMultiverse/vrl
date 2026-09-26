# React Example

See the [tested framework/runtime combinations and packed consumer checks](framework-compatibility.md) for SSR, hydration, updates and compatibility limits.

Diagram-state creation delegates to `@subvertic/vrl-diagram`. Existing adapter factory names, options, and state fields are unchanged; the neutral `createDiagramState` result can also be supplied directly. See the [shared state contract](diagram-state.md) for warning, failure, exception, and caching behavior.

Invalid layout or renderer configuration throws `TypeError` or `RangeError` from the state factory or component. See the [configuration contract](api-reference.md#configuration-validation) and [supported paint values](api-reference.md#renderer-configuration-and-svg-attributes).

Treat a supplied `diagram.svg` as trusted markup: the component inserts it with `dangerouslySetInnerHTML`, bypassing compilation and renderer validation. Use a trusted VRL state factory result, or sanitize arbitrary external SVG within the application before supplying it. Component props such as `containerProps` are also application-owned. See the [trust boundary](api-reference.md#precomputed-diagram-trust-boundary).

The React adapter uses dependency injection so the package can keep React as a peer dependency and stay easy to test.

```jsx
import React from "react";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/vrl-react";

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
  showWarnings={true}
  warningsLabel="Avisos de la ruta"
  role="img"
  containerProps={{ "data-route": "quebrada-gata" }}
  diagnosticsProps={{ "aria-live": "polite" }}
/>
```

`options` are passed to both the compiler/layout and SVG renderer. Compiler layout options live under `options.layout` and include `width`, `spineX`, `horizontalScale`, `marginY`, `marginBottom`, `pixelsPerMeter`, and `minNodeGap`; renderer options include top-level `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens`. The diagram legend is enabled by default; set `legend: false` when the page provides its own explanation.

## Successful-state warnings

Successful diagrams show a warning panel by default. `showWarnings` defaults to `true`; set it to `false` when the application supplies its own warning presentation. `warningsClassName` defaults to `"vrl-diagram__warnings"` and `warningsLabel` to `"Route warnings"`. These are display props, not compiler/renderer options. Diagnostics remain in state, and errors still suppress SVG. The warning panel is a sibling of the image, adding an outer wrapper only when warnings are visible. See the [warning presentation policy](warning-presentation.md) for accessibility, localization, and CSS migration details.
