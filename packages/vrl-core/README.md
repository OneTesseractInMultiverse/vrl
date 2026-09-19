# @subvertic/core

Framework-free core for Vertical Route Language.

This package parses compact VRL source, validates route semantics, normalizes route models, computes elevation-aware vertical layout data, and exports JSON. It has no framework, DOM, file-system, or network dependencies.

## Install

```sh
npm install @subvertic/core
```

## Usage

```js
import { compileRoute, formatDiagnostic } from "@subvertic/core";

const source = `
route "Quebrada Gata"
metadata entrance_elevation=1300m exit_elevation=1100m difficulty="V3 A4 III"
start "Quebrada Pilas entrance"
rappel "R1" height=28m rope=60m anchor=bolts inclination=90%
pool type=shallow
exit "Old metal ladder"
`;

const result = compileRoute(source, {
  layout: {
    width: 900,
    horizontalScale: 1.15,
    pixelsPerMeter: 6,
    minNodeGap: 68
  }
});

if (result.ok === false) {
  console.error(result.diagnostics.map(formatDiagnostic).join("\n"));
} else {
  console.log(result.model.summary.requiredRopeMeters);
  console.log(result.layout.nodes.length);
  console.log(result.json);
}
```

## Main Exports

```js
import {
  parseVrl,
  validateRoute,
  normalizeRoute,
  computeVerticalLayout,
  compileRoute,
  createRouteCompiler,
  exportRouteJson
} from "@subvertic/core";
```

- `parseVrl(source)` returns `{ ast, diagnostics }`.
- `validateRoute(ast)` returns semantic diagnostics.
- `normalizeRoute(ast)` returns a stable route model with generated element IDs and summary fields.
- `computeVerticalLayout(model, options)` computes SVG-ready node positions.
- `compileRoute(source, options)` runs the full parser, validation, normalization, layout, and JSON export pipeline.
- `createRouteCompiler(overrides)` creates an injectable compiler for tests or alternate ports.
- `exportRouteJson(model)` serializes normalized route data.

Normalized models include `traversal.points` and `traversal.segments`: domain-owned endpoint references, technical element ownership, direction, and signed physical elevation changes. Positive deltas mean ascent; negative deltas mean descent. Intermediate boundaries keep adjacent descents and climbs separate, and outer boundaries preserve leading/trailing technical features. They do not add source elements.

Layouts retain one `nodes` entry per route element and add all traversal `points` plus positioned `segments`. Renderers should use the latter instead of choosing a technical owner from neighboring nodes. `validateGeometry(model)` checks normalized elevation constraints; compilation calls this injectable port before layout/export. Missing measurements and underdetermined profiles are diagnosed, and inconsistent technical-only profiles block compilation. See the repository API reference for the complete contract and custom renderer migration.

## Diagnostics

Diagnostics are plain objects:

```js
{
  kind: "syntax",
  severity: "error",
  message: "Unknown statement \"teleport\".",
  location: { line: 3, column: 1 },
  suggestion: "Use route, metadata, start, walk, rappel, downclimb, climb, pool, hazard, note, or exit."
}
```

Use `formatDiagnostic(diagnostic)` for readable CLI, build, or editor output.

## Layout Options

```js
compileRoute(source, {
  layout: {
    width: 900,
    spineX: 120,
    horizontalScale: 1.15,
    marginY: 120,
    marginBottom: 80,
    pixelsPerMeter: 6,
    minNodeGap: 68
  }
});
```

`horizontalScale` controls how far route nodes advance across the canvas. Values above `1` use more horizontal space while preserving the vertical profile. `minNodeGap` keeps dense elevation-aware diagrams readable by adding visual spacing when nearby route nodes would overlap. Set it to `0` for strict elevation scale.

Layout options must be a plain object with known keys. All values must be finite JavaScript numbers no greater than `Number.MAX_SAFE_INTEGER`; numeric strings and explicit `null` are rejected. `width`, `baseSpacing`, `horizontalScale`, and `pixelsPerMeter` must be positive; `spineX`, `marginY`, `marginBottom`, and `minNodeGap` may be zero. Omitted or `undefined` values use defaults. `baseSpacing` defaults to `68` for schematic layouts.

Invalid types or keys throw `TypeError`; invalid numeric ranges throw `RangeError` when the layout stage is reached. Invalid horizontal scales no longer silently fall back to `1`. These exceptions are separate from source diagnostics and propagate to callers. `validateLayoutOptions(options)` exposes the validation and returns a shallow copy. See the repository's [API reference](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/api-reference.md#configuration-validation) for defaults and compatibility details.

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
