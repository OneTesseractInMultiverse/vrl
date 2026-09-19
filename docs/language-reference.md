# VRL Language Reference

VRL documents are text files. The implemented vertical slice supports a compact line-oriented style where every non-empty line starts with a statement keyword. Comments start with `#` outside quoted strings.

## Quoted Text, Escapes, and Token Boundaries

Double quotes delimit text within one physical line. Quoted text preserves equals signs, hashes, Unicode, and all interior whitespace, including leading/trailing spaces and literal tabs. Only two escape sequences are supported: `\"` produces a literal double quote, and `\\` produces one literal backslash. Decoding happens once, from left to right. Spellings such as `\n`, `\t`, `\u0041`, and `\#` are errors; write Unicode and hashes directly, or double a backslash when the spelling itself is intended as text.

```vrl
route "Cañón #1"
metadata description="Marker A=B; path A\\B"
start "A=B"
walk distance=1m note="Use the \"left\" bank # marked"
note "  Preserve these spaces  "
exit "Finish"
```

An attribute has an unquoted, nonempty key followed immediately by `=` and a bare or quoted value. Whitespace around `=` is not supported. The first equals sign outside quotes separates the key and value; further equals signs in a bare value are literal text. Thus `note="A=B"` is an attribute, while `start "A=B"` has a label and no attributes. Once an element's attributes begin, further tokens must be attributes.

Tokens must be separated by whitespace. A quoted value must end before another token begins: `"A"suffix`, `prefix"A"`, `"A""B"`, and `note="A"next=1` are errors. A quote can start a token or the value immediately after `=`; quoted attribute keys are not supported. An outside `#` begins a comment even without preceding whitespace. A hash inside quotes is ordinary text, and comment contents are not tokenized. Backslashes outside quotes are literal characters and do not escape comments or whitespace.

Use `""` for empty text, including an empty label, note, or text attribute. `key=` is a syntax error. Semantic rules still apply: `route ""` has a missing route name, and an empty required measurement does not satisfy that field.

For compatibility, route names, note text, and element labels/identifiers may contain whitespace-separated bare and quoted fragments. Each quoted fragment is decoded independently, and separators between fragments become one space. Prefer one quoted token when exact whitespace matters or a label contains `=`. Route and note free-text contexts retain assignment-shaped tokens literally. Statement keywords themselves must be unquoted.

LF and CRLF delimit physical lines. Quotes cannot continue across those boundaries. An unfinished string produces a syntax error at its opening quote; a dangling or unsupported escape points to the backslash; invalid adjacency points to the first unexpected character. Source lines and columns are one-based; columns count UTF-16 code units, with each tab counting as one unit. The parser skips a lexically invalid statement and continues with the next line for diagnostics. Compilation returns `ok: false` with no model, layout, or JSON when blocking diagnostics exist.

A separate trailing `{` token and standalone `}` line remain tolerated for block-style examples; block nesting and document-order validation remain outside this lexical change. Quoted braces are text. A brace directly attached to a quoted token is invalid adjacency; a brace within a bare token is literal text.

## Route

Every document starts with a route statement.

```vrl
route "Quebrada Gata"
```

The route name is required. It becomes the title used by JSON export and renderers.

## Metadata

Metadata is represented as attributes on one or more `metadata` lines.

```vrl
metadata country="Costa Rica" region="Bajos del Toro" difficulty="V3 A4 III"
metadata descent_time="5-7h" season="December-May" entrance_elevation=1300m exit_elevation=1100m
```

Metadata values are normalized only when the field is measurement-bearing, such as `total_distance=1300m`, `total_descent=200m`, `entrance_elevation=1300m`, or `exit_elevation=1100m`.

## Elements

The first slice supports these ordered elements: `start`, `exit`, `walk`, `rappel`, `downclimb`, `climb`, `pool`, `hazard`, and `note`. Source order is preserved in the normalized elements and layout nodes. Notes and hazards are annotations; the remaining elements define physical progression.

```vrl
metadata country="Costa Rica" region="Bajos del Toro" difficulty="V3 A4 III" entrance_elevation=1300m exit_elevation=1100m
start "Quebrada Pilas entrance"
walk distance=80m note="Short creek walk after the hanging bridge"
rappel "R1" height=28m rope=60m traverse=80m anchor=bolts anchor_count=2 station=left landing=pool flow=medium shape=ladder inclination=90%
pool type=shallow
downclimb "D1" height=3m exposure=medium anchor_count=1 station=right landing=pool shape=ladder inclination=60%
climb "C1" height=5m exposure=medium station=right landing=trail shape=ladder inclination=55%
hazard type=swift_water severity=high note="Dry-season weather window recommended"
exit "Old metal ladder"
note "Low-water route only"
```

