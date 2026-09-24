# Contributing

VRL code should keep the architecture boundary clear. Domain code must remain independent from UI frameworks, browser APIs, file systems, HTTP clients, local storage, package managers, and services. Application services may coordinate computations and ports, but they should not inline parser rules, validation rules, layout math, or SVG path construction.

Every function should have one reason to change. Measurement parsing should not know about SVG. Validation should not draw. React and Svelte adapters should not implement route semantics. Renderers should not parse source text.

Tests must be self-contained. They should not require network access, databases, secrets, local configuration, browser state, or manual setup. Each test function should contain exactly one assertion. Split behavior checks into separate tests with focused names.

Documentation examples should stay executable or parseable. When adding a VRL snippet, add a test fixture or parser test so docs cannot drift away from implementation.

Renderer changes must preserve the separation between scene computations and SVG encoding. Add or update pure scene records for geometry and labels, and let serializers consume them without reconstructing domain facts from display text. Test scene coordinates and category/value invariants independently of XML, then verify complete output and failure behavior through public boundaries. See [rendering scenes](rendering-scene.md).
