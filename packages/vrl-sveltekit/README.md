# @subvertic/vrl-sveltekit

See the [tested framework/runtime combinations](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/framework-compatibility.md) for packed-application SSR, hydration, updates and compatibility limits.

Bundled declarations cover every public export. See the [API stability, typed contracts, and revision policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/public-contracts.md). Existing runtime entry points and serialized diagram state are unchanged; successful components now show warnings by default.

SvelteKit load helpers for Vertical Route Language.

This package compiles VRL source into serializable diagram data that can be returned from SvelteKit `load` functions and rendered with a Svelte component.

State creation delegates to the first-party `@subvertic/vrl-diagram` package. Existing factory signatures and `{ ok, ast, diagnostics, diagnosticsText, model, layout, json, svg }` results are unchanged. Warning-only results still render SVG; blocking diagnostics skip rendering. The shared package has no framework peers. See the [state contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/diagram-state.md).

## Install

```sh
npm install @subvertic/vrl-sveltekit @subvertic/vrl-svelte @subvertic/vrl-core @subvertic/vrl-render-svg @sveltejs/kit svelte
```

## Usage

```js
import { createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";

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
  import VrlDiagram from "@subvertic/vrl-sveltekit/VrlDiagram.svelte";

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
import { createVrlSvelteKitData, createVrlSvelteKitLoad } from "@subvertic/vrl-sveltekit";
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
  showWarnings: boolean,
  warningsClassName: string,
  warningsLabel: string,
  role: string
}
```

The component reads `data.vrl` by default. Passing `diagram` overrides `data[diagramKey]`.

Compiler layout options live under `options.layout`, including `width`, `spineX`, `horizontalScale`, `marginY`, `marginBottom`, `pixelsPerMeter`, and `minNodeGap`. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` live at the top level. The diagram legend is enabled by default; set `legend: false` when the page provides its own explanation.

## Successful-state warnings

Successful diagrams show a warning panel by default. `showWarnings` defaults to `true`; set it to `false` when the application supplies its own warning presentation. `warningsClassName` defaults to `"vrl-diagram__warnings"` and `warningsLabel` to `"Route warnings"`. These are display props, not compiler/renderer options. Diagnostics remain in state, and errors still suppress SVG. The warning panel is a sibling of the image, adding an outer wrapper only when warnings are visible. See the [warning presentation policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/warning-presentation.md) for accessibility, localization, and CSS migration details.

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