Measurements must use meters in the first release. Values such as `35m`, `120m`, and `4.5m` are accepted and normalized to `{ value, unit, meters }`.

## Numeric Limits and Precision

Source measurements use ordinary decimal notation with at most six fractional digits, including trailing zeros, and an absolute magnitude no greater than `1000000000m`. Scientific notation, nonfinite values, larger magnitudes, and extra fractional digits are rejected rather than rounded. The smallest positive source measurement is `0.000001m`. These representation limits keep the six-digit fractional grid distinguishable within JavaScript's numeric precision.

| Numeric field | Accepted range |
| --- | --- |
| `entrance_elevation`, `exit_elevation` | From `-1000000000m` to `1000000000m`, including zero |
| `distance`, `height`, `rope`, `traverse`, `total_distance`, `total_descent`, `vertical_gain`, `descent` | Greater than zero, up to `1000000000m` |
| `inclination` | Greater than `0%` and at most `100%`, with up to six fractional digits; `%` may be omitted |
| `anchor_count` | Decimal integer from `1` to `9007199254740991`, without leading zeros |
| `stages`, `redirection`, `redirections` | Each contained measurement follows the same magnitude, precision, and positive-length rules |

Recognized numeric fields follow these rules in metadata and on every element. Both redirection aliases are checked if both are supplied. Existing stage/height and redirection-position checks still apply. Empty numeric fields are invalid; omit an optional field when unknown. Negative zero in a parsed measurement or percentage is normalized to positive zero, so JSON preserves its numeric meaning.

Unrecognized metadata remains text. Use `rope_inventory="1x60m"` for an inventory description; `rope=60m` is a metric measurement. The example route now uses `rope_inventory` to preserve its original description without overloading a numeric field.

Source range and precision failures are structured validation diagnostics and block compilation before normalization and layout. Computed summaries, technical distances, and layout values must remain finite, with absolute magnitude no greater than `Number.MAX_SAFE_INTEGER`. Layout settings can be individually valid yet produce coordinates outside this limit; those combinations throw `RangeError`. JSON export rejects unsupported numbers rather than silently converting them to `null`.

Normalized values and calculations use standard binary floating-point arithmetic, not exact decimal arithmetic. For example, `0.1m + 0.2m` may produce `0.30000000000000004m`; JSON retains that same value. Derived quantities may have more than six fractional digits, and pixel coordinates retain the layout's existing rounding rules. The six-digit limit applies to source spellings, not to calculated results.

## Elevation Profile

When both `entrance_elevation` and `exit_elevation` are present on metadata, VRL computes the route profile against that total elevation change. Rappels and downclimbs contribute `height * inclination%` as vertical descent; climbs contribute the same value upward. Any remaining signed elevation change is distributed across non-technical connections between progression elements. Annotations never create such connections or receive a share of that residual. Entrance metadata binds to the explicit `start`, and exit metadata binds to the explicit `exit`; if a marker is omitted, its outer physical traversal boundary is used. The default layout also enforces readable visual spacing between progression points; pass `layout.minNodeGap=0` when strict elevation scale is more important than symbol separation. The renderer keeps the technical line itself proportional to `height * inclination% * pixelsPerMeter`; readable spacing beyond that technical length is drawn as a connector after the drop or climb.

## Technical Event Boundaries

A rappel or downclimb starts at its element node and proceeds to its lower boundary. A climb ends at its element node, with its upward traversal immediately before that node. When a descent is followed directly by a climb, an intermediate boundary separates them; neither event takes precedence. A leading climb receives an implicit entry boundary, and a trailing rappel/downclimb receives an implicit final boundary. These are traversal boundaries, not additional DSL statements or named route elements.

```vrl
route "Descent and ascent"
metadata entrance_elevation=100m exit_elevation=75m
start "Entry"
rappel "R1" height=30m rope=60m
climb "C1" height=5m
exit "Finish"
```

This route has a 30 m descent to an intermediate elevation of 70 m, followed by a 5 m ascent to 75 m. Both slopes are rendered, including when readable spacing is enabled. Their net change is a 25 m descent. `inclination` applies independently to each technical feature. Stages, redirections, anchor details, and other annotations remain attached to the feature that declares them.

If technical measurements cannot match the endpoint elevations and no non-technical connection can account for the difference, compilation fails with a geometry diagnostic. When connections can absorb a residual, compilation warns that intermediate elevations are schematic estimates. A downclimb without `height` is allowed schematically with a warning; a measured endpoint profile requires that missing height. Neither case silently changes a declared climb into a descent.

### Route boundaries and annotations

A route may contain at most one `start` and one `exit`. A declared start must be the first progression element; a declared exit must be the last. Repeated markers, progression before start, and progression after exit produce blocking geometry diagnostics at the offending declaration, even without elevation metadata. Neither marker is required: implicit boundaries continue to support standalone technical features.

