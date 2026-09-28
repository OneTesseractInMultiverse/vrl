# Canyon research corpus and protocol

Research revision 1, prepared 2026-09-27. Follow the [research charter and experiment register](charter.md) for evidence categories, promotion decisions and delivery handoffs. This is a versioned input to [#32](https://github.com/OneTesseractInMultiverse/vrl/issues/32), separate from the supported [language contract](../language-reference.md). Canyon routes come first; cave notation remains a later investigation.

## Corpus inventory

| Case | Kind and role | Status and coverage |
| --- | --- | --- |
| [Davis first three labeled rappels](cases/davis-first-three.json) | Source-backed published topo fragment; development case | Comparison-ready for documentary fidelity and explicit loss reporting; technical labels, anchors, alternative text, missing physical measurements. Field accuracy and independent/practitioner review pending. |
| [Two-rappel canyon](../../examples/soft-terrain-canyon.vrl) | Synthetic procedure/visual pilot | Independent [fact inventory](../../tests/fixtures/visual/catalog.json), runnable visual/export fixtures; not evidence about a real canyon. |
| CanyonTopo `wallace.yaml` at the Davis source revision | Reserved holdout | Only its existence/name has been inventoried; contents have not been used to design this protocol. Review source/reuse terms and extract independently before using it. |

One real-document fragment is enough to begin a bounded comparison; it is not a representative sample of canyon routes. The exploratory target remains 8–12 cases. Acquire additional permitted source documents covering aquatic movement, multistage obstacles, approach/return, alternatives/escapes, and dated conflicting observations. Record refusals and unavailable sources. Do not count synthetic variants as additional real cases. Keep at least two newly acquired cases reserved before any broader conclusion.

The Davis source is an upstream test fixture naming a canyon; its status as a field-verified or current route description is **unknown**. Here “source-backed” means traceable to that published document, not verified in the canyon. Inventory only the stated first-three-label scope. Later obstacles, water conditions, access and complete-route totals are outside it.

## Inventory schema (revision 1)

Each case is ordinary JSON, independent of VRL parsing or rendering:

- `schemaVersion`, `id`, `kind`, `scope`, `preparedOn`: stable identity and declared limits.
- `sources`: stable IDs, authorship/attribution, immutable URL/revision where available, retrieval and commit dates, file hash, reuse assessment and observation date. Publication/retrieval dates never substitute for observation dates.
- `facts`: unique IDs, subject, predicate, supplied value (or null), evidence class (`reported`, `observed`, `estimated`, `inferred`, `unknown`), source locator, and qualification. Retain source units/lexemes separately from interpretation. Unknown never means zero. `observed` requires an actual observation record; no field observations occur in the initial case.
- `relationships`: separately identified source/destination claims, evidence and qualification. Drawing proximity/coordinate coincidence is not a confirmed domain link.
- `uncertainties`: missing or ambiguous information, its affected facts and the question needed to resolve it. Conflicting reports must remain separate claims with their respective sources/dates; do not overwrite one with a chosen value.
- `review`: documentary extraction, independent review and practitioner review statuses, disagreements and reviewer records. Pending reviews have no invented reviewer or outcome.

The source hash pins acquisition, not correctness. A reviewer should read the linked original and confirm each extraction. Updating the inventory requires a new revision, explanation and re-scoring affected results. Reuse is assessed per source: this case publishes an original factual inventory and a few short labels, not upstream YAML, code, artwork or screenshots. No license was found at the pinned upstream repository root; do not infer permission to redistribute its full fixtures.

## Evaluation protocol (revision 1, set before comparison)

Freeze the case, source revision, tool versions, candidate files, VRL commit and known defects before scoring. Assign every fact/relationship one primary outcome: **preserved**, **omitted**, **contradicted**, **invented**, or **unsupported**. An invention has no inventory ID; record it as an extra output claim. Unsupported requires a visible limitation/loss entry; silently dropping a fact counts as omitted. A literal note can preserve documentary text while leaving its structured semantics unsupported; report both layers separately. Do not combine duplicate credit into a fidelity percentage.

| Task | Expected answer / scoring |
| --- | --- |
| Reconstruct the scoped obstacle labels | Three labels in numerical R1, R2, R3 order; source supplies that label order, not a machine-readable complete itinerary. One point per correct position. |
| Find reported anchor categories/counts | Feature 14: bolt/2; 16: natural/1 with a log label; 18: natural/1. One point per exact pair. Coordinate matches suggest associations 14→15, 16→17, 18→19; mark these inferred, not confirmed. |
| Separate physical drop from rope declaration | Neither is independently confirmed by this fragment. Three dimension labels retain prime notation; drawing lengths are not physical units. One point only if the answer refuses to supply either a drop or required rope. |
| Preserve alternatives and side uncertainty | R1 and R3 contain alternative abbreviations. Retain their wording; expansion and reference frame need confirmation. One point per retained alternative with unresolved meaning. |
| Recognize missing observations | Pool measurement, rope declarations and observation dates are not established in this scope. One point per explicit unknown; absence is not a zero measurement or proof that no pool exists. |
| Revise a single reported count | In a clearly synthetic copy, change feature 14's count from 2 to 3. Only that claim and derived displays may change. Record edits, collateral changes and correction count. Restore the pinned case afterward. |
| Author/import the same inventory | Provide the same facts and unresolved questions to each candidate. Record inability to encode a relationship or unknown measurement instead of filling a mandatory field with an estimate. |

For syntax, compare compact VRL, an explicit fact-record candidate and conventional notes with the same inventory; test editor assistance separately. For visuals, use the same facts, labels, tasks and width while changing only the selected visual factor. When a real case cannot be represented faithfully, report that blocker and use the synthetic pilot solely to debug visual procedure. No visually attractive output earns credit for invented facts.

**Decision thresholds:** zero silent omissions, contradictions or inventions for an adopted in-scope conversion. Explicit unsupported findings are acceptable experiment results, not a successful lossless conversion. Automated failure probes must detect every predeclared fault below. A comprehension claim additionally requires at least five consenting canyon practitioners, documented familiarity and presentation order, ≥90% correct task answers in each tested mode, and zero invented-equipment/unknown-as-zero interpretations. This is an exploratory gate, not statistical proof or a safety certification. If a mode misses the gate, revise it; if evidence is absent, investigate further. Timing can favor a candidate only after fidelity passes; publish per-person raw task times and errors, not just an average. Do not collect identifying information unnecessary to the study.

Record anonymous participant IDs, relevant familiarity, mode order, each answer/error and elapsed time. Rotate order across participants, give equivalent instructions, and retain confusion/disagreement rather than resolving it silently. Practitioner and assistive-technology observations are pending. A maintainer preference or browser accessibility-tree check cannot fill those cells.

## Controlled failure cases

Before evaluation, create separate synthetic mutations; never overwrite the source-backed inventory:

| Fault | Required outcome |
| --- | --- |
| Relabel a drawing length as meters, or change feet to meters without conversion | Invented/contradicted measurement; reject conversion. |
| Supply a second conflicting count/date | Preserve both claims and report conflict; do not choose silently. |
| Replace unknown rope/depth/date with zero or today's date | Invented claim; reject. |
| Drop an alternative or infer a tree from the generic natural category | Omission or unjustified specialization; explicit loss/uncertainty required. |
| Attach an anchor to an unsupported target or dangling ID | Report unsupported relationship; never fabricate an association. |
| Remove a label/count, reverse descent, clip a continuation or hide uncertainty | Semantic/export regression must fail; then verify the unmodified control passes. |

Existing [semantic and export checks](../visual-regression.md) exercise supported synthetic diagrams. Candidate-specific unit/conflict/import checks belong to the corresponding experiment; this corpus has no automatic external-tool importer and does not claim these research fault probes already ran.

## Initial handoff and limitations

The first inventory supports three requirements for candidate importers: preserve literal evidence and its status; distinguish diagram coordinates from measurements; and report unsupported alternatives/unknown mandatory fields. It does not establish new grammar, an anchor-side convention, equipment requirements or a complete graph model. These questions feed [canyon scope #31](https://github.com/OneTesseractInMultiverse/vrl/issues/31) and [comparison #34](https://github.com/OneTesseractInMultiverse/vrl/issues/34).

Follow-up work: independent source review; additional source permissions and cases; holdout extraction; actual practitioner tasks; then bounded implementation decisions. Domain claims and validation remain separate from acquisition, storage and presentation adapters. Any executable research tool must have documented coordinator/computation responsibilities, focused single-assert correctness/failure tests and no new production runtime dependency.

[Experiment 001](experiments/001-documentary-fidelity.md) records the first per-fact comparison, executable conversion failures and negative findings. Practitioner comprehension and authoring-time comparisons remain pending.

The [pool-depth engineering decision](../pool-depth.md#evidence-and-research-boundary) adopts a bounded optional metric/unknown field using synthetic fidelity and failure checks. It adds no measured claim to the source-backed corpus, category threshold or practitioner result. Spatial coverage, dates, conflicting depths and swimming remain research questions.

The [explicit-swimming decision](../swimming.md#evidence-alternatives-and-limits) adopts a distinct optional-distance itinerary element using federation vocabulary and synthetic fidelity/failure evidence. It adds no real-canyon measurement or practitioner result. Aquatic source cases and typed feature association remain research work.
