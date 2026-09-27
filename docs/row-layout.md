# Readable canyon rows

Use `flow: "rows"` with `style: "soft-terrain"` when a complete profile would otherwise need to shrink into an unreadable viewport. Rows use fixed readable type and grow vertically. The default remains `flow: "continuous"`; existing exports are unchanged unless rows are requested.

```js
import { createDiagramState } from "@subvertic/vrl-diagram";

const state = createDiagramState('route Example\nstart\nrappel R1 height=18m rope=40m anchor=bolts anchor_count=2\nwalk W1 distance=120m\nexit', {
  style: "soft-terrain",
  flow: "rows",
  symbols: "annotations",
  layout: { width: 320 }
});
if (!state.ok) throw new Error(state.diagnosticsText);
console.log(state.svg);
```

The same options pass through React, Svelte and SvelteKit. The renderer never reads a browser viewport or measures fonts through the DOM. A browser adapter can observe its container and explicitly pass a new width. Supplied diagram states retain their already-rendered markup; options do not rewrite a supplied state.

## Layout and reading policy

The initial policy dedicates one row to each progression element and keeps its following notes/hazards in that section. Leading annotations remain in the first section; annotation-only documents have one section, and empty routes state that no elements exist. The shared fictional canyon therefore has six sections at both 320 and 736 units. Width changes wrapping, not the canonical section order. This is an explicit section-per-row presentation, not automatic viewport detection or a compact multicolumn profile.

Each rappel or climb remains whole, with its original technical segment, physical direction, stage boundaries, redirections and station side. A short schematic curve shows traversal direction, ticks show internal stage boundaries, and diamonds show redirections. All stage lengths and redirection distances/sides are listed below their owning curve; close markers may coincide on the schematic while their ordered text records remain distinct. A row boundary never cuts the technical segment. Generic connections retain their canonical records; section boundaries and continuation arrows are reading cues, not new physical drops, branches or escape routes.

Read rows from top to bottom. Every boundary has exactly two markers: an outgoing `A ↓ Continue to section 2` and an incoming `A → From section 1`, for example. Labels advance deterministically through A–Z, AA, AB and onward; they are unique within the diagram. Each pair names its target/source section explicitly. Route element IDs, authored labels, source order and canonical annotation point references remain available independently of the display coordinates.

Walking lengths are compressed schematically and carry an explicit zigzag plus their complete supplied distance. The fictional fixture retains **120m**, two bolts, the tree anchor, 18m/12m physical heights, 40m/30m declared ropes, unknown pool depth and the slippery landing. Rope length is a declaration, not a computed equipment requirement. Physical points, elevations and signed technical deltas are retained from the core; pixel lengths and curves are not measurements.

## Readability, bounds and constraints

- Body, technical facts, continuation text and legend: **14 drawing units**; headings: **16**; pictograms: **24**.
- Text uses `ui-monospace, monospace`. Wrapping reserves 0.75 em for ASCII and 1.25 em per other UTF-16 unit through the shared bounds module. The conservative envelope accommodates wide fallback glyphs; supplementary characters are never split. Every text fragment preserves the original characters, including whitespace.
- Width comes from the supplied core `layout.width`: an integer from **320 to 2048**. Row height is content-driven; the core layout height is not a requested row canvas height. Set width to the intended display width; the ordinary compiler default still applies when omitted. The fitted SVG keeps that exact width and uses intrinsic minimum width rather than scaling down its text. A smaller host must allow horizontal overflow or request a supported smaller layout.
- Maximum **256 source elements**, **100000 characters in JSON.stringify(route)**, and **50000 drawing units of fitted height**. Existing compiler resource limits also apply. These limits bound the added presentation work; they are not new DSL limits.
- Unknown flow values, `null`, or rows without soft terrain throw `TypeError`. Unsupported widths, incomplete/mismatched canonical layouts, and resource/extent violations throw `RangeError`. Ordinary nonfinite/negative geometry and invalid XML/paint failures retain their existing behavior. Content is never truncated to fit.

Text grows vertically and long unbroken labels wrap. The scene includes complete text, icon, stroke, arrow, continuation and legend bounds using the same rectangle union and fitting owner as continuous diagrams. Row labels sit below their diagrams, so leader lines are unnecessary. `symbols: "annotations"` and `symbols: "minimal"` keep identical coordinates and text; the latter hides decorative pictograms. `symbols: "icons"` selects primary pictograms alongside the explicit element heading. All icon backgrounds remain transparent.

This policy prioritizes readable facts over short document height. It does not paginate for printers, optimize the number of sections, or establish practitioner comprehension. Complete accessible route descriptions and monochrome interpretation remain in [#38](https://github.com/OneTesseractInMultiverse/vrl/issues/38); human comparison remains in [#34](https://github.com/OneTesseractInMultiverse/vrl/issues/34).

## Scene and architectural contracts

The core continues to own traversal, technical ownership, physical measurements and canonical layout. Renderer modules separately own row constraints/grouping (`row-policy`), fact projection (`row-facts`), fixed-font wrapping (`row-text`), schematic geometry (`row-geometry`), scene coordination (`row-scene`) and SVG encoding (`row-serializer`). They use public core/icon APIs and add no runtime dependencies or DOM requirements. Inputs and shared registries are not mutated.

`computeTopoScene` returns `RowTopoScene` for literal `flow: "rows"`, and the existing `TopoScene` for absent/continuous flow. A dynamically typed `RenderOptions` value can produce either; use `"rows" in scene` to narrow before accessing flow-specific fields. Row scenes expose `rows`, full `traversal`, original `physicalPoints`, header/legend blocks and complete bounds. Each row retains source element indexes, annotation point references and its original canonical segments separately from drawing paths. This is a next-minor advanced presentation contract addition, with no persisted route JSON or grammar revision.

## Reproducible comparisons and evidence

`npm run rows:build` regenerates these exports; `npm run rows:check` rejects drift and runs in `make check`. `make render-assets` also regenerates both icon and row galleries.

| Fixture | Export |
| --- | --- |
| Fictional canyon, 320 units | [SVG](assets/rows/canyon-320.svg) |
| Same facts, 736 units | [SVG](assets/rows/canyon-736.svg) |
| Spanish minimal mode, dark, 320 units | [SVG](assets/rows/canyon-minimal-320.svg) |
| Stages, redirections and ascent, 320 units | [SVG](assets/rows/technical-320.svg) |

The [fictional canyon](../examples/soft-terrain-canyon.vrl) and [technical example](../examples/soft-terrain-annotated.vrl) remain ordinary supported VRL. Tests specify the complete ordered fact inventory and exact continuation pairs independently, inspect emitted primitive bounds, preserve Unicode and fixed font sizes, retain canonical points/deltas, and exercise malformed constraints and resource exhaustion. Controlled missing partners, duplicate codes, reversed sections, clipped text and lost compressed distance must fail their intended correctness assertions. Packed framework tests inspect actual text/icon bounds, font sizes, source order and continuation pairs in SSR and hydrated browser output at both widths.
