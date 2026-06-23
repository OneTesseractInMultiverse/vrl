# SvelteKit Example

The Svelte package exposes both a component and an SSR-friendly markup helper.

```svelte
<script>
  import VrlDiagram from "@vrl/svelte/VrlDiagram.svelte";

  export let data;
</script>

<VrlDiagram source={data.routeSource} options={{ theme: "light" }} />
```

Server-side loading can read VRL source from a local file, CMS, database, or API endpoint before passing the text into the page component.

```js
export async function load({ fetch }) {
  const response = await fetch("/routes/rio-azul.vrl");
  return {
    routeSource: await response.text()
  };
}
```

For server-only rendering, use the markup helper:

```js
import { renderVrlSvelteMarkup } from "@vrl/svelte";

export function renderRoute(source) {
  return renderVrlSvelteMarkup(source, { theme: "dark" });
}
```

Diagnostics are rendered as text when the route is invalid, which keeps validation failures visible during development and content review.
