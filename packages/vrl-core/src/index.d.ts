/** Public model contract revision 2; other contracts retain revision 1. See docs/public-contracts.md. */
export type ElementType = "start" | "exit" | "walk" | "rappel" | "downclimb" | "climb" | "pool" | "hazard" | "note";
export type Direction = "up" | "down";
/** One-based UTF-16 coordinates; end positions in spans are exclusive. */
export interface SourceLocation { line: number; column: number }
export interface SourceSpan { start: SourceLocation; end: SourceLocation }
export interface AttributeSpans { span: SourceSpan; keySpan: SourceSpan; valueSpan: SourceSpan }
export interface DeclarationSource {
  span: SourceSpan | null;
  keywordSpan: SourceSpan;
  attributeSpans: Record<string, AttributeSpans>;
  nameSpan?: SourceSpan | null;
  idSpan?: SourceSpan | null;
  labelSpan?: SourceSpan | null;
  textSpan?: SourceSpan | null;
}
export interface SourceMap {
  route: DeclarationSource | null;
  metadata: DeclarationSource[];
  elements: DeclarationSource[];
}
/** Recovery syntax is not a validated model. Programmatic input may omit parser bookkeeping. */
export interface RouteElementAst {
  type: ElementType;
  id?: string | null | undefined;
  label?: string | null | undefined;
  attributes: Record<string, string>;
  sourceLocation?: SourceLocation | undefined;
}
export interface RouteAst {
  name: string | null;
  metadata: Record<string, string>;
  elements: RouteElementAst[];
  source?: string | undefined;
  sourceMap?: SourceMap | undefined;
}
export interface ParsedRouteAst extends RouteAst { source: string; sourceMap: SourceMap }
export interface RelatedLocation { message: string; location: SourceLocation; span?: SourceSpan | undefined }
/** Custom ports may omit suggestion/code/span. Built-in diagnostics always have suggestion. */
export interface Diagnostic {
  kind: string;
  severity: "error" | "warning";
  message: string;
  location: SourceLocation;
  suggestion?: string | undefined;
  relatedLocations?: RelatedLocation[] | undefined;
  code?: string | undefined;
  span?: SourceSpan | undefined;
}
export interface BuiltinDiagnostic extends Diagnostic { suggestion: string }
export interface ParseResult<A extends RouteAst = ParsedRouteAst> { ast: A; diagnostics: Diagnostic[] }
export interface Measurement { value: number; unit: "m"; meters: number }
/** Rappel rope declaration: a metric value or explicitly unknown, never an equipment requirement. */
export type RopeDeclaration = Measurement | "unknown";
export interface Inclination { value: number; unit: "%"; percent: number }
/** Token conversion accepts arbitrary side text; semantic normalization restricts it. */
export interface ParsedRedirection { distance: Measurement; side: string }
export interface Redirection extends ParsedRedirection { side: "left" | "right" | "center" | "unknown" }
export type TokenResult<T> = { ok: true; value: T } | { ok: false; reason: string };
export interface CommonFields {
  distance?: Measurement; height?: Measurement; rope?: Measurement; traverse?: Measurement;
  total_distance?: Measurement; total_descent?: Measurement;
  entrance_elevation?: Measurement; exit_elevation?: Measurement;
  vertical_gain?: Measurement; descent?: Measurement;
  inclination?: Inclination;
  /** Positive safe integer encoded as decimal text, not a number. */
  anchor_count?: string;
  stages?: Measurement[];
  redirection?: Redirection[]; redirections?: Redirection[];
}
export type Level = "low" | "medium" | "high";
export interface TechnicalFields {
  shape?: "ladder" | "direct" | "slab";
  station?: "left" | "right" | "center" | "floor" | "tree" | "natural" | "unknown";
  landing?: "pool" | "ledge" | "dry" | "chaos" | "gallery" | "trail" | "unknown";
}
export interface ElementFields extends Omit<CommonFields, "rope">, TechnicalFields {
  rope?: RopeDeclaration;
  anchor?: "bolts" | "natural" | "tree" | "thread" | "removable" | "fixed" | "unknown" | "mixed";
  exposure?: Level;
  flow?: "dry" | Level;
  type?: "deep" | "shallow" | "swimmer" | "dry" | "unknown";
  severity?: Level | "critical";
}
type FieldsFor<T extends ElementType> = Omit<CommonFields, "rope"> & Pick<ElementFields, "flow">
  & (T extends "rappel" ? TechnicalFields & Pick<ElementFields, "anchor"> & { height: Measurement; rope: RopeDeclaration }
    : Pick<CommonFields, "rope"> & (T extends "climb" ? TechnicalFields & Pick<ElementFields, "exposure"> & { height: Measurement }
      : T extends "downclimb" ? TechnicalFields & Pick<ElementFields, "exposure">
      : T extends "pool" ? Pick<ElementFields, "type">
      : T extends "hazard" ? Pick<ElementFields, "severity"> : {}));
