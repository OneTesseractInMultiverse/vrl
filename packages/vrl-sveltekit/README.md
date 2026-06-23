# @subvertic/sveltekit

SvelteKit load helpers for Vertical Route Language.

This package compiles VRL source into serializable diagram data that can be returned from SvelteKit `load` functions and rendered with a Svelte component.

## Install

```sh
npm install @subvertic/sveltekit @subvertic/svelte @subvertic/core @subvertic/render-svg @sveltejs/kit svelte
```

## Usage

```js
import { createVrlSvelteKitLoad } from "@subvertic/sveltekit";

export const load = createVrlSvelteKitLoad({
  source: async ({ fetch }) => {
    const response = await fetch("/routes/rio-azul.vrl");
    return response.text();
  },
  options: { symbology: "spanish" }
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

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
