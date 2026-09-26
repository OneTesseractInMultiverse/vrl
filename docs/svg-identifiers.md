# Multiple inline diagrams

SVG IDs belong to the containing document, not to an individual `<svg>` element. With the legacy `vrl-arrow` ID, two inline diagrams share a marker target even when they have different themes. VRL supports a caller-controlled `idPrefix` to give each diagram occurrence its own definitions and references.

## Namespace contract

Set `options.idPrefix` at the top level of renderer or diagram options. For example, `idPrefix: "overview"` produces `id="overview-arrow"` and `marker-end="url(#overview-arrow)"` throughout the diagram. This affects SVG presentation only: route element IDs, model JSON, diagnostics, geometry and labels remain unchanged.

The prefix must be a primitive string of 1–64 ASCII characters, start with a letter, and contain only letters, digits, `_` or `-`. Non-strings, including `null`, throw `TypeError`. Empty, oversized or malformed strings throw `RangeError`; whitespace, punctuation, markup, fragment delimiters and non-ASCII characters are rejected. Values are never coerced, trimmed, truncated or sanitized into potentially colliding names. `undefined` or omission uses `vrl`, preserving the existing standalone `vrl-arrow` markup. Validation occurs when the renderer runs; a blocking compiler error still returns diagnostics without rendering.

Each embedding page must assign a unique prefix per **occurrence**, including repeated copies of the same route, and reserve the resulting `<prefix>-arrow` ID against other document content. A route name or route ID alone is insufficient when that route appears more than once. Do not derive prefixes directly from unchecked route text, user input or framework-generated IDs containing unsupported characters.

VRL has no DOM access, page-wide registry, counter, clock or random generator. Reusing a prefix is accepted and deterministically repeats the IDs; it does not rename a neighbor or throw based on prior render calls. Such duplicates are an embedding error. A renderer invocation cannot detect another diagram in a different component, server request, or previously generated document. The application should enforce unique instance keys when composing its page.

## Framework and server rendering

All adapters forward the same `options.idPrefix` through the shared diagram state. Assign prefixes from stable page instance keys and serialize/reuse the same options during hydration. For example, render a route overview with `route-overview` and its repeated detail view with `route-detail`; reordering or updating route facts does not change either instance key. This strategy works with React 18/19, Svelte 4/5, and SvelteKit without framework hooks or process-global allocation. Separate React roots still share one document ID space.

```jsx
<VrlDiagram source={source} options={{ idPrefix: "route-overview", theme: "light" }} />
<VrlDiagram source={source} options={{ idPrefix: "route-detail", theme: "dark" }} />
```

For Svelte and SvelteKit, pass the same `options` prop to their `VrlDiagram.svelte` entries. `createVrlSvelteKitLoad({ source, options: { idPrefix: "route-overview" } })` resolves the prefix on the server; asynchronous options functions can select an application-owned instance key.

A supplied `diagram` state, including SvelteKit load data, already contains SVG. Components preserve it verbatim and ignore rendering options; they do not rewrite IDs inside trusted markup. Generate a separate state with a distinct prefix for each occurrence. Reusing the same precomputed state twice repeats its IDs. Source-based updates must retain the original instance prefix, or deliberately replace all definitions and references together with a new one.

## Scenes and SVG fragments

`computeTopoScene` returns an owned `identifiers: { arrow: string }` record. Scene computation resolves and validates the namespace; serialization only encodes the resolved identifiers. Domain and compiler layers do not allocate SVG IDs. No runtime dependency is added.

The advanced fragment helpers accept an optional final `idPrefix` argument, preserving every existing positional argument:

```js
renderRouteSegments(layout, theme, language = "en", idPrefix);
renderDropLadderSegment(previous, node, theme, element = previous.element, language = "en", layout = null, idPrefix);
renderDirectTechnicalSegment(previous, node, theme, element = previous.element, layout = null, language = "en", idPrefix);
```

Fragments reference `<prefix>-arrow` but do not emit a marker definition. The containing SVG must supply the matching definition and style. Omitting the final argument preserves the legacy reference. The helper validates explicitly supplied prefixes using the same rule as the full renderer.

## Verification and compatibility

`tests/svg-identifiers.test.js` verifies local reference resolution across themes, every technical arrow, determinism, unchanged route facts, ownership, limits and malformed input. It exercises the real framework SSR components, fragment helpers, supplied states, and asynchronous SvelteKit load results with one assertion per test. Packed production consumers verify two same-route diagrams together, local marker references and paint, stable IDs and retained outer image containers across hydration, and namespace updates that leave the adjacent diagram unchanged. Svelte 4 may recreate inner SVG nodes during hydration; marker node identity is not part of this contract. Tests also record the deliberate duplicate-prefix behavior; they do not claim automatic page-wide collision detection.

The option and fragment arguments are additive for the next minor release. Existing callers retain the default output. Pages with multiple inline diagrams must adopt unique prefixes to remove their collisions; a standalone SVG embedded as an image has its own document scope. See the [API reference](api-reference.md) and [framework compatibility matrix](framework-compatibility.md).
