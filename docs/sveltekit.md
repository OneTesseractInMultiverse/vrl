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
    const response = await fetch("/routes/rio-azul.vrl");
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
