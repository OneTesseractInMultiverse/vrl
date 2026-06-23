# @subvertic/svelte

Svelte adapter for Vertical Route Language.

This package exposes an SSR-friendly markup helper, a diagram state helper, and a Svelte component for rendering VRL diagrams through the core and SVG renderer packages.

## Install

```sh
npm install @subvertic/svelte @subvertic/core @subvertic/render-svg svelte
```

## Usage

```svelte
<script>
  import VrlDiagram from "@subvertic/svelte/VrlDiagram.svelte";

  export let source = "";
</script>

<VrlDiagram
  {source}
  options={{ symbology: "federation", layout: { pixelsPerMeter: 6 } }}
/>
```

```js
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/svelte";

const diagram = createVrlSvelteDiagramState(source, {
  symbology: "spanish",
  layout: { pixelsPerMeter: 6 }
});
const html = renderVrlSvelteMarkup("", {}, { diagram });
```

## Component Props

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

Pass `source` for simple use. Pass `diagram` from `createVrlSvelteDiagramState` when a parent component or server route owns compilation.

Compiler layout options live under `options.layout`. Renderer options such as `symbology`, `theme`, and `themeTokens` live at the top level.

## SSR Helper

```js
import { renderVrlSvelteMarkup } from "@subvertic/svelte";

const html = renderVrlSvelteMarkup(
  source,
  { symbology: "spanish" },
  { className: "route-diagram", role: "img" }
);
```

Invalid source renders escaped diagnostics in a `<pre>` block. Valid source renders the SVG inside an escaped wrapper `<div>`.

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
