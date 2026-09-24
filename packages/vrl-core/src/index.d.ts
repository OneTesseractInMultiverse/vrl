/** Public contract revision 1. See docs/public-contracts.md for stability and preconditions. */
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
export interface ElementFields extends CommonFields, TechnicalFields {
  anchor?: "bolts" | "natural" | "tree" | "thread" | "removable" | "fixed" | "unknown" | "mixed";
  exposure?: Level;
  flow?: "dry" | Level;
  type?: "deep" | "shallow" | "swimmer" | "dry" | "unknown";
  severity?: Level | "critical";
}
type FieldsFor<T extends ElementType> = CommonFields & Pick<ElementFields, "flow">
  & (T extends "rappel" ? TechnicalFields & Pick<ElementFields, "anchor"> & { height: Measurement; rope: Measurement }
    : T extends "climb" ? TechnicalFields & Pick<ElementFields, "exposure"> & { height: Measurement }
    : T extends "downclimb" ? TechnicalFields & Pick<ElementFields, "exposure">
    : T extends "pool" ? Pick<ElementFields, "type">
    : T extends "hazard" ? Pick<ElementFields, "severity"> : {});
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
  requiredRopeMeters: number; totalDistanceMeters: number;
  entranceElevationMeters: number | null; exitElevationMeters: number | null;
  totalElevationChangeMeters: number;
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
export type RouteCompiler<A extends RouteAst = ParsedRouteAst, M extends object = RouteModel, L extends object = RouteLayout, O extends object = LayoutOptions> =
  (source: string, options?: CompileOptions<O>) => CompileResult<A, M, L>;
