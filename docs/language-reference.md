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
metadata estimated_time="4h" season="dry-season"
```

Metadata values are normalized only when the field is measurement-bearing, such as `total_distance=1800m` or `total_descent=260m`.

## Elements

The first slice supports these ordered elements: `start`, `exit`, `walk`, `rappel`, `downclimb`, `pool`, `hazard`, and `note`. Order is meaningful and is preserved by the normalized model and renderer.

```vrl
start "Entrance"
walk distance=120m note="Riverbed approach"
rappel "R1" height=35m rope=70m anchor=bolts
pool type=deep
downclimb "D1" height=4m exposure=medium
hazard type=swift_water severity=high note="Avoid after heavy rain"
exit "Left bank trail"
note "Low-water route only"
```

Measurements must use meters in the first release. Values such as `35m`, `120m`, and `4.5m` are accepted and normalized to `{ value, unit, meters }`.

## Diagnostics

Diagnostics are structured objects with `kind`, `severity`, `message`, `location`, and `suggestion`. Syntax diagnostics come from parsing. Validation diagnostics come from semantic route checks. Rope length shorter than rappel height is currently a warning so teams can encode routes that require interpretation while still surfacing the issue.

## Future Block Syntax

The target language also includes richer block syntax for routes, sections, access, rescue notes, and organization-specific custom attributes. The first parser tolerates braces around statements, but nested section semantics are a future milestone.
