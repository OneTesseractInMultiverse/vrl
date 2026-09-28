# Accessible route descriptions and monochrome canyon rows

VRL exposes complete ordered route facts as text, links that text to the SVG image, and offers monochrome soft-terrain rows. These are presentation features of this checkout for the next minor release; they do not change the DSL or persisted route model. The [fictional comparison gallery](assets/accessibility/index.html) uses the same two-rappel canyon in every mode.

## Readable monochrome output

```js
import { compileRoute } from "@subvertic/vrl-core";
import { renderTopoSvg } from "@subvertic/vrl-render-svg";

const result = compileRoute(source, { layout: { width: 320 } });
if (!result.ok) throw new Error("Invalid route");
const svg = renderTopoSvg(result.model, result.layout, {
  flow: "rows", style: "soft-terrain", symbols: "annotations",
  monochrome: true, theme: "light", idPrefix: "canyon-print"
});
```

`monochrome` defaults to `false`. It must be a boolean. `true` requires `flow: "rows"` and `style: "soft-terrain"`; other combinations throw `TypeError`. Nonempty `themeTokens` overrides are rejected in monochrome mode so the controlled palette remains achromatic. An omitted or empty override record is accepted. Color mode retains the existing theme override contract.

Light monochrome uses dark ink on white paper. Dark monochrome uses light ink on a dark canvas for screens; use light mode when printing without backgrounds. Both retain these cues:

| Fact or relationship | Non-color cue |
| --- | --- |
| Schematic terrain | Dashed contour; the faint wash is decorative |
| Technical route and movement | Solid directed rope curve, movement label, physical height and declared rope text |
| Pool/water | Basin outline, water wave where present, explicit type/unknown text; dry pools omit waves |
| Station | Left/right tick and full station word; center, floor, tree, natural and unknown remain words without invented lateral ticks |
| Anchors | Anchor type and complete count in text, including unknown count |
| Hazard/note | Literal type and note at its owning row/boundary; pictograms are redundant |
| Continuation/compressed walking or swimming | Matched continuation codes, direction and explicitly labeled walking/swimming distance/break |

The supported row widths are 320–2048 integer layout units. Default row body text is at least 14 units, headings 16, icon slots 24 and essential row strokes 2. The SVG's intrinsic minimum width prevents automatic text shrinkage: allow overflow or request a supported smaller layout. External images and caller CSS can still scale or override these dimensions. These criteria do not apply to a continuous profile squeezed into a narrow host.

Tests calculate contrast independently from emitted default paints for light/dark color and monochrome rows: normal text must meet 4.5:1 and essential row strokes 3:1 against the canvas. These thresholds follow [WCAG text contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html) and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html). Decorative washes are excluded; redundant icons are accompanied by qualifying text. The checks cover these defaults and fixtures, not arbitrary themes, CSS, printers or accessibility conformance certification.

## One logical description, independent of appearance

`describeRoute(model, options?)` returns an owned `RouteDescription` with `title`, resolved `language`, `introduction`, `metadata`, ordered `entries`, `empty` and complete plain `text`. Each entry contains the original zero-based `elementIndex`, `id`, `type`, `title`, ordered `facts` and canonical annotation `pointIndex` (null for non-annotations or unattached annotations). Its plain description numbers entries from one; textual annotation boundaries also use one-based numbers. Empty routes explicitly state that no elements exist.

The projection reads normalized fields and domain traversal, never SVG, row coordinates or localized diagram strings. Technical movement and signed vertical change come from canonical segments. Physical height, inclination, declared rope, stages and redirections retain their distinct meanings. Missing critical height/distance, rappel anchor/count/rope and measured pool depth remain unknown, never zero. Pool type is categorical: even `type=deep` does not establish a measured depth. Model revision 4 supports optional typed pool `depth`: supplied zero/metric/unknown values produce one depth fact, replacing the unknown placeholder when known. Historical `extensions.depth` stays a literal additional field; rendering does not reinterpret it. See [depth semantics and migration](pool-depth.md).

All supplied metadata, attributes and extensions remain present in stable field order. Known field labels/values use the existing English/Spanish selection policy; authored prose and unfamiliar extension values remain literal, not translated. Notes and hazards retain source order and their canonical boundary, including an explicit unattached state. Changes to icons, width, theme, flow or monochrome do not change the facts. Rope declarations are not equipment requirements, and the introduction states that the drawing is schematic and not to scale.

The public functions expect a valid normalized model or compatible view, as other low-level rendering helpers do. They are not a new validator for arbitrary imported JSON. Plain-option validation and existing language fallback apply. Projection does not mutate the supplied model. Serialization escapes all supplied text and applies the renderer's XML-character policy; unsupported characters fail instead of being silently removed.

## Inline SVG and framework responsibilities

