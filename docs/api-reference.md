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
    horizontalScale: 1.15,
    pixelsPerMeter: 6,
    minNodeGap: 68,
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

Layout options are nested under `options.layout`. `horizontalScale` widens or tightens route progression while keeping the same vertical elevation model. `minNodeGap` keeps dense elevation-aware nodes readable when small real elevation changes would otherwise place symbols on top of each other; set it to `0` for strict elevation scale. Technical element lines in elevation-aware diagrams use `height * inclination * pixelsPerMeter`, and any additional spacing from `minNodeGap` is rendered as a connector. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` are consumed by renderer and framework packages at the top level.

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

### Configuration validation

`computeVerticalLayout` and `computeElevationLayout` validate layout options before computing positions. With the default layout port, `compileRoute` applies the same validation when valid source reaches the layout stage. Options must be plain objects, including objects with a null prototype. Arrays, custom prototypes, unknown layout keys, and `null` are rejected. Omitted options and known properties with value `undefined` use defaults.

| Layout option | Accepted numeric range | Default |
| --- | --- | --- |
| `width` | Greater than zero | `640` |
| `baseSpacing` | Greater than zero | `68` (schematic layout) |
| `horizontalScale` | Greater than zero | `1` |
| `pixelsPerMeter` | Greater than zero | `5.5` (elevation layout) |
| `spineX` | Zero or greater | `96` |
| `marginY` | Zero or greater | `108` |
| `marginBottom` | Zero or greater | `64` |
| `minNodeGap` | Zero or greater | `68` (elevation layout) |

All values must be finite JavaScript numbers no greater than `Number.MAX_SAFE_INTEGER`; fractions are supported. Strings are not coerced, and `NaN` and infinities are rejected. `validateLayoutOptions(options)` exposes this check and returns a shallow copy without modifying the caller's object. `resolveHorizontalScale` follows the same positive-number contract.

Configuration errors throw exceptions: `TypeError` for incorrect types or unsupported keys/values, and `RangeError` for nonfinite or out-of-range numeric values. They are caller configuration errors, not source diagnostics, and framework state factories propagate them. A source error can stop compilation before the layout configuration is inspected. Custom compiler ports own their configuration contracts.

This tightens the previous API: invalid horizontal scales no longer silently fall back to `1`, and numeric strings, negative spacing, unknown layout keys, and explicit `null` values must be corrected by the caller.

### Technical traversal and geometry validation

The normalized model adds `traversal: { points, segments }`. Points contain `elementIndex`, or `null` for an intermediate/outer boundary. Each segment contains:

```js
{
  from: 1,                 // index into traversal.points
  to: 2,                   // index into traversal.points
  elementIndex: 1,          // owning route.elements index; null for a connection
  kind: "technical",       // or "connection"
  direction: "down",       // "up" for climbs; null for connections
  verticalDeltaMeters: -30 // positive upward, negative downward; null if unmeasured
}
```

Connection deltas in the model are zero placeholders, not measured level terrain. Under an elevation profile, their unknown elevation changes can receive a schematic residual; compilation reports a `geometry` warning in that case. Technical deltas remain fixed. A missing downclimb height produces a warning in a schematic route and a blocking error when endpoint elevations require a measured profile. Inconsistent profiles with no eligible connections produce blocking errors. Comparisons tolerate floating-point roundoff, not a fixed rounding of measurements.

`validateGeometry(model)` returns these diagnostics. `createRouteCompiler({ validateGeometry })` can replace that port. `compileRoute` runs it after normalization and returns `model`, `layout`, and `json` as `null` on an error. Lower-level consumers should call it after `normalizeRoute` and before rendering. `computeElevationLayout` and `elevationSegmentDeltas` throw `RangeError` for inconsistent or unmeasured elevation geometry; the former also requires complete elevation metadata. Without elevation metadata, `elevationSegmentDeltas` returns an empty list.

`layout.nodes` retains one entry per route element. `layout.points` contains all positioned traversal boundaries. `layout.segments` augments each domain segment with `start`, `end`, `element` (the owner or `null`), and `technicalDeltaY` (positive downward in SVG coordinates, negative upward, `null` for connections). `elevationSegmentDeltas` returns descent-positive values in this segment order; its length can exceed `elements.length - 1`. Preserve physical `elevationMeters` precision independently of rounded pixel coordinates and readable spacing.

Treat normalized models and layouts as snapshots. Re-normalize after editing source facts, and recompute layouts after changing options. Existing element-only models can still be passed to `computeVerticalLayout`, which derives the canonical traversal.

### Custom renderer migration

Use `layout.segments` to iterate technical events, `segment.element` for annotations, and `segment.start` / `segment.end` for endpoints. Do not infer ownership from adjacent entries in `layout.nodes`: a descent followed by a climb has two events in that gap. Node-only cached or custom layouts must be recomputed; `renderRouteSegments` rejects a missing `segments` array with `TypeError` instead of silently losing a feature.

`segmentTechnicalElement(previous, node)` remains a compatibility helper for unambiguous pairs and now throws `RangeError` for pairs containing two technical elements. `technicalSegmentDelta(previous, element)` returns the combined descent-positive change for such a pair; a scalar net value is not a replacement for its two events.

For custom geometry, pass a positioned segment as the final argument to `dropLadderGeometry`, `technicalLineVerticalDelta`, or the technical segment render helpers. They consume its `technicalDeltaY` directly. The older elevation-layout overload remains available for callers with an already unambiguous pair, but compiled rendering uses only the positioned segment contract.

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
    language: "es",
    symbology: "federation",
    theme: "light"
  });
}
```

