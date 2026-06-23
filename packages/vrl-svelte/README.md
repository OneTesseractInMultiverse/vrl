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

<VrlDiagram {source} options={{ symbology: "federation" }} />
```

```js
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/svelte";

const diagram = createVrlSvelteDiagramState(source, { symbology: "spanish" });
const html = renderVrlSvelteMarkup("", {}, { diagram });
```

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