/** Known fields live in attributes; unrecognized or inapplicable fields remain string extensions. */
export type RouteElement = { [T in ElementType]: {
  type: T; id: string; label: string | null; attributes: FieldsFor<T>;
  extensions: Record<string, string>; sourceLocation: SourceLocation | undefined;
} }[ElementType];
/** A broader read view for advanced helpers and historical, caller-built elements. */
export interface ElementView {
  type: ElementType; id: string | null; label?: string | null | undefined;
  attributes: ElementFields; extensions?: Record<string, string> | undefined;
  sourceLocation?: SourceLocation | undefined;
}
export interface TraversalPoint { elementIndex: number | null }
export type TraversalSegment = { from: number; to: number } & (
  { kind: "connection"; elementIndex: null; direction: null; verticalDeltaMeters: 0 }
  | { kind: "technical"; elementIndex: number; direction: Direction; verticalDeltaMeters: number | null }
);
export interface Traversal {
  points: TraversalPoint[]; segments: TraversalSegment[];
  annotations: { elementIndex: number; pointIndex: number | null }[];
}
export interface RouteSummary {
  numberOfRappels: number; numberOfHazards: number; highestRappelMeters: number;
  /** @deprecated Maximum declared rappel rope, or 0 when absent; not an equipment requirement. Use summarizeRouteMeasurements. */
  requiredRopeMeters: number;
  /** @deprecated Sum of recorded walk distances only, or 0 when absent. Use summarizeRouteMeasurements. */
  totalDistanceMeters: number;
  entranceElevationMeters: number | null; exitElevationMeters: number | null;
  totalElevationChangeMeters: number;
}
/** Explicit numeric observations; unknown ropes do not contribute to declaredRopeCount or maxima. */
export interface RouteMeasurementSummary {
  maximumDeclaredRopeMeters: number | null;
  declaredRopeCount: number;
  rappelCount: number;
  summedWalkDistanceMeters: number | null;
  measuredWalkCount: number;
  walkCount: number;
  declaredTotalDistanceMeters: number | null;
  declaredTotalDescentMeters: number | null;
  /** Entrance minus exit; positive for net descent, distinct from total descent. */
  endpointElevationChangeMeters: number | null;
}
export interface RouteModel {
  name: string; metadata: CommonFields; extensions: Record<string, string>;
  elements: RouteElement[]; traversal: Traversal; summary: RouteSummary;
}
export interface RouteView {
  name: string; metadata: CommonFields; extensions?: Record<string, string> | undefined;
  elements: ElementView[]; traversal?: Traversal | undefined;
}
export interface ElevationProfile { entranceMeters: number; exitMeters: number; totalChangeMeters: number }
export interface Position { x: number; y: number }
export interface LayoutPoint extends Position, TraversalPoint {
  id: string | null; element: ElementView | null;
  elevationMeters?: number; direction?: Direction | null;
}
export interface LayoutNode extends LayoutPoint {
  elementIndex: number; id: string; element: ElementView; anchorPointIndex?: number | null;
}
export type LayoutSegment = TraversalSegment & { start: LayoutPoint; end: LayoutPoint } & (
  { kind: "connection"; element: null; technicalDeltaY: null }
  | { kind: "technical"; element: ElementView; technicalDeltaY: number }
);
export interface RouteLayout {
  width: number; height: number; spine: { x: number; y1: number; y2: number };
  elevation?: ElevationProfile & { pixelsPerMeter: number };
  nodes: LayoutNode[]; points: LayoutPoint[]; segments: LayoutSegment[];
}
export interface LayoutOptions {
  width?: number | undefined; baseSpacing?: number | undefined; horizontalScale?: number | undefined;
  pixelsPerMeter?: number | undefined; spineX?: number | undefined; marginY?: number | undefined;
  marginBottom?: number | undefined; minNodeGap?: number | undefined;
}
export interface ProcessingLimits {
  maxSourceBytes: number; maxLines: number; maxLineBytes: number; maxElements: number; maxListEntries: number;
}
export type LimitOptions = { [K in keyof ProcessingLimits]?: number | undefined };
export interface ParseOptions { limits?: LimitOptions | undefined }
export interface CompileOptions<O extends object = LayoutOptions> extends ParseOptions { layout?: O | undefined }
export type CompileResult<A extends RouteAst = ParsedRouteAst, M extends object = RouteModel, L extends object = RouteLayout> =
  { ok: true; ast: A; diagnostics: Diagnostic[]; model: M; layout: L; json: string }
  | { ok: false; ast: A | ParsedRouteAst; diagnostics: Diagnostic[]; model: null; layout: null; json: null };
/**
 * Callable compilation use case bound to captured synchronous ports.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document text.
 * @param {CompileOptions<O>} [options] - Per-call layout and processing budgets.
 * @returns {CompileResult<A, M, L>} Result with ordered diagnostics and outputs only on success.
 */
