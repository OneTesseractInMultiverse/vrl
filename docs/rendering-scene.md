# Rendering scenes

See the [public API classifications, typed contracts, and revision policy](public-contracts.md).

The SVG adapter prepares a complete presentation scene before generating XML. `computeTopoScene(model, layout, options)` exposes that computation; `renderTopoSvg(model, layout, options)` prepares the same scene and serializes it with the resolved theme. Neither operation changes the model or layout.

## Responsibilities and dependency direction

Core owns route validation, technical segment ownership, traversal direction, and physical measurements. The renderer consumes a normalized model and the positioned segments from core. It does not parse the DSL or reconstruct segment ownership from neighboring labels.

`svg-identifiers.js` validates a caller-owned `idPrefix` and computes an owned identifier record. `topo-scene.js` carries it as `scene.identifiers`; serialization uses the same resolved ID in definitions and references. Allocation across diagram instances stays with the embedding application. See [multiple inline diagrams](svg-identifiers.md).

The adapter has three stages:

1. `detail-content.js` selects display facts from normalized fields. It assigns badge categories before localization and keeps descriptive text as text.
2. `node-scene.js`, `segment-scene.js`, `panel-scene.js`, and `detail-layout.js` compute positions, wrapping, symbols, annotation geometry, and panel records. `topo-scene.js` coordinates these computations and fits the canvas using prepared detail and annotation positions. `scene-bounds.js` handles envelopes; `scene-path.js` requires finite numeric coordinates before building path data.
3. `svg-serializer.js` encodes those placed records as SVG. It imports only XML/attribute encoding and badge style helpers. It receives no model, layout, or locale arguments and does not infer meanings or calculate positions. `svg-renderer.js` coordinates preparation and serialization and retains the public fragment helpers.

`presentation.js` supplies shared pure calculations and historical formatting helpers. Locale strings and symbol profiles are presentation policies. Theme lookup, XML escaping, and paint validation remain in the output adapter. This separation adds no runtime dependencies or browser measurements. Dependency tests prevent scene computations from importing serializers and prevent serializers from importing geometry, locale, or core semantics.

## Inspecting a scene

```js
import { compileRoute } from "@subvertic/vrl-core";
import { computeTopoScene, renderTopoSvg } from "@subvertic/vrl-render-svg";

const source = `route "Badge semantics"
rappel height=10m rope=20m flow=high inclination=80%
note "flow: high / 80%"`;
const result = compileRoute(source);
if (!result.ok) throw new Error("Invalid route");

const options = { language: "es", legend: false };
const scene = computeTopoScene(result.model, result.layout, options);
const rappel = scene.nodes.find(({ node }) => node.element.type === "rappel");
const badges = rappel.drawing.detailRecords.flat()
  .filter((record) => record.kind === "badge")
  .map(({ category, value, label }) => ({ category, value, label }));
// [{ category: "flow", value: "high", label: "alto" },
//  { category: "inclination", value: 80, label: "80%" }]

const svg = renderTopoSvg(result.model, result.layout, options);
// The note remains literal text; it does not acquire badges.
```

The scene retains `language`, `nodes`, `infoBox`, `legend`, `contentBounds`, `bounds`, and `viewBox`. It additionally contains:

| Field | Contents |
| --- | --- |
| `title`, `description` | Localized accessible strings, before XML escaping. |
| `terrainPath`, `waterPaths` | Prepared terrain and water path data. |
| `segments` | Connection paths or technical records with `ownerId`, display `shape`, `geometry`, `paths`, `rungs`, `stages`, and `redirections`. |
| `segmentLabels` | Placed traversal labels: `text`, `x`, `y`. |
| `stationTicks` | Two placed line records per visible station tick. |
| `nodes[].drawing` | Node type, color token, accessible label, title coordinates, structured detail rows, placed details, marker, anchor marks, and optional leader path. |
| `infoBox.textLines` | Text, coordinates, font size, and heading flag for each summary line. |
| `legend.drawingRows` | Placed symbols, labels, badges, and descriptions. |