Every generated SVG owns `role="img"`, a localized `<title id="<prefix>-title">`, a full `<desc id="<prefix>-description">`, and matching `aria-labelledby`/`aria-describedby` references. `lang` and `xml:lang` identify its text language. The same metadata travels with standalone SVG. This follows [SVG title/description semantics](https://www.w3.org/TR/SVG/struct.html) and [ARIA naming and description guidance](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/).

React, Svelte, SvelteKit and Svelte markup wrappers have **no role by default**. The SVG owns the image announcement; warnings remain outside it. Existing custom wrapper `role` props are accepted, but assigning `img` can conceal or duplicate the inner semantics. Leave the wrapper role absent for the supported contract. Pictograms remain decorative (`aria-hidden`, not focusable); the image description and visible text carry their meaning.

Use a distinct stable `idPrefix` per occurrence. The namespace now covers `arrow`, `title`, `description` and adjacent `text` IDs. There is no global counter or collision repair. SSR and hydration must reuse the same prefix; separately supplied precomputed states retain their original SVG and IDs without rewriting. Regenerate old cached states to adopt the new metadata. See [namespace ownership](svg-identifiers.md) and [state trust](diagram-state.md).

## External images and visible HTML

Internal SVG metadata alone does not name or describe an external HTML image. Supply an appropriate `alt`, and include a visible alternative for the complete ordered facts. `renderRouteText(model, options?)` returns an escaped native HTML section with a visible heading, metadata, an ordered element list and each element's facts. It accepts language/locale/symbology selection and `idPrefix`; it has no layout dependency and does not hide content.

```js
import { renderRouteText } from "@subvertic/vrl-render-svg";

const alternative = renderRouteText(result.model, {
  language: "en", idPrefix: "external-canyon"
});
const html = '<img src="canyon.svg" alt="Canyon topo" aria-describedby="external-canyon-text">'
  + alternative;
```

`<prefix>-text` differs from the SVG description ID, allowing adjacent text and one inline diagram to share the same occurrence prefix. Repeated occurrences still need distinct prefixes. The section deliberately has no `aria-label`: naming a referenced container can cause browsers to use only that label as the image description, dropping its descendant route facts. The visible heading preserves the title without replacing the content alternative. Actual external-image accessibility-tree tests guard this behavior. The HTML list remains useful independently of image support; applications may instead build their own native UI from `describeRoute`. Do not insert its raw plain-text values into HTML without encoding.

## Evidence and print review

Workspace tests compare the entire English/Spanish description against independently authored fixture facts, exercise malformed options, unknowns, empty routes, legacy records, long Unicode and markup-bearing text, resolve namespace references, and check non-color cues and contrast. Five deliberate faults must fail assertions: lost pool uncertainty, missing anchor count, broken description reference, hidden image and removed water wave. Coverage remains a supporting metric.

Packed React/Svelte/SvelteKit applications inspect Chromium's actual accessibility tree in SSR and hydrated states across continuous, row, color, monochrome, light/dark and icon/minimal variants. Each image has the expected name and complete independently specified description. A hidden-image negative control detects its disappearance. Print-media checks suppress decorative backgrounds and require the essential cues and facts to remain. These are automated Chromium observations, not representative screen-reader or practitioner review; both human reviews remain **pending** under the research/evaluation work, including [#34](https://github.com/OneTesseractInMultiverse/vrl/issues/34).

Reproduce the gallery and actual browser print export:

```sh
npm run accessibility:build
npm run accessibility:check
node scripts/prepare-consumers.mjs minimum
node .consumers/minimum/node_modules/playwright/cli.js install chromium
node scripts/export-accessibility-print.mjs minimum
```

The print command creates ignored `.consumers/minimum/monochrome-print.pdf` from the generated 736-unit light monochrome SVG with canvas/wash fills suppressed and browser background printing disabled. It uses a long sheet at intrinsic size, retaining all rows rather than shrinking to fit A4. Inspect the PDF for complete text, outlines, waves, arrowheads, station marks, continuations and hazard notes. This PDF is a visual print proof; it is untagged and does not establish accessible PDF reading semantics. Use the SVG/HTML alternatives for the documented accessibility contract. Print pagination and usability on particular paper/printer combinations are separate work. The source fixture is fictional and unverified field documentation.

## Compatibility and ownership

`describeRoute`, `renderRouteText`, their declaration records and `RenderOptions.monochrome` are additive next-minor presentation APIs. Scenes now carry the complete description and the four namespace IDs. Accessible SVG bytes/title metadata and default wrapper roles change intentionally; application selectors should use wrapper classes for container identity and SVG `role` for the image. Svelte may recreate inner SVG nodes during hydration; container preservation and equivalent markup are tested, not inner-node identity.

Domain rules remain in core. Renderer computation owns text/monochrome policy; SVG and HTML serializers only encode prepared facts. Framework adapters own wrapper composition. No third-party runtime dependencies, compiler ports, persisted model fields or DSL semantics are added.

Explicit swimming produces a localized movement fact and swimming-distance fact, including unknown when absent. It is never labeled walking distance or measured pool depth. Flow and notes follow in stable field order. The same facts appear in SVG and HTML; see [swimming](swimming.md).
