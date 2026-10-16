# Explicit jumps in an ordered canyon itinerary

`jump [id] height=<positive metric|unknown>` records a supplied downward jump separately from pools, swimming and rope descent. Height is the vertical difference between departure and arrival, not horizontal range, pool depth or an inferred trajectory. This unreleased addition is intended for the next minor release; it does not prescribe a maneuver.

```vrl example=explicit-jumps kind=document
route "Synthetic jumps"
start "Entry"
jump J1 height=3m landing=pool phase=canyon flow=low
hazard H1 type=slippery note="Supplied observation"
pool P1 depth=2m
swim SW1 distance=12m pool_ref=P1
jump J2 height=unknown
note No landing association inferred.
walk W1 distance=5m phase=return
exit "Exit"
```

The [executable example](../examples/canyon-jumps.vrl) contains a measured 3 m jump and a jump of explicitly unknown height. The pool's 2 m depth, swim's 12 m distance and 5 m walking sum are separate supplied facts. The hazard follows J1 at its reached boundary; the note follows J2 at its reached boundary. No jump-to-pool link is implied by order or `landing=pool`. All facts are synthetic, not field measurements.

## Fields, identity and failure

Height is required. A measured height is strictly positive, at most `1000000000m`, with at most six fractional digits; `0.000001m` is the minimum positive declaration. Exact `unknown`, including its decoded quoted spelling, is retained as a string. Omission, zero, negative values, unsupported units, malformed numbers, excess precision and other sentinel spellings fail. Missing height uses `VRL_FIELD_REQUIRED`; malformed height uses `VRL_FIELD_MEASUREMENT_SYNTAX`; nonpositive measured height uses `VRL_FIELD_MEASUREMENT_RANGE`. Compilation failures have no model, layout or JSON. Direct normalization enforces the same field policy with `RangeError`.

Jump identifiers follow the existing quoting, exact identity, duplicate rejection and explicit-ID reservation rules. Generated IDs use the separate `J` prefix. Existing ID-like extensions do not set identity.

Known jump fields are **height, flow, phase and landing**. Flow and landing use their existing exact vocabularies; phase remains optional explicit membership. Other fields remain literal extensions, including `inclination`, `rope`, `anchor_count`, `shape`, `station`, `stages`, `redirection`, `redirections`, `distance`, `depth` and `pool_ref`. Their text appears as additional fields in complete descriptions but cannot scale jump height, establish rigging or resolve a pool relationship. Notes remain literal. This narrow scope deliberately differs from the legacy broadly applicable numeric fields on older elements.

Explicit unknown height produces `VRL_GEOMETRY_HEIGHT_UNKNOWN` at the value: a warning for schematic output and a blocking error with complete entrance/exit elevations. The following fails instead of deriving the missing height from the endpoints:

```vrl example=unknown-jump-profile kind=invalid
route Example
metadata entrance_elevation=10m exit_elevation=7m
jump J1 height=unknown
```

## Physical meaning and output

Every jump owns one downward `technical` segment. Here technical means an element-owned vertical event, not a requirement for rope. Known height produces exactly its negative vertical delta; unknown produces `null`. First, last and adjacent jumps retain their own segment, including synthetic boundaries when needed. Following notes/hazards remain at the reached boundary and add no physical motion. Complete measured profiles retain fixed jump deltas and existing endpoint consistency rules.

Jumps do not enter rappel counts/maxima, declared-rope observations or walking sums. A nearby pool, free-text note or icon never invents a jump. The supplied vertical height is not adjusted using inclination, pool depth, rope, distance or diagram pixels. Unknown physical motion is not zero; the legacy `technicalVerticalMeters` helper's zero fallback does not change canonical null semantics.

Classic output uses a directed straight schematic path without ladder rungs; soft-terrain and row output use existing schematic curves. These are progression cues, not ballistic trajectories or rope geometry. English `Jump` and Spanish `Salto` titles, measured/unknown height, flow, landing, notes and phase remain visible and available in complete SVG descriptions and HTML alternatives. Monochrome retains text and arrows. `J` is a project abbreviation in every symbol profile, not a federation standard. No jump pictogram is currently mapped; icon mode retains the labeled fallback.

The [English narrow view](assets/visual/jumps-color-320.svg) and [Spanish monochrome view](assets/visual/jumps-mono-es-320.svg) retain both measured and unknown jumps alongside independent pool/swim facts. Browser checks cover complete bounds and accessibility; visual preference is separate from comprehension evidence.

## Compatibility and architecture

AST revision **3** and model revision **8** extend the closed `ElementType` union with `jump`; update exhaustive readers, maps and switches before accepting new documents. `JumpHeightDeclaration` is `Measurement | "unknown"`, and concrete jump attributes expose only the scoped fields above. Earlier inventories and the pinned revision-7 pool-reference model remain available. Existing valid source retains its physical/model meaning; prose is never reinterpreted as a jump. Updated legends alter presentation bytes, not saved route facts.

Applications store the current contract revision in their own persistence envelope. JSON gains no version property. Keep source for migration, use current readers before accepting jumps, and follow the pre-1.0 minor-release policy. No package version changes or publishing occur in this slice.

Domain vocabulary owns J identity and movement classification; domain field specifications own requiredness and scope. Existing traversal, geometry validation and application ports are reused. Renderer computations consume canonical movement and prepare labels/paths; serialization and framework adapters remain separate. No runtime dependency, route-choice engine or new public runtime export is added. Functions retain coordinator/computation documentation.

## Evidence and decision

The [FFME canyon practice page](https://www.ffme.fr/montagne-canyon/canyon/pratiquer-canyon/), accessed 2026-10-16, lists jumping among progression methods and describes pools separately. That supports an explicit movement distinction, not this field schema, a surveyed route or a suitability rule.

Alternatives were prose-only carriage, inferring jumps from a pool/category, or an explicit measured/unknown vertical event. Adopt the last within the existing ordered itinerary: it preserves authored motion and uncertainty while keeping the feature and movement distinct. Synthetic cases, independent expected deltas, a removed-descent mutation and browser inspection establish implementation fidelity only. No practitioner timing/comprehension or new real-canyon measurement is claimed; the historical documentary experiment stays pinned.

Horizontal jump range, trajectory, jump-to-pool relationships, multiple alternatives, escape edges and partial conflicting observations need separate evidence and contracts. Sliding, independent traverses and caves remain deferred. A description of a candidate jump in prose remains an observation, not a selected itinerary movement.
