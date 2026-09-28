# Explicit swimming in an ordered canyon itinerary

Use `swim` to record swimming explicitly, independently of a pool feature. A swimming entry has its own identity and optional supplied metric distance. A pool's depth or `type=swimmer` never creates a swim entry. This is an unreleased, bounded addition intended for the next minor release.

```vrl example=explicit-swimming kind=document
route "Synthetic aquatic itinerary"
start S1
pool P1 depth=2.5m type=deep
swim SW1 distance=12m flow=low note="Supplied example"
hazard H1 type=slippery
rappel R1 height=4m rope=8m
walk W1 distance=6m
swim
exit E1
```

The [synthetic executable example](../examples/canyon-swim.vrl) has a 2.5 m pool depth, a distinct 12 m swim, a 4 m rappel, a 6 m walk and an unmeasured swim. It succeeds without warnings. The pool's depth is not the swim's length; their adjacency establishes order, not a typed feature association. No route conditions or suitability are asserted by these fictional values.

## Language and normalized meaning

`swim [id] [attributes]` follows the existing element grammar, quoting, source-span, order and duplicate-key rules. Generated IDs use the separate `SW` prefix, with whole-document explicit-ID reservation. A quoted identifier retains its decoded literal text. Flow uses the existing element vocabulary; notes and unrecognized/inapplicable fields remain string extensions. In particular, `depth` and pool `type` are not swim attributes and do not supply pool meaning.

Distance, when present, is a positive metric from `0.000001m` through `1000000000m` with at most six fractional digits. Omission stays absent and descriptions say unknown. Unlike required rappel declarations and optional pool depth, swim distance does **not** accept the string `unknown`; omit it for missing information. Zero, negative, empty, nonmetric, scientific, nonfinite, overprecise and overflowing values fail with located existing field diagnostics. Duplicate attributes/IDs, invalid flow and illegal document order also fail. Compilation returns no model/layout/JSON on blocking errors; direct normalization enforces domain invariants.

The normalized element is `type: "swim"`, with optional `attributes.distance: Measurement`, existing applicable known fields and separate extensions. The element records a supplied movement mode, not a recommendation. Neither a nearby pool, a swimmer icon, a flow observation nor prose adds this mode automatically. No new feature reference, alternatives, water-current model or claim provenance is introduced.

## Traversal, profiles and totals

Swimming occupies an ordered nontechnical progression point, like walking. Existing connections join progression points; they do not gain a swimming owner, surveyed endpoints or measured swim elevation. Technical segments retain their rappel/downclimb/climb owners and signed deltas. Notes and hazards remain attached to the reached boundary and do not become physical segments.

A connection's canonical zero delta means no declared technical rise/descent under the existing traversal contract; it does not prove level water or a measured swimming elevation. With complete entrance/exit elevations, the existing layout may distribute a residual across connections and emits `VRL_GEOMETRY_ELEVATIONS_ESTIMATED`. Those coordinates remain estimates. Swimming distance never supplies this vertical change or alters its distribution.

Legacy `totalDistanceMeters` and explicit `summedWalkDistanceMeters` continue to count only recorded walks. Swim lengths remain on their own elements; this change adds no swim-total or combined-route-total field. A declared total-distance comparison still uses only known walks and cannot establish completeness. Rope observations are unaffected.

## Visual and accessible representation

English/Spanish titles and distance labels distinguish swimming from walking. Missing distance stays visibly unknown. Classic and soft-terrain views retain distance, flow and note; row output includes a directed zigzag and an explicit compressed-swimming-distance label. All lengths and widths are schematic. Full SVG descriptions and HTML alternatives say swimming and give its distance without calling it walking or pool depth.

`SW` is a project abbreviation in every symbol profile, with a legend entry; it is not a federation standard. `symbols: "icons"` maps explicit swimming to the existing transparent swim pictogram. The older pool `type=swimmer` icon mapping is preserved for compatibility, so text/type remain necessary to distinguish feature from movement. The five-role annotation-icon pilot is unchanged. Monochrome keeps text and directed compression cues independently of color.

The gallery includes [English icon rows](assets/visual/swim-icons-320.svg) and [Spanish monochrome rows](assets/visual/swim-mono-es-320.svg). Browser export checks inspect real transformed icon bounds; primitive-only XML bounds tests cannot interpret relative icon paths/transforms and are limited to non-icon variants.

## Compatibility and architecture

Inventory revision **5** records AST revision **2** and normalized-model revision **5** for the expanded closed `ElementType` union. Traversal, layout, diagnostics, compiler and diagram structures retain revision 1. Update exhaustive switches, element maps and readers before accepting `swim`; older readers cannot interpret it. Existing valid source retains model/summary meaning. Legends and generated presentation artifacts now include the new vocabulary. Prior inventories remain available, and a pinned revision-4 pool fixture verifies unchanged JSON and feature meaning.

Applications store model revision 5 in their own envelopes; JSON has no added schema-version field. Retain source for migration. This requires a minor package release before 1.0; this implementation does not publish or change package versions. The [public contracts](public-contracts.md) include a typed example.

Domain vocabulary owns the new discriminator and ID prefix; existing field policy owns numeric validation. Parser and validation adapters retain their existing roles. Application coordination, traversal, summaries and export ports are reused. Renderer computations own labels/compression; the icon package owns the mapping/artwork. No new runtime dependency, general movement graph or external-tool importer is introduced.

## Evidence, alternatives and limits

The [FFME canyon practice page](https://www.ffme.fr/montagne-canyon/canyon/pratiquer-canyon/), accessed 2026-09-28, describes pools and other terrain separately from progression methods including swimming and walking. This is vocabulary evidence, not a standardized DSL or a measured route case.

The engineering decision compares three representations: retain swimming only in prose (no validated movement identity/distance), infer it from pool category (invents a choice), or add an explicit optional-distance itinerary entry. Adopt the third within the existing linear contract. Synthetic cases and deliberate lost-meaning failures support implementation fidelity only; no new real-canyon measurements, practitioner timings or comprehension findings are claimed. The earlier Davis experiment remains pinned to its historical baseline.

Follow-up work needs source-backed aquatic cases, location/date/conflict evidence, movement-to-feature references and actual reader evaluation before broader graph or observation semantics. Jumping, sliding, independent traverses, alternatives/escapes and cave expansion remain separately scoped.
