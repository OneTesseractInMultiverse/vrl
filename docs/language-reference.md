# VRL Language Reference

VRL documents are text files. The implemented vertical slice supports a compact line-oriented style where every non-empty line starts with a statement keyword. Comments start with `#` outside quoted strings.

## Route

Every document starts with a route statement.

```vrl
route "Rio Azul"
```

The route name is required. It becomes the title used by JSON export and renderers.

## Metadata

Metadata is represented as attributes on one or more `metadata` lines.

```vrl
metadata country="Costa Rica" region="Cartago" difficulty="V4 A3 III"
metadata estimated_time="4h" season="dry-season" entrance_elevation=1240m exit_elevation=1170m
```

Metadata values are normalized only when the field is measurement-bearing, such as `total_distance=1800m`, `total_descent=260m`, `entrance_elevation=1240m`, or `exit_elevation=1170m`.

## Elements

The first slice supports these ordered elements: `start`, `exit`, `walk`, `rappel`, `downclimb`, `climb`, `pool`, `hazard`, and `note`. Order is meaningful and is preserved by the normalized model and renderer.

```vrl
metadata country="Costa Rica" region="Cartago" difficulty="V4 A3 III" entrance_elevation=1240m exit_elevation=1170m
start "Entrance"
walk distance=120m note="Riverbed approach"
rappel "R1" height=35m rope=70m traverse=50m anchor=bolts anchor_count=2 station=left landing=pool flow=medium shape=ladder inclination=80% stages=20m+15m redirections=12m:left,27m:right
pool type=deep
downclimb "D1" height=4m exposure=medium anchor_count=1 station=right landing=ledge shape=ladder inclination=65%
climb "C1" height=5m exposure=medium station=right landing=trail shape=ladder inclination=55%
hazard type=swift_water severity=high note="Avoid after heavy rain"
exit "Left bank trail"
note "Low-water route only"
```

Measurements must use meters in the first release. Values such as `35m`, `120m`, and `4.5m` are accepted and normalized to `{ value, unit, meters }`.

## Elevation Profile

When both `entrance_elevation` and `exit_elevation` are present on metadata, VRL computes the route profile against that total elevation change. Rappels and downclimbs contribute `height * inclination%` as vertical descent; climbs contribute the same value upward. Any remaining descent between entrance and exit is distributed across non-technical progression segments so the final exit node lands at the provided elevation.

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

`shape=ladder` is the default visual behavior for rappels, downclimbs, and climbs. It renders stepped shelves, a sloped or vertical technical line with an arrow, and small rungs so the diagram reads like a classic canyon profile. `inclination=100%` is vertical; lower values slant the ladder in the direction of travel. Climbs use the same field but render upward.

Use `redirection` or `redirections` when a single rappel has intermediate redirection anchors along the same rope line. The distance is measured from the rappel head and must be greater than `0m` and shorter than the rappel `height`; the side must be `left`, `right`, `center`, or `unknown`. Use `stages` when that single rappel should show multiple rope-length sections, for example before and after a redirection. Use two separate `rappel` elements when the canyon has two actual rappel stations.

## Diagnostics

Diagnostics are structured objects with `kind`, `severity`, `message`, `location`, and `suggestion`. Syntax diagnostics come from parsing. Validation diagnostics come from semantic route checks. Rope length shorter than rappel height is currently a warning so teams can encode routes that require interpretation while still surfacing the issue.

## Future Block Syntax

The target language also includes richer block syntax for routes, sections, access, rescue notes, and organization-specific custom attributes. The first parser tolerates braces around statements, but nested section semantics are a future milestone.
