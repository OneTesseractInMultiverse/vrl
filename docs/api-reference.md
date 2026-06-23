# API Reference

VRL is split into small packages so consumers can choose the layer they need. The core package is framework-free. Renderers and framework adapters depend inward on the core.

## @subvertic/core

Install:

```sh
npm install @subvertic/core
```

Common imports:

```js
import {
  compileRoute,
  parseVrl,
  validateRoute,
  normalizeRoute,
  computeVerticalLayout,
  exportRouteJson
} from "@subvertic/core";
```

`compileRoute(source, options)` is the main use case. It parses source, validates it, normalizes the route model, computes layout, and exports JSON.

```js
const result = compileRoute(source, {
  layout: {
    width: 900,
    spineX: 120,
    pixelsPerMeter: 6,
    marginY: 120,
    marginBottom: 80
  }
});

if (result.ok === false) {
  for (const diagnostic of result.diagnostics) {
    console.error(diagnostic.message);
  }
} else {
  console.log(result.model.summary.requiredRopeMeters);
  console.log(result.json);
}
```

Layout options are nested under `options.layout`. Renderer options such as `symbology`, `theme`, and `themeTokens` are consumed by renderer and framework packages at the top level.

Returned shape:

```js
{
  ok: true,
  ast,
  diagnostics,
  model,
  layout,
  json
}
```

When syntax or validation blocks compilation, `ok` is `false`; `diagnostics` contains structured diagnostic objects with `kind`, `severity`, `message`, `location`, and `suggestion`.

Lower-level functions are available for tooling:

```js
const { ast, diagnostics: syntaxDiagnostics } = parseVrl(source);
const validationDiagnostics = validateRoute(ast);
const model = normalizeRoute(ast);
const layout = computeVerticalLayout(model);
const json = exportRouteJson(model);
```

Use `createRouteCompiler(overrides)` when an application needs to inject custom parser, validator, layout, normalization, or JSON export ports for tests or integration.

## @subvertic/render-svg

Install:

```sh
npm install @subvertic/core @subvertic/render-svg
```

Render a compiled route:

```js
import { compileRoute } from "@subvertic/core";
import { renderTopoSvg } from "@subvertic/render-svg";

const result = compileRoute(source);

if (result.ok) {
  const svg = renderTopoSvg(result.model, result.layout, {
    symbology: "federation",
    theme: "light"
  });
}
```

Renderer options:

```js
{
  symbology: "federation" | "french" | "spanish",
  theme: "light" | "dark",
  themeTokens: {
    background: "#eef6f8",
    routeLine: "#111111",
    water: "#1479a6"
  }
}
```

Useful helper exports include `resolveTheme`, `symbolCode`, `resolveSymbolProfile`, `formatTopoLabel`, `formatTopoDetail`, and lower-level SVG rendering helpers for custom renderers.

## @subvertic/react

Install:

```sh
npm install @subvertic/react react
```

Create a component with dependency-injected React:

```jsx
import React, { useMemo } from "react";
import { createVrlDiagramComponent, createVrlReactDiagramState } from "@subvertic/react";

const VrlDiagram = createVrlDiagramComponent(React);

export function RouteDiagram({ source }) {
  const diagram = useMemo(
    () => createVrlReactDiagramState(source, {
      symbology: "spanish",
      layout: { pixelsPerMeter: 6 }
    }),
    [source]
  );

  return <VrlDiagram diagram={diagram} className="route-diagram" />;
}
```

Component props:

```js
{
  source,
  options,
  diagram,
  className,
  diagnosticsClassName,
  role,
  containerProps,
  diagnosticsProps
}
```

Pass `source` and `options` for simple use. Pass `diagram` from `createVrlReactDiagramState` when the parent owns memoization, caching, or server-provided state.

Compiler layout options live under `options.layout`. Renderer options such as `symbology`, `theme`, and `themeTokens` live at the top level.

## @subvertic/svelte

Install:

```sh
npm install @subvertic/svelte svelte
```

Component usage:

```svelte
<script>
  import VrlDiagram from "@subvertic/svelte/VrlDiagram.svelte";

  export let source = "";
</script>

<VrlDiagram {source} options={{ symbology: "federation", layout: { pixelsPerMeter: 6 } }} />
```

Server-side markup helper:

```js
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/svelte";

const diagram = createVrlSvelteDiagramState(source, {
  symbology: "spanish",
  layout: { pixelsPerMeter: 6 }
});
const html = renderVrlSvelteMarkup("", {}, { diagram, className: "route-diagram" });
```

Component props:

```js
{
  source,
  options,
  diagram,
  className,
  diagnosticsClassName,
  role
}
```

Compiler layout options live under `options.layout`. Renderer options such as `symbology`, `theme`, and `themeTokens` live at the top level.

## @subvertic/sveltekit

Install:

```sh
npm install @subvertic/sveltekit @subvertic/svelte @sveltejs/kit svelte
```

Create a reusable load function:

```js
import { createVrlSvelteKitLoad } from "@subvertic/sveltekit";

export const load = createVrlSvelteKitLoad({
  source: async ({ fetch }) => {
    const response = await fetch("/routes/quebrada-gata.vrl");
    return response.text();
  },
  options: { symbology: "spanish", layout: { pixelsPerMeter: 6 } }
});
```

Render the loaded data:

```svelte
<script>
  import VrlDiagram from "@subvertic/sveltekit/VrlDiagram.svelte";
  export let data;
</script>

<VrlDiagram {data} />
```

`createVrlSvelteKitLoad({ source, options, key })` accepts `source` and `options` as values or functions. The default returned key is `vrl`. If you use a custom key, pass it to the component:

```js
import { loadRouteSource } from "$lib/routes";

export const load = createVrlSvelteKitLoad({
  key: "diagram",
  source: ({ params }) => loadRouteSource(params.slug)
});
```

```svelte
<VrlDiagram {data} diagramKey="diagram" />
```

## Publishing

Local publishing is centralized through the Makefile:

```sh
make publish-plan
make publish
make publish VERSION=0.2.0
make publish RELEASE=minor
make publish OTP=123456
```

`make publish` runs checks, updates all workspace versions and internal pins, then publishes in dependency order.
