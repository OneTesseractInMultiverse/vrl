# Changelog

This project follows Semantic Versioning once public releases begin.

## 0.1.0 - Unreleased

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