export type RouteCompiler<A extends RouteAst = ParsedRouteAst, M extends object = RouteModel, L extends object = RouteLayout, O extends object = LayoutOptions> =
  (source: string, options?: CompileOptions<O>) => CompileResult<A, M, L>;
/** All stages are synchronous; records must be plain objects. Exceptions propagate unchanged. */
export interface CompilerPorts<A extends RouteAst = ParsedRouteAst, M extends object = RouteModel, L extends object = RouteLayout, O extends object = LayoutOptions> {
  /**
   * Adapt source text into recovery syntax and lexical diagnostics within supplied budgets.
   * @responsibility coordinator
   * @param {string} source - Original document text.
   * @param {{limits: Readonly<ProcessingLimits>}} options - Resolved immutable budgets.
   * @returns {ParseResult<A>} Synchronous AST and diagnostics; a thenable is invalid.
   */
  parse: (source: string, options: { limits: Readonly<ProcessingLimits> }) => ParseResult<A>;
  /**
   * Coordinate semantic checks on raw syntax without normalizing it.
   * @responsibility coordinator
   * @param {A} ast - Accepted parser AST, including raw attributes.
   * @returns {Diagnostic[]} Ordered synchronous warnings and errors.
   */
  validate: (ast: A) => Diagnostic[];
  /**
   * Coordinate conversion of validated syntax into the domain model.
   * @responsibility coordinator
   * @param {A} ast - Syntax already free of blocking semantic diagnostics.
   * @returns {M} Synchronous plain model; unknown fields retain extension ownership.
   */
  normalize: (ast: A) => M & { then?: never };
  /**
   * Coordinate normalized geometry and boundary checks before layout/export.
   * @responsibility coordinator
   * @param {M} model - Normalized domain model.
   * @param {SourceMap} [sourceMap] - Optional parser ranges for located failures.
   * @returns {Diagnostic[]} Synchronous geometry diagnostics; errors block later ports.
   */
  validateGeometry: (model: M, sourceMap?: SourceMap) => Diagnostic[];
  /**
   * Coordinate validated physical/schematic layout computations.
   * @responsibility coordinator
   * @param {M} model - Geometry-validated normalized model.
   * @param {O} [options] - Layout settings owned by this implementation.
   * @returns {L} Synchronous plain layout with supported finite numeric leaves.
   */
  layout: (model: M, options?: O) => L & { then?: never };
  /**
   * Coordinate serialization of the accepted normalized model.
   * @responsibility coordinator
   * @param {M} model - Same validated model passed to the other downstream ports.
   * @returns {string} Primitive JSON text synchronously; exceptions propagate.
   */
  exportJson: (model: M) => string;
}
export type CompilerOverrides = Partial<Omit<CompilerPorts, "validateGeometry">> & {
  validateGeometry?: CompilerPorts["validateGeometry"] | null | undefined;
};
export type CompilerDependencies = Omit<CompilerPorts, "validateGeometry"> & Pick<CompilerOverrides, "validateGeometry">;
/**
 * Stable facade. Invalid source returns ok:false; programming/configuration errors throw.
 * Compile through the default captured adapters, returning diagnostics for invalid source and propagating programming or configuration exceptions.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @param {CompileOptions} [options] - Operation-specific option record; defaults to an empty record. Contains optional layout and processing-limit overrides.
 * @returns {CompileResult} Compilation result with ok, AST and ordered diagnostics; model, layout and JSON are null on blocking failure.
 */
export function compileRoute(source: string, options?: CompileOptions): CompileResult;
/**
 * Partial overrides use default shapes. Custom shapes require all six substitutable ports.
 * Validate overrides, bind default adapters and capture immutable application ports in a reusable synchronous compiler closure.
 * @responsibility coordinator
 * @param {CompilerOverrides} [overrides] - Caller-supplied values replacing the corresponding defaults; defaults to {}.
 * @returns {RouteCompiler} Reusable synchronous compiler bound to the captured port snapshot.
 */
export function createRouteCompiler(overrides?: CompilerOverrides): RouteCompiler;
/**
 * Validate overrides, bind default adapters and capture immutable application ports in a reusable synchronous compiler closure.
 * @responsibility coordinator
 * @param {CompilerPorts<A, M, L, O>} ports - Complete synchronous caller-owned compiler ports for custom AST, model and layout shapes.
 * @returns {RouteCompiler<A, M, L, O>} Reusable synchronous compiler bound to the captured port snapshot.
 */
export function createRouteCompiler<A extends RouteAst, M extends object, L extends object, O extends object = LayoutOptions>(ports: CompilerPorts<A, M, L, O>): RouteCompiler<A, M, L, O>;
/**
 * Validate caller-owned ports, supply the legacy geometry-validation default, and delegate the complete compilation workflow. Preserve the public helper's legacy geometry default; all other ports are caller-owned.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @param {CompileOptions | undefined} options - Operation-specific option record; defaults to an empty record. Contains optional layout and processing-limit overrides.
 * @param {CompilerDependencies} dependencies - Caller-supplied synchronous compiler port implementations.
 * @returns {CompileResult} Compilation result with ok, AST and ordered diagnostics; model, layout and JSON are null on blocking failure.
 */
