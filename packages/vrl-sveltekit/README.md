# @subvertic/sveltekit

Bundled declarations cover every public export. See the [API stability, typed contracts, and revision policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/public-contracts.md). Runtime entry points and serialized output are unchanged.

SvelteKit load helpers for Vertical Route Language.

This package compiles VRL source into serializable diagram data that can be returned from SvelteKit `load` functions and rendered with a Svelte component.

State creation delegates to the first-party `@subvertic/diagram` package. Existing factory signatures and `{ ok, ast, diagnostics, diagnosticsText, model, layout, json, svg }` results are unchanged. Warning-only results still render SVG; blocking diagnostics skip rendering. The shared package has no framework peers. See the [state contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/diagram-state.md).

## Install

```sh
npm install @subvertic/sveltekit @subvertic/svelte @subvertic/core @subvertic/render-svg @sveltejs/kit svelte
```

## Usage

```js
import { createVrlSvelteKitLoad } from "@subvertic/sveltekit";

export const load = createVrlSvelteKitLoad({
  source: async ({ fetch }) => {
    const response = await fetch("/routes/quebrada-gata.vrl");
    return response.text();
  },
  options: { language: "es", symbology: "spanish", layout: { pixelsPerMeter: 6 } }
});
```

```svelte
<script>
  import VrlDiagram from "@subvertic/sveltekit/VrlDiagram.svelte";

  export let data;
</script>

<VrlDiagram {data} />
```

If your load function uses a custom key, pass the same key to the component:

```svelte
<VrlDiagram {data} diagramKey="diagram" />
```

## Load Helpers

```js
import { createVrlSvelteKitData, createVrlSvelteKitLoad } from "@subvertic/sveltekit";
import { loadRouteSource } from "$lib/routes";
```

- `createVrlSvelteKitData(source, options)` returns serializable diagram state.
- `createVrlSvelteKitLoad({ source, options, key })` returns an async SvelteKit `load` function.

`source` and `options` can be values or functions that receive the SvelteKit load event:

```js
export const load = createVrlSvelteKitLoad({
  key: "routeDiagram",
  source: ({ params }) => loadRouteSource(params.slug),
  options: ({ url }) => ({
    symbology: url.searchParams.get("profile") ?? "federation",
    language: url.searchParams.get("lang") ?? "es",
    layout: { pixelsPerMeter: 6 }
  })
});
```

```svelte
<VrlDiagram {data} diagramKey="routeDiagram" />
```

## Component Props

```js
{
  data: object,
  source: string,
  options: object,
  diagram: object | null,
  diagramKey: string,
  className: string,
  diagnosticsClassName: string,
  role: string
}
```

The component reads `data.vrl` by default. Passing `diagram` overrides `data[diagramKey]`.

Compiler layout options live under `options.layout`, including `width`, `spineX`, `horizontalScale`, `marginY`, `marginBottom`, `pixelsPerMeter`, and `minNodeGap`. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` live at the top level. The diagram legend is enabled by default; set `legend: false` when the page provides its own explanation.

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
