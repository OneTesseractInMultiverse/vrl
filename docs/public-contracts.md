# Public API and compatibility contracts

VRL publishes ESM JavaScript with bundled TypeScript declarations for all six packages. No compilation step or third-party runtime dependency is added to core, SVG rendering, or the shared diagram package. React uses a structural `createElement` port; Svelte component declarations refer to the existing Svelte peer. Development checks use TypeScript 7, React 18 types, and Svelte 4 types.

## Stability classes

[The revision 1 inventory](contracts/v1.json) classifies every current runtime export and supported component subpath. Tests compare that inventory and the declared value exports with the real package namespaces. Classification does not remove or rename existing exports.

| Surface | Stable facade | Advanced extension points |
| --- | --- | --- |
| Core | `compileRoute`, `parseVrl`, `validateRoute`, `normalizeRoute`, `computeVerticalLayout`, `exportRouteJson`, diagnostic construction/formatting/blocking checks | Compiler composition/overrides, individual element/token helpers, traversal and geometry helpers, numerical guards |
| SVG | `renderTopoSvg`, `resolveTheme`, `LIGHT_THEME`, `DARK_THEME`, `escapeXml` | `computeTopoScene`, presentation calculations, localization/symbol tables, individual SVG fragments and prepared drawing overrides |
| Diagram | `createDiagramState`, `diagramWarningText` | None |
| React | Both state and component factories | None |
| Svelte | State/markup factories and `VrlDiagram.svelte` | None |
| SvelteKit | State/load factories and `VrlDiagram.svelte` | None |

Use the facade for ordinary integrations. Advanced exports remain supported for the current package release, are typed, and have the preconditions described below; their finer details may change as the implementation evolves. Pin package versions when depending on them. Internal files under `src/` that are not package exports are not supported import paths. Type-only imports do not create JavaScript exports.

## Contract revisions and releases

Revision **1** names the existing AST, normalized model, traversal, layout, diagnostic, compiler result/port, and diagram-state contracts. The inventory records each revision separately. This documentation baseline adds no `schemaVersion` property and makes no change to existing JSON bytes or object fields.

Package versions and data-contract revisions have different purposes:

- Patch releases may fix incorrect behavior or documentation without intentionally breaking valid facade usage or changing field meaning.
- Additive optional fields or exports may be introduced with a minor package release while retaining the applicable contract revision. Consumers should tolerate unknown object properties.
- Removing or renaming fields, changing units, requiredness, nullability, identity allocation, ownership, or failure categories requires a new affected contract revision and migration notes. Extending a closed union such as `ElementType` can break exhaustive consumers and receives the same review.
- Before 1.0, incompatible facade or advanced API changes require a minor package release; after 1.0, incompatible stable API changes require a major release. Advanced changes must be announced in a minor-or-major release with migration guidance, never silently shipped as a patch. Deprecate an export and document its replacement before removal.
- A declaration change that rejects previously valid documented usage is an API change. Correcting declarations to reject usage the runtime already rejects is a bug fix and should be explained in release notes.

Retain prior contract inventories and compatibility fixtures when introducing a new revision. Record the affected contracts, old/new behavior, migration, and package release in the PR and release notes. Exact SVG bytes, font-dependent appearance, readable diagnostic wording, and advanced scene coordinates are not persistent interchange contracts; semantic route facts, ownership, documented failures, and diagnostic codes are.

Applications that persist model JSON must store its contract revision themselves, for example:

```js
import { compileRoute } from "@subvertic/core";

const result = compileRoute('route Archive\nstart\nrappel pitch height=12m rope=24m\nexit');
if (!result.ok) throw new Error(result.diagnostics.map(item => item.message).join("\n"));
const envelope = { contract: "vrl/model", revision: 1, model: JSON.parse(result.json) };
console.log(envelope.model.elements[1].id); // pitch
```

