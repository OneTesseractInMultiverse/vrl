# VRL Architecture

VRL follows strict hexagonal architecture. The core package owns pure domain concepts, parser contracts, validation rules, normalization, layout computation, and application use cases. External packages adapt that core into SVG, React, Svelte, and SvelteKit surfaces.

```mermaid
flowchart LR
  React[React Adapter] --> App[Application Use Cases]
  Svelte[Svelte Adapter] --> App
  SvelteKit[SvelteKit Load Adapter] --> Svelte
  SVG[SVG Renderer Adapter] --> Domain[Domain Model]
  App --> Parser[Parser]
  App --> Validator[Validator]
  App --> Domain
  App --> Layout[Layout Computation]
```

The domain layer has no dependency on framework code, browser APIs, file systems, HTTP clients, storage, or renderer implementations. It receives source text and plain JavaScript values, then returns structured data. Application services coordinate the pure computations without owning parsing rules, validation logic, or drawing logic.

The renderer package receives a normalized route model and a layout. It does not parse source text and it does not validate safety rules. Its job is to convert stable route data into accessible SVG markup.

Configuration validation belongs at the boundary that owns it. Core's `layout/options.js` validates numeric layout inputs; its layout entry points coordinate validation and position computation. The SVG adapter's `render-options.js` checks incoming canvas geometry and renderer settings, `paint.js` defines the supported paint grammar, and `attributes.js` serializes attribute values. SVG color and XML rules stay in the adapter and do not enter the domain. Pure validation and encoding helpers perform no I/O.

The renderer's `xml.js` owns the shared XML 1.0 character policy for text and attributes, keeping those format restrictions outside the core. `escapeXml` coordinates string conversion, character validation, and pure encoding. Summary preparation transforms raw display text before sizing; serialization only escapes the prepared heading. Detail serialization validates the original text independently of prepared rows, so whitespace wrapping cannot hide an invalid control character. XML-incompatible text produces a `TypeError` rather than replacement text or a partial diagram.

Framework state factories propagate configuration exceptions. Precomputed `diagram.svg` explicitly bypasses these boundaries and is trusted markup owned by the embedding application; adapters do not sanitize it. This contract is documented in the API reference and security policy.

Tests parse generated SVG with a strict independent XML parser to check structure and injection resistance, alongside accepted-value and failure tests. That parser is a root development dependency only. The published core and renderer retain zero third-party runtime dependencies.

Framework adapters are intentionally thin. They accept framework-specific inputs, call the core application use case, and render either diagnostics or SVG markup. This makes React, Svelte, SvelteKit, Angular, CLI tools, static site generators, and future applications replaceable adapters.

## Main Modules

`domain/field-specifications.js` owns immutable field applicability, requiredness, parser selection, units, ranges, list grammar, and enum vocabularies. It depends only on the shared numeric policy. `domain/field-values.js` dispatches pure token parsing and computes field-value problems; validation and normalization consume the same specification and parsers. Existing public classification/normalization helpers retain their signatures. Unknown or out-of-context categorical names remain extension text. No schema or renderer dependency enters the domain.

`domain/stage-totals.js` compares validated source lengths as exact integer millionths using temporary `BigInt` values. This isolates decimal equality from both diagnostic formatting and the unchanged floating-point model/JSON contract.

`domain/measurements.js` parses and normalizes metric measurement tokens. The first release accepts meters and stores normalized `meters` values internally.

`domain/numeric-policy.js` owns source decimal magnitude/precision limits and the finite derived-number contract. Measurement and inclination parsing share that policy; semantic validation adds field-specific signs, percentage ranges, and safe integer count rules. Recognized numeric fields are checked before normalization regardless of their metadata/element placement. Summary, traversal, and layout computations check their outputs; geometry validation rejects unsupported numeric leaves in custom normalized models. The application coordinates numeric output checks for injected ports, and JSON serialization rejects unsupported numbers at its boundary. None of these rules depend on rendering or framework packages.

