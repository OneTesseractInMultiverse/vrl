# Explicit unknown rappel height

A documented rappel can have no supplied physical height. Use the exact `height=unknown` declaration to preserve that uncertainty. Model revision 3 supports this on rappels; missing height is still an error. This is unreleased behavior intended for the next minor release.

```vrl example=unknown-rappel-height kind=document
route "Synthetic unknown height"
rappel R1 height=unknown rope=20m anchor=bolts
```

This succeeds with `VRL_GEOMETRY_HEIGHT_UNKNOWN`, a nonblocking warning pointing to the `unknown` value. Normalized attributes and JSON retain `height: "unknown"`. Its canonical technical segment still belongs to R1 and points downward, but `verticalDeltaMeters` is **null**. The independent 20 m rope declaration is retained; it does not supply physical height. See [the executable example](../examples/canyon-unknown-height.vrl).

## Recorded facts and schematic geometry

The compiler produces a schematic layout without assigning a physical elevation profile. Pixel spacing is presentation geometry. It cannot be read back as height, descent, or rope length. Source order, adjacent technical owners and reached annotations follow the existing traversal rules. Inclination, traverse length, anchors/counts, station, landing and notes remain independent supplied facts; none fills the unknown height. Rope can itself be numeric or explicitly unknown, with its own warning.

Classic and soft-terrain output display explicit localized unknown-height wording. Narrow monochrome rows and English/Spanish SVG descriptions and HTML alternatives retain unknown physical height and unknown vertical change. Framework components keep successful diagrams and the warning panel together.

Both entrance and exit elevations request a measured profile. An unknown technical height then causes a blocking `VRL_GEOMETRY_HEIGHT_UNKNOWN` **error**, even if the endpoints are equal, match a rope declaration, or have intervening walks that could absorb a residual. No model, layout or JSON is returned by the compiler on that failure. One endpoint alone does not establish a complete profile. Direct normalization preserves facts but does not validate profile feasibility; call `validateGeometry` or use `compileRoute` for that check.

## Proper failures and current limits

Only rappel height gains this sentinel. Climb height remains required numeric; downclimb may omit height under its existing contract but does not accept explicit `unknown`. Metadata and other elements retain their metric height rules. Quoted `"unknown"` decodes identically. Empty, zero, negative, nonmetric, uppercase or padded values are invalid, and height/rope declarations cannot be omitted.

`stages`, `redirection` and `redirections` on an unknown-height rappel cause `VRL_DETAIL_REQUIRES_KNOWN_HEIGHT`, located on each offending field. Their measured positions cannot be checked or drawn against an unknown physical extent. This rule is owned by the domain and also enforced by direct normalization. Retain such unpositioned documentary evidence in a note until a separate partial-detail contract is adopted; do not sum stages or use a redirection distance to invent a total height. Known-height rappels keep the existing stage-total warnings and redirection-range checks.

Legacy summaries retain their shapes and numeric sentinels. `highestRappelMeters` is the maximum **known supplied** rappel height; it is 0 if none is numeric and is a partial observation when any height is unknown. It does not describe an unknown rappel as zero height. Inspect the retained height declarations before interpreting that maximum. Rope observations remain governed by their independent declarations and [summary policy](route-summary.md).

## Compatibility and ownership

Normalized-model revision **3** widens rappel height to `RappelHeightDeclaration = Measurement | "unknown"`. TypeScript readers must narrow before accessing `.meters`. The concrete `RouteElement` type also rejects positioned stage/redirection fields alongside an unknown height. Broader helper views remain caller-validated inputs; types do not validate saved JSON.

AST, traversal, layout, diagnostic and application contracts retain revision 1: traversal already admits null technical deltas and schematic layouts already omit measured elevation profiles. Revision-1 fully measured fixtures and revision-2 unknown-rope documents remain supported. Retain their original versioned inventories; write the current model revision (now 5 for [swimming](swimming.md)) in application-owned envelopes for newly compiled models. Upgrade readers/renderers before supplying unknown heights, retain source for recompilation, and follow [the public migration example](public-contracts.md#explicit-unknown-height-model-revision-3). This union extension requires a minor release before 1.0; no packages are published by this implementation.

Domain field and relationship policy owns acceptance and detail restrictions. Traversal preserves nullable physical meaning; geometry validation gates measured profiles; layout computes schematic pixels; rendering localizes the retained facts. No new application port or runtime dependency is needed.

## Evidence and follow-up

[Experiment 001](research/experiments/001-documentary-fidelity.md) identified compulsory measurements as a lossless-documentation barrier. This bounded decision uses the existing unmeasured technical-motion contract. It does not resolve ambiguous source labels, establish anchor ownership, import the Davis document automatically, or demonstrate practitioner comprehension.

Independent tests verify null motion/JSON, adjacent ownership, annotation boundaries, direct normalization, exact bare/quoted spans, complete-profile failure, forbidden scopes/details, numeric compatibility, TypeScript narrowing, bilingual visual/text bounds and packed framework accessibility. A deliberate null-to-zero mutation must fail the physical-delta regression. Richer evidence/provenance, unknown climb heights, partial detail placement and practitioner studies remain separate work under #31/#34.
