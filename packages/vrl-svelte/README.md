# @subvertic/svelte

Bundled declarations cover every public export. See the [API stability, typed contracts, and revision policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/public-contracts.md). Existing runtime entry points and serialized diagram state are unchanged; successful components now show warnings by default.

Svelte adapter for Vertical Route Language.

This package exposes an SSR-friendly markup helper, a diagram state helper, and a Svelte component for rendering VRL diagrams through the core and SVG renderer packages.

State creation delegates to the first-party `@subvertic/diagram` package. Existing factory signatures and `{ ok, ast, diagnostics, diagnosticsText, model, layout, json, svg }` results are unchanged. Warning-only results still render SVG; blocking diagnostics skip rendering. The shared package has no framework peers. See the [state contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/diagram-state.md).

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
  options={{ language: "es", symbology: "federation", layout: { pixelsPerMeter: 6 } }}
/>
```

```js
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/svelte";

const diagram = createVrlSvelteDiagramState(source, {
  symbology: "spanish",
  language: "es",
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
  showWarnings: boolean,
  warningsClassName: string,
  warningsLabel: string,
  role: string
}
```

Pass `source` for simple use. Pass `diagram` from `createVrlSvelteDiagramState` when a parent component or server route owns compilation.

Caller-supplied `diagram.svg` is trusted markup: the component uses `@html` and the SSR helper inserts it directly, bypassing compilation and renderer validation. Use a trusted state factory result or sanitize arbitrary external SVG in the application before passing it here. Escaping the wrapper does not sanitize embedded SVG.

Invalid layout or renderer configuration throws `TypeError` or `RangeError`; these exceptions are separate from source diagnostics. See the [configuration and paint contracts](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#configuration-validation).

Compiler layout options live under `options.layout`, including `width`, `spineX`, `horizontalScale`, `marginY`, `marginBottom`, `pixelsPerMeter`, and `minNodeGap`. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` live at the top level. The diagram legend is enabled by default; set `legend: false` when the page provides its own explanation.

## SSR Helper

```js
import { renderVrlSvelteMarkup } from "@subvertic/svelte";

const html = renderVrlSvelteMarkup(
  source,
  { language: "es", symbology: "spanish" },
  { className: "route-diagram", role: "img" }
);
```

Invalid source renders escaped diagnostics in a `<pre>` block. Valid source renders the SVG inside an escaped wrapper `<div>`.

## Successful-state warnings

Successful diagrams show a warning panel by default. `showWarnings` defaults to `true`; set it to `false` when the application supplies its own warning presentation. `warningsClassName` defaults to `"vrl-diagram__warnings"` and `warningsLabel` to `"Route warnings"`. These are display props, not compiler/renderer options. Diagnostics remain in state, and errors still suppress SVG. The warning panel is a sibling of the image, adding an outer wrapper only when warnings are visible. See the [warning presentation policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/warning-presentation.md) for accessibility, localization, and CSS migration details.

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
