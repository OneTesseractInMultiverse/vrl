# Language contract examples

These examples complement the [language reference](language-reference.md). Fences carry a stable example ID and a kind: `document` is a complete valid document, `fragment` requires an explicit fixture prefix, and `invalid` deliberately fails. The executable contracts compare selected normalized facts, complete diagnostic categories/codes/locations, technical ownership and direction, physical boundaries, annotation attachment, and suppressed outputs. See [maintaining executable documentation](documentation-contracts.md).

## Literal text and cosmetic braces

Braces do not establish scope or require balancing. Hashes inside quotes and equals signs inside note text remain literal. This complete document has one note containing `A=B # inside` and no physical traversal.

```vrl example=cosmetic-braces kind=document
}
{
route "Cosmetic" {
note "A=B # inside" {
```

An unsupported escape is a syntax error at the backslash, not a decoded newline. This example intentionally fails on line 2, column 10. The parser can retain a partial AST for diagnostics, but compilation produces no model, layout or JSON.

```vrl example=unsupported-escape kind=invalid
route "Escapes"
note "bad\n"
```

## Declaration and key conflicts

A second route is a syntax error even when its name matches the first.

```vrl example=duplicate-route kind=invalid
route "Once"
route "Once"
```

Metadata cannot resume after a note, even though that note creates no physical segment.

```vrl example=late-metadata kind=invalid
route "Order"
note "Conditions"
metadata country=CR
```

Repeated keys do not override earlier values. The duplicate below is reported at line 2, column 18, with the original key retained as related source information.

```vrl example=duplicate-key kind=invalid
route "Keys"
walk distance=1m distance=2m
```

## Applicability and extension data

Unknown descriptive attributes and out-of-scope enum names go into `extensions`; numeric names stay reserved in every context. Here metadata `flow` and the hazard's descriptive `type` remain extension strings, while element `flow` and `severity` are validated known fields.

```vrl example=extension-fields kind=document
route "Extensions"
metadata survey_team="A&B" flow=descriptive
start
hazard type=swift_water severity=high flow=medium survey_team=local
exit
```

A pool's `type` uses its vocabulary and cannot use an arbitrary hazard kind.

```vrl example=invalid-pool-type kind=invalid
route "Vocabulary"
pool type=swift_water
```

An inapplicable enum name may be extension data, but an invalid numeric token cannot bypass validation by appearing on a hazard.

```vrl example=reserved-numeric kind=invalid
route "Reserved"
hazard type=rockfall height=banana
```

## Units, precision and ranges

The positive measurement boundary is one millionth of a meter. Negative and zero endpoint elevations are valid; this route descends from 0 m to −0.000001 m. The count is preserved as its declared string; renderer symbol limits do not change it.

```vrl example=numeric-boundaries kind=document
route "Precision"
metadata entrance_elevation=0m exit_elevation=-0.000001m
rappel height=0.000001m rope=1000000000m anchor_count=9007199254740991 inclination=100%
```

Feet and scientific notation are not accepted metric source spellings.

```vrl example=invalid-unit kind=invalid
route "Units"
walk distance=1ft
```

```vrl example=invalid-exponent kind=invalid
route "Exponent"
walk distance=1e2m
```

The seventh fractional digit is rejected even when it is zero; zero-length progression and values beyond the source magnitude bound are also errors.

```vrl example=invalid-precision kind=invalid
route "Precision"
walk distance=0.0000010m
```

```vrl example=invalid-zero kind=invalid
route "Zero"
walk distance=0m
```

```vrl example=invalid-magnitude kind=invalid
route "Magnitude"
walk distance=1000000001m
```

## Identity and endpoints

Explicit IDs share one namespace across element types. The second `shared` below is a validation error; neither technical output nor JSON is produced.

```vrl example=duplicate-identifier kind=invalid
route "Identity"
walk shared distance=1m
rappel shared height=2m rope=4m
```

Annotations may follow exit, but a physical progression element cannot.

```vrl example=progression-after-exit kind=invalid
route "Boundary"
exit
walk distance=1m
```

Annotations cannot absorb inconsistent measured endpoints. The single technical event declares a 10 m descent, so it cannot account for a 20 m descent.

```vrl example=contradictory-endpoints kind=invalid
route "Endpoints"
metadata entrance_elevation=100m exit_elevation=80m
rappel height=10m rope=20m
note "At base"
```

## Nonblocking warnings and blocking errors

A declared rope shorter than the rappel height remains a warning. Both declared values survive normalization, and the technical event still descends 10 m; the warning is not equipment advice.

```vrl example=short-rope-warning kind=document
route "Declared rope"
rappel height=10m rope=5m
```

A stage sum differing by one millionth produces a warning without rewriting the stage lengths. The exact matching example is in the language reference.

```vrl example=stage-mismatch-warning kind=document
route "Declared stages"
rappel height=0.3m rope=1m stages=0.1m+0.200001m
```

Empty list entries are errors rather than omitted stages.

```vrl example=empty-stage kind=invalid
route "Stages"
rappel height=30m rope=60m stages=10m++20m
```

## Processing budgets

With `{ limits: { maxElements: 1 } }`, this example deliberately fails on the second element at line 3. The prefix AST is for diagnostic recovery only. The fixture supplies that documented compiler option; the DSL does not configure budgets.

```vrl example=element-budget kind=invalid
route "Budget"
start
exit
```

## API and rendering boundaries

Source failures return diagnostics; invalid caller options and malformed port outputs throw exceptions. Successful compilation does not certify that arbitrary supplied SVG is safe, or that text is XML-compatible. The renderer rejects XML-invalid characters; supplied `diagram.svg` is trusted markup and bypasses compiler/render validation. Executable API examples and boundary tests are linked from the [public contract policy](public-contracts.md), [API reference](api-reference.md), and [architecture](architecture.md). These boundaries must not be converted into source warnings.
