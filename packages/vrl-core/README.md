# @subvertic/core

Framework-free core for Vertical Route Language.

This package parses compact VRL source, validates route semantics, normalizes route models, computes elevation-aware vertical layout data, and exports JSON. It has no framework, DOM, file-system, or network dependencies.

## Install

```sh
npm install @subvertic/core
```

## Usage

```js
import { compileRoute } from "@subvertic/core";

const result = compileRoute('route "Rio Azul"\nmetadata entrance_elevation=1240m exit_elevation=1170m\nrappel "R1" height=35m rope=70m anchor=bolts');
```

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
