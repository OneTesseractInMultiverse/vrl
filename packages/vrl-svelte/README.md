# @vrl/svelte

Svelte adapter for Vertical Route Language.

This package exposes an SSR-friendly markup helper and a Svelte component for rendering VRL diagrams through the core and SVG renderer packages.

## Install

```sh
npm install @vrl/svelte @vrl/core @vrl/render-svg svelte
```

## Usage

```svelte
<script>
  import VrlDiagram from "@vrl/svelte/VrlDiagram.svelte";

  export let source = "";
</script>

<VrlDiagram {source} options={{ symbology: "federation" }} />
```

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
