# Symbology

VRL uses canyon topo abbreviations rather than decorative invented markers. The renderer supports three profiles:

```text
federation  shared default profile
french      French-oriented labels
spanish     Spanish-oriented labels
```

The shared canyon symbols in the current implementation are deliberately conservative:

```text
R    rappel / rapel
D    downclimb / desescalade / destrepe
C    climb / escalade / escalada
M    marche / movement on foot
V    vasque / pool
!    hazard
i    note
```

The Spanish profile uses `P` for pool/poza and `A` for walking/on-foot travel. The French profile uses `DEP` and `SORT` for start and exit labels, while the Spanish profile uses `INI` and `FIN`.

The renderer does not copy federation artwork. It renders these as text symbols on the route profile and explains the active profile in the SVG legend so public documentation stays portable and easy to diff. Classic ladder-style technical slopes, inclination, rungs, segment labels, station ticks, anchor-count marks, rappel stage labels, and mid-rappel redirection anchors are diagram structure and route detail, not a new general symbol family.

## Anchor Count Shorthand

Anchor-count circles are bounded visual shorthand for the declared quantity. Up to four circles are drawn; additional anchors use `+N` beside the row. For example, four circles and `+1` mean five declared anchors, and detail/accessibility text says `5 anchors`. Omitting `anchor_count` leaves the count unknown. Circle positions do not describe the physical arrangement of a station.

This overflow notation is a VRL presentation convention, not a federation-standard symbol. Full counts remain in the model, JSON, localized text, and accessible diagram description. See the [anchor-count contract](language-reference.md#anchor-counts).

## Federation Context

The profiles are grounded in federation canyoning/barranquismo terminology, not copied artwork. FFME describes canyon progression through walking, swimming, jumps, slides, downclimbing, rappels, and rope techniques. FEDME describes barranquismo as progression through canyons or ravines on foot and/or swimming, with differentiated technical materials, and its safety/equipment discussion includes rappel heads, handlines, intermediate points, deviations, and technical signage.

Reference pages:

```text
https://www.ffme.fr/montagne-canyon/canyon/pratiquer-canyon/
https://www.ffme.fr/montagne-canyon/canyon/fiches-canyon/
https://fedme.es/barranquismo/
```

## Tropical Extension

VRL adds one non-federation extension for tropical canyons. This fragment is checked after a `route "Documentation fragment"` header; its hazards are annotations and create no physical traversal:

```vrl example=tropical-hazards kind=fragment
hazard type=snake severity=medium note="Potential snake area"
hazard type=snake_dense_area severity=high note="Dense snake area"
```

These render as `SN` with a simple snake mark. This is intentionally marked as a VRL extension, not a French or Spanish federation standard.

## Optional canyon style

Use `options.style: "soft-terrain"` for a neutral ground wash, directed technical curves, symbolic pools and explicit rope/anchor information. Classic rendering remains the default. This renderer-owned option preserves the domain model and canonical traversal; framework adapters forward it. These are project schematic conventions, not a claim of federation approval. See the [style contract and visual gallery](soft-terrain.md) for examples, language/theme compatibility, failure behavior and limitations.

## Selective annotation icons

`symbols: "annotations"` with `style: "soft-terrain"` adds selected start, finish, bolt, tree and slippery pictograms beside explicit labels. `symbols: "minimal"` preserves identical placement and facts without pictograms; `symbols: "icons"` retains primary node pictograms. Omission preserves classic symbols. See the [mapping, compatibility, failures and gallery](annotation-icons.md).

Row flow adds paired continuation letters with explicit source/target section numbers, and a zigzag beside compressed walking distances. These are schematic reading cues, not additional route events. Stage ticks, redirection diamonds and station marks remain attached to one complete section with explicit technical text. See [readable rows](row-layout.md).

[Monochrome rows](accessible-output.md) use dashed contours, solid directed ropes, outlined/waved pools and explicit text for stations, anchors and hazards. Meaning does not depend on hue or the decorative terrain wash. These are project conventions, not federation-standard or certified accessibility symbols. Full ordered descriptions remain identical across icon/minimal and color/monochrome choices.

The [revision 1 canyon visual specification](visual-specification.md) defines hierarchy, states, technical shapes, convention sources and deferred defaults; its gallery covers every current element kind and representative dense combinations.