`domain/processing-limits.js` owns immutable per-call budget resolution and pure source, list, and AST limit computations. UTF-8 byte counting scans code points without allocating an encoded document; list counting scans separators without constructing measurement arrays. It depends only on domain field specifications. Domain diagnostics translate limit problems into structured errors and append diagnostic batches iteratively. No infrastructure dependency enters the policy.

The application checks source budgets before any parser port, passes resolved limits to that port, and rechecks its AST before semantic validation. The default parser also guards its standalone entry point, processes bounded lines incrementally, and stops before retaining an over-budget statement. Coordinators propagate limit results without catching unrelated programming exceptions. Document budgets do not constrain caller-owned low-level helper inputs or arbitrary output growth in custom ports.

`domain/model.js` coordinates route normalization and creates route elements, normalizes measurement-bearing attributes, rappel redirections, rappel stages, and computes summary values such as highest rappel, required rope, entrance elevation, exit elevation, and total elevation change.

`domain/element-identifiers.js` owns the element identity policy and allocation computation. It checks explicit IDs across the whole route, reserves all of them before generating any, and uses per-call counters and a set to skip reserved names without restarting scans. Domain problems are plain records; `validation/validate-identifiers.js` translates them into located diagnostics. Both semantic validation and direct normalization use that same policy. `normalizeRoute` delegates allocation and attribute normalization separately; no allocation state enters the public model or persists between routes. Identifiers are unique within a route and deterministic for unchanged input, while persistence across edits requires author-maintained explicit IDs. No domain dependency points toward validation, rendering, frameworks, or I/O.

`domain/traversal.js` owns technical event order, endpoint references, element ownership, direction, and signed physical elevation change. Normalization records these in `model.traversal`. A descent followed by a climb has an intermediate boundary and two segments. Leading climbs and trailing descents receive the missing outer boundary. These boundaries have no drawing coordinates and do not create route elements. Feature attributes remain on their owning normalized element. Standalone notes and hazards are separate `traversal.annotations` references to reached physical boundaries. The domain owns this classification and attachment policy; annotations neither split technical events nor add connections.

`validation/validate-boundaries.js` validates uniqueness and ordering of explicit start/exit declarations among progression elements, reusing the domain annotation classification. It returns source-located geometry diagnostics without performing layout.

`validation/validate-geometry.js` first coordinates boundary validation, then reports missing technical measurements and inconsistent or underdetermined elevation constraints after normalization. It does not distribute a residual over a declared technical feature. The application invokes this validation before layout and JSON export; geometry errors prevent either output.

`parser/lexer.js` owns lexical rules: quoted/bare forms, assignment boundaries, escape decoding, comments, and source spans. It produces plain typed tokens and syntax diagnostics without external dependencies. Quotes are decoded once here; the parser does not rediscover assignments by searching decoded text. The existing raw-token/comment helpers delegate to this same lexical computation.

`parser/line-parser.js` coordinates line scanning, document-order validation, and statement parsing. It consumes typed tokens, retains statement locations, skips lexically invalid statements, and continues collecting diagnostics from later lines. `parser/document-order.js` computes ordering transitions and source-linked diagnostics without I/O or AST mutation; recognized rejected statements still advance order so recovery cannot reset the header. `parser/attribute-parser.js` owns duplicate detection for attribute lists, with document-scoped metadata locations supplied by the coordinator. It preserves the first declaration, diagnoses every repeat, and uses own properties for all source keys. Internal maps are scoped to one parse and do not enter the domain model. Token spans remain syntax data and do not introduce renderer or framework concepts into the domain. Blocking syntax errors stop the application before normalization, geometry, layout, and export. Declaration conflicts use optional diagnostic `relatedLocations` to retain both original coordinates, and the shared formatter exposes both to every adapter. Broader attribute-level semantic source mapping remains a separate contract change.