export function compileRouteWithDependencies(source: string, options: CompileOptions | undefined, dependencies: CompilerDependencies): CompileResult;
/**
 * Validate caller-owned ports, supply the legacy geometry-validation default, and delegate the complete compilation workflow. Preserve the public helper's legacy geometry default; all other ports are caller-owned.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @param {CompileOptions<O> | undefined} options - Operation-specific option record; defaults to an empty record. Contains optional layout and processing-limit overrides.
 * @param {CompilerPorts<A, M, L, O>} dependencies - Caller-supplied synchronous compiler port implementations.
 * @returns {CompileResult<A, M, L>} Compilation result with ok, AST and ordered diagnostics; model, layout and JSON are null on blocking failure.
 */
export function compileRouteWithDependencies<A extends RouteAst, M extends object, L extends object, O extends object = LayoutOptions>(source: string, options: CompileOptions<O> | undefined, dependencies: CompilerPorts<A, M, L, O>): CompileResult<A, M, L>;
/**
 * Resolve budgets and coordinate incremental line parsing into a recovery AST plus ordered diagnostics; source/configuration type errors propagate.
 * @responsibility coordinator
 * @param {string} source - Complete VRL document source text, retained unchanged for diagnostics.
 * @param {ParseOptions} [options] - Operation-specific option record; defaults to an empty record. Contains optional layout and processing-limit overrides.
 * @returns {ParseResult} Recovery AST and ordered diagnostics; syntax or budget failures remain data for the compiler coordinator.
 */
export function parseVrl(source: string, options?: ParseOptions): ParseResult;
/**
 * Validate route name, metadata, relationships, identifiers and each element in deterministic order without normalizing the recovery AST.
 * @responsibility coordinator
 * @param {RouteAst} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @returns {Diagnostic[]} Ordered semantic diagnostics; error severity blocks compilation while warnings preserve success.
 */
export function validateRoute(ast: RouteAst): Diagnostic[];
/**
 * Validate one raw element's identity, fields and relationships; route-wide uniqueness requires whole-route validation.
 * @responsibility coordinator
 * @param {RouteElementAst} element - Owning route element with its type, identity and declared attributes.
 * @param {DeclarationSource} [source] - Optional declaration source record with span and attribute ranges.
 * @returns {Diagnostic[]} Identity, field and relationship diagnostics for this single element.
 */
export function validateElement(element: RouteElementAst, source?: DeclarationSource): Diagnostic[];
/**
 * Throws TypeError for malformed syntax records, RangeError for invalid domain invariants.
 * Validate raw syntax, allocate route-wide identifiers, normalize attributes and elements, then compose traversal and summary into the explicit domain model.
 * @responsibility coordinator
 * @param {RouteAst} ast - Unvalidated route syntax record with raw string metadata and elements.
 * @returns {RouteModel} Explicit normalized model containing metadata/extensions, unique elements, canonical traversal and route summary.
 */
export function normalizeRoute(ast: RouteAst): RouteModel;
/**
 * Mutates supplied identifier counters; route-wide uniqueness requires normalizeRoute.
 * Validate and normalize one raw element, updating caller-owned ID counters; collection-wide uniqueness requires normalizeRoute.
 * @responsibility coordinator
 * @param {RouteElementAst} element - Owning route element with its type, identity and declared attributes.
 * @param {Partial<Record<ElementType, number>>} [counters] - Caller-owned per-element-type counters, advanced during identifier allocation.
 * @returns {RouteElement} Normalized element with typed attributes, extensions and allocated identity.
 */
export function normalizeElement(element: RouteElementAst, counters?: Partial<Record<ElementType, number>>): RouteElement;
/**
 * Compute element counts, maxima, walk-distance sums and endpoint elevations. Missing measurements contribute zero to legacy aggregates; these are documentation facts, not equipment calculations.
 * @responsibility computation
 * @param {ElementView[]} elements - Route elements in source order.
 * @param {CommonFields} [metadata] - Route-level metadata; absent endpoint measurements remain unknown; defaults to {}.
 * @returns {RouteSummary} Counts, declared maxima, walk-distance sum and endpoint elevation fields; legacy missing aggregates are zero and missing endpoints are null.
 */