Technical stages include a placed boundary line or `null` for the last stage. Redirections include their marker path and localized accessible label. All supported shapes retain the same stage/redirection records; only ladder shapes have rungs. `slab` uses the existing `direct` display group. Stage/redirection values and owner IDs come from the positioned segment, not from translated text.

### Detail records

`nodes[].drawing.detailRecords` contains rows of semantic presentation records:

- Text: `{ kind: "text", text }`.
- Badge: `{ kind: "badge", category, value, className, prefix, label }`.

`prefix` and `label` are localized display strings. `category`, `value`, and `className` are independent of language. `value` is a canonical level string or an inclination percentage number.

| Normalized field | Category | Example value |
| --- | --- | --- |
| Rappel `flow` | `flow` | `"high"` |
| Downclimb/climb `exposure` | `exposure` | `"medium"` |
| Hazard `severity` | `hazardSeverity` | `"critical"` |
| Technical `inclination.percent` | `inclination` | `80` |

Descriptive text, including note text, hazard notes/types, and landing descriptions, never supplies a badge category. A literal ` / ` inside a descriptive field remains part of that field. Text can wrap at whitespace; a badge and its prefix stay together. Unbroken words retain their full width and expand the fitted viewport when necessary.

`nodes[].drawing.details` contains the corresponding placed rows. Text items carry coordinates, font size, and stroke width. Badge items carry rectangle coordinates/dimensions and `textX`/`textY`. Separators are explicit placed text. Fitting and serialization consume these same positions, so neither has to split or reinterpret a formatted detail string.

## Inputs, failures, and compatibility

Use a successful compiler result, or a validated normalized model and compatible layout from core. Scene preparation checks plain layout/options containers, node/element/attribute records, segment records and endpoints, and finite numeric canvas/point data. `legend` must be boolean when supplied. Invalid shapes or DSL values are diagnosed in core before rendering; scene preparation does not replace semantic validation. Malformed records throw `TypeError`; nonfinite or unsupported coordinate magnitudes and invalid derived bounds throw `RangeError`. Full rendering additionally validates theme paints and XML text. XML-invalid characters in raw details are rejected even when wrapping would remove them.

Scene records are read-only by convention. Recompute after changing inputs; do not mutate, persist as a versioned interchange format, or submit arbitrary scene records as public rendering inputs. The scene retains original `node` references for inspection, but the serializer uses the prepared `drawing` data. The serializer itself is internal and is not exported from the package. Use core's JSON export for route interchange.

Existing renderer exports and signatures remain available. `formatTopoDetail` still returns a display string. `nodes[].detail` and string-array `detailRows` remain display-oriented compatibility fields; use `drawing.detailRecords` when meaning matters. Free-form text may now wrap differently because it is no longer split into guessed fields or badges. Byte-for-byte SVG whitespace is not an API contract.

`renderDetailLine(string, ...)` intentionally retains historical label/level recognition. Explicit `renderNode` detail-string or detail-row overrides use that same compatibility behavior. These helpers cannot recover canonical semantics from arbitrary text; prefer the normal model/scene pipeline for route rendering. Default `renderNode`, `renderNodes`, and full rendering use structured records. No migration is required for normal callers. Callers that used note text to obtain badges should move the fact to the corresponding supported DSL field.

Fragment helpers do not fit a complete canvas or repeat core's semantic validation. Their callers own composition and valid normalized input. Numeric path preparation and XML/paint encoding still reject invalid output values.

## Verification

Tests inspect pure rung, stage, redirection, text, badge, symbol, and panel placements independently of XML. End-to-end tests parse output with an independent XML parser across languages and shapes, verify exact domain facts and literal notes, exercise compatibility helpers and malformed inputs, and check deterministic output without input mutation. Existing canvas tests inspect emitted primitives and verify they fit the viewport. Each test uses one assertion; the coverage target complements these behavior and failure checks.
