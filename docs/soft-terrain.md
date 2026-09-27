# Soft-terrain canyon style

Set `options.style: "soft-terrain"` on `renderTopoSvg`, `computeTopoScene`, or a diagram/framework state factory. Omission, `undefined`, and `"classic"` retain the existing renderer. Other values, including `null`, throw `TypeError` before rendering. This is a renderer option, not a DSL field or a compiler layout option.

The style is an optional next-minor addition. It preserves the source, normalized model, JSON, traversal ownership and layout measurements. It adds no runtime dependencies. Existing fragment helpers retain their classic behavior; use the complete renderer for soft terrain. A supplied precomputed `diagram.svg` is still used as-is, so changing options does not restyle that cached SVG: recompile the state.

## Meaning and visual rules

| Representation | Meaning and limits |
| --- | --- |
| Neutral contour and subtle ground wash | Continuous schematic terrain through the canonical layout points. It is not surveyed geology or evidence of an overhang. |
| Thin directed technical curves | The owning segment supplies its start, end, direction and signed pixel delta. Arrows follow traversal, including climbs. Curvature does not measure rope length or assert free-hanging equipment. |
| Technical labels | Element ID and declared height first; declared rope, anchor type and complete anchor count follow. Missing anchor type/count remains unknown; an unmeasured downclimb is labeled with unknown height. Rope values are supplied declarations, not calculated equipment requirements. |
| Stages and redirections | Exact supplied labels follow the same curve. Stage positions use the declared stage total; redirections use distance/height. Existing 5–95% endpoint clearance and compiler warnings remain. |
| Pool outline, light fill and wave cue | Fixed symbolic basin size, independent of depth/type. Missing or explicit unknown type is labeled as unknown depth. Waves indicate water, not current, measured depth or mandatory swimming. Explicit dry type/flow removes fill and waves but retains the outline and condition text. |
| Notes and hazards | Technical, pool and walk notes remain attached to their owning elements; hazard notes retain their annotation position. Anchor overflow still shows the full count plus the existing capped marks. |

All technical shapes (`ladder`, `direct`, `slab`) use the directed curve in this style. These source hints remain in the model. The classic style still honors their historical presentation. Soft terrain has no ladder rungs; a shape hint is not a statement that a physical ladder exists.

## Compatibility and failure

Both themes and existing theme-token overrides apply. Terrain uses `terrain` at 0.45 opacity, the contour uses `mutedText`, and the curve uses `routeLine`. The summary uses `panel` rather than the classic green fill. Pool fill uses `water` at 0.16 opacity; its wave cue also works without relying on fill color.

English/Spanish language selection and federation/French/Spanish text-symbol profiles keep their existing precedence. Style explanations appear in the localized legend and accessible description. Existing symbols and namespace handling remain; selected icons are available through `symbols: "annotations"`; see [annotation modes](annotation-icons.md). The optional icon modes are not required to use this style.

Source errors retain the compiler's diagnostics and suppress derived output. Rendering still requires validated normalized input and a canonical segment layout. Contradictory supplied technical direction/delta (including zero) throws `RangeError`; nonfinite geometry is rejected. The style never repairs domain data or reassigns ownership from neighboring labels. Configuration errors propagate through the framework adapters.

Soft-style label blocks move right to clear nearby symbol envelopes, rewrapping until clear; their leader lines preserve association. This is symbol clearance, not general route-path collision avoidance. The final SVG grows to fit all prepared primitives and labels. Requested width is a minimum, not a guarantee of readability when the image is scaled down to that width. Small-screen continuation layouts remain [#37](https://github.com/OneTesseractInMultiverse/vrl/issues/37); print and broader accessibility evaluation remain [#38](https://github.com/OneTesseractInMultiverse/vrl/issues/38). Custom fonts/CSS need independent visual review.

## Reproducible comparison

The [fictional two-rappel source](../examples/soft-terrain-canyon.vrl) declares entry, an 18 m rappel with 40 m rope and two bolts, an unknown-depth pool, a 120 m walk, a 12 m rappel with 30 m rope and a tree anchor, a slippery landing, and exit. The tree anchor's count is unspecified. The [independent fact inventory](../tests/fixtures/soft-terrain-canyon.json) is authored separately from renderer output.

| Export | Purpose |
| --- | --- |
| [Classic, light](assets/soft-terrain/classic-light.svg) | Existing default on the same source. |
| [Soft terrain, light](assets/soft-terrain/soft-light.svg) | Contour, curves, uncertainty and declared measurements. |
| [Soft terrain, dark](assets/soft-terrain/soft-dark.svg) | Same facts with the dark theme. |
| [Annotated, Spanish](assets/soft-terrain/soft-annotated-es.svg) | Adjacent descent/ascent, missing downclimb height, seven anchors, stages, redirection, notes and dry pool. |

![Soft-terrain fictional canyon](assets/soft-terrain/soft-light.svg)

Generate from the reviewed [profiles](../examples/style-gallery.json) with `node scripts/render-style-gallery.mjs`. Open the SVG files directly in a browser for full-size visual review. Review source facts, arrows, station association, labels and clipping before accepting changed baselines; CI compares exports with blank-line indentation removed but never regenerates them. Browser font/rasterization differences are not encoded as pixel snapshots.

Behavioral tests compare independent facts, exact labels, canonical motion, complete primitive bounds, option failures and deterministic output. Selected mutations must detect reversed curves, missing stages, changed anchor counts and invented pool depth. Packed React, Svelte and SvelteKit consumers verify SSR, hydration and style changes.

This implements the preferred direction in [#35](https://github.com/OneTesseractInMultiverse/vrl/issues/35), contributing fixtures to [#29](https://github.com/OneTesseractInMultiverse/vrl/issues/29). Practitioner comprehension testing under [#34](https://github.com/OneTesseractInMultiverse/vrl/issues/34) remains pending. The style is not a validated canyoning standard, and adopting it as the default requires a separate decision.