export function summarizeRoute(elements: ElementView[], metadata?: CommonFields): RouteSummary;
/**
 * Summarize normalized observations separately from declared route totals without changing inputs or the legacy model summary.
 * @responsibility computation
 * @param {readonly ElementView[]} elements - Compatible normalized elements in source order; only rappel rope and walk distance observations contribute to their respective aggregates.
 * @param {CommonFields} [metadata] - Optional normalized route metadata; defaults to an empty record; absent measurements remain null.
 * @returns {RouteMeasurementSummary} Independently owned measurements and observation counts; missing values are null, and endpoint change is entrance minus exit in meters.
 * @throws {TypeError} A present measurement is not a normalized record.
 * @throws {RangeError} A measurement or computed aggregate is nonfinite or outside the supported numeric range.
 */
export function summarizeRouteMeasurements(elements: readonly ElementView[], metadata?: CommonFields): RouteMeasurementSummary;
/**
 * Construct physical progression from route elements and attach standalone annotations to their reached boundaries.
 * @responsibility coordinator
 * @param {ElementView[]} elements - Route elements in source order.
 * @returns {Traversal} Canonical points, directed segments and annotations retaining original element ownership.
 */
export function createTraversal(elements: ElementView[]): Traversal;
/**
 * Check numeric leaves and boundaries, then classify missing technical heights and endpoint consistency before layout; return warnings or blocking geometry diagnostics.
 * @responsibility coordinator
 * @param {RouteView} route - Normalized route or compatible route view used by this operation.
 * @param {SourceMap} [sourceMap] - Parser-owned source ranges; may be absent for programmatic input.
 * @returns {Diagnostic[]} Ordered numeric/boundary/geometry diagnostics; absent heights may be warnings without endpoint constraints.
 */
export function validateGeometry(route: RouteView, sourceMap?: SourceMap): Diagnostic[];
/**
 * Select elevation-based or weighted layout after resolving whether both endpoint elevations exist.
 * @responsibility coordinator
 * @param {RouteView} route - Normalized route or compatible route view used by this operation.
 * @param {LayoutOptions} [options] - Operation-specific option record; defaults to an empty record. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @returns {RouteLayout} Finite schematic or elevation-aware layout with positioned points, nodes, annotations and owned segments.
 */
export function computeVerticalLayout(route: RouteView, options?: LayoutOptions): RouteLayout;
/**
 * Requires both endpoint elevations and consistent geometry.
 * Validate configuration and geometry, resolve endpoint constraints, position traversal points, enforce readable gaps and assemble layout.
 * @responsibility coordinator
 * @param {RouteView} route - Normalized route or compatible route view used by this operation.
 * @param {LayoutOptions} [options] - Operation-specific option record; defaults to an empty record. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @returns {RouteLayout} Finite layout retaining declared endpoint elevations and technical changes; readable pixel gaps may be exaggerated.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function computeElevationLayout(route: RouteView, options?: LayoutOptions): RouteLayout;
/**
 * Serializes caller data after numeric checks; cycles/BigInt and custom toJSON can throw.
 * Validate numeric data and serialize the route as indented JSON; native cycles, BigInt and custom toJSON failures propagate.
 * @responsibility coordinator
 * @param {RouteModel} route - Normalized route data with typed attributes, traversal and summary.
 * @returns {string} The result returned by JSON.stringify.
 */
export function exportRouteJson(route: RouteModel): string;
/**
 * Validate numeric data and serialize the route as indented JSON; native cycles, BigInt and custom toJSON failures propagate.
 * @responsibility coordinator
 * @param {unknown} route - Normalized route data with typed attributes, traversal and summary.
 * @returns {string | undefined} The result returned by JSON.stringify.
 */
export function exportRouteJson(route: unknown): string | undefined;
/**
 * Allocate an empty recovery AST with source text and source-map collections; no domain validity is implied. Raw syntax records for parsers and recovery; these do not establish domain validity.
 * @responsibility computation
 * @param {string} [source] - Complete VRL document source text, retained unchanged for diagnostics; defaults to "".
 * @returns {ParsedRouteAst} A record containing name, metadata, elements, source, sourceMap.
 */
export function createEmptyRoute(source?: string): ParsedRouteAst;
/**
 * Construct an unvalidated syntax element from raw attributes and optional identity, label and location.
 * @responsibility computation
 * @param {ElementType} type - Declared element or record discriminator.
 * @param {Record<string, string>} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @param {SourceLocation} [sourceLocation] - Optional one-based source position retained from parsing.
 * @param {string | null} [id] - Explicit or already allocated route element identifier; defaults to null.
 * @param {string | null} [label] - Unescaped display label supplied by the caller; defaults to null.
 * @returns {RouteElementAst} A record containing type, id, label, attributes, sourceLocation.
 */
