# Explicit swimming-to-pool associations

Optional swim-only `pool_ref` records an authored association with a pool's explicit identifier. It does not derive swimming from the pool, prescribe a maneuver or establish geographic geometry. This unreleased addition is intended for the next minor release and was introduced in normalized model revision 7. The current model is revision 8 for [jump entries](jumping.md).

```vrl example=explicit-pool-references kind=document
route "Synthetic pool associations"
start "Entry"
pool "Upper basin" depth=2m
swim SW1 distance=12m pool_ref="Upper basin" phase=canyon
hazard H1 type=slippery note="Supplied observation"
swim SW2 pool_ref="Lower basin"
pool "Lower basin" depth=unknown
swim SW3 distance=3m
walk W1 distance=5m phase=return
exit "Exit"
```

The [executable synthetic itinerary](../examples/canyon-pool-references.vrl) contains a backward association from SW1 to Upper basin and a forward association from SW2 to Lower basin. SW3 remains unassociated despite its proximity to a pool. The pool depths, swimming distances, phase tags and 5 m walking sum remain independent. All values are fictional supplied facts, not field measurements.

## Identity, scope and failure

A reference must exactly match one uniquely **explicitly identified pool** in the same raw document. Forward/backward declarations and several swims associated with one pool are valid. Whole-document duplicate identity checks run first: ambiguous IDs fail rather than selecting one target. Automatic IDs do not establish targets, even if their current generated spelling matches the reference. Write `pool P1` rather than relying on the ID that `pool` happens to receive. This avoids silently changing an association when an earlier unnamed element is inserted.

The value is a nonblank string, not an element index, URL lookup or imported object. Matching is case-sensitive and does not trim or translate. Quoted identifiers may contain spaces, punctuation and Unicode under the existing identifier grammar. A pool explicitly named `unknown` can be referenced with that exact text; the word is not an uncertainty sentinel in this field. Omit the field when the association is unspecified.

| Condition | Result |
| --- | --- |
| Empty or whitespace-only value | `VRL_FIELD_REFERENCE_SYNTAX` at the supplied value |
| No exact explicit target, including generated-only identity | `VRL_REFERENCE_TARGET_MISSING` at the reference |
| Explicit target is not a pool, including self-reference to the swim | `VRL_REFERENCE_TARGET_TYPE`, with the target declaration as a related location |
| Repeated explicit ID | Existing `VRL_IDENTIFIER_DUPLICATE`; reference resolution is skipped |
| Repeated `pool_ref` key | Existing `VRL_SYNTAX_DUPLICATE_ATTRIBUTE` |

This invalid example points at a walk, so it fails with `VRL_REFERENCE_TARGET_TYPE` at line 3, column 19 and a related location at the walk's ID:

```vrl example=wrong-pool-target kind=invalid
route Example
walk P1
swim SW1 pool_ref=P1
```

Errors block model/layout/JSON. Local field and identity failures suppress cascading reference diagnostics. Valid associations do not add warnings; missing swim distance and pool depth retain their separate existing uncertainty behavior. Processing limits still bound source/element counts, and lookup uses a route-local map in linear time without graph expansion.

Metadata and non-swim `pool_ref` values stay literal extensions. They do not add reverse edges, even when a pool's extension mentions a swim ID. Free-form `note` text remains literal. The typed relationship only goes from swim to pool, so accepted associations cannot form cycles. This is not a navigation or escape-link contract.

## Normalization and compatibility

The model stores the exact ID in `swim.attributes.pool_ref?: string`; it stores no target index, duplicated pool object or graph. `compileRoute` and `validateRoute` check whole-route resolution against explicit raw IDs. `normalizeRoute` independently enforces it and throws `RangeError` for missing/wrong-type targets after ordinary field and identity checks.

Advanced `validateElement` and `normalizeElement` only have one element. They validate reference syntax and retain its string but cannot establish target existence/type or route-wide uniqueness. Use a whole-route API before accepting an association. As with other fields, permissive `normalizeAttributes` is token conversion, not validation.

Model revision **7** promotes swim `pool_ref` from extension text into a scoped known field. AST revision 2 and traversal/layout/diagnostic/compiler/diagram structural revision 1 remain unchanged. New diagnostic code strings are additive; no runtime exports or dependencies are added. No package version is changed or published here. Store the current revision in an application-owned envelope; JSON itself gains no version field.

Saved earlier `extensions.pool_ref` remains a literal additional field in descriptions and is not silently promoted or translated. The pinned revision-6 fixture verifies that behavior. Recompiling former swim source with a valid explicit target now produces a typed association. Rename arbitrary prior prose to `pool_note` or move it to `note`; `swim pool_ref="as described above"` now fails without an explicit pool of that exact name. Metadata and other element scopes retain their existing extension meaning. Retain source for migration and upgrade readers before recompiling.

## Traversal and output

A pool and a swim remain separate ordered entries and progression points. The association never merges points, relocates annotations, adds a physical or navigable segment, changes elevation reconciliation, derives a swim distance from depth or adjusts route-wide summaries. Forward references describe association, not a command to reorder the itinerary. Pool categories, flow, phase, proximity and icons cannot invent references or swimming choices.

Classic, soft-terrain, rows and monochrome views display the exact ID as `Pool reference: …` or `Referencia de poza: …`. Complete SVG descriptions and visible HTML alternatives retain the same literal identifier. Text wraps and contributes to scene bounds; it is not translated as a known category and is escaped only at the output boundary. No connector line, new icon or color-only encoding is introduced. Missing references add no placeholder.

The [narrow English view](assets/visual/pool-links-color-320.svg) and [Spanish monochrome view](assets/visual/pool-links-mono-es-320.svg) show named feature association while preserving separate movement/feature facts. Row continuations still describe layout order, not reference links.

Domain policy owns reference syntax, allowed owner and target kind. A pure domain computation classifies reference problems; the validation adapter adds source ranges, and normalization enforces the same invariant. Existing application coordination and export ports remain unchanged. Renderers consume the structured ID as text; framework adapters reuse success/error state. New functions retain documented coordinator/computation roles and no runtime dependency is added.

## Research decision and limits

The [FFME canyon rating document](https://www.ffme.fr/wp-content/uploads/2020/04/Syst%C3%A8me-de-cotations-en-canyonisme.pdf), adopted 2015-11-28, page 1, distinguishes arrival in a pool followed by swimming (accessed 2026-10-12). This supports the feature/movement distinction, not this schema or a field-verified association. The one-pool optional relation is a bounded engineering decision.

Alternatives were prose-only association, inference from adjacent features, and an explicit reference. Adopt explicit references to preserve a supplied relationship without inferring an action. A general many-feature graph and alternatives/escapes require separate source cases and semantics. Synthetic fixtures, deliberate wrong-target failures and browser observations establish implementation fidelity only. No practitioner comprehension result, real-canyon survey or confirmation of the historical Davis associations is claimed.

Follow-up research should test source-backed aquatic cases, several features crossed by one movement, repeated visits, incomplete or conflicting associations and reader interpretation of forward references. Those findings may revise the bounded one-target contract; they do not justify cave/network expansion yet.
