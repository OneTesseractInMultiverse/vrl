# Shared diagram state

See the [public API classifications, typed contracts, and revision policy](public-contracts.md).

`@subvertic/diagram` owns framework-neutral diagram coordination. React, Svelte, and SvelteKit delegate their state factories to `createDiagramState(source, options = {})`. Consumers can also use it directly without installing a framework.

```js
import { createDiagramState } from "@subvertic/diagram";

const source = `route "Short rope"
rappel height=10m rope=5m`;
const diagram = createDiagramState(source, { language: "es", legend: false });
// diagram.ok === true: warnings do not block rendering.
// diagram.diagnostics[0].severity === "warning"
// diagram.diagnosticsText includes the rope/height warning.
// diagram.svg contains the complete SVG document.
```

## State and failure contract

The function is synchronous and returns these fields, preserving the existing adapter contract:

| Field | Successful compilation, including warnings | Blocking diagnostics |
| --- | --- | --- |
| `ok` | `true` | `false` |
| `ast` | Compiler AST, including source references | Recovered compiler AST |
| `diagnostics` | Ordered compiler diagnostics, including warning codes and ranges | Ordered compiler diagnostics, including errors |
| `diagnosticsText` | Core-formatted diagnostic lines joined with `\n`, or `""` | Same formatting and order |
| `model` | Normalized route | `null` |
| `layout` | Positioned route | `null` |
| `json` | Core JSON export string | `null` |
| `svg` | Complete renderer output string | `""` |

Compilation runs once. Rendering runs once only if compilation succeeds. The same caller options reach both stages: layout options remain nested under `layout`, processing limits under `limits`, and renderer options at the top level. No option names are added or translated. Renderer-only options are not evaluated on a blocking compiler result, so invalid source still returns its diagnostics even if a supplied theme is unsupported.

Invalid caller configuration and unexpected compiler or renderer exceptions propagate unchanged. They do not become diagnostics or partially populated states. The owning core/renderer boundary defines the exception type; for example, invalid numeric layout ranges throw `RangeError`, and unsupported paint or XML-invalid text throws `TypeError`. Asynchronous source/options resolvers belong to the SvelteKit load adapter; their rejected promises propagate to its caller.

Each call recomputes state. There is no global cache, retained source/options state, or I/O. Inputs are not mutated. AST/model/layout/diagnostic records are the current compilation's records, not a second deep copy. They remain mutable as before; editing a returned state does not change later calls. Application-owned caching and memoization must account for source and all relevant options.

Warnings remain available in `diagnostics` and `diagnosticsText` on successful state. Components and the Svelte markup helper show an accompanying warning panel by default. `showWarnings: false` hides only that panel; failures still display all diagnostic text without SVG. See the [warning presentation policy](warning-presentation.md) for display settings, accessibility, and wrapper compatibility.

## Boundaries and responsibilities

`packages/vrl-diagram/src/application/create-diagram-state.js` coordinates synchronous compiler/render ports. It knows neither their concrete implementations nor a framework. The internal port record contains `compile(source, options)` and `render(model, layout, options)`. Composition supplies trusted implementations following the existing compiler-result and SVG-string contracts. These internal ports are not a new supported dependency-injection API.

`application/diagram-state.js` is a pure projection: it selects state fields and uses core's domain diagnostic formatter. It does not compile, render, perform I/O, or know about component props. `application/diagram-warnings.js` is a separate pure computation that selects and formats successful-state warning text. Its public `diagramWarningText` helper performs no compilation or rendering. `composition/diagram-state.js` wires the core compiler and SVG renderer for the public `createDiagramState` function. The domain and renderer never depend on the shared diagram package or on frameworks.

Framework-specific work remains in its adapter:

- React supplies `createElement`, component defaults/props, diagnostic containers, and trusted SVG insertion.
- Svelte supplies reactive component props, markup wrappers, and escaping of wrapper attributes and diagnostic text.
- SvelteKit resolves source/options from load events, returns the configured data key, and forwards data/props to its Svelte component. Data creation calls the neutral package directly.

Dependency tests enforce these directions, including import/re-export checks on JavaScript and Svelte sources. No framework runtime dependency enters core, the renderer, or the neutral package.

## Precomputed state and compatibility

The following existing functions retain their arguments and complete state shape:

- `createVrlReactDiagramState(source, options)`
- `createVrlSvelteDiagramState(source, options)`
- `createVrlSvelteKitData(source, options)`

State created by `createDiagramState` can be passed to those adapters' existing `diagram` inputs. A supplied non-null state takes precedence over source/options and bypasses compilation, configuration validation, and rendering. SvelteKit's component preserves its precedence: explicit `diagram`, then `data[diagramKey]`, then source/options. Successful injected SVG remains trusted caller markup; failed injected diagnostics remain text. See the [trust boundary](api-reference.md#precomputed-diagram-trust-boundary).

State creation preserves its source and SVG behavior. Warning-only component markup adds the wrapper described in the [display migration](warning-presentation.md#markup-and-accessibility). Direct consumers of the shared helpers should install `@subvertic/diagram`; existing adapter consumers receive it transitively. There are no new third-party runtime dependencies. The adapters' package manifests and lockfile declare the new first-party dependency explicitly; Svelte still uses the renderer's XML encoder, and SvelteKit still uses the Svelte component.

## Packaging and validation

The six publishable workspaces share a version. Publish in dependency order: core, render-svg, diagram, react, svelte, sveltekit. Release preparation includes the new package and its internal pins. Before the next release, configure the new package's npm publishing access/trusted publisher alongside the existing packages; the repository change itself does not publish anything. See the [release checklist](release-checklist.md).

Tests compare every field against the existing compiler/renderer contracts for valid, warning-only, and invalid documents. Additional checks cover exact port calls and argument identity, renderer suppression after errors, exception identity, source/options changes, frozen inputs, independent calls, precomputed state, full wrapper content, and asynchronous/concurrent SvelteKit loads. Each test has one assertion. Warning-presentation tests also exercise actual React server rendering and compiled Svelte/SvelteKit components. These checks supplement the configured 100% JavaScript coverage target; browser hydration and assistive-technology behavior remain separate testing concerns.
