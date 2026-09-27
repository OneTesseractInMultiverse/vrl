# Canyon documentation research charter

Revision 1, 2026-09-27. Delivery and research proceed together. Confirmed defects are fixed without waiting for a study; new domain semantics and default visual conventions need evidence and an explicit compatibility decision. Canyon routes are the first domain. Caves follow after the adopted canyon scope is dependable; structures and dedicated climbing-route models remain deferred.

## Question and users

Which representation preserves canyon route meaning with the least ambiguity and practical authoring effort while supporting understandable diagrams and dependable validation? “Best” is relative to a task: documenting a descent, reviewing an update and reading a printed topo have different constraints. Evaluate those tradeoffs instead of declaring one universally superior notation.

Study route authors, reviewers and readers. Separate physical features from movement across them, station locations from drawing positions, measured dimensions from declarations, and dated observations from enduring geometry. Existing VRL syntax and symbols are candidates to evaluate, not the definition of the problem.

## Questions and competing hypotheses

| Question | Candidate comparison | Evidence against the hypothesis |
| --- | --- | --- |
| Does compact syntax reduce authoring/revision effort without loss? | Current VRL, explicit evidence records, conventional notes; editor assistance tested separately | Mandatory invention, omitted meaning, more corrections or higher interpretation error despite shorter text |
| Is an ordered itinerary with references sufficient? | Linear cases, alternatives/escapes, a graph candidate only when a counterexample requires one | Duplicated facts, incompatible order or relationships hidden in prose |
| Can one fact model support multiple views? | Text/table and schematic profile from the same inventory | Views disagree, silently drop uncertainty or require independent factual edits |
| Do soft terrain and selected icons improve reading? | Current optional modes with identical facts/labels; color, monochrome and 320/736 widths | More association/direction/uncertainty errors or slower correct answers |
| Can external tools exchange the same facts? | Source-backed documents, explicit loss tables and malformed conversions | Coordinates promoted to physical measurements, unsupported facts silently discarded |

## Research cycle and records

Question → pinned source-backed cases → predeclared protocol → comparison/prototype → recorded evidence → adopt/revise/reject/investigate-further decision → bounded implementation issue → regression/docs → follow-up observation.

Keep at most two active experiments. Each record names its question, corpus and tool revisions, scope, expected answers, fault probes, decision thresholds and stopping condition before evaluation. Use [the corpus protocol](README.md) as the first rubric. Preserve negative results, unknowns and disagreements. A tool or participant unable to represent an input is a result, not permission to simplify the input silently.

Separate documentary extraction, automated behavior, visual inspection, maintainer preference, practitioner comprehension and assistive-technology observations. Only actual observations populate the corresponding evidence category. Machine-readable fixtures and high coverage cannot substitute for comprehension or field verification. Record participant familiarity and order; rotate presentation where practical. Timing results are useful only after factual fidelity passes.

Decisions include evidence and limits, alternatives, the affected model/grammar/render contract, migration/compatibility implications, implementation links and follow-up conditions. Experimental records stay outside the supported grammar until explicitly promoted. Default style changes require their own compatibility decision. Pure domain computation, application coordination, source acquisition, persistence, external-tool translation and rendering remain distinct owners; dependencies point inward. Any tooling retains documented coordinator/computation contracts, single-assert correctness/failure tests and the runtime dependency policy.

## Experiment register

| ID / issue | Status | Available evidence | Next stopping condition |
| --- | --- | --- | --- |
| Corpus / [#33](https://github.com/OneTesseractInMultiverse/vrl/issues/33) | Initial foundation established; growth queued | One pinned published-document fragment, independent-of-DSL inventory, one synthetic visual pilot and reserved holdout | Independent review, additional permitted source cases and unresolved meanings recorded before claiming generality |
| Representation fidelity / [#34](https://github.com/OneTesseractInMultiverse/vrl/issues/34) | Investigating | Davis source and predeclared protocol; current parser/domain contracts | Publish per-fact conversion outcomes and deliberate failure results, then choose a bounded next step |
| Visual comprehension / [#34](https://github.com/OneTesseractInMultiverse/vrl/issues/34) | Awaiting practitioner input | Optional implementation, synthetic semantic/export checks and maintainer preference | Run matched reader tasks and report errors/order/familiarity; no comprehension claim before then |

The initial 8–12-case corpus is exploratory, not statistically representative. One case can expose a defect or import limitation; it cannot establish the best model. Independent/practitioner review remains pending and has no fabricated participants, timings or results.

## Delivery handoff and completion

Research informs [canyon completeness #31](https://github.com/OneTesseractInMultiverse/vrl/issues/31), [visual specification](../visual-specification.md) and [correctness backlog #30](https://github.com/OneTesseractInMultiverse/vrl/issues/30). Accepted requirements get bounded issues with independent expected facts, proper failure examples, ownership and documentation. Unresolved questions remain research work and do not block unrelated correctness fixes.

At each capability/release review, update the supported/deferred capability matrix, accepted and rejected decisions, missing evidence, and next experiments. Re-run adopted corpus cases after implementation. New negative results may reopen a decision.

The initial research cycle finishes only after a source-backed language/model comparison and an actual visual-comprehension study produce documented decisions and implementation handoffs. Publishing this charter completes the documentation foundation, **not** that cycle. [#32](https://github.com/OneTesseractInMultiverse/vrl/issues/32) remains open until those criteria are met.

## Reference entry points

- [Pinned CanyonTopo source document](https://github.com/hcooper/CanyonTopo/blob/32990a441310856e3918aa4ad82ec1ab0f5dc47c/tests/fixtures/davis.yaml): diagram-oriented records and ambiguous text/measurement boundaries. See the corpus for attribution/reuse limits.
- [Canyon Log Topo Builder](https://canyonlog.org/canyon-topo-builder/): reference for notes, drawings and vector-template workflows, accessed 2026-09-27. Its page is mutable; record a new access date/version for subsequent comparisons. No template or artwork is copied here.
- [Current VRL language](../language-reference.md), [domain contracts](../domain-model.md) and [visual/export evidence](../visual-regression.md): implementation baseline and known limits, not evidence of comparative superiority.

[Experiment 001](experiments/001-documentary-fidelity.md) records the first per-fact comparison, executable conversion failures and negative findings. Practitioner comprehension and authoring-time comparisons remain pending.