Renderer options:

```js
{
  language: "en" | "es",
  locale: "en-US" | "es-CR",
  symbology: "federation" | "french" | "spanish",
  legend: true | false,
  theme: "light" | "dark",
  themeTokens: {
    background: "#eef6f8",
    routeLine: "#111111",
    water: "#1479a6"
  }
}
```

`language` controls diagram text such as element names, route-summary labels, accessibility labels, the legend, and common detail values. `locale` is accepted as an alias. If neither is set, `symbology: "spanish"` selects Spanish text; otherwise English text is used. `legend` defaults to `true`; set it to `false` only when the embedding surface already explains topo abbreviations and detail fields such as flow, exposure, severity, and inclination. Flow, exposure, hazard severity, and inclination values render as category-colored SVG badges and use matching colors in the legend. Lower-level helpers such as `dropLadderGeometry` and `technicalLineVerticalDelta` expose the same scaled technical-line geometry for custom renderers.

Useful helper exports include `resolveTheme`, `symbolCode`, `resolveSymbolProfile`, `formatTopoLabel`, `formatTopoDetail`, and lower-level SVG rendering helpers for custom renderers.

### Renderer configuration and SVG attributes

`renderTopoSvg` accepts a plain options object. If supplied, `legend` must be a boolean and `theme` must be `"light"` or `"dark"`. Omitted or `undefined` values use defaults; `null` is invalid. The shared options object may also contain compiler options. Existing language, locale, and symbology fallback behavior is unchanged.

`themeTokens` must be a plain object with only keys exported by `LIGHT_THEME` / `DARK_THEME`: `background`, `terrain`, `text`, `mutedText`, `routeLine`, `water`, `hazard`, `warning`, `anchor`, `rappel`, `exit`, `panel`, `flowBadge`, `flowBadgeText`, `exposureBadge`, `exposureBadgeText`, `hazardSeverityBadge`, `hazardSeverityBadgeText`, `inclinationBadge`, `inclinationBadgeText`, `levelBadge`, and `levelBadgeText`. Each supplied token must be a supported paint string; omit a token to inherit it. Token values of `undefined` or `null` are invalid. Overrides are copied and outer whitespace is trimmed.

