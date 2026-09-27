# Canyon capability matrix

Revision 1, 2026-09-27. This checkout supports an ordered schematic canyon document with the elements below. It does not yet represent every canyon maneuver or route relationship. [#31](https://github.com/OneTesseractInMultiverse/vrl/issues/31) remains open; cave expansion has not started. Status describes this repository, including unreleased changes, not npm availability.

## Supported contract and explicit deferrals

| Capability | Grammar / normalized meaning | Validation / output | Disposition and rationale |
| --- | --- | --- | --- |
| Ordered itinerary and boundaries | `route`, `start`, `exit`; deterministic element IDs; canonical traversal points/segments | Duplicate/conflicting declarations fail; adjacent technical owners survive; ordered SVG/text/JSON | Supported. An ordered document is not a branch network or geographic survey. |
| Walk, rappel, downclimb, climb | Element-owned technical motion; metric fields and explicit sign conventions; annotations do not add movement | Rappel requires explicit `height` and `rope` declarations, each positive metric or `unknown`; climb requires height; unmeasured downclimb stays unknown with warning; scenes use canonical traversal | Supported for declared linear itineraries. A climb element does not establish a climbing-route domain. |
| Anchors, station and landing | Rappel anchor categories/counts; technical station/landing fields | Known vocabulary and counts validated; full counts, localized facts and unknown fallback retained | Supported as supplied categories. No evidence that schematic station left/right is a field-verified reference frame. |
| Rope stages/redirections | Validated positive metric lists owned by technical element | Stage sum/range and redirection positions checked; unknown-height rappels reject positioned details; all supported line shapes retain valid labels | Supported declarations; no calculation of equipment requirements. |
| Pools and flow | Pool classification and element flow category; separate from movement | Known values checked; accessible output explicitly says measured depth unknown | Supported categories. Numeric pool depth and swimming motion are deferred: category/silhouette is not a measurement or traversal. |
| Notes and hazards | Annotation records with canonical boundary association | Text retained in JSON, SVG and complete descriptions; no physical progression | Supported. Free text retains supplied wording, not typed movement/references/provenance. |
| Measurements and summaries | Metric declarations, canonical signed technical deltas, endpoint elevations; `summarizeRouteMeasurements` separates declarations/observations/unknowns | Finite/range/precision and consistency checks; explicit warnings and null unknowns | Supported within current fields. Walk sums are not total route distance; maximum declared rope is not required equipment. |
| Swimming, jumping, sliding, independent traverse | No statement keywords or normalized movement variants | Unsupported keywords fail; descriptive notes remain literal | Deferred pending feature-versus-movement contracts, dimensions, uncertainty and alternative-choice evidence. Existing `traverse` attribute is a measurement, not a movement. |
| Approach/canyon/return sections | Descriptive notes and ordered walks only | Preserved as text; no typed section boundaries/totals | Deferred as structured phases. Need rules for membership, transitions and summary scope before syntax. |
| Escape/alternative links | IDs identify elements; no outgoing branch/reference graph | Prose may mention a candidate; compiler cannot validate prose destinations | Deferred pending source-backed route examples and dangling/ambiguous/cyclic-reference semantics. Do not infer an edge from text or coordinates. |
| Partial technical evidence | Rappel rope and height support explicit `unknown`; requiredness remains explicit | Missing declarations still fail; unknowns survive JSON/text and warn in schematic output; unknown height blocks complete measured profiles and positioned details | Rope and height uncertainty are supported under [model revision 3](unknown-height.md); richer claims remain deferred. [Experiment 001](research/experiments/001-documentary-fidelity.md) demonstrates the import gap. Unknown physical motion remains null and separate from schematic pixels; no automatic import or source association is established. |
| Dated evidence and conflicts | Opaque metadata/extensions can carry text; no typed source/claim/conflict model | String carriage does not establish provenance validation | Deferred production model. Research records preserve reported/inferred/unknown claims and contradictions independently. Publication date is not observation date. |
| Physical geometry and survey | Schematic progression; declared endpoint reconciliation | Deterministic bounded layout and explicit estimates/warnings | Supported schematic output; map coordinates, measured cross-sections and cave surveys are deferred. |
| Output and interoperability | Versioned model/layout/diagnostic contracts, JSON, structured scenes, SVG and visible text; thin framework adapters | Complete bounds, XML, accessibility-tree/export and consumer checks | Supported declared contracts. No CanyonTopo/Canyon Log importer and no claim of lossless external conversion. |

## Representative executable examples

All examples below are synthetic. Their declared values are independent test expectations, not observations or maneuver recommendations.

| Example | What it establishes | What it does not establish |
| --- | --- | --- |
| [Dry technical canyon](../examples/canyon-dry.vrl) | 12 m rappel / 30 m declared rope, two bolts, 25 m walk and 3 m downclimb; total technical delta −15 m | Equipment adequacy, real site conditions or a measured connecting profile |
| [Aquatic observations](../examples/canyon-aquatic-notes.vrl) | Swimmer-class pool, unknown depth/distance in prose, jump/slide alternatives as notes, 10 m rappel / 25 m rope, water hazard text | Swimming/jump/slide movements, applicability or choice of an alternative; only the rappel creates technical descent |
| [Approach and return](../examples/canyon-approach-return.vrl) | 100 m and 50 m walks, 8 m rappel / 20 m rope, retained phase and unresolved-escape descriptions | Typed phases, a navigable escape edge or a total route distance of 150 m |

`npm run check:docs` checks all standalone sources against independently authored facts, IDs, warning lists and source hashes. `tests/canyon-scope.test.js` additionally verifies JSON/text retention and exactly the declared technical movement; unsupported movement/phase keywords must fail without a model. Existing semantic/export galleries cover all adopted elements, states, technical shapes and narrow/monochrome output.

## Promotion and architecture

The immediate scope is dependable **supported linear canyon documentation**, with explicit limits above. Do not silently reinterpret notes or generic extension strings as new language semantics. For each proposed capability, record source-backed requirements, domain entities/relationships, units/unknowns, validation and proper failures, normalized JSON shape, visible/text presentation, and migration rules before adoption.

Domain-owned claims and traversal must remain independent of parser spelling, drawing coordinates and external tool records. Import acquisition/storage belongs in adapters; application ports coordinate; domain functions compute invariants; scenes compute presentation; serializers write output. Every implementation function remains a documented coordinator or computation unit, with single-assert behavior/failure tests and no new runtime dependency by default.

Reusable contracts currently include IDs, source spans, diagnostics, numeric policy, compiler ports, pure traversal/measurement helpers, scene serialization and framework state. Their documented version/compatibility policies remain binding. Cave branching, return traversal and survey semantics are **not** implied by those contracts. Reuse should follow real cave cases only after the canyon scope decision and evidence review; no generic network abstraction is introduced here.

## Open acceptance work

The original correctness, architecture, gallery and export backlog is complete. The remaining canyon-completeness work is domain definition and evidence: independent source/practitioner review; source-backed aquatic/alternative cases; a decision on incomplete technical claims; structured movement/phase/reference contracts or explicit product-scope deferral. Corpus growth and visual comprehension studies remain in [the research register](research/charter.md).

This matrix makes the limitations reviewable and executable. It does not close the broader canyon-completeness issue by relabeling unsupported concepts as supported notes, and it does not promote cave support.