export function createRouteElement(type: ElementType, attributes: Record<string, string>, sourceLocation?: SourceLocation, id?: string | null, label?: string | null): RouteElementAst;
/**
 * Construct a diagnostic record with stable severity, location, suggestion and optional related locations, code and span.
 * @responsibility computation
 * @param {string} kind - Discriminator selecting the supported record or diagnostic category.
 * @param {Diagnostic["severity"]} severity - Diagnostic severity, error or warning.
 * @param {string} message - Human-readable diagnostic or process message.
 * @param {SourceLocation} location - One-based line and UTF-16 column used as the diagnostic origin.
 * @param {string} [suggestion] - Actionable correction text retained in the diagnostic; defaults to "".
 * @param {RelatedLocation[]} [relatedLocations] - Ordered related diagnostic source references; defaults to [].
 * @param {{ code?: string | undefined; span?: SourceSpan | undefined }} [details] - Optional stable diagnostic code and end-exclusive source span.
 * @returns {BuiltinDiagnostic} A record containing kind, severity, message, location, suggestion, the supplied fields, the supplied fields, the supplied fields.
 */
export function createDiagnostic(kind: string, severity: Diagnostic["severity"], message: string, location: SourceLocation, suggestion?: string, relatedLocations?: RelatedLocation[], details?: { code?: string | undefined; span?: SourceSpan | undefined }): BuiltinDiagnostic;
/**
 * Format a diagnostic and its related locations as readable plain text without changing its source data.
 * @responsibility computation
 * @param {Diagnostic} diagnostic - Structured diagnostic with kind, severity, message and source location.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
export function formatDiagnostic(diagnostic: Diagnostic): string;
/**
 * Report whether any diagnostic has error severity; warnings alone remain nonblocking.
 * @responsibility computation
 * @param {Diagnostic[]} diagnostics - Ordered diagnostic records; append helpers mutate the supplied destination list.
 * @returns {boolean} The result returned by diagnostics.some.
 */
export function hasBlockingDiagnostics(diagnostics: Diagnostic[]): boolean;
export type LexToken = { raw: string; span: SourceSpan } & (
  { kind: "bare" | "quoted"; value: string }
  | { kind: "attribute"; key: string; value: string; valueForm: "bare" | "quoted"; keySpan: SourceSpan; valueSpan: SourceSpan }
);
/**
 * Scan a physical line into typed tokens and end-exclusive UTF-16 spans, stopping at comments or the first malformed lexeme. Scan one physical line; spans are one-based UTF-16 columns, end-exclusive.
 * @responsibility computation
 * @param {string} line - One physical VRL source line without its line terminator.
 * @param {SourceLocation} [location] - One-based line and UTF-16 column used as the diagnostic origin; defaults to { line: 1, column: 1 }.
 * @returns {{ tokens: LexToken[]; diagnostics: Diagnostic[]; commentStart: number | null }} A record containing tokens, diagnostics, commentStart.
 */
export function lexVrlLine(line: string, location?: SourceLocation): { tokens: LexToken[]; diagnostics: Diagnostic[]; commentStart: number | null };
/**
 * Malformed lexemes throw SyntaxError with a diagnostics array.
 * Lex a line and return original token spellings; malformed lexemes raise SyntaxError with structured diagnostics. Compatibility helpers retain raw strings for valid lines and fail explicitly otherwise.
 * @responsibility coordinator
 * @param {string} line - One physical VRL source line without its line terminator.
 * @returns {string[]} The result returned by requireLexedLine(line).tokens.map.
 */
export function tokenize(line: string): string[];
/**
 * Lex a line and remove only an unquoted comment suffix; malformed lexemes raise SyntaxError.
 * @responsibility coordinator
 * @param {string} line - One physical VRL source line without its line terminator.
 * @returns {string} The selected result, including the documented absent-value fallback.
 */
export function stripComment(line: string): string;
/**
 * Lex legacy raw token strings, return lexical failures, then delegate typed attribute parsing.
 * @responsibility coordinator
 * @param {string[]} tokens - Lexical tokens or raw token spellings for the explicitly named compatibility API.
 * @param {SourceLocation} [location] - One-based line and UTF-16 column used as the diagnostic origin.
 * @returns {{ attributes: Record<string, string>; diagnostics: Diagnostic[] }} A record containing attributes, diagnostics.
 */
export function parseAttributeTokens(tokens: string[], location?: SourceLocation): { attributes: Record<string, string>; diagnostics: Diagnostic[] };
/**
 * Recognize metric field names in the shared specification.
 * @responsibility computation
 * @param {string} name - Field name used to select the domain conversion or measurement.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function isMeasurementField(name: string): boolean;
/**
 * Recognize the field name owned by inclination parsing.
 * @responsibility computation
 * @param {string} name - Field name used to select the domain conversion or measurement.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function isInclinationField(name: string): boolean;
/**
 * Recognize the stages field name.
 * @responsibility computation
 * @param {string} name - Field name used to select the domain conversion or measurement.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function isRappelStagesField(name: string): boolean;
/**
 * Recognize singular and plural redirection field names.
 * @responsibility computation
 * @param {string} name - Field name used to select the domain conversion or measurement.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function isRedirectionField(name: string): boolean;
/**
 * Parse signed decimal meter text within the source precision and magnitude budget; malformed input returns a failed token result.
 * @responsibility computation
 * @param {string} token - Raw field text before metric/list/percentage decoding.
 * @returns {TokenResult<Measurement>} Discriminated token result: ok=true with the parsed value, or ok=false with the syntax/range reason.
 */
