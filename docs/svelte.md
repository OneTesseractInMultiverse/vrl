# Svelte Example

When embedding multiple diagrams, pass a stable, unique `options.idPrefix` per occurrence and reuse it for SSR and hydration. Precomputed states keep their original IDs. See [SVG namespace ownership and validation](svg-identifiers.md).

See the [tested framework/runtime combinations and packed consumer checks](framework-compatibility.md) for SSR, hydration, updates and compatibility limits.

Diagram-state creation delegates to `@subvertic/vrl-diagram`. Existing adapter factory names, options, and state fields are unchanged; the neutral `createDiagramState` result can also be supplied directly. See the [shared state contract](diagram-state.md) for warning, failure, exception, and caching behavior.

The Svelte package exposes both a component and SSR-friendly helpers. The component compiles source internally unless a precomputed `diagram` state is provided.

Invalid layout or renderer configuration throws `TypeError` or `RangeError`. See the [configuration contract](api-reference.md#configuration-validation) and [supported paint values](api-reference.md#renderer-configuration-and-svg-attributes).

Treat a supplied `diagram.svg` as trusted markup: the component uses `@html`, and `renderVrlSvelteMarkup` embeds it directly, bypassing compilation and renderer validation. Use a trusted VRL state factory result, or sanitize arbitrary external SVG within the application before supplying it. See the [trust boundary](api-reference.md#precomputed-diagram-trust-boundary).

## Component Usage

```svelte
<script>
  import VrlDiagram from "@subvertic/vrl-svelte/VrlDiagram.svelte";

  const source = `
route "Quebrada Gata"
metadata country="Costa Rica" difficulty="V3 A4 III" entrance_elevation=1300m exit_elevation=1100m
start "Quebrada Pilas entrance"
rappel "R1" height=28m rope=60m anchor=bolts inclination=90%
pool type=shallow
exit "Old metal ladder"
`;
</script>

<VrlDiagram
  {source}
  options={{ language: "es", symbology: "spanish", theme: "light" }}
  className="route-diagram"
/>
```

If the source is invalid, the component renders formatted diagnostics in a `<pre>` block. If it is valid, it renders the SVG inside a `div` with `role="img"` by default.

Compiler layout options live under `options.layout`, including `width`, `spineX`, `horizontalScale`, `marginY`, `marginBottom`, `pixelsPerMeter`, and `minNodeGap`. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` live at the top level. The diagram legend is enabled by default; set `legend: false` when the page provides its own explanation.

## Precomputed State

Use `createVrlSvelteDiagramState` when a parent component or server route owns compilation, caching, or diagnostics.

```svelte
<script>
  import VrlDiagram from "@subvertic/vrl-svelte/VrlDiagram.svelte";
  import { createVrlSvelteDiagramState } from "@subvertic/vrl-svelte";

  export let source = "";

  $: diagram = createVrlSvelteDiagramState(source, {
    symbology: "federation",
    language: "es",
    layout: { pixelsPerMeter: 6 }
  });
</script>

<VrlDiagram {diagram} />
```

## Server-Side Markup

`renderVrlSvelteMarkup(source, options, renderOptions)` returns a string. It escapes diagnostics and wrapper attributes, and it embeds renderer-produced SVG when valid.

```js
import { renderVrlSvelteMarkup } from "@subvertic/vrl-svelte";

export function renderRouteHtml(source) {
  return renderVrlSvelteMarkup(
    source,
    { language: "es", symbology: "spanish" },
    { className: "route-diagram", role: "img" }
  );
}
```

## Props

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
  role: string
}
```

## Successful-state warnings

Successful diagrams show a warning panel by default. `showWarnings` defaults to `true`; set it to `false` when the application supplies its own warning presentation. `warningsClassName` defaults to `"vrl-diagram__warnings"` and `warningsLabel` to `"Route warnings"`. These are display props, not compiler/renderer options. Diagnostics remain in state, and errors still suppress SVG. The warning panel is a sibling of the image, adding an outer wrapper only when warnings are visible. See the [warning presentation policy](warning-presentation.md) for accessibility, localization, and CSS migration details.