This envelope is application-owned, not a new VRL import/export API. VRL has no general JSON deserializer/schema validator: `JSON.parse` and TypeScript annotations do not validate untrusted saved data. Retain source and recompile when adopting a new model revision; do not send a normalized model back through `normalizeRoute`. See the existing [extension-field migration](domain-model.md#failure-determinism-and-compatibility).

## Typed records

Import types from the owning package root using `import type`. The declarations in each published `src/index.d.ts` are the detailed field/signature reference, including every advanced helper. The following records form the supported data vocabulary:

| Owner | Types | Meaning and preconditions |
| --- | --- | --- |
| Core | `RouteAst`, `RouteElementAst`, `ParsedRouteAst`, `SourceMap`, `SourceSpan`, `LexToken` | Raw decoded strings and recovery syntax, not semantic validity. Parser ASTs always contain `source` and `sourceMap`; programmatic ASTs may omit them. Names may be null in recovery. [Syntax provenance](diagnostics.md) uses one-based UTF-16 coordinates and exclusive span ends. |
| Core | `Measurement`, `Inclination`, `Redirection`, `RouteElement`, `RouteModel`, `RouteSummary` | Validated known fields, separate string extensions, meters/percent units, normalized identities. `RouteElement` narrows by type: a rappel requires height and rope, a climb requires height. `anchor_count` remains integer **text**. [Domain constraints](domain-model.md) still require runtime validation. |
| Core | `Traversal`, `TraversalPoint`, `TraversalSegment` | Physical progression and explicit technical ownership, with annotations outside that progression. A connection has no element owner/direction and zero vertical delta; a technical segment has an owner, direction, and signed rise (positive for climbing) or null if unmeasured. |
| Core | `RouteLayout`, `LayoutPoint`, `LayoutNode`, `LayoutSegment`, `LayoutOptions` | Positioned traversal plus one node per element. Implicit boundary points have null element/index/id. Technical pixel deltas are downward-positive, unlike domain elevation deltas. Elevation fields are optional. [Layout contracts](api-reference.md#technical-traversal-and-geometry-validation) describe geometry constraints. |
| Core | `Diagnostic`, `BuiltinDiagnostic`, `RelatedLocation` | Error/warning severity, kind, message and positive source point; optional code/span/related locations. Built-in diagnostics include suggestion text. Custom ports may omit it and use their own kind/code strings. Use codes, not messages, for programmatic matching. |
| Core | `CompileResult`, `CompileOptions`, `CompilerPorts`, `CompilerOverrides`, `RouteCompiler` | Discriminated success/failure, synchronous ports, finite numeric output, processing budgets. [Port contracts](compiler-ports.md) specify stage order, override defaults, errors, and ownership. |
| SVG | `RenderOptions`, `Theme`, `RenderLayout`, `TopoScene` | Validated paint/layout inputs and advanced prepared presentation records. Optional points support historical caller-built layouts. [Scene records](rendering-scene.md) are inspection data, not persisted domain facts. |
| Diagram | `DiagramOptions`, `DiagramState`, `WarningDisplayOptions` | Combined compiler/renderer settings; a failed state has null derived values and an empty SVG. [State contracts](diagram-state.md) define precedence, escaping and caching responsibilities; [warning display settings](warning-presentation.md) belong to adapters, not compiler/render options. |
| Adapters | `VrlDiagramProps`, `VrlMarkupOptions`, `VrlLoadOptions`, `ReactFactory` | Framework-owned props, wrapper settings, async loader providers and the component factory port. Svelte subpaths export their typed default component. |

`ElementView` and `RouteView` describe the broader inputs of low-level helpers, including historical manually supplied records. They are not evidence that a value passed domain validation. Individual token parsers return `{ ok: true, value }` or `{ ok: false, reason }`; a successfully converted token can still violate a field's semantic range. Parsed redirection side text, for example, is unrestricted until normalization.

```ts
import { compileRoute } from "@subvertic/core";
import type { RouteModel } from "@subvertic/core";
import { renderTopoSvg } from "@subvertic/render-svg";

const result = compileRoute('route Typed\nstart\nrappel pitch height=12m rope=24m\nexit');
if (result.ok) {
  const route: RouteModel = result.model;
  console.log(renderTopoSvg(route, result.layout, { theme: "dark" }));
} else {
  // model, layout, and json are all null here.
  console.log(result.diagnostics.map(item => item.code));
}
```

## Overrides and failures

Partial `createRouteCompiler` overrides must preserve the default AST/model/layout types because omitted stages still use built-in implementations. Custom shapes require a complete `CompilerPorts<A, M, L, O>` set: AST, model, layout, and layout-option types respectively. This prevents a custom normalizer from accidentally feeding unrelated records into the default layout/export pipeline. Both composition functions retain their legacy optional/default geometry port at runtime; use complete wiring for custom shapes.

```ts
import { createRouteCompiler, parseVrl } from "@subvertic/core";
import type { CompilerPorts, RouteAst } from "@subvertic/core";

const ports: CompilerPorts<RouteAst, { title: string }, { title: string }, { prefix: string }> = {
  parse: parseVrl,
  validate: ast => ast.name === null
    ? [{ kind: "custom", severity: "error", message: "Missing name", location: { line: 1, column: 1 } }]
    : [],
  normalize: ast => ({ title: ast.name ?? "" }),
  validateGeometry: () => [],
  layout: (model, options) => ({ title: (options?.prefix ?? "") + model.title }),
  exportJson: model => JSON.stringify(model)
};
const compile = createRouteCompiler(ports);
const result = compile("route Custom", { layout: { prefix: "Topo: " } });
if (result.ok) console.log(result.layout.title); // Topo: Custom
```

Custom port records must be synchronous plain objects. Types reject Promise-returning ports, but cannot prove object prototypes, dense arrays, finite numbers, positive integer budgets, valid paint syntax, or cross-field relationships. Runtime guards remain authoritative. Custom parser ASTs still need the processing-limit envelope (`metadata`, `elements`, and each element's raw `attributes`). A budget failure before parsing returns the ordinary empty recovery AST, not a custom parser's additional fields; the failure union reflects this.

| Situation | Observable behavior |
| --- | --- |
| Malformed/semantically invalid source, exceeded processing budget, blocking geometry diagnostic | `ok: false`, diagnostics retained, model/layout/JSON null; diagram SVG empty |
| Warnings without errors | Success, diagnostics retained and rendering continues |
| Wrong source/configuration type, unknown layout/limit/theme token, malformed port result | `TypeError` when that boundary is reached |
| Unsupported numeric magnitude/range, invalid direct normalization invariant, inconsistent direct layout | `RangeError` |
| Malformed input to `tokenize` or `stripComment` | `SyntaxError` with a diagnostics array |
| Exception thrown by a supplied port | The same exception propagates; it is not converted into a source diagnostic |

`validateRoute`/`validateElement` expect well-shaped raw syntax records and report semantic problems; they are not general guards for arbitrary JavaScript values. Direct normalization checks its raw structural inputs before domain invariants. Direct layout requires a normalized/compatible model and valid geometry; `computeElevationLayout` additionally requires both endpoint elevations. Direct renderer helpers require their documented prepared inputs and do not repeat every facade guard. Compiler stages short-circuit: source failure may occur before layout/renderer options are inspected.

`exportRouteJson(RouteModel)` returns a string. Its broader legacy overload accepts other JavaScript values with native JSON behavior: undefined/function/symbol roots may return undefined; cycles and BigInt throw; `toJSON` methods run. Its replacer rejects unsupported numeric values. The compiler exporter port must always return a string, though a custom exporter may choose a non-JSON format.

## Identity, mutation and provenance

Explicit element IDs are case-sensitive and unique across the route; preserve them for references that must survive editing. Generated IDs are repeatable for unchanged ordered input, but insertion, removal, reordering or explicit reservations can renumber them. Array indexes, layout positions and object identity are not persistent identifiers. Equal compilations have equal data, not shared object references.

Normalized models detach maps, values, lists and source points from the AST. Layout elements refer to the input model's elements; positioned segments share their endpoint records with layout points. Diagram state reuses its compilation's records. These compilation outputs are mutable; editing a model does not recompute a previously created layout or SVG. Recompute downstream stages after changing data. `normalizeElement(element, counters)` intentionally updates caller-owned counters and cannot enforce route-wide uniqueness. Shared theme/symbol/localization definitions are frozen as described below. Scene records remain read-only by convention, without runtime freezing.

AST source text and source maps are excluded from model JSON. An element's `sourceLocation` is retained when present, and omitted from JSON when undefined. Adding a comment or whitespace can therefore change serialized JSON without changing route facts or explicit IDs. Consumers hashing semantic content must deliberately project out provenance; do not treat byte equality as route identity. JSON export preserves native property insertion order and array order; it does not promise canonical key sorting across independently constructed equivalent records.

## Rendering definition ownership

Exported `LIGHT_THEME`/`DARK_THEME`, resolved symbol profiles, and localization records are shared and frozen, including nested `elements` and `values` dictionaries. Their declarations are read-only. Strict-mode mutation attempts throw `TypeError`; reflective writes return false. In non-strict code, assignments/deletions may fail silently but cannot change a shared definition. Dictionary lookups consider own keys only: inherited names fall back or remain literal text instead of exposing prototype objects.

Use per-call `themeTokens`, `theme`, `language`/`locale`, and registered `symbology` selections. `resolveTheme` deliberately returns an owned, mutable copy. There is currently no custom symbol/localization dictionary option; copying those dictionaries supports application-owned UI only. Shared definitions have no mutation-based customization hook.

```js
import { createDiagramState } from "@subvertic/diagram";
import { DARK_THEME, resolveTheme } from "@subvertic/render-svg";

const localTheme = resolveTheme("dark", { water: "#176f91" });
localTheme.terrain = "#c8be9c";
const diagram = createDiagramState('route Custom\nstart\nrappel pitch height=12m rope=24m\nexit', {
  theme: "dark", themeTokens: localTheme, language: "es", symbology: "spanish"
});
console.log(diagram.ok); // true
console.log(resolveTheme("dark").terrain === DARK_THEME.terrain); // true
```

Previously unsupported writes to shared definitions could affect subsequent consumers. They now fail; migrate any such writes to explicit options or owned copies. This enforces the earlier read-only convention without changing record fields, existing export names, valid SVG output, or revision 1 AST/model/layout/diagnostic serialization. Unknown prototype-property selectors now follow the documented unknown-name fallback. The stricter runtime and declaration behavior must be noted in the next package release.

## Warning presentation and wrapper migration

Successful React, Svelte, SvelteKit, and string-markup diagrams now display warning diagnostics alongside their SVG by default. `showWarnings: false` suppresses only the panel. The added optional `warningsClassName` and `warningsLabel` props control CSS and the accessible name. These UI props do not belong in compiler/renderer options or change the state/diagnostic contract.

`diagramWarningText` is an additive stable export for the same pure warning selection. Custom presentations can use it or consume diagnostic records directly:

```js
import { createDiagramState, diagramWarningText } from "@subvertic/diagram";
import { renderVrlSvelteMarkup } from "@subvertic/svelte";

const diagram = createDiagramState('route "Short rope"\nrappel height=10m rope=5m');
const text = diagramWarningText(diagram);
const html = renderVrlSvelteMarkup("", {}, { diagram, warningsLabel: "Route warnings" });
if (!diagram.ok || !text.includes("Rope length is shorter") || !html.includes('role="status"')) {
  throw new Error("Expected nonblocking warnings beside a successful diagram");
}
if (diagramWarningText(diagram, false) !== "" || diagram.diagnostics.length !== 1) {
  throw new Error("Hiding warnings must retain diagnostic data");
}
```

Warning-only output gains an outer wrapper around the existing image and new warning panel. Image props stay on the image container. Review CSS/root-element assumptions, or disable the panel when supplying your own warning UI. Custom implementations of the structural `ReactFactory` port must accept element children as well as text for the nested panel; React itself already supports both. Clean success, failure markup, and all revision 1 state/AST/model/layout/diagnostic records remain unchanged. Schedule this display change and additive API for the next minor package release; no persisted-data migration is needed. See the [full policy and verification limits](warning-presentation.md).

## Verification and migration for contract revision 1

The revision baseline introduces declarations without changing persisted data shapes. Additions and display migrations are recorded above; existing entry points and state factory signatures remain available. No data migration is required. TypeScript consumers should handle the `ok` union and optional fields, keep extension strings in `extensions`, and supply complete custom ports when changing pipeline shapes. JavaScript users may import the same types in JSDoc.

`make check` runs positive/negative consumer type checks, behavioral tests with coverage thresholds, package dry runs, and an isolated consumer check using actual tarballs. Negative fixtures must keep producing errors (`@ts-expect-error` fails if an invalid call becomes accepted). Checks exercise real React/Svelte types, custom ports, null failure outputs, units, required fields, configuration mistakes, exception behavior, saved model compatibility, identity and provenance effects. Packed checks preserve locked dependency resolutions, replace workspace links with the tarballs under test, and run `npm ci --offline` with the configured npm cache. No registry metadata or registry access is needed after dependency installation.

Each behavioral test uses one assertion. Coverage remains a 100% target, supplemented by explicit expected facts, deliberate failures, export/declaration inventory checks, and a saved revision 1 model fixture. Changes to that fixture require a compatibility explanation, not automatic snapshot regeneration.