`validation/validate-route.js` coordinates route-name, identifier, metadata, and element validation. `validation/validate-fields.js` translates domain field problems and requiredness into located diagnostics. `validation/validate-field-relationships.js` separately coordinates rope/height warnings, redirection positions, and exact stage/height comparison. Enum vocabularies and per-field ranges have one owner in the domain specification, rather than independent switches in validation and normalization. The application and adapters retain their existing ports.

`layout/vertical-layout.js` turns ordered route elements into positioned nodes with horizontal progression, upward movement for climbs, elevation-aware y positions when entrance and exit elevations are available, and readable minimum node spacing for dense features. It is pure layout math and does not emit SVG.

Layout positions the canonical traversal points and segments. `layout.nodes` still contains one node per source element in source order; `layout.points` excludes annotations and includes implicit boundaries, and `layout.segments` carries positioned endpoints, the owning element, and the technical pixel delta. Annotation symbols are positioned separately beside their attachment boundaries, and their rows contribute only to the content extent. Physical elevation values and the route spine remain independent of annotation placement and minimum visual spacing. Validated entrance/exit metadata anchors the physical boundaries, with the final elevation pinned after consistency checks to avoid cumulative roundoff. The SVG adapter orders labels by visual y position, placing progression labels before annotations at equal y to keep boundary text readable. It sorts a copy and preserves the source-order node contract. The renderer consumes these positioned segments and does not choose an owner by inspecting neighboring nodes. Terrain uses all traversal points so intermediate and terminal technical features remain visible.

`application/compile-route.js` coordinates processing-budget checks, parse, validation, normalization, layout, and JSON export. It also exposes `createRouteCompiler(overrides)` so alternate parser, validator, layout, normalization, or export ports can be injected without changing the use-case coordinator.

The optional `validateGeometry` port validates the normalized contract. The renderer depends inward on the first-party core package for its compatibility helpers; neither package adds third-party runtime dependencies. The SVG adapter owns complete presentation bounds: core layout dimensions do not account for adapter-specific fonts or decorations.

`vrl-render-svg/src/presentation.js` contains pure geometry, formatting, label placement, and wrapping calculations extracted from serialization. `topo-scene.js` coordinates presentation preparation and computes envelopes for route decorations, shared detail rows, the summary, and the legend. Its stage/redirection placement records are shared by fitting and serialization for every supported line shape. Shape-specific public segment helpers delegate to a shared technical-segment coordinator, which prepares geometry and annotations before a separate markup serializer emits the group. Only rungs depend on line style; annotation values, ownership, positions, language, and bounds do not. Pure presentation formatting supplies a localized annotation summary for the top-level SVG description so these facts remain accessible when the diagram is exposed as one image. Source validation stays in core, while these presentation choices stay in the SVG adapter. `scene-bounds.js` provides pure numeric envelope union, text estimation, and canvas fitting with explicit range failures. `svg-renderer.js` coordinates scene preparation and SVG serialization, retaining the existing public helper exports.

`vrl-render-svg/src/anchor-presentation.js` separates the full declared anchor quantity from the capped mark count. Pure formatting uses the full value, while a separate placement computation emits at most four circle positions and optional overflow text. Both fitting and serialization consume those placements, and the top-level description includes per-element quantities. The existing mark-count helper remains available for drawing only. Core retains source-count validation; the renderer adds no domain quantity limits or model fields.

The final viewport grows around these prepared bounds rather than changing physical geometry to satisfy a fixed canvas. SVG-only concerns stay outside the core, and the renderer performs no DOM measurement or I/O. Requested width determines detail wrapping once, preventing a sizing feedback loop. Conservative text envelopes trade spare space for deterministic output across supported system fonts. Strict XML tests independently inspect emitted primitive extents, alongside input immutability, repeated-render determinism, and numeric failure cases.

## Dependency Rule

```mermaid
flowchart TD
  UI[React, Svelte, and SvelteKit Packages] --> Renderer[SVG Adapter]
  UI --> Core[Core Application]
  Renderer --> CoreTypes[Core Route Model]
  Core --> Domain[Pure Domain]
```

No dependency should point from core to a framework or infrastructure package.
