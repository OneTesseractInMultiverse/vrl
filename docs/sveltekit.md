# SvelteKit Example

The SvelteKit package exposes reusable load helpers and a component that reads precomputed diagram state from `data.vrl` by default.

```svelte
<script>
  import VrlDiagram from "@subvertic/sveltekit/VrlDiagram.svelte";

  export let data;
</script>

<VrlDiagram {data} />
```

When `createVrlSvelteKitLoad` uses a custom `key`, pass the same value as `diagramKey`.

Server-side loading can read VRL source from a local file, CMS, database, or API endpoint before passing compiled diagram state into the page component.

```js
import { createVrlSvelteKitLoad } from "@subvertic/sveltekit";

export const load = createVrlSvelteKitLoad({
  source: async ({ fetch }) => {
    const response = await fetch("/routes/quebrada-gata.vrl");
    return response.text();
  },
  options: { theme: "light" }
});
```

For server-only rendering, use the markup helper:

```js
import { createVrlSvelteKitData } from "@subvertic/sveltekit";
import { renderVrlSvelteMarkup } from "@subvertic/svelte";

export function renderRoute(source) {
  const diagram = createVrlSvelteKitData(source, { theme: "dark" });
  return renderVrlSvelteMarkup("", {}, { diagram });
}
```

Diagnostics are rendered as text when the route is invalid, which keeps validation failures visible during development and content review.

Compiler layout options live under `options.layout`. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` live at the top level. The diagram legend is enabled by default; set `legend: false` when the page provides its own explanation.

## Custom Keys and Direct State

```js
import { loadRouteSource } from "$lib/routes";

export const load = createVrlSvelteKitLoad({
  key: "routeDiagram",
  source: ({ params }) => loadRouteSource(params.slug),
  options: { language: "es", symbology: "federation", layout: { pixelsPerMeter: 6 } }
});
```

```svelte
<VrlDiagram {data} diagramKey="routeDiagram" className="route-diagram" />
```

You can also bypass `data` and pass a precomputed diagram directly:

```svelte
<VrlDiagram diagram={data.routeDiagram} />
```

The component props are `data`, `source`, `options`, `diagram`, `diagramKey`, `className`, `diagnosticsClassName`, and `role`.
