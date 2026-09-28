# Visual and export regression evidence

The [visual gallery](visual-specification.md) is a deterministic baseline backed by independent facts and real browser/export checks. The test layers have different responsibilities; none establishes practitioner comprehension or universal accessibility conformance.

## Case and evidence matrix

| Cases | Independent meaning | Export/presentation evidence |
| --- | --- | --- |
| Shared two-rappel canyon, 320/736, annotations/minimal, color/monochrome | Complete bilingual descriptions, 18m/12m physical heights, 40m/30m declared ropes, two bolts/tree anchor, unknown depth, 120m walk, slippery landing | Matched continuation pairs, readable text, icon/profile clearance, contrast and non-color cues; actual standalone and external SVGs |
| Element inventory, classic and soft rows | All nine supported kinds, ascent/descent, annotation ownership, no physical event for notes/hazards | XML, complete text bounds, local image name/description and marker references |
| Anchor/station/landing inventory, dark | All current categories, declared counts 1–7, unknown count and non-lateral stations | Full text/count retention, dark-theme rendering and row-text collision check |
| Pool/flow/severity inventory, narrow | Categorical pool states versus measured unknown depth, dry/wet cues, complete hazard severities | Readable text, standalone XML/layout, no hidden text or clipping |
| Technical shapes, light/dark | Ladder/direct/slab, adjacent climb/descent, stage lengths and redirection sides | Structural assertions/mutations for direction and annotation retention, complete standalone bounds |
| Long multilingual route, Spanish narrow and wide monochrome | Ordered facts, long literal text, unknown downclimb height and explicit warning | Browser glyph bounds, readable row fonts, row-text overlap check and deterministic exports |
| Multiple inline diagrams | Same facts in independently namespaced occurrences | Actual document-wide reference resolution; duplicate-ID negative control |
| Print | Same fictional facts, explicit unknowns, essential non-color cues | Print media with fills suppressed, plus the reproducible intrinsic-size PDF inspection described in [accessible output](accessible-output.md#evidence-and-print-review) |

Fixtures, independent expectations and the original renderer/icon revision are pinned in [catalog.json](../tests/fixtures/visual/catalog.json). The current renderer, fixture and generated baseline revision is the enclosing commit. `visual:build` never revises the expected facts/fingerprints. `visual:check` and tests reject drift; CI does not accept new baselines automatically. Review baseline diffs separately from generation using the [acceptance procedure](visual-specification.md#reproduce-and-accept-a-baseline-change).

## Browser and raster tolerances

Both packed consumer profiles run `export.test.mjs` against a real, owned loopback production server with external requests blocked. Each of the fifteen standalone SVGs must load successfully, expose resolvable local title/description and marker references, keep text visible and inside its actual SVG rectangle, and avoid overlapping row text. The browser-layout tolerance is **0.75 CSS pixels** for extents and overlapping rectangles. Default row fonts must remain at least **14 CSS pixels** at intrinsic size. These checks do not infer physical measurements from pixels and do not replace the independent domain/fact tests.

Two external monochrome images (320/736) must decode successfully. Their structural drawing bands are rasterized in the same pinned Chromium run and must match inline SVG **exactly**, at device scale 1 and integer crop coordinates with eight pixels of vertical clearance. These bands cover rope/contour, water/pool and walking-break geometry. Full PNGs are retained under the ignored consumer `export-evidence/` directory for inspection. Text rasterization can differ between external-image and inline contexts, including font weight/antialiasing; text is checked separately through DOM bounds/visibility, independent factual expectations and the actual accessibility tree. No cross-platform pixel hash is treated as a universal baseline.

Browser accessibility must expose the external image's complete adjacent HTML alternative, not merely a section label. A visible heading identifies the HTML alternative; applying `aria-label` to that referenced container previously caused Chromium to replace the complete description with its short title. The new regression checks the independently specified full text. Inline framework accessibility checks continue to require one named image per diagram through SSR/hydration.

## Failure sensitivity

Workspace semantic mutations require assertion failures for removed anchor counts, wrong anchor pictograms, lost uncertainty, reversed movement, lost stages, obscured icon gutters, clipped labels, missing/duplicate continuations, missing hazards, broken descriptions and removed water cues. The external-section naming regression adds a dedicated mutation. Mutation crashes or unrelated failures do not count as detection.

The packed export suite separately injects clipped text, hidden annotations, a broken description target, duplicate marker/metadata IDs and malformed XML. Each independent browser oracle must report the intended failure. Existing public API tests verify invalid rendering options and impossible row constraints fail with documented exception categories instead of silent fallback. These controls supplement exact SVG baselines and the configured 100% package coverage target.

## Reproduction and recorded limits

```sh
make check
node scripts/prepare-consumers.mjs minimum
node .consumers/minimum/node_modules/playwright/cli.js install chromium
node scripts/check-consumers.mjs minimum
```

Repeat with `current` for the second locked framework profile. Preparation recreates `.consumers/<profile>` and copies the reviewed gallery, source inventory and test helpers. Edit repository sources, not generated consumer files. The same runs execute in the Node/runtime matrix documented in [framework compatibility](framework-compatibility.md).

The September 2026 baseline was inspected in Chromium across classic, dark, narrow multilingual and monochrome output; the light monochrome long-sheet PDF was inspected with decorative fills suppressed. This records automated and visual-inspection evidence only. Firefox/WebKit, representative assistive technology, printer/paper combinations, icon recognition, reading accuracy and task times remain untested or pending under [research #34](https://github.com/OneTesseractInMultiverse/vrl/issues/34). General continuous-profile path/leader collision avoidance is not claimed. Known limits and negative observations must remain visible when accepting future baselines.
