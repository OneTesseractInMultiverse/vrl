# Changelog

This project follows Semantic Versioning once public releases begin.

## 0.1.0 - Unreleased

- Bound source measurements to an absolute magnitude of 1000000000m and six fractional digits; reject nonfinite conversions, unsafe anchor counts, and invalid numeric fields in metadata and all element types. Preserve valid zero/negative elevations and canonicalize negative zero.
- Guard computed model/layout quantities and custom compiler port outputs; JSON export rejects unsupported numbers instead of silently writing null. Document numeric limits and binary floating-point precision.
- Rename the example's descriptive metadata `rope="1x60m"` to `rope_inventory="1x60m"`, keeping `rope` consistently numeric.
- Separate note/hazard annotations from physical traversal and attach them to reached boundaries. Preserve source-order nodes, annotation visibility, technical ownership, and elevation profiles when annotations move.
- Bind endpoint elevations to explicit start/exit markers or implicit outer boundaries. Reject duplicate or misplaced markers, and prevent annotations from absorbing residual elevation or hiding contradictory technical profiles.
- Add `traversal.annotations` and annotation-node `anchorPointIndex`; cached models from before this change must be re-normalized. Document attachment rules and the distinction between physical points and visual annotation rows.

- Add a dependency-free lexer with typed tokens, original source spans, explicit quoted forms, and assignment separators outside quotes. Preserve labels such as `start "A=B"` and decode supported escapes exactly once.
- Report unfinished strings/escapes, unsupported escapes, and invalid token adjacency as blocking syntax diagnostics. Document lexical rules and compatibility behavior; raw token/comment helpers now throw structured `SyntaxError` on malformed input.
- Validate finite numeric layout configuration and supported renderer themes/paint before rendering; XML-encode all dynamic SVG attributes.
- Reject numeric strings, invalid ranges, unknown layout/theme-token keys, and unsupported paint syntax. Invalid horizontal scales and theme names no longer silently select defaults; configuration errors throw `TypeError` or `RangeError`.
- Document the trusted-markup contract for caller-supplied `diagram.svg`. Add independent XML structure, valid configuration, and deliberate failure regressions, using a test-only XML parser without adding runtime dependencies.
- Preserve every adjacent rappel, downclimb, and climb through canonical technical traversal segments, including leading climbs and trailing descents.
- Diagnose inconsistent and underdetermined elevation geometry; never distribute residual elevation over declared technical motion.
- Add normalized traversal and positioned segment contracts. Custom node-only renderer layouts must be recomputed; ambiguous single-owner helper calls now fail explicitly.
- Add independent direction, elevation, annotation, boundary, determinism, and failure regressions for all nine ordered technical-element pairs.

Initial vertical slice:

- Core parser, validation, normalization, layout, and JSON export.
- SVG renderer with federation-oriented symbology profiles and a tropical snake hazard extension.
- React and Svelte adapters.
- Self-contained test suite with 100 percent coverage thresholds.
- Open source project scaffolding for MIT-licensed npm publication.