The paint policy intentionally accepts a subset of [CSS colors](https://www.w3.org/TR/css-color-4/):

- CSS named colors, `transparent`, `currentColor`, and SVG `none`, case-insensitively.
- Hex colors with 3, 4, 6, or 8 digits.
- Comma-separated `rgb(r, g, b)` and `rgba(r, g, b, a)`. All three channels must use either numbers from 0 to 255 or percentages from 0 to 100%.
- Comma-separated `hsl(h, s, l)` and `hsla(h, s, l, a)`. Hue is a finite unitless number in degrees; saturation and lightness are percentages from 0 to 100%.
- Alpha is a number from 0 to 1 or a percentage from 0 to 100%. Components use ordinary decimal notation, optionally signed, without exponents.

Resource references such as `url(...)`, including local fragments, CSS variables/expressions, escaped spellings, declarations, and other color syntaxes are rejected with `TypeError`. Space-separated modern color functions are not supported. This is a compatibility change for previously unchecked CSS strings and unknown theme names or tokens.

The renderer also checks supplied layout dimensions and positioned geometry. `width` must be positive, `height` nonnegative, and both must be finite numbers no greater than `Number.MAX_SAFE_INTEGER`. Node, optional point, and segment endpoint coordinates, plus technical pixel deltas, must be finite numbers with absolute magnitude no greater than that limit. Layouts require `nodes` and `segments` arrays; `points` is optional. Derived layouts can exceed these limits even when each input option is individually accepted; rendering rejects them.

Every dynamic SVG attribute is XML-encoded at serialization, including generated path strings, class names, accessibility labels, and paint values. Attribute control characters invalid in XML and nonfinite numeric attribute values throw. Lower-level SVG helpers also encode their attributes and validate paint, but callers remain responsible for their geometry and normalized-model contracts. These helpers are not a general SVG sanitizer.

### Precomputed diagram trust boundary

Caller-provided `diagram.svg` is **trusted markup**. React inserts it with `dangerouslySetInnerHTML`; the Svelte component uses `@html`, and `renderVrlSvelteMarkup` embeds it directly. Supplying `diagram` bypasses compilation, configuration validation, and SVG generation. Use state created by VRL's diagram factories within a trusted application pipeline. If an application accepts arbitrary SVG or precomputed states from another source, it must apply its own appropriate sanitization before passing them to these adapters. Escaping wrapper attributes or diagnostics does not sanitize `diagram.svg`. React's `containerProps` and `diagnosticsProps` are also application-owned component props.

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
      language: "es",
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

See the [precomputed diagram trust boundary](#precomputed-diagram-trust-boundary) before accepting cached or externally supplied diagram states.

Compiler layout options live under `options.layout`. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` live at the top level.

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

<VrlDiagram {source} options={{ language: "es", symbology: "federation", layout: { pixelsPerMeter: 6 } }} />
```

Server-side markup helper:

```js
import { createVrlSvelteDiagramState, renderVrlSvelteMarkup } from "@subvertic/svelte";

const diagram = createVrlSvelteDiagramState(source, {
  language: "es",
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

Compiler layout options live under `options.layout`. Renderer options such as `language`, `locale`, `symbology`, `legend`, `theme`, and `themeTokens` live at the top level.

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
  options: { language: "es", symbology: "spanish", layout: { pixelsPerMeter: 6 } }
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
make release-prepare RELEASE=patch
make publish
make publish VERSION=0.2.0
make publish RELEASE=minor
make publish OTP=123456
```

`make release-prepare` updates all workspace versions and internal pins without publishing. Commit those changes before creating the GitHub release. `make publish-ci` is reserved for GitHub Actions and publishes the committed version through npm Trusted Publishers. `make publish` runs checks, updates versions, then publishes locally in dependency order. If npm returns `E403` requiring two-factor authentication during a local publish, rerun with a fresh one-time password: `make publish OTP=123456`.
