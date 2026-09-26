# Route summary meaning and provenance

VRL records route descriptions. It does not derive an equipment inventory or a complete route distance from partial measurements. Use `summarizeRouteMeasurements(model.elements, model.metadata)` to keep declared totals, computed partial observations and unknown values separate. The helper returns a new object; it does not replace `model.summary` or change persisted model JSON.

## Explicit measurement summary

| Field | Source and computation | Missing-data meaning |
| --- | --- | --- |
| `maximumDeclaredRopeMeters` | Maximum `rope.meters` among rappels only | `null` when no rappel rope is recorded |
| `declaredRopeCount` | Number of rappels with a recorded rope measurement | `0` is a known count |
| `rappelCount` | Number of rappel elements | `0` is a known count |
| `summedWalkDistanceMeters` | Sum of recorded `distance.meters` on walks only | `null` when no walk distance is recorded |
| `measuredWalkCount` | Walks contributing a distance to that sum | `0` is a known count |
| `walkCount` | All walk elements, including those without distance | Compare with `measuredWalkCount` to identify incomplete walk observations |
| `declaredTotalDistanceMeters` | `metadata.total_distance.meters`, unchanged | `null` when absent; never filled from the walk sum |
| `declaredTotalDescentMeters` | `metadata.total_descent.meters`, unchanged | `null` when absent; never filled from heights or endpoint change |
| `endpointElevationChangeMeters` | Entrance elevation minus exit elevation | `null` unless both are supplied; known level endpoints produce `0`, net ascent is negative |

The rope maximum does not add ropes, double rappel heights, account for rigging/retrieval, or infer anything from `traverse`, stages, anchors or a rope field on another element/metadata. A warning that a declared rope is shorter than height preserves that rope declaration; the maximum is not silently raised to the height. Valid normalized rappels always have a rope. The counts also disclose missing rope observations in historical compatible records passed directly to the helper.

The walk sum is a partial distance even when every walk is measured. It excludes height, traverse, rope, stages, and `distance` fields on pools, climbs, rappels or annotations. VRL has no rule establishing those measurements as disjoint contributions to a whole-route length. It does not infer an unrecorded approach, exit, horizontal projection or technical length. Matching a declared total to the walk sum does not prove completeness.

The helper expects normalized compatible records, as do other domain computations; it is not a general validator of untrusted models. Absent measurements produce unknown values. Present primitive/null measurements throw `TypeError`; unsupported numeric measurements or aggregate overflow throw `RangeError`. Source compilation already enforces units, applicability and numeric ranges. Use the compiler before summarizing source. Results use ordinary binary floating-point numbers: `0.1m + 0.2m` can produce `0.30000000000000004`, which remains the same when serialized.

## Conflicting totals

After successful semantic field validation, a declared `metadata.total_distance` smaller than the sum of recorded walk distances produces `VRL_TOTAL_DISTANCE_BELOW_WALK_SUM`, a nonblocking validation warning. Its source span points to the declared metadata value, including quotes, on the actual metadata line. Programmatic ASTs without source maps retain the standard line 1, column 1 fallback. Invalid fields block compilation and suppress this additional comparison rather than producing cascading or misleading warnings.

```vrl example=summary-distance-conflict kind=document
route "Distance observations"
metadata total_distance=20m
walk distance=15m
walk distance=10m
walk
rappel height=5m rope=10m traverse=8m
```

This succeeds with one warning: the declared total is 20 m and the two recorded walks sum to 25 m. The third walk is unmeasured. Both quantities remain in their original fields; the 8 m traverse and 5 m rappel are not added to the walk sum. The explicit helper reports three walks, two measured walks, and a maximum declared rope of 10 m. The shared diagram state retains the warning and still renders SVG.

Equality or a larger declared total produces no distance-conflict warning, including when some walks are unmeasured. Without a declared total or without recorded walk distances, there is no comparison. Absence is exposed by nulls/counts rather than inferred totals or an additional warning for every incomplete route.

Comparison uses temporary integer millionths of a meter from validated source spellings, shared with stage-total comparisons. `0.1m + 0.2m` exactly matches a declared `0.3m`; one millionth more warns. Those integers never enter normalized records or JSON. Source order and declarations are preserved.

```vrl example=summary-declared-only kind=document
route "Declared survey"
metadata total_distance=900m total_descent=200m
```

This has declared totals but no recorded walk or rope observations. Both observed aggregates are unknown in the explicit helper, even though legacy summary sentinels remain zero. No physical endpoints or equipment requirements are inferred. `total_descent` is retained as an author declaration, distinct from net endpoint change, especially when a route includes climbs. This change adds no comparison between those different quantities.

## Existing model and JSON compatibility

`model.summary` and `summarizeRoute` retain every revision 1 key, numeric value and zero sentinel. Existing models, layouts, saved JSON and renderers do not require a migration. These legacy fields mean exactly the following:

| Legacy field | Meaning |
| --- | --- |
| `numberOfRappels` | Count of rappel elements |
| `numberOfHazards` | Count of hazard annotations |
| `highestRappelMeters` | Largest declared rappel height; `0` if none. Not necessarily its vertical component. |
| `requiredRopeMeters` | Largest declared rappel rope; `0` if absent. Despite the legacy name, not an equipment requirement. |
| `totalDistanceMeters` | Sum of recorded walk distances only; `0` if none. Ignores metadata totals and other lengths. |
| `entranceElevationMeters` | Declared entrance elevation, or `null` |
| `exitElevationMeters` | Declared exit elevation, or `null` |
| `totalElevationChangeMeters` | Entrance minus exit when both are declared; otherwise the legacy `0` sentinel. Not cumulative descent. |

The ambiguous rope and distance names are deprecated in the declarations. New consumers should use the explicit helper and handle nulls. Do not interpret the old zero sentinel as proof that no rope or walking is involved. A helper result may be serialized separately by an application; it is not automatically embedded in the route model.

The additive export and warning are intended for the next minor package release. Contract revision 1 remains applicable: no existing field changes meaning/type, and previously valid sources remain successful. A previously silent conflicting total now produces a warning and therefore may show the default framework warning panel. Consumers that match diagnostics should handle the new code; see [public contracts](public-contracts.md) and [warning presentation](warning-presentation.md).

Domain computations own observed aggregates and the exact partial-total comparison. Validation translates the comparison into a located warning; compiler/application code only coordinates the existing ports. Renderers and framework adapters retain their existing data and presentation responsibilities.