export function parseMeasurementToken(token: string): TokenResult<Measurement>;
/**
 * Parse a bounded decimal percentage without applying field-specific positivity or maximum-inclination rules; malformed input returns a failed token result.
 * @responsibility computation
 * @param {string} token - Raw field text before metric/list/percentage decoding.
 * @returns {TokenResult<Inclination>} Discriminated token result: ok=true with the parsed value, or ok=false with the syntax/range reason.
 */
export function parseInclinationToken(token: string): TokenResult<Inclination>;
/**
 * Parse an ordered plus-separated list of at least two metric stages, preserving individual measurements.
 * @responsibility computation
 * @param {string} token - Raw field text before metric/list/percentage decoding.
 * @returns {TokenResult<Measurement[]>} Discriminated token result: ok=true with the parsed value, or ok=false with the syntax/range reason.
 */
export function parseRappelStagesToken(token: string): TokenResult<Measurement[]>;
/**
 * Parse one metric redirection and side suffix without applying field-level distance or side vocabulary restrictions.
 * @responsibility computation
 * @param {string} token - Raw field text before metric/list/percentage decoding.
 * @returns {TokenResult<ParsedRedirection>} Discriminated token result: ok=true with the parsed value, or ok=false with the syntax/range reason.
 */
export function parseRedirectionToken(token: string): TokenResult<ParsedRedirection>;
/**
 * Parse an ordered comma-separated redirection list, returning a failed result for an invalid entry.
 * @responsibility computation
 * @param {string} token - Raw field text before metric/list/percentage decoding.
 * @returns {TokenResult<ParsedRedirection[]>} Discriminated token result: ok=true with the parsed value, or ok=false with the syntax/range reason.
 */
export function parseRedirectionsToken(token: string): TokenResult<ParsedRedirection[]>;
/**
 * Legacy conversions retain invalid token text; they do not validate a model.
 * Convert recognized metric text and retain the original text when the compatibility conversion cannot parse it.
 * @responsibility computation
 * @param {string} name - Field name used to select the domain conversion or measurement.
 * @param {string} value - Raw attribute text; unsupported or invalid conversion retains this exact value.
 * @returns {string | Measurement} Converted typed value for recognized valid text, otherwise the original string.
 */
export function normalizeAttributeValue(name: string, value: string): string | Measurement;
/**
 * Convert recognized valid inclination text and preserve legacy text on conversion failure.
 * @responsibility computation
 * @param {string} name - Field name used to select the domain conversion or measurement.
 * @param {string} value - Raw attribute text; unsupported or invalid conversion retains this exact value.
 * @returns {string | Inclination} Converted typed value for recognized valid text, otherwise the original string.
 */
export function normalizeInclinationValue(name: string, value: string): string | Inclination;
/**
 * Convert recognized stage or redirection attributes and preserve raw text when legacy token conversion fails.
 * @responsibility computation
 * @param {string} name - Field name used to select the domain conversion or measurement.
 * @param {string} value - Raw attribute text; unsupported or invalid conversion retains this exact value.
 * @returns {string | Measurement[] | ParsedRedirection[]} Converted typed value for recognized valid text, otherwise the original string.
 */
export function normalizeRappelDetailValue(name: string, value: string): string | Measurement[] | ParsedRedirection[];
/**
 * Apply permissive legacy conversions to raw attribute entries without establishing model validity. Legacy token conversion only; strict route normalization uses inspectAttributes.
 * @responsibility computation
 * @param {Record<string, string>} attributes - Attribute record for this scope; raw text before normalization and typed values afterward.
 * @returns {Record<string, string | Measurement | Inclination | Measurement[] | ParsedRedirection[]>} New record of permissively converted attribute values; malformed legacy values remain text.
 */
export function normalizeAttributes(attributes: Record<string, string>): Record<string, string | Measurement | Inclination | Measurement[] | ParsedRedirection[]>;
/**
 * Expand adjacent gaps in their declared direction and shift into the top margin; physical elevation metadata remains unchanged.
 * @responsibility computation
 * @param {T[]} nodes - Positioned route nodes or syntax nodes in the order owned by this operation.
 * @param {number} [minNodeGap] - Minimum readable vertical gap in drawing units; defaults to 0.
 * @param {number} [top] - Top margin or minimum y in drawing units; defaults to 0.
 * @returns {T[]} The result returned by requireNumericData.
 */
export function applyMinimumNodeGap<T extends { y: number; direction?: Direction | null }>(nodes: T[], minNodeGap?: number, top?: number): T[];
/**
 * Require consistent geometry and compute directed per-segment elevation changes when a profile exists.
 * @responsibility coordinator
 * @param {RouteView} route - Normalized route or compatible route view used by this operation.
 * @returns {number[]} Per-segment signed descent values in meters, or an empty list without a complete profile.
 */
