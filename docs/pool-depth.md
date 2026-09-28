# Explicit pool depth

A pool may carry an author-supplied metric depth, including zero, or the exact `unknown` sentinel. This is optional pool data under normalized-model revision **4**, intended for the next minor release. It does not establish a complete depth survey, current conditions or a traversal decision.

```vrl example=pool-depth kind=document
route "Synthetic pool depth"
pool P1 depth=2.5m type=deep flow=low note="Supplied example value"
pool P2 depth=0m
pool P3 depth=unknown
```

This synthetic [executable example](../examples/canyon-pool-depth.vrl) succeeds without warnings. P1 retains `{ value: 2.5, unit: "m", meters: 2.5 }`, P2 retains a zero measurement, and P3 retains the string `"unknown"`. Omitting depth leaves the attribute absent. Absent and explicit unknown remain structurally distinct even though both produce unknown-depth wording in complete descriptions.

## Meaning and proper failures

Only `pool` promotes `depth` into a known field. Accept ordinary metric decimals from `0m` to `1000000000m`, with at most six fractional digits, or exact `unknown`. Quoting either token retains the same decoded meaning. Negative zero normalizes to zero. Empty, negative, nonmetric, scientific, nonfinite, excessive precision/magnitude, uppercase or padded sentinel values fail with located field diagnostics; duplicate keys fail during parsing. Compilation returns no model, layout or JSON on failure. Direct normalization enforces the same semantic range.

Metadata and other element types retain `depth` as literal extension text. Pool categories (`deep`, `shallow`, `swimmer`, `dry`, `unknown`), flow and notes remain independent. No numeric thresholds derive a category, and a category supplies no measurement. This slice does not reject combinations based on an assumed category threshold.

Pool depth never adds swimming motion, walking distance, technical descent, endpoint elevation, rope requirements or summary totals. Canonical traversal and physical profiles remain unchanged. Symbolic pool silhouettes do not scale with depth. The value carries no spatial coverage, observation date, source confidence or competing claims; those require separate evidence contracts.

## Presentation

Classic and soft-terrain diagrams display a localized pool-depth label with the supplied value or unknown state, retaining category, flow and note. Narrow monochrome rows use the same facts. English/Spanish SVG descriptions and HTML alternatives include exactly one depth fact; a known value replaces the former unknown placeholder. The complete text alternative labels it “Measured pool depth” as a declared metric field, without independently certifying a measurement.

Optional unknown depth does not produce a warning. Its absence does not block a measured endpoint profile because it has no role in vertical route motion. This differs from unknown required rappel height.

## Compatibility and ownership

Revision 4 introduces `PoolDepthDeclaration = Measurement | "unknown"` on optional depth attributes of pool `RouteElement` records. Narrow both absence and unknown before reading `.meters`; see the [typed example](public-contracts.md#pool-depth-model-revision-4). The runtime exports and all other contract revisions stay unchanged. Package versions are not changed or published by this implementation.

Saved revision-1/2/3 models remain supported. Historical `extensions.depth` stays literal when rendered, even if its text looks numeric; it cannot silently become a measurement. The revision-3 fixture records that behavior alongside unknown rappel height/rope. Retain source and record the current model revision (now 5 for [swimming](swimming.md)) in an application-owned envelope for newly compiled models.

Recompiling old pool source `depth=2m` now moves the value from extensions into typed attributes. Previously arbitrary pool prose such as `depth="variable"` fails; move that text to `depth_note="variable"` or `note`. Review migration before replacing saved data. The advanced, unscoped `normalizeAttributes` helper can convert recognized depth tokens but cannot establish pool ownership or model validity; use scoped normalization or compilation for route records.

The domain field specification owns scope, token acceptance and nonnegative range. Existing parser and validation adapters preserve locations and translate failures. Rendering projects typed facts; it does not parse historical extension strings. No new application port, traversal variant or runtime dependency is needed.

## Evidence and research boundary

This is a bounded engineering decision based on the existing pool category, unknown-depth presentation and metric policy. Compare the former category/prose-only representation with a typed optional depth: the latter preserves numeric zero, explicit unknown and failure semantics while leaving movement independent. Synthetic tests establish that behavior, saved-data compatibility, bilingual bounds and actual framework accessibility exposure. A deliberate lost-depth mutation must fail its independent fact-list test.

The current research corpus has no confirmed measured-pool claim from which to derive a survey model or category threshold. No field observation, practitioner preference or comprehension result is claimed. Future aquatic cases should record measurement location/date, variation, movement and conflicting evidence separately. The [research register](research/charter.md) and [canyon capability matrix](canyon-capabilities.md) retain those open questions; caves remain later work.
