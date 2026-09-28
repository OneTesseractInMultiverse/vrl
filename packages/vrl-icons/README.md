# @subvertic/vrl-icons

Original, dependency-free canyoning pictograms, immutable registry, explicit presentation mappings and SVG serialization. This package owns the exact vector paths used by the VRL renderer. It has no core, framework, browser or third-party runtime dependency.

```sh
npm install @subvertic/vrl-icons
```

```js
import { renderIcon, getIcon, resolveAttributeIconId } from "@subvertic/vrl-icons";

const svg = renderIcon("bolt", { size: 24, decorative: true });
const definition = getIcon("tree");
const anchorIcon = resolveAttributeIconId("anchor", "bolts");
console.log(svg, definition?.description, anchorIcon);
```

Use `symbols: "annotations"` with the SVG renderer's soft-terrain style for the five selected canyon roles, or `symbols: "icons"` for primary node icons. The [annotation guide](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/annotation-icons.md) documents mapping, layout, accessibility, unknowns and compatibility. `symbols: "minimal"` preserves the same labels and reserved icon slots while hiding pictograms.

## Public contract

| API | Meaning |
| --- | --- |
| `getIcon(id)` | Exact case-sensitive lookup; unknown/prototype keys return null |
| `listIcons(category?)` | New array containing shared frozen definitions; unknown categories are empty |
| `iconIds`, `iconRegistry`, `iconManifest` | Deeply immutable ordered identity, lookup and complete manifest records |
| `getLineStyle(id)` | Frozen reusable stroke pattern, or null for unknown/non-line icons |
| `resolveElementIconId(element)` | Explicit type/subtype mapping; unknown pools use pool, unknown hazards use warning, unknown element types return null |
| `resolveAttributeIconId(field, value)` | Explicit anchor/landing mapping; unsupported values return null |
| `renderIconGeometry(id)` | Trusted ID-free SVG path group; the parent owns placement and accessibility |
| `renderIcon(id, options?)` | Standalone SVG with exact geometry, escaped text, size and accessibility options |

Typed subpaths are `/registry`, `/semantics` and `/svg`. `/manifest.json`, `/svg/<id>.svg` and `/package.json` are explicit data exports. Private source paths are unsupported. `manifest.json` has schema version 1 and retains ordered categories, definitions, exact paths, provenance, optional line/difficulty metadata and semantic mappings. Renaming IDs, changing meanings or changing schema requires compatibility review.

Standalone rendering defaults to size 32, currentColor, registry title/description and a named image. Positive finite sizes are supported. Invalid size, title, description or decorative flags throw `TypeError`; unknown IDs throw `RangeError`. Text and color are XML-escaped; arbitrary SVG attributes or markup are not accepted. Named icons include role, title, description and accessible labels. Decorative icons omit those names and use `aria-hidden`. No IDs are generated, so repeated icons do not need namespace allocation. External HTML images still need appropriate `alt` text and do not inherit the page's color.

## Transparent backgrounds

Standalone assets and programmatic SVGs paint only the original strokes, with `fill="none"` and no background shape. Inline SVG inherits the host's CSS `color` through `currentColor`; use `renderIcon("tree", { color: "#176b59" })` to set the stroke explicitly. Set any desired background on the surrounding HTML element. External `<img>` SVGs do not inherit host text color; supply an explicitly colored SVG for those uses.

Both renderer icon modes preserve transparency. Node pictograms retain their abbreviation but have no solid square or panel-colored text halo. Full diagram canvas and panel paints remain controlled separately by the renderer's `themeTokens.background` and `themeTokens.panel`; they accept `"transparent"`. The [comparison gallery](https://github.com/OneTesseractInMultiverse/vrl/blob/main/docs/assets/canyoning-icons.html) demonstrates standalone and rendered node icons on light, dark and checkerboard host backgrounds.

## Geometry and scope

The existing catalog contains 63 original definitions in nine categories: vertical progression, aquatic obstacles, terrain features, anchors/equipment, hazards, environment, route information, illustrative difficulty, and diagram line styles. Authoring provenance distinguishes 57 reference-taxonomy concepts and six VRL extensions. All paths use a 32-unit square canvas with a two-unit stroke; line-pattern metadata retains its own caps and dashes. The annotation pilot uses these paths unchanged at 24 drawing units. Inspect smaller uses rather than assuming recognizability.

These are project pictograms, not federation-certified symbols. Counts, grades, route availability, anchor condition, pool depth and traversal choices must remain explicit text/data. Illustrative difficulty bars do not convert canyon grades or hazard levels. Available icons such as slides, handlines and caves do not add grammar elements or make cave support complete. Mappings never infer meaning from prose.

## Maintenance

`src/catalog.js` is the sole geometry/mapping authoring source. Registry initialization freezes it recursively. Run `npm run icons:build` from the repository root to regenerate the 63 standalone SVGs, manifest and light/dark comparison gallery. `npm run icons:check` rejects drift and unexpected assets; it never silently deletes files. Keep generated output and source together, run `make check`, and review the gallery at 24, 32 and 48 pixels.

The package shares the workspace version and publishes before its renderer consumer. Its npm identity and trusted publisher must be configured before the next release; generation and verification never publish packages. MIT. Copyright (c) 2026 Pedro Guzmán; see LICENSE.

The explicit VRL `swim` element now maps to the existing `swim` pictogram without artwork changes. The older `pool type=swimmer` mapping remains categorical and does not imply a swimming movement; full labels retain that distinction.
