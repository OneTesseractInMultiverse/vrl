# VRL Language Reference

VRL documents are text files. The implemented vertical slice supports a compact line-oriented style where every non-empty line starts with a statement keyword. Comments start with `#` outside quoted strings.

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

The first slice supports these ordered elements: `start`, `exit`, `walk`, `rappel`, `downclimb`, `climb`, `pool`, `hazard`, and `note`. Order is meaningful and is preserved by the normalized model and renderer.

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

## Elevation Profile

When both `entrance_elevation` and `exit_elevation` are present on metadata, VRL computes the route profile against that total elevation change. Rappels and downclimbs contribute `height * inclination%` as vertical descent; climbs contribute the same value upward. Any remaining descent between entrance and exit is distributed across non-technical progression segments so the final exit node lands at the provided elevation. The default layout also enforces readable visual spacing between nearby nodes, so dense hazards, pools, stations, and rappels do not stack their symbols; pass `layout.minNodeGap=0` when strict elevation scale is more important than symbol separation. The renderer keeps the technical line itself proportional to `height * inclination% * pixelsPerMeter`; readable spacing beyond that technical length is drawn as a connector after the drop or climb.

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

The SVG renderer labels ambiguous diagram detail fields, so `flow=medium` appears as `flow: medium` and `exposure=medium` appears as `exposure: medium`. Flow, exposure, hazard severity, and inclination values render as category-colored badges. Values such as `dry`, `low`, `medium`, `high`, and `critical` share the color of their field category instead of using separate intensity colors. The default diagram legend explains the active topo abbreviation profile and uses the same category colors to explain supported flow, exposure, severity, and inclination values in the selected diagram language.

`shape=ladder` is the default visual behavior for rappels, downclimbs, and climbs. It renders stepped shelves, a sloped or vertical technical line with an arrow, and small rungs so the diagram reads like a classic canyon profile. `inclination=100%` is vertical; lower values slant the ladder in the direction of travel and shorten the vertical contribution relative to the element height. Climbs use the same field but render upward.

Use `redirection` or `redirections` when a single rappel has intermediate redirection anchors along the same rope line. The distance is measured from the rappel head and must be greater than `0m` and shorter than the rappel `height`; the side must be `left`, `right`, `center`, or `unknown`. Use `stages` when that single rappel should show multiple rope-length sections, for example before and after a redirection. Use two separate `rappel` elements when the canyon has two actual rappel stations.

## Diagnostics

Diagnostics are structured objects with `kind`, `severity`, `message`, `location`, and `suggestion`. Syntax diagnostics come from parsing. Validation diagnostics come from semantic route checks. Rope length shorter than rappel height is currently a warning so teams can encode routes that require interpretation while still surfacing the issue.

## Future Block Syntax

The target language also includes richer block syntax for routes, sections, access, rescue notes, and organization-specific custom attributes. The first parser tolerates braces around statements, but nested section semantics are a future milestone.
