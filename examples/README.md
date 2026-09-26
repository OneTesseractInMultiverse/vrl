# Working examples

Examples target this checkout, including unreleased options. Start with the fictional soft-terrain canyon; do not treat example descriptions as verified field documentation. See the [documentation index](../docs/README.md) for capability and release scope.

| Source | Purpose | Expected diagnostics |
| --- | --- | --- |
| [soft-terrain-canyon.vrl](soft-terrain-canyon.vrl) | Shared quick-start and comparison fixture: two rappels, explicit ropes/anchors, unknown-depth pool, walk, slippery landing and exit | None |
| [soft-terrain-annotated.vrl](soft-terrain-annotated.vrl) | Adjacent descent/ascent, seven anchors, rope stages, redirection, notes, missing downclimb height and dry pool | `VRL_GEOMETRY_HEIGHT_REQUIRED`, a nonblocking warning; unknown height remains unknown |
| [quebrada-gata.vrl](quebrada-gata.vrl) | Legacy illustrative profile with elevation metadata, inclinations, stations and hazards. Its descriptions are unverified example data | `VRL_GEOMETRY_ELEVATIONS_ESTIMATED`, a nonblocking warning; connections absorb the undeclared part of the endpoint elevation change |

The legacy fixture declares a 200 m endpoint difference while its technical elements account for only part of that change. Successful compilation does not make the intermediate elevations measured. The maximum declared rope is not an equipment recommendation, and the sum of explicit walk distances is not a complete route distance.

## Run and review

After `npm ci` with the repository development runtime:

```sh
make run
npm run example -- /tmp/vrl-classic.svg
make render-assets
npm run check:docs
make check
```

`make run` prints the legacy classic SVG to stdout and diagnostics to stderr. The second command writes the SVG to a chosen file. `make render-assets` regenerates all checked-in previews: the legacy classic image and the four optional-style comparisons. It does not accept their changes automatically; inspect the resulting diff and images.

The [legacy render profile](quebrada-gata.render.json) and [gallery profiles](style-gallery.json) keep source paths, layout options and renderer options reproducible. You can regenerate only the gallery with `node scripts/render-style-gallery.mjs`. The [gallery guide](../docs/soft-terrain.md#reproducible-comparison) links every exported SVG.

## Use the same data through each package

The root quick start, core package quick start, [React](../docs/react.md) and [Svelte](../docs/svelte.md) page examples use the same fictional canyon source. They show the exact declared values; style, language and theme are presentation settings. [SvelteKit](../docs/sveltekit.md) loads that file through an application-owned endpoint. Copy it to your application's served route-source directory and handle failed HTTP responses before compiling.

For multiple inline diagrams, allocate a stable, distinct `idPrefix` per occurrence. Recompute cached diagram state after changing source or render options; supplying `diagram` bypasses those inputs. Framework adapters show nonblocking warnings by default. Direct compiler/SVG integrations must present `result.diagnostics` themselves.

Standalone source files and quick-start copies have behavioral regression checks, including their expected warnings and declared facts. Generated SVG checks compare current output with reviewed artifacts after removing blank-line indentation. These checks complement visual review and do not validate real routes.

## Selective annotation icons

`symbols: "annotations"` with `style: "soft-terrain"` adds selected start, finish, bolt, tree and slippery pictograms beside explicit labels. `symbols: "minimal"` preserves identical placement and facts without pictograms; `symbols: "icons"` retains primary node pictograms. Omission preserves classic symbols. See the [mapping, compatibility, failures and gallery](../docs/annotation-icons.md).
