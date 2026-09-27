# React Example

When embedding multiple diagrams, pass a stable, unique `options.idPrefix` per occurrence and reuse it for SSR and hydration. Precomputed states keep their original IDs. See [SVG namespace ownership and validation](svg-identifiers.md).

See the [tested framework/runtime combinations and packed consumer checks](framework-compatibility.md) for SSR, hydration, updates and compatibility limits.

Diagram-state creation delegates to `@subvertic/vrl-diagram`. Existing adapter factory names, options, and state fields are unchanged; the neutral `createDiagramState` result can also be supplied directly. See the [shared state contract](diagram-state.md) for warning, failure, exception, and caching behavior.

Invalid layout or renderer configuration throws `TypeError` or `RangeError` from the state factory or component. See the [configuration contract](api-reference.md#configuration-validation) and [supported paint values](api-reference.md#renderer-configuration-and-svg-attributes).

Treat a supplied `diagram.svg` as trusted markup: the component inserts it with `dangerouslySetInnerHTML`, bypassing compilation and renderer validation. Use a trusted VRL state factory result, or sanitize arbitrary external SVG within the application before supplying it. Component props such as `containerProps` are also application-owned. See the [trust boundary](api-reference.md#precomputed-diagram-trust-boundary).

The React adapter uses dependency injection so the package can keep React as a peer dependency and stay easy to test.

```jsx
import React from "react";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/vrl-react";

const VrlDiagram = createVrlDiagramComponent(React);

const source = `route "Synthetic two-rappel canyon"
start "Entry"
rappel R1 height=18m rope=40m anchor=bolts anchor_count=2 station=right
pool P1 type=unknown
walk W1 distance=120m
rappel R2 height=12m rope=30m anchor=tree
hazard H1 type=slippery note="Slippery landing"
exit "Exit"`;

export function RoutePage() {
  const diagram = createVrlReactDiagramState(source, { theme: "dark", style: "soft-terrain", idPrefix: "canyon-overview" });
  return <VrlDiagram diagram={diagram} />;
}
```

If parsing or validation fails, the component renders formatted diagnostics in a `<pre>` block. If the route is valid, it renders accessible SVG inside a `div` without a default role. The SVG owns the image name and complete description; leave the wrapper role absent to avoid nested image semantics. See [accessible output](accessible-output.md).

For API-backed routes, load the source string in the parent component and pass it through the same `source` prop, or precompute diagram state with `createVrlReactDiagramState` when the parent owns memoization or caching. Rendering options are plain data, so they can be stored in application settings, CMS fields, or application-owned route records. They are not VRL DSL metadata fields.

## Props

```jsx
<VrlDiagram
  source={source}
  options={{ style: "soft-terrain", idPrefix: "canyon-overview", language: "es", symbology: "spanish", layout: { pixelsPerMeter: 6 } }}
  className="route-diagram"
  diagnosticsClassName="route-diagram-diagnostics"
  showWarnings={true}
  warningsLabel="Avisos de la ruta"
  containerProps={{ "data-route": "quebrada-gata" }}
  diagnosticsProps={{ "aria-live": "polite" }}
/>
```

`options` are passed to both the compiler/layout and SVG renderer. Compiler layout options live under `options.layout` and include `width`, `spineX`, `horizontalScale`, `marginY`, `marginBottom`, `pixelsPerMeter`, and `minNodeGap`; renderer options include top-level `style`, `idPrefix`, `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens`. The diagram legend is enabled by default; set `legend: false` when the page provides its own explanation.

## Successful-state warnings

Successful diagrams show a warning panel by default. `showWarnings` defaults to `true`; set it to `false` when the application supplies its own warning presentation. `warningsClassName` defaults to `"vrl-diagram__warnings"` and `warningsLabel` to `"Route warnings"`. These are display props, not compiler/renderer options. Diagnostics remain in state, and errors still suppress SVG. The warning panel is a sibling of the image, adding an outer wrapper only when warnings are visible. See the [warning presentation policy](warning-presentation.md) for accessibility, localization, and CSS migration details.

## Optional canyon style

Use `options.style: "soft-terrain"` for a neutral ground wash, directed technical curves, symbolic pools and explicit rope/anchor information. Classic rendering remains the default. This renderer-owned option preserves the domain model and canonical traversal; framework adapters forward it. These are project schematic conventions, not a claim of federation approval. See the [style contract and visual gallery](soft-terrain.md) for examples, language/theme compatibility, failure behavior and limitations.
