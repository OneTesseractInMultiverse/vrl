# Svelte Example

The Svelte package exposes both a component and SSR-friendly helpers. The component compiles source internally unless a precomputed `diagram` state is provided.

## Component Usage

```svelte
<script>
  import VrlDiagram from "@subvertic/svelte/VrlDiagram.svelte";

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
  options={{ symbology: "spanish", theme: "light" }}
  className="route-diagram"
/>
```

If the source is invalid, the component renders formatted diagnostics in a `<pre>` block. If it is valid, it renders the SVG inside a `div` with `role="img"` by default.

Compiler layout options live under `options.layout`. Renderer options such as `symbology`, `theme`, and `themeTokens` live at the top level.

## Precomputed State

Use `createVrlSvelteDiagramState` when a parent component or server route owns compilation, caching, or diagnostics.

```svelte
<script>
  import VrlDiagram from "@subvertic/svelte/VrlDiagram.svelte";
  import { createVrlSvelteDiagramState } from "@subvertic/svelte";

  export let source = "";

  $: diagram = createVrlSvelteDiagramState(source, {
    symbology: "federation",
    layout: { pixelsPerMeter: 6 }
  });
</script>

<VrlDiagram {diagram} />
```

## Server-Side Markup

`renderVrlSvelteMarkup(source, options, renderOptions)` returns a string. It escapes diagnostics and wrapper attributes, and it embeds renderer-produced SVG when valid.

```js
import { renderVrlSvelteMarkup } from "@subvertic/svelte";

export function renderRouteHtml(source) {
  return renderVrlSvelteMarkup(
    source,
    { symbology: "spanish" },
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
  role: string
}
```
