# Canyon visual specification — revision 1

The [reviewable gallery](assets/visual/index.html) defines optional canyon presentation for the current element vocabulary. Its six fictional sources and thirteen selected views cover all nine element kinds, all anchor/station/pool categories, flow and hazard severity levels, three classic technical shapes, adjacent ascent/descent, full anchor counts, stages/redirections, long multilingual text, narrow rows, dark color and monochrome. These are controlled design and regression cases, not observations of real canyons.

The inventory is [versioned JSON](../tests/fixtures/visual/catalog.json) with explicit source fingerprints, ordered types, signed technical changes, required facts and expected warning codes. Renderer/icon baseline is commit `40b981848f6ca51590ee01d053ea87b068b7ce34`; subsequent artifact revisions are identified by their enclosing Git commit. Package version alone does not identify an unreleased visual baseline. The first-party icon geometry and mappings remain owned by `@subvertic/vrl-icons`.

## Visual hierarchy and interpretation

| Layer | Contract and limits |
| --- | --- |
| Progression | Source order and canonical movement determine reading order. Arrows follow descent/ascent, including adjacent technical owners. A curve is schematic; its apparent angle/length is not a measurement. |
| Terrain | Soft terrain is the preferred optional style. Its contour separates terrain from the route; a faint wash is decorative. Rows use a dashed contour distinct from solid directed ropes. The wash can disappear in print without losing meaning. |
| Water | Fixed symbolic pool outline and a wave identify water without relying on blue. Dry states remove water cues; categories such as deep/swimmer are not measured depth or a required maneuver. Keep measured depth unknown where no measurement exists. |
| Technical shapes | Classic `ladder`, `direct` and `slab` remain compatible drawing choices. Legacy ladder rungs do **not** assert the presence of a physical ladder. Soft terrain replaces these with schematic directed curves; a future physical-ladder concept requires domain evidence and separate syntax. |
| Stations/anchors | Full station words distinguish left/right/center/floor/tree/natural/unknown; row lateral ticks occur only for left/right. Type and full declared count remain text. Capped marks/overflow are shorthand, never inferred inventory or surveyed placement. |
| Internal technical marks | Stage ticks and redirection diamonds belong to their technical owner. Exact lengths, sequence and sides remain text even when close marks coincide schematically. Connector spacing is excluded from the technical measurement. |
| Labels | Element identity and physical height lead; declared rope, anchor details and annotations follow. Height, signed vertical change and declared rope have distinct labels. Neither counts nor equipment requirements are inferred from pictograms. |
| Leaders/clearance | Continuous soft-style label blocks reserve symbol envelopes and can move right with leaders. This is not a universal collision solver. Rows keep complete technical sections and put ordered details beneath them. |
| Distances/continuations | A zigzag explicitly compresses walking distance while retaining its declared length. Matched continuation codes name both source and destination sections. Row breaks are reading devices, not new route events or branches. |
| Icons | Optional entry/exit/bolt/tree/slippery pictograms complement factual labels. Unknown or unsupported mappings keep text instead of a guessed icon. Minimal mode retains positions and facts. Artwork is transparent and decorative for accessibility. |
| Legend | Explain abbreviations, categories and project reading cues in the selected language. It is on by default; suppress it only when the embedding surface explains the same meanings. |
| Name/description | The SVG owns one named image with the complete ordered description. External images need an HTML alternative; the gallery supplies one per card. Source facts remain identical across width/theme/icon choices. |

The gallery deliberately shows missing anchor counts, unknown pool depth and one unmeasured downclimb. Its warning `VRL_GEOMETRY_HEIGHT_REQUIRED` is displayed with the long-route case; the missing height is neither zero nor a discarded element. Other fixtures compile without warnings. Synthetic count/type combinations exercise presentation and are not recommendations for station construction.

## Supported presentations and constraints

Classic continuous output remains the default. Soft terrain, selected icons, rows and monochrome remain explicit options. This preserves existing documents and avoids treating a stated style preference as comprehension evidence.

[Row layout](row-layout.md) provides 14-unit body/16-unit heading text, 24-unit icon slots and an exact 320–2048-unit width; content grows vertically and intrinsic minimum width prevents forced shrinkage. Continuous profiles expand to fit and can become unreadable when callers scale them down. Long tokens/labels preserve their characters. Close technical marks can coincide, but their factual records stay distinct. General path/leader crossings, typography overrides and printer pagination are not solved by this specification.

[Monochrome output](accessible-output.md) defines the controlled light/dark palettes, minimum default contrast/strokes, valid option combinations and background-suppressed print procedure. Use light monochrome for white-paper print. Custom CSS or color overrides require separate review; the dark-screen theme is not a guarantee for backgroundless paper output. Invalid options, impossible row widths and resource/extent violations fail explicitly instead of silently clipping or dropping facts.

## Decisions and research boundary

| Decision | Status and evidence |
| --- | --- |
| Prefer soft terrain with selected icons for canyon exploration | Adopt as optional, based on recorded owner preference and semantic/geometry checks; not a reader-comprehension result. |
| Preserve all source facts independently of drawing | Adopt. Independent inventories, source-to-description checks and semantic mutations cover counts, direction, annotations and uncertainty. |
| Use complete sections and explicit continuation codes at narrow widths | Adopt as optional. Exact width, bounds, ordering and browser tests support this bounded policy; paper pagination remains separate. |
| Default to soft terrain or broaden icon vocabulary | Defer until [comparison #34](https://github.com/OneTesseractInMultiverse/vrl/issues/34) records practitioner interpretation and a compatibility decision. |
| Add jump, swim, slide, escape or cave-network meaning to recreate external artwork | Defer to [canyon scope #31](https://github.com/OneTesseractInMultiverse/vrl/issues/31) and source-backed research. A drawn feature or free-text note is not an adopted domain primitive. |

Reference inspiration is recorded in [issue #28](https://github.com/OneTesseractInMultiverse/vrl/issues/28): [Canyon Log's authoring workflow](https://canyonlog.org/canyon-topo-builder/) and [CanyonTopo](https://github.com/hcooper/CanyonTopo). Their artwork is not copied. Federation profiles use activity terminology; this project does not claim a federation-standard symbol set. The snake hazard pictogram and the contour/continuation conventions are explicitly project choices. See [symbology](symbology.md) for vocabulary references and scope.

Representative practitioner, assistive-technology and timed reading studies remain **pending**. Automated tests and visual inspection establish reviewable output, not safe current field conditions, recognition accuracy or usability superiority. Domain and normalized facts have one owner in core; presentation policy/scene computation, public icon geometry, SVG/HTML serialization and framework adapters remain separate. This gallery adds development tooling, no runtime dependency or domain geometry.

## Reproduce and accept a baseline change

```sh
npm run visual:check
npm run visual:build
node --test tests/visual-fixtures.test.js
```

`visual:check` is read-only and part of `make check`. `visual:build` generates **candidate** SVG/HTML changes and never updates approved source fingerprints or expected facts. Open the gallery, compare standalone exports at intrinsic size, and inspect the Git diff before committing. Review ordered facts and warning changes first, then direction, full labels, associations, bounds, non-color cues and the corresponding independent tests. Update inventory expectations deliberately when the source contract changes; do not copy parser results into expected facts. CI must never regenerate its own expected baselines.

[Export regression guidance](testing.md) distinguishes exact deterministic SVG comparisons from semantic oracles, browser observations and pending human evaluation. A screenshot alone is never acceptance evidence.
