# Experiment 001: documentary fidelity before diagram conversion

Status: documentary/model comparison completed; authoring-time and practitioner/visual-comprehension evaluation pending. Date: 2026-09-27. Protocol: [revision 1](../README.md), frozen before this run. Scope: the same ten fact records and three inferred relationships in [Davis first-three revision 1](../cases/davis-first-three.json). This is a comparison of published document representations, not a verified survey or navigation guide.

## Revisions and procedure

- VRL production baseline: `7c02422817d375f5d9f7971984870aab56a2bea5`, workspace version 0.2.1 (unreleased); no production code changed by this experiment.
- Corpus/protocol: commit `a77f379`; CanyonTopo source: `32990a441310856e3918aa4ad82ec1ab0f5dc47c`, YAML format `1.0`. Pinned source hash and reuse assessment are in the inventory. CanyonTopo editor was **not executed**; conclusions below concern inspected storage fields only.
- Explicit evidence-record candidate: corpus schema revision 1. It is an experimental record structure, without an editor, parser contract or production API.
- Documentary-notes candidate: the complete facts/relationships encoded as literal JSON inside VRL notes in [the reproducible probe](../../../tests/research-fidelity.test.js). This tests lossless carriage across normalization/JSON, not ergonomic field notes or semantic interpretation.
- [Canyon Log workflow](https://canyonlog.org/canyon-topo-builder/), accessed 2026-09-27: background reference for recording notes and constructing vector topos. The mutable page lists text/drawing/digital workflows. No template import, artwork reuse or timed authoring session was performed; do not score it as a tested candidate.

The corpus expected values were extracted before compiler runs. Inspect each upstream record at its pinned locator; do not use VRL output to decide what the source said. Apply the protocol's per-fact classification independently from syntax validity. Probe missing, zero, unknown-text and unsupported-unit measurements; conflicting count declarations; an unsupported movement keyword; a notes container; and a deliberately invented valid metric declaration.

Reproduce with the repository development runtime after `npm ci`:

```sh
node --test tests/research-fidelity.test.js
make check
```

## Per-fact outcomes

“Preserved as text” is documentary carriage, not a modeled physical relationship. “Unsupported” below is explicitly reported; no conversion is silently presented as successful. No physical VRL profile of this fragment is supplied, because doing so would require unsupported measurement claims.

| Inventory ID | Pinned CanyonTopo document | Explicit evidence records / documentary-notes container | Structured VRL technical model |
| --- | --- | --- | --- |
| label-15 | Free-text description on feature 15 | Preserved, including unresolved meaning | Unsupported as a complete technical record: height/rope unresolved |
| label-17 | Free-text description on feature 17 | Preserved, including unresolved meaning | Unsupported as a complete technical record: height/rope unresolved |
| label-19 | Free-text description on feature 19 | Preserved, including unresolved meaning | Unsupported as a complete technical record: height/rope unresolved |
| anchor-14 | Separate category and count | Preserved with source/evidence class | Category/count fit, but complete owner cannot be constructed faithfully |
| anchor-16 | Separate category/count/name | Preserved without specializing natural to tree | Natural category/count fit; owner and name/provenance require separate handling |
| anchor-18 | Separate category/count, no supplied name | Preserved; absent name remains null | Natural category/count fit; owner still unresolved |
| physical-drop-heights | Not independently established; drawing lengths exist | Explicit null unknown | Unsupported: required positive metric height cannot express this missing evidence |
| declared-rope-lengths | Not independently established | Explicit null unknown | Unsupported: required positive metric rope cannot express this missing evidence |
| measured-pool-depths | Outside scoped measured evidence | Explicit null unknown | Do not add a pool or measured depth to fill this gap |
| observation-date | Not established | Explicit null unknown | No typed dated-observation contract; metadata/prose alone do not supply one |
| association-14-15 | Coordinate coincidence, no target ID | Preserved as inferred, requiring confirmation | Unsupported as a confirmed domain link |
| association-16-17 | Coordinate coincidence, no target ID | Preserved as inferred, requiring confirmation | Unsupported as a confirmed domain link |
| association-18-19 | Coordinate coincidence, no target ID | Preserved as inferred, requiring confirmation | Unsupported as a confirmed domain link |

All thirteen inventory records survive the documentary container exactly, including evidence class and null values; its normalized technical segment list remains empty. That demonstrates information carriage, not that notes are an adequate canyon model. The complete structured technical conversion is rejected, so there is no fidelity percentage implying that partially encodable fields constitute a complete route.

## Automated observations and negative findings

Eight single-assert probes passed locally with Node 25.9.0:

- Missing height/rope yields two `VRL_FIELD_REQUIRED` errors. Nonmetric or unknown-text values yield measurement-syntax errors. Zero substitutions yield range errors.
- Duplicate count declarations fail with `VRL_SYNTAX_DUPLICATE_ATTRIBUTE`; the proposed swimming statement fails with `VRL_SYNTAX_UNKNOWN_STATEMENT`. Every invalid probe produces no normalized model, layout or JSON.
- The documentary container retains all thirteen records through JSON export but has no physical descent and no rappels.
- **A fabricated positive metric height/rope pair compiles successfully.** This is expected for a compiler that validates declarations, but it rejects the hypothesis that compiler success proves a faithful external conversion. Source-to-model fidelity needs a separate evidence/loss boundary. Never relabel a drawing dimension or supply an equipment value merely to make the parser accept an input.

A unit mismatch may be syntactically valid if both spellings use meters; current syntax checks cannot detect that factual error. Conflicting source reports are also different from duplicate attributes: retain both reports in research records until a conflict model exists. The tests demonstrate the compiler boundary, not a complete external-document validator. Automatic association, omitted alternatives, all importer fault classes and participant interpretation have not been evaluated by these eight probes.

## Decisions and compatibility

| Hypothesis | Decision | Rationale / handoff |
| --- | --- | --- |
| Current mandatory measurements support lossless technical import of incomplete documents | Reject for this case | Positive values cannot stand for unknown evidence. [#31](https://github.com/OneTesseractInMultiverse/vrl/issues/31) must specify partial technical facts before adopting import syntax. Do not loosen required fields without layout/summary/JSON compatibility rules. |
| Explicit evidence records can preserve the documentary inventory | Adopt as a research artifact; investigate production model | Exact documentary carriage is demonstrated. No conclusion about author effort, reader comprehension or a public API follows. |
| Coordinate matching is enough to establish anchor ownership | Investigate further | It suggests an association but needs source/practitioner confirmation; no automatic domain import is authorized. |
| Soft terrain / selected icons improve reading | Investigate further | Synthetic facts/export checks and a stated preference exist. Matched real-case presentation is blocked by incomplete semantics; practitioner tasks remain pending. No default change. |

The adopted boundary is “preserve evidence, report loss, do not invent required values.” The concrete next domain question is how unknown measurement claims and their sources coexist with an optional derived physical profile. Separate a future acquisition/import adapter from domain facts, validation, layout and serialization. Keep compatibility with existing fully measured documents explicit.

## Visual and authoring follow-up

Use the existing [synthetic gallery](../../visual-specification.md) to debug identical-fact reading tasks: order, station/count association, drop versus rope, unknown depth, compressed walk and continuations at 320/736 widths in color/monochrome. Optional icon/minimal modes keep placement and facts constant. Existing [export checks](../../visual-regression.md) verify selected losses and rendering failures; they do not provide reading accuracy or timing.

No participant has supplied results for this study. Familiarity, order, task times, comprehension scores and real-case visual preference are **pending**, not zero. Do not combine this documentary comparison with the unperformed Canyon Log authoring session or visual study into a claim of superiority. [#34](https://github.com/OneTesseractInMultiverse/vrl/issues/34) remains open for those observations, independent review, additional cases and holdout evaluation.

## Follow-up: explicit unknown rope (issue #78)

Model revision 2 adopts `rope=unknown` for rappels with known height, preserving the sentinel and warning without contributing a numeric rope observation. The first scoped modeling gap is reduced; unknown height, unclear source measurement meaning and inferred anchor associations still prevent faithful physical import of this Davis fragment. The original baseline results above remain historical. The executable unknown-height probe now expects only the height syntax error because unknown rope is independently supported. This is a language/domain decision with correctness evidence, not a practitioner-comprehension result.


## Follow-up: explicit unknown rappel height (issue #80)

Model revision 3 adopts `height=unknown` for rappels. It reuses the existing null technical-delta contract: schematic output warns, complete endpoint profiles fail, and positioned stage/redirection details require known height. The exact unknown attribute survives JSON and bilingual visible/accessible output; no rope length or pixel distance fills it. This reduces the compulsory-height gap while leaving richer partial-detail/provenance contracts separate.

The historical baseline above is unchanged. The former unknown-rappel-height failure is now a successful, explicitly unmeasured case; a climb-height probe retains the unchanged forbidden-scope boundary. The Davis fragment still requires confirmation of feature interpretation, measurement meaning and anchor association before a faithful structured conversion can be claimed. No automatic importer, source verification or practitioner results are introduced.

## Follow-up: explicit swimming

The historical unsupported-swimming result above remains a result for the pinned baseline. AST revision 2 / model revision 5 now adopts [explicit swimming](../../swimming.md) with optional distance independently of pool features; the current unsupported-movement probe uses `slide`. This is a separate vocabulary/engineering decision, not a reclassification of Davis facts or a new practitioner result.
