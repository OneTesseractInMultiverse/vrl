# Explicit unknown rappel rope

A source can document a measured drop without supplying a rope declaration. Use the exact `rope=unknown` value on that rappel. It preserves the missing information instead of inventing a length. This is a model-revision-2 feature intended for the next minor release; it is not available merely because a branch or manifest has changed.

```vrl example=unknown-rappel-rope kind=document
route "Synthetic unknown rope"
rappel R1 height=12m rope=unknown anchor=bolts
```

This compiles successfully with the located warning `VRL_ROPE_LENGTH_UNKNOWN`. The physical descent is −12 m, derived from the supplied height. Normalized attributes and JSON contain `rope: "unknown"`; neither height nor stages fill in a rope value. The same source is in [the executable example](../examples/canyon-unknown-rope.vrl).

`rope` remains required. Omitting it, supplying an empty value, zero, a negative value, nonmetric units, `UNKNOWN` or padded text is still an error. The sentinel applies only to rappel `rope`: height, distances, stage entries, metadata rope and rope fields on other elements retain their numeric contracts. Quoted `"unknown"` decodes to the same exact sentinel. Unknown drop heights and automatic conversion of external documents remain outside this change.

## Meaning, summaries and warnings

The sentinel means no rope length is supplied. It does not describe a zero-length rope, a missing rope in the field, an equipment recommendation, or a lack of rope use. A supplied numeric declaration retains its existing meaning and validation. Stage totals and redirections remain independently checked; an unknown rope does not suppress their errors or warnings.

`summarizeRouteMeasurements` excludes explicit unknowns from `declaredRopeCount` and `maximumDeclaredRopeMeters`. A route with one unknown rope has `rappelCount: 1`, `declaredRopeCount: 0`, and `maximumDeclaredRopeMeters: null`. If a second rappel declares 20 m, the maximum is 20 m and the count is 1 of 2. That maximum is a partial observation. The legacy `requiredRopeMeters` remains 0 when no numeric declaration contributes; use the explicit helper to distinguish unknown from zero.

The nonblocking warning points to the `unknown` source value. Existing successful-state warning presentation applies in shared state and framework adapters. Keeping the warning visible does not replace preserving the sentinel in stored data and text alternatives.

## Presentation and compatibility

Classic and soft-terrain diagrams display explicit declared-rope/unknown text; narrow and monochrome modes retain it. English and Spanish accessible descriptions and adjacent HTML alternatives preserve the same fact. Changing style or hiding optional pictograms does not turn the unknown value into a measurement.

The normalized-model contract is now revision **2**. Rappel `attributes.rope` changes from `Measurement` to `Measurement | "unknown"` (`RopeDeclaration`). AST values remain strings; model property names, known measurement records, traversal, layout and legacy summary fields are unchanged. The source grammar gains one scoped value, and diagnostic code `VRL_ROPE_LENGTH_UNKNOWN` is additive. Fully measured revision-1 fixtures retain their exact JSON and remain renderable.

Persist revision 2 in an application-owned envelope for newly compiled models. Retain the source. Readers must handle the sentinel explicitly; do not drop it, cast it to a number or feed revision-2 unknown ropes to a revision-1 reader. TypeScript consumers must narrow before accessing `.meters`. This union extension requires the next minor release before 1.0 and cannot be published as a patch. See [the public contract and migration](public-contracts.md#explicit-unknown-rope-model-revision-2).

## Decision and evidence

[Experiment 001](research/experiments/001-documentary-fidelity.md) identified compulsory values as an obstacle to faithful incomplete-source representation. This first bounded decision accepts explicit unknown rope evidence when height is known. It does **not** claim the Davis fragment can now become a faithful physical profile: its measurement meanings and anchor associations remain unresolved. No field verification, importer or equipment calculation is added.

Domain field policy owns sentinel acceptance; relationship assessment owns the warning condition; validation locates it; summaries classify numeric observations; renderer adapters localize the retained fact. No runtime dependency or new application port is needed.

Independent tests cover source/direct normalization, exact JSON facts, unchanged technical motion, numeric/unknown/mixed observations, malformed and forbidden scopes, warning locations, TypeScript narrowing, bilingual visible/accessible output, narrow bounds and packed framework consumers. A controlled mutation that counts an unknown rope as zero must fail its observation-count/null regression. Existing revision-1 compatibility fixtures remain in the full gate.
