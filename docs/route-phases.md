# Explicit route phase membership

`phase=approach|canyon|return` records the supplied membership of one element. Omit it when unspecified. It is optional on every attribute-bearing element statement, including hazards and start/exit markers. This is an unreleased addition intended for the next minor release, with normalized model revision 6.

```vrl example=explicit-route-phases kind=document
route "Synthetic phase membership"
start "Trailhead" phase=approach
walk W1 distance=100m phase=approach
rappel R1 height=8m rope=20m phase=canyon
hazard H1 type=slippery phase=canyon
note "Phase unspecified for this observation"
swim SW1 distance=12m phase=canyon
walk W2 distance=50m phase=return
walk W3 distance=5m
exit "Finish" phase=return
```

This [synthetic executable example](../examples/canyon-phases.vrl) supplies approach membership for a start and a 100 m walk, canyon membership for an 8 m rappel, hazard and 12 m swim, and return membership for a 50 m walk and exit. The intervening note and final 5 m walk have **unspecified** membership. Their neighbors do not assign it. The existing walking sum is 155 m across all walks; the swim remains excluded. These are fictional declarations, not a field survey.

## Ownership, absence and order

Each value belongs only to its element. No value carries forward, fills gaps or labels earlier elements. Movement type, names, IDs, note text, pool properties, geometry and row breaks cannot assign a phase. `canyon` means the declared in-canyon portion, not vertical descent: a climb can belong to it. An approach or return can also contain technical movement. Annotation membership describes the annotation itself and does not move its canonical reached-boundary attachment or assign a phase to that boundary.

Values are exact and case-sensitive, with ordinary bare/quoted attribute syntax. Empty text, whitespace-padded values, `unknown`, translated spellings, lists and unsupported categories fail with value-located `VRL_FIELD_UNSUPPORTED_VALUE`. Duplicate keys fail with `VRL_SYNTAX_DUPLICATE_ATTRIBUTE`. Blocking compilation produces no model/layout/JSON; direct normalization rejects invalid membership with `RangeError`. Metadata `phase` remains an opaque extension and cannot provide a document default.

Free-form `note` statements have no attribute syntax. For compatibility, `note phase=return` is literal content, not a declaration; notes also do not inherit membership. Programmatic ASTs may explicitly set `attributes.phase` on a note and receive the same domain validation and rendering as other elements. Do not introduce a new note spelling by interpreting assignment-shaped prose. Use a hazard's phase when the supplied observation is a hazard; do not change an observation's type just to add source membership.

Repeated or interleaved values are valid and remain in source order. This field does not declare section boundaries, a required sequence, route completion, alternatives, escapes or an edge between phases. No source `phase` statement is introduced. Phase-level totals and duration/distance completeness are not part of this contract.

## Geometry, summaries and presentation

Membership never changes traversal, signed technical deltas, endpoint reconciliation, spacing weights, annotations or measurement aggregation. Existing summaries remain route-wide observations: walking sums include declared walks in any phase and unspecified walks. A phase label does not establish a complete approach length, canyon descent, return distance or equipment requirement.

Classic, soft-terrain, rows and monochrome views add a text detail to explicitly tagged elements, including elevation-bearing start/exit markers. English labels are `Phase: approach`, `Phase: canyon` and `Phase: return`; Spanish labels are `Fase: aproximacion`, `Fase: barranco` and `Fase: retorno`. Full SVG descriptions and visible HTML alternatives retain the same facts. The Spanish walk title is now `Caminata` rather than the former `Aproximacion`, so a return or unspecified walk is not mislabeled as approach. The existing Spanish `A` walking symbol remains a project profile abbreviation for on-foot travel. Unspecified membership adds no repeated placeholder. Existing ordering and row continuation cues still apply; a row is not a phase.

The [English narrow gallery](assets/visual/phases-color-320.svg) and [Spanish monochrome gallery](assets/visual/phases-mono-es-320.svg) use explicit text without new icons or color-only distinctions. Labels can increase the fitted viewport or row count without changing core physical coordinates.

## Compatibility and migration

Revision **6** promotes element `phase` from an arbitrary extension to a validated known field: `attributes.phase?: RoutePhase`, where `RoutePhase` is `"approach" | "canyon" | "return"`. AST revision 2 and other structural contract revisions remain unchanged. No runtime export, dependency or package version changes. Upgrade readers before recompiling and store revision 6 in your own model envelope; JSON itself gains no version property.

Previously saved `extensions.phase` values remain literal when rendered, even when they equal a supported category. They are not silently promoted or translated. Recompiling source with a supported value now produces typed membership; arbitrary earlier prose must be renamed to `phase_note` or moved to `note`. For example, migrate `walk phase="approach & return"` to `walk phase_note="approach & return"` to preserve the literal claim. Metadata and free-form notes retain their old meanings. The pinned revision-5 fixture checks saved extension behavior; earlier model fixtures and inventories remain retained. See [public contracts](public-contracts.md) for a typed example.

Domain field policy owns vocabulary, scope and normalization. Renderers read structured membership and use a shared field-specific text computation; they never infer it from layout or translate legacy extensions. Framework adapters reuse diagram state. Functions retain coordinator/computation contracts and core/renderer gain no runtime dependency.

## Evidence and decision

The [FFME canyon rating document](https://www.ffme.fr/wp-content/uploads/2020/04/Syst%C3%A8me-de-cotations-en-canyonisme.pdf), adopted 2015-11-28, page 3, includes approach, descent and return in its trip-duration scope (accessed 2026-10-12). This supports terminology only. VRL's choice of `canyon` for the middle portion, optional per-element ownership and lack of inferred transitions are engineering decisions, not federation notation or grading rules.

Three options were considered: keep phase claims in prose, introduce stateful section declarations with inherited membership, or adopt explicit element membership. The last preserves independently supplied facts while avoiding inferred transitions across incomplete documents. The existing synthetic approach/return case and the new independent correctness/failure tests support this bounded implementation. They do not establish a real-canyon import, practitioner comprehension or a complete section model.

Research still needs source-backed mixed itineraries and reader evaluation of repeated labels, missing membership, re-entry and section boundaries. Alternatives/escapes, typed source claims, phase totals and cave networks remain separately scoped under the canyon and research roadmap.
