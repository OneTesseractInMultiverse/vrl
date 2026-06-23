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
    pixelsPerMeter: 6
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
    marginY: 120,
    marginBottom: 80,
    pixelsPerMeter: 6
  }
});
```

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