`note` and `hazard` statements can appear before start, between features, or after exit. Each attaches to the boundary reached after the preceding progression element: the lower end of a rappel/downclimb, the upper end of a climb, or the point of another element. Leading annotations attach to the first physical boundary. A note between a rappel and a climb therefore attaches to their shared lower boundary. Feature attributes such as `note=`, anchor details, and redirections still belong to the feature that declares them.

Annotations are drawn beside their attachment point and retain its physical elevation. Adding, removing, or moving annotations does not change progression coordinates, technical ownership, residual allocation, or endpoint elevations. Multiple annotations at one boundary receive separate visual rows without adding route segments. Their symbol positions are presentation coordinates, not extra measured positions. An annotation-only document has no physical traversal, and its annotations have no measured elevation; it cannot explain a nonzero endpoint elevation change.

```vrl
route "Annotated exit"
metadata entrance_elevation=100m exit_elevation=0m
note "Seasonal conditions"
start "Entry"
walk distance=10m
exit "Finish"
note "Trail continues left"
hazard type=swift_water severity=high
```

Here `Entry` remains at 100 m and `Finish` at 0 m. The last two annotations attach to the exit at 0 m. Moving the leading note after the walk changes only its attachment, not the physical profile. The unmeasured walk/exit connections trigger a warning that intermediate elevations are estimates. Technical-only contradictions remain errors even when surrounded by annotations. Final boundary elevation is pinned to the supplied value after consistency validation; intermediate arithmetic retains floating-point precision.

## Expressive Descent Attributes

The parser accepts arbitrary `key=value` attributes, but the first validated rendering fields are:

```text
height        metric descent height, required for rappel
rope          metric rope length, required for rappel
traverse      metric horizontal or approach distance shown on the segment
anchor        bolts, natural, tree, thread, removable, fixed, unknown, or mixed
anchor_count  positive integer, rendered as station anchor marks
station       left, right, center, floor, tree, natural, or unknown
landing       pool, ledge, dry, chaos, gallery, trail, or unknown
flow          dry, low, medium, or high
shape         ladder, direct, or slab
inclination   percentage from 1% to 100%, accepted as 75 or 75%
redirection   one mid-rappel redirection anchor, such as 12m:left
redirections  comma-separated mid-rappel redirection anchors, such as 12m:left,27m:right
stages        plus-separated rappel stage lengths, such as 20m+15m
```

The SVG canvas expands to contain the full presentation, including labels, technical details, annotations, the route summary, and the legend. Requested layout width/height are minimum framing dimensions. The summary has its own row above the route, and the legend follows the lowest label. Detail rows wrap once using the requested width; unbroken text grows the canvas. Fitting can produce a negative `viewBox` origin and does not change physical measurements or route coordinates. It does not paginate long routes. See the [complete bounds API](api-reference.md#complete-diagram-bounds) for deterministic text estimates, dimension failures, and custom embedding rules.

The SVG renderer labels ambiguous diagram detail fields, so `flow=medium` appears as `flow: medium` and `exposure=medium` appears as `exposure: medium`. Flow, exposure, hazard severity, and inclination values render as category-colored badges. Values such as `dry`, `low`, `medium`, `high`, and `critical` share the color of their field category instead of using separate intensity colors. The default diagram legend explains the active topo abbreviation profile and uses the same category colors to explain supported flow, exposure, severity, and inclination values in the selected diagram language.

`shape=ladder` is the default visual behavior for rappels, downclimbs, and climbs. It renders stepped shelves, a sloped or vertical technical line with an arrow, and small rungs so the diagram reads like a classic canyon profile. `inclination=100%` is vertical; lower values slant the ladder in the direction of travel and shorten the vertical contribution relative to the element height. Climbs use the same field but render upward.

Use `redirection` or `redirections` when a single rappel has intermediate redirection anchors along the same rope line. The distance is measured from the rappel head and must be greater than `0m` and shorter than the rappel `height`; the side must be `left`, `right`, `center`, or `unknown`. Use `stages` when that single rappel should show multiple rope-length sections, for example before and after a redirection. Use two separate `rappel` elements when the canyon has two actual rappel stations.

## Diagnostics

Diagnostics are structured objects with `kind`, `severity`, `message`, `location`, and `suggestion`. Syntax diagnostics come from parsing. Validation diagnostics come from semantic route checks. Rope length shorter than rappel height is currently a warning so teams can encode routes that require interpretation while still surfacing the issue.

## Future Block Syntax

The target language also includes richer block syntax for routes, sections, access, rescue notes, and organization-specific custom attributes. The first parser tolerates braces around statements, but nested section semantics are a future milestone.
