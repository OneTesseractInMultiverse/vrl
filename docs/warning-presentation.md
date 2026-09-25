# Warning presentation

Successful diagrams display compiler warnings by default in React, Svelte, SvelteKit, and `renderVrlSvelteMarkup`. Warnings accompany the SVG; they never turn a successful result into a failure. Blocking errors still display the entire diagnostic report without SVG.

| Result | Default output | With `showWarnings: false` |
| --- | --- | --- |
| Success without warnings | SVG image container | Same |
| Success with warnings | SVG image container and accompanying warning panel | SVG image container |
| Blocking diagnostics | Full diagnostic text; no SVG | Same |

The policy concerns HTML presentation. `createDiagramState` and the framework state factories retain the same complete `diagnostics`, `diagnosticsText`, and `svg` fields. Hiding a panel never deletes diagnostics, changes severity, or changes compilation/layout/JSON/SVG output. Direct `renderTopoSvg` calls do not include an HTML warning panel.

## Display settings

These are adapter props, or fields in the third `renderOptions` argument to `renderVrlSvelteMarkup`. They do not belong inside compiler/renderer `options` or SvelteKit load options.

| Setting | Default | Meaning |
| --- | --- | --- |
| `showWarnings` | `true` | Boolean controlling the successful-state warning panel. Omitted/`undefined` uses the default; nonboolean values, including `null`, throw `TypeError`. |
| `warningsClassName` | `"vrl-diagram__warnings"` | CSS class for the warning text container. |
| `warningsLabel` | `"Route warnings"` | Accessible name of the warning panel. Supply a localized label for the embedding page. |

React accepts all three settings in `createVrlDiagramComponent(React, defaults)` as well as per-instance props. SvelteKit forwards them to its Svelte component and preserves the precedence of explicit `diagram`, `data[diagramKey]`, then source/options. The display flag is checked even when compilation is bypassed by a supplied state. Existing `diagnosticsClassName` and React `diagnosticsProps` continue to apply only to the failure report.

```jsx
<VrlDiagram
  source={source}
  showWarnings={true}
  warningsClassName="route-warnings"
  warningsLabel="Avisos de la ruta"
/>
```

The same props work on the Svelte and SvelteKit components. For string markup:

```js
import { renderVrlSvelteMarkup } from "@subvertic/svelte";

const source = 'route "Short rope"\nrappel height=10m rope=5m';
const html = renderVrlSvelteMarkup(source, {}, { warningsLabel: "Route warnings" });
```

The label is explicitly configurable; SVG `language`/`locale` settings do not translate it or the compiler's diagnostic messages. Applications that provide their own diagnostic presentation can set `showWarnings: false` and consume the unchanged machine-readable diagnostics, including codes and source ranges.

## Markup and accessibility

Warning-only success adds an outer `div` containing the existing image container and a sibling `pre`. The panel sits outside `role="img"`, exposes `role="status"`, `aria-live="polite"`, `aria-atomic="true"`, and `aria-label`, and wraps long text with `white-space: pre-wrap; overflow-wrap: anywhere`. Diagnostic content is text; framework escaping or the markup helper's XML encoder prevents it from becoming HTML. Caller-supplied SVG retains the existing [trusted markup boundary](api-reference.md#precomputed-diagram-trust-boundary).

The status semantics follow [W3C's status-message technique](https://www.w3.org/WAI/WCAG22/Techniques/aria/ARIA22). The attributes make the panel available to accessibility tooling, but server rendering alone does not establish announcement behavior. Browser, hydration, and assistive-technology testing remains necessary for dynamic announcements in an embedding application.

Clean success and hidden warnings preserve the previous single image container. Failure preserves the previous diagnostic block. For warning-only success, `className`, `role`, and React `containerProps` stay on the image container, not the new outer wrapper. Update CSS or DOM traversal that assumes the image is always the component's root. Set `showWarnings: false` to retain that structure when the application supplies another warning presentation.

## Shared selection and ownership

`diagramWarningText(diagram, showWarnings = true)` is a pure exported helper from `@subvertic/diagram`. It selects successful-state warning diagnostics in their original order, formats each with core's `formatDiagnostic`, and joins them with newlines. It returns `""` for failed state, intentional suppression, or no warnings. It never changes input state, invokes compilation/rendering, or imports a framework/DOM API. Legacy supplied successful states without `diagnostics` (or with `null`) return no warning text; callers needing a panel should supply complete diagnostic records, not just `diagnosticsText`.

The helper uses trusted state; it does not repeat domain validation or reconcile contradictory caller-built state. Core owns severity and domain rules, the shared application layer owns warning selection, and each adapter owns markup/escaping. This keeps presentation choices out of the domain.

## Verification

Tests render the actual React server component, compiled Svelte component, SvelteKit wrapper, and Svelte markup helper. Each test has one assertion. They verify clean/warning/error output, ordered warnings, display overrides, frozen state preservation, precomputed state precedence, asynchronous load data, accessibility attributes, escaping, and invalid display flags. Consumer type checks and packed-package checks cover the public API. These tests complement the configured 100% JavaScript coverage target; they do not claim browser hydration or screen-reader verification.
