# @stev/core

Framework-free core for Vertical Route Language.

This package parses compact VRL source, validates route semantics, normalizes route models, computes simple vertical layout data, and exports JSON. It has no framework, DOM, file-system, or network dependencies.

## Install

```sh
npm install @stev/core
```

## Usage

```js
import { compileRoute } from "@stev/core";

const result = compileRoute('route "Rio Azul"\nrappel "R1" height=35m rope=70m anchor=bolts');
```

## License

MIT. Copyright (c) 2026 Pedro Guzmán.