/** All stages are synchronous; records must be plain objects. Exceptions propagate unchanged. */
export interface CompilerPorts<A extends RouteAst = ParsedRouteAst, M extends object = RouteModel, L extends object = RouteLayout, O extends object = LayoutOptions> {
  parse: (source: string, options: { limits: Readonly<ProcessingLimits> }) => ParseResult<A>;
  validate: (ast: A) => Diagnostic[];
  normalize: (ast: A) => M & { then?: never };
  validateGeometry: (model: M, sourceMap?: SourceMap) => Diagnostic[];
  layout: (model: M, options?: O) => L & { then?: never };
  exportJson: (model: M) => string;
}
export type CompilerOverrides = Partial<Omit<CompilerPorts, "validateGeometry">> & {
  validateGeometry?: CompilerPorts["validateGeometry"] | null | undefined;
};
export type CompilerDependencies = Omit<CompilerPorts, "validateGeometry"> & Pick<CompilerOverrides, "validateGeometry">;
/** Stable facade. Invalid source returns ok:false; programming/configuration errors throw. */
export function compileRoute(source: string, options?: CompileOptions): CompileResult;
/** Partial overrides use default shapes. Custom shapes require all six substitutable ports. */
export function createRouteCompiler(overrides?: CompilerOverrides): RouteCompiler;
export function createRouteCompiler<A extends RouteAst, M extends object, L extends object, O extends object = LayoutOptions>(ports: CompilerPorts<A, M, L, O>): RouteCompiler<A, M, L, O>;
export function compileRouteWithDependencies(source: string, options: CompileOptions | undefined, dependencies: CompilerDependencies): CompileResult;
export function compileRouteWithDependencies<A extends RouteAst, M extends object, L extends object, O extends object = LayoutOptions>(source: string, options: CompileOptions<O> | undefined, dependencies: CompilerPorts<A, M, L, O>): CompileResult<A, M, L>;
export function parseVrl(source: string, options?: ParseOptions): ParseResult;
export function validateRoute(ast: RouteAst): Diagnostic[];
export function validateElement(element: RouteElementAst, source?: DeclarationSource): Diagnostic[];
/** Throws TypeError for malformed syntax records, RangeError for invalid domain invariants. */
export function normalizeRoute(ast: RouteAst): RouteModel;
/** Mutates supplied identifier counters; route-wide uniqueness requires normalizeRoute. */
export function normalizeElement(element: RouteElementAst, counters?: Partial<Record<ElementType, number>>): RouteElement;
export function summarizeRoute(elements: ElementView[], metadata?: CommonFields): RouteSummary;
export function createTraversal(elements: ElementView[]): Traversal;
export function validateGeometry(route: RouteView, sourceMap?: SourceMap): Diagnostic[];
export function computeVerticalLayout(route: RouteView, options?: LayoutOptions): RouteLayout;
/** Requires both endpoint elevations and consistent geometry. */
export function computeElevationLayout(route: RouteView, options?: LayoutOptions): RouteLayout;
/** Serializes caller data after numeric checks; cycles/BigInt and custom toJSON can throw. */
export function exportRouteJson(route: RouteModel): string;
export function exportRouteJson(route: unknown): string | undefined;
export function createEmptyRoute(source?: string): ParsedRouteAst;
export function createRouteElement(type: ElementType, attributes: Record<string, string>, sourceLocation?: SourceLocation, id?: string | null, label?: string | null): RouteElementAst;
export function createDiagnostic(kind: string, severity: Diagnostic["severity"], message: string, location: SourceLocation, suggestion?: string, relatedLocations?: RelatedLocation[], details?: { code?: string | undefined; span?: SourceSpan | undefined }): BuiltinDiagnostic;
export function formatDiagnostic(diagnostic: Diagnostic): string;
export function hasBlockingDiagnostics(diagnostics: Diagnostic[]): boolean;
export type LexToken = { raw: string; span: SourceSpan } & (
  { kind: "bare" | "quoted"; value: string }
  | { kind: "attribute"; key: string; value: string; valueForm: "bare" | "quoted"; keySpan: SourceSpan; valueSpan: SourceSpan }
);
export function lexVrlLine(line: string, location?: SourceLocation): { tokens: LexToken[]; diagnostics: Diagnostic[]; commentStart: number | null };
/** Malformed lexemes throw SyntaxError with a diagnostics array. */
export function tokenize(line: string): string[];
export function stripComment(line: string): string;
export function parseAttributeTokens(tokens: string[], location?: SourceLocation): { attributes: Record<string, string>; diagnostics: Diagnostic[] };
export function isMeasurementField(name: string): boolean;
export function isInclinationField(name: string): boolean;
export function isRappelStagesField(name: string): boolean;
export function isRedirectionField(name: string): boolean;
export function parseMeasurementToken(token: string): TokenResult<Measurement>;
export function parseInclinationToken(token: string): TokenResult<Inclination>;
export function parseRappelStagesToken(token: string): TokenResult<Measurement[]>;
export function parseRedirectionToken(token: string): TokenResult<ParsedRedirection>;
export function parseRedirectionsToken(token: string): TokenResult<ParsedRedirection[]>;
/** Legacy conversions retain invalid token text; they do not validate a model. */
export function normalizeAttributeValue(name: string, value: string): string | Measurement;
export function normalizeInclinationValue(name: string, value: string): string | Inclination;
export function normalizeRappelDetailValue(name: string, value: string): string | Measurement[] | ParsedRedirection[];
export function normalizeAttributes(attributes: Record<string, string>): Record<string, string | Measurement | Inclination | Measurement[] | ParsedRedirection[]>;
export function applyMinimumNodeGap<T extends { y: number; direction?: Direction | null }>(nodes: T[], minNodeGap?: number, top?: number): T[];
export function elevationSegmentDeltas(route: RouteView): number[];
export function elementVisualWeight(element: Pick<ElementView, "type">): number;
export function hasElevationProfile(route: Pick<RouteView, "metadata">): boolean;
export function horizontalProgress(element: Pick<ElementView, "type">): number;
export function residualDistributionWeights(elements: ElementView[], baseDeltas: number[]): number[];
export function resolveHorizontalScale(value?: number): number;
export function routeElevationProfile(route: Pick<RouteView, "metadata">): ElevationProfile | null;
export function technicalSegmentDelta(previous: ElementView, element: ElementView): number;
export function technicalVerticalMeters(element: ElementView): number;
export function verticalDirection(element: Pick<ElementView, "type">): -1 | 1;
export function technicalElementIndexesBetween(elements: ElementView[], index: number): number[];
export function assertFiniteNumber(value: unknown, name: string): asserts value is number;
export function assertOptionsRecord(value: unknown, name: string): asserts value is Record<string, unknown>;
export function validateLayoutOptions(options?: LayoutOptions): LayoutOptions;
