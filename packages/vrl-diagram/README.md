# @subvertic/vrl-diagram

Bundled declarations cover every public export. See the [API stability, typed contracts, and revision policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/public-contracts.md). Serialized diagram state is unchanged; warning presentation adds the pure helper documented below.

Framework-neutral diagram state for Vertical Route Language. This package coordinates the core compiler and SVG renderer, then projects their results into the state used by React, Svelte, and SvelteKit. It has only first-party dependencies on `@subvertic/vrl-core` and `@subvertic/vrl-render-svg`, with no framework peers or third-party runtime dependencies.

## Install

```sh
npm install @subvertic/vrl-diagram
```

## Usage

```js
import { createDiagramState } from "@subvertic/vrl-diagram";

const source = `route "Canyon preview"
start
rappel height=10m rope=20m flow=high
exit`;
const diagram = createDiagramState(source, {
  language: "es",
  theme: "dark",
  layout: { width: 640 }
});

// diagram.ok === true
// diagram.diagnosticsText === ""
// diagram.svg contains the complete SVG document.
```

`createDiagramState(source, options = {})` returns `{ ok, ast, diagnostics, diagnosticsText, model, layout, json, svg }` synchronously. It compiles once and renders once on success, including warning-only results. Blocking diagnostics retain the AST and diagnostic information, set model/layout/JSON to `null`, and return `svg: ""` without invoking the renderer. `diagnosticsText` uses the core formatter and preserves diagnostic order.

The same options object goes to the compiler and renderer. Put layout settings under `options.layout`; renderer settings such as `language`, `symbology`, `theme`, and `legend` remain at the top level. Processing limits stay under `options.limits`.

Configuration errors, XML-incompatible text, and unexpected compiler/renderer exceptions propagate unchanged instead of becoming source diagnostics or partial states. Renderer-only settings are checked only when compilation succeeds. The operation performs no I/O or caching; call it again after changing source/options. It does not freeze returned state or mutate caller options.

Pass the resulting state as `diagram` to existing React/Svelte components or markup helpers, or return it from a server load function. Existing `createVrlReactDiagramState`, `createVrlSvelteDiagramState`, and `createVrlSvelteKitData` entry points delegate to this package and retain their signatures and state shape. Warnings remain available in state. Successful components display SVG and, by default, an accompanying warning panel. Set the adapter prop `showWarnings: false` to hide the panel without discarding diagnostics.

A supplied `diagram.svg` is trusted markup. Framework adapters bypass compilation and rendering for an injected state; they do not sanitize it. Use a trusted state or apply application-owned sanitization before injecting external SVG.

See the [diagram-state contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/diagram-state.md) for ownership, failure behavior, adapter responsibilities, and packaging details. Internal compiler/render ports and state projection helpers are not public package exports.

`diagramWarningText(diagram, showWarnings = true)` returns successful-state warning text in diagnostic order, formatted by core, or `""` for hidden warnings, failed state, or missing diagnostics. Nonboolean flags throw `TypeError`. It performs no compilation/rendering and never mutates the state. `WarningDisplayOptions` describes the adapters' `showWarnings`, `warningsClassName`, and `warningsLabel` props. See the [warning presentation policy](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/warning-presentation.md) for configuration, accessible markup, and compatibility details.

## License

MIT. Copyright (c) 2026 Pedro Guzmán.

For multiple inline diagrams, set a stable, document-unique `options.idPrefix` per occurrence. Supplied diagram states preserve their existing IDs. See the [namespace contract](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/svg-identifiers.md).