export function elevationSegmentDeltas(route: RouteView): number[];
/**
 * Look up a type's schematic spacing weight, defaulting to one for unsupported types.
 * @responsibility computation
 * @param {Pick<ElementView, "type">} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} Configured schematic spacing weight, or one for an unknown element type.
 */
export function elementVisualWeight(element: Pick<ElementView, "type">): number;
/**
 * Report whether both endpoint elevations can form an elevation profile.
 * @responsibility computation
 * @param {Pick<RouteView, "metadata">} route - Normalized route or compatible route view used by this operation.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function hasElevationProfile(route: Pick<RouteView, "metadata">): boolean;
/**
 * Choose a type-specific horizontal spacing increment in drawing units.
 * @responsibility computation
 * @param {Pick<ElementView, "type">} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} Type-specific horizontal increment: 44 for rappel, 42 for climb/downclimb, 78 for exit and 58 otherwise.
 */
export function horizontalProgress(element: Pick<ElementView, "type">): number;
/**
 * Assign legacy residual weights only to nontechnical, nonannotation connections. Compatibility helper; residuals must never be added to technical motion.
 * @responsibility computation
 * @param {ElementView[]} elements - Route elements in source order.
 * @param {number[]} baseDeltas - Legacy per-connection technical deltas used to exclude technical residual distribution.
 * @returns {number[]} The result returned by baseDeltas.map.
 */
export function residualDistributionWeights(elements: ElementView[], baseDeltas: number[]): number[];
/**
 * Validate and return a positive finite horizontal scale within the supported magnitude.
 * @responsibility computation
 * @param {number} [value] - Candidate value; accepted shape, missing-value behavior and rejection rules are described above; defaults to 1.
 * @returns {number} The validated positive finite scale unchanged.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function resolveHorizontalScale(value?: number): number;
/**
 * Construct an endpoint elevation profile only when both typed elevations are available.
 * @responsibility computation
 * @param {Pick<RouteView, "metadata">} route - Normalized route or compatible route view used by this operation.
 * @returns {ElevationProfile | null} Finite entrance/exit elevations and their signed total change, or null when either endpoint is absent.
 */
export function routeElevationProfile(route: Pick<RouteView, "metadata">): ElevationProfile | null;
/**
 * Compute the legacy net descent between adjacent elements, retaining both events when descent is followed by ascent. Compatibility helper: the net change may contain two technical events.
 * @responsibility computation
 * @param {ElementView} previous - Previous positioned node or element in the compatibility helper.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} Finite net descent in meters across the adjacent elements, including both technical events when present.
 */
export function technicalSegmentDelta(previous: ElementView, element: ElementView): number;
/**
 * Compute vertical meters from declared height and optional inclination percentage without inventing absent measurements.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} Height times inclination/100 in meters; missing height contributes zero only in this compatibility helper. Canonical traversal separately retains unknown height.
 */
export function technicalVerticalMeters(element: ElementView): number;
/**
 * Map climb elements to negative screen-y progression and all other elements to positive progression.
 * @responsibility computation
 * @param {Pick<ElementView, "type">} element - Owning route element with its type, identity and declared attributes.
 * @returns {-1 | 1} Negative one for climb and positive one for every other element type.
 */
export function verticalDirection(element: Pick<ElementView, "type">): -1 | 1;
/**
 * Select technical owners between neighboring source elements while preserving descent-before-ascent order. Technical ownership is a domain rule, independent of drawing coordinates.
 * @responsibility computation
 * @param {ElementView[]} elements - Route elements in source order.
 * @param {number} index - Zero-based position in the current ordered collection.
 * @returns {number[]} The indexes value selected or validated above.
 */
export function technicalElementIndexesBetween(elements: ElementView[], index: number): number[];
/**
 * Reject nonnumbers with TypeError and nonfinite numeric values with RangeError.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @returns {void} Returns normally only for a finite number; otherwise throws with the failed contract.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function assertFiniteNumber(value: unknown, name: string): asserts value is number;
/**
 * Require a non-null plain configuration record, accepting ordinary or null prototypes.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} name - Field, port, fixture or other named subject selected by the surrounding operation.
 * @returns {void} Returns normally only for a plain options record; otherwise throws.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function assertOptionsRecord(value: unknown, name: string): asserts value is Record<string, unknown>;
/**
 * Validate recognized layout keys, numeric magnitudes and positive or nonnegative ranges; return an owned shallow snapshot.
 * @responsibility computation
 * @param {LayoutOptions} [options] - Operation-specific option record; defaults to an empty record. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @returns {LayoutOptions} Owned shallow snapshot of validated options; defaults are applied by layout computations.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function validateLayoutOptions(options?: LayoutOptions): LayoutOptions;
