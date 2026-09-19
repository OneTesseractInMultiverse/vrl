# Changelog

This project follows Semantic Versioning once public releases begin.

## 0.1.0 - Unreleased

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
