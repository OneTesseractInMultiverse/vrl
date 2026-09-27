# VRL documentation

These guides describe the implementation in this checkout, including unreleased changes. Use the [changelog](../CHANGELOG.md), package version and README shipped in your installed tarball to determine release availability. Repository changes, package-name corrections and npm publication are separate steps.

## Start here

- [Quick start](../README.md#quick-start): compile a fictional canyon and render SVG, including nonblocking warnings.
- [Example catalog](../examples/README.md): source files, expected warnings, rendering profiles and regeneration commands.
- [Language reference](language-reference.md) and [success/failure examples](language-examples.md): grammar, identity, known fields, extensions, limits and diagnostics.
- [API reference](api-reference.md) and [public contracts](public-contracts.md): package entry points, TypeScript, supported extension points and migrations.

## Current capabilities

| Area | Implemented behavior | Guide |
| --- | --- | --- |
| Source language | Ordered route/header/elements; located syntax and semantic diagnostics; deterministic IDs; bounded processing; strict known fields and preserved extensions | [Language](language-reference.md), [diagnostics](diagnostics.md), [domain model](domain-model.md) |
| Physical traversal | Canonical owners, adjacent descents/ascents, implicit boundaries, attached notes/hazards, elevation validation and measured technical deltas | [Traversal API](api-reference.md#technical-traversal-and-geometry-validation) |
| Route measurements | Separate declared totals, observed rope/walk measurements, counts and null unknowns; located warnings for totals below recorded walk sums | [Summary provenance](route-summary.md) |
| SVG | Classic default; optional soft terrain; complete fitted bounds; light/dark themes; English/Spanish text; three text-symbol profiles; stages, redirections and full anchor counts | [Scenes](rendering-scene.md), [soft terrain/gallery](soft-terrain.md), [symbology](symbology.md) |
| Narrow layouts | Optional fixed-width sections, readable text, paired continuations and explicit walking-distance breaks | [Row layout and gallery](row-layout.md) |
| Pictograms | Original immutable icon package; optional node icons or selected icons beside factual labels; equivalent minimal layout | [Annotation guide and gallery](annotation-icons.md) |
| Embedding | Caller-owned marker/title/description namespaces; shared diagram state; successful-state warnings; explicit precomputed-state trust and precedence | [SVG identifiers](svg-identifiers.md), [state](diagram-state.md), [warnings](warning-presentation.md) |
| Frameworks | React factory, Svelte component/markup, SvelteKit data/load/component; packed SSR, hydration and update checks | [React](react.md), [Svelte](svelte.md), [SvelteKit](sveltekit.md), [tested matrix](framework-compatibility.md) |
| Engineering | Inward dependency direction; computation/coordination separation; single-assert behavioral and failure tests; selected mutation probes; configured 100% JavaScript coverage | [Architecture](architecture.md), [ports](compiler-ports.md), [verification](testing.md) |
| Releases | Seven canonical `@subvertic/vrl-*` packages; explicit preparation, verified committed-version publication and partial-publication recovery | [Release checklist](release-checklist.md), [npm setup](trusted-publishing.md) |

All seven packages share a version; the repository's development runtime differs from the package runtime floor. Follow the compatibility matrix rather than assuming that the root tooling runs on every supported consumer runtime.

## Scope and interpretation

The [research charter](research/charter.md) tracks competing hypotheses, evidence requirements and experiment status. Research documentation distinguishes current implementation from unanswered domain and comprehension questions.

Canyon routes are the initial domain. Generic climb/downclimb elements do not establish complete cave, structure or climbing-route models. Slides, jumps, alternative lines, equipment systems and other canyon concepts require explicit modeling decisions; no new DSL semantics should be inferred from an icon, contour or extension string.

Soft terrain is optional. Its curves and pool silhouettes are schematic, and practitioner comprehension evaluation remains pending. Selective [annotation icons](annotation-icons.md) are implemented as an optional mode. Optional [narrow row layouts](row-layout.md) preserve technical sections and display order with matched continuations. [Complete text alternatives and monochrome rows](accessible-output.md) include automated browser accessibility-tree and print checks; representative assistive-technology review remains pending. Canyon-model completeness and research remain under [#31](https://github.com/OneTesseractInMultiverse/vrl/issues/31) and [#32](https://github.com/OneTesseractInMultiverse/vrl/issues/32).

Legacy aggregate names include historical terminology: `requiredRopeMeters` is the maximum declared rappel rope, and `totalDistanceMeters` sums supplied walk distances. Neither proves equipment requirements or a complete route distance. Missing declarations can produce zero aggregates. The additive `summarizeRouteMeasurements` helper separates declarations, observations, counts and null unknowns while preserving existing model JSON. See [summary provenance and compatibility](route-summary.md) and the [legacy summary contract](domain-model.md#current-summary-fields).

## Keeping documentation current

Update the owning guide, package README, working example and expected behavior with each implementation change. Use the [maintenance matrix](documentation-contracts.md#change-to-documentation-checklist) to find the affected surfaces. Run the [documentation checks](documentation-contracts.md), review regenerated SVGs, and complete `make check`; run the packed framework matrix when adapter behavior or its examples change.

Contributor and project guidance: [contributing](contributing.md), [open source practices](open-source.md), [governance](../GOVERNANCE.md), [security](../SECURITY.md).

Function-level contracts, responsibility tags and the structural enforcement command are documented in [internal documentation](internal-documentation.md).

The [visual specification and decision record](visual-specification.md) consolidates current element/state coverage, hierarchy, optional defaults and the reproducible [gallery](assets/visual/index.html).

[Visual/export regression evidence](visual-regression.md) maps the synthetic cases to semantic oracles, browser layout/raster/accessibility checks, negative controls and print inspection.

The [research corpus and protocol](research/README.md) separates source-backed evidence, synthetic fixtures, unresolved source meaning and pending practitioner evaluation.

The [canyon capability matrix](canyon-capabilities.md) maps grammar, normalized meaning, validation, output and explicit domain deferrals.

[Unknown rope declarations](unknown-rope.md) document the scoped language addition, warning, summary behavior and model-revision-2 migration.

[Unknown height declarations](unknown-height.md) define schematic motion, profile/detail failure rules and revision-3 migration.
