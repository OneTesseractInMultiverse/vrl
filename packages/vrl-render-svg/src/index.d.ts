import type { ElementType, ElementView, LayoutNode, LayoutPoint, Measurement, Position, Redirection, RouteLayout, RouteView } from "@subvertic/vrl-core";
import type { BadgeCategory, InfoBox, LabelPlacement, LadderGeometry, Legend, LegendRow, NodeRenderOptions, PreparedNode, SymbolEntry, TopoScene } from "./scene.js";
export type * from "./scene.js";

/** Public contract revision 1. Only paint values accepted by the renderer are valid tokens. */
export interface Theme {
  background: string; terrain: string; text: string; mutedText: string; routeLine: string;
  water: string; hazard: string; warning: string; anchor: string; rappel: string; exit: string; panel: string;
  flowBadge: string; flowBadgeText: string; exposureBadge: string; exposureBadgeText: string;
  hazardSeverityBadge: string; hazardSeverityBadgeText: string; inclinationBadge: string;
  inclinationBadgeText: string; levelBadge: string; levelBadgeText: string;
}
export interface RenderOptions {
  /** Optional schematic presentation; classic preserves historical output. */
  style?: "classic" | "soft-terrain" | undefined;
  theme?: "light" | "dark" | undefined; themeTokens?: Partial<Theme> | undefined;
  language?: string | undefined; locale?: string | undefined; symbology?: string | undefined;
  legend?: boolean | undefined;
  /** Document-unique prefix: 1–64 ASCII letters/digits/_/-, starting with a letter. Default: vrl. */
  idPrefix?: string | undefined;
}
/** Caller-built layouts may omit points and use nodes as the terrain path. */
export type RenderLayout = Omit<RouteLayout, "points" | "spine"> & { points?: LayoutPoint[]; spine?: RouteLayout["spine"] };
/** Shared frozen defaults; use resolveTheme/themeTokens for per-call customization. */
export const LIGHT_THEME: Readonly<Theme>;
export const DARK_THEME: Readonly<Theme>;
/**
 * Validate light/dark selection and overrides, then produce an owned resolved token record without mutating frozen defaults.
 * @responsibility coordinator
 * @param {"light" | "dark"} [theme] - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name; defaults to "light".
 * @param {Partial<Theme>} [overrides] - Caller-supplied values replacing the corresponding defaults; defaults to {}.
 * @returns {Theme} Owned validated theme-token record; frozen shared defaults remain unchanged.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function resolveTheme(theme?: "light" | "dark", overrides?: Partial<Theme>): Theme;
/**
 * Stable SVG facade. Throws for invalid layouts, options, paint or XML characters.
 * Resolve theme, prepare the full scene and serialize accessible SVG; invalid configuration or numeric/XML data propagates as an exception.
 * @responsibility coordinator
 * @param {RouteView} route - Normalized route or compatible route view used by this operation.
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {RenderOptions} [options] - Operation-specific option record; defaults to an empty record. Carries renderer configuration or the internal placement overrides consumed below.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderTopoSvg(route: RouteView, layout: RenderLayout, options?: RenderOptions): string;
/**
 * Advanced scene inspection; returned records are not a serialized domain model.
 * Validate render inputs, resolve style/language/IDs, prepare layers and panels, then fit complete bounds without changing the route or layout. Prepare once: fitting and serialization consume the same presentation records.
 * @responsibility coordinator
 * @param {RouteView} route - Normalized route or compatible route view used by this operation.
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {RenderOptions} [options] - Operation-specific option record; defaults to an empty record. Carries renderer configuration or the internal placement overrides consumed below.
 * @returns {TopoScene} Renderer-owned scene containing style, identifiers, layers, panels, conservative bounds and fitted viewBox.
 */
export function computeTopoScene(route: RouteView, layout: RenderLayout, options?: RenderOptions): TopoScene;
/**
 * Convert a value to text, reject invalid XML 1.0 characters and encode reserved characters and carriage returns.
 * @responsibility coordinator
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {string} XML-safe text preserving valid Unicode and carriage returns without silent replacement.
 */
export function escapeXml(value: unknown): string;
/**
 * Choose the semantic theme-token name for an element's type.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @returns {keyof Theme} Semantic theme-token name; unsupported types use routeLine.
 */
export function elementColorToken(element: ElementView): keyof Theme;
/**
 * Format supplied element attributes as human-readable detail text.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Human-readable declared measurements and descriptive attributes, or empty text when the element has no details.
 */
export function formatElementDetail(element: ElementView, language?: string): string;
/**
 * Format the element's identity and localized type label without altering its model.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Localized element type with its supplied label or identity when present.
 */
export function formatElementTitle(element: ElementView, language?: string): string;
/**
 * null is not a supported measurement argument.
 * Format an available typed metric measurement, retaining the helper's empty-text convention for absent values.
 * @responsibility computation
 * @param {Measurement | string | number | undefined} measurement - Typed metric measurement containing a numeric meters value.
 * @returns {string} Numeric meters followed by m for a typed object; nonobject inputs yield empty text.
 */
export function formatMeasurement(measurement: Measurement | string | number | undefined): string;
export interface DiagramText {
  readonly routeSummary: string; readonly schematicDescription: string; readonly topo: string; readonly noData: string; readonly difficulty: string;
  readonly elevationChange: string; readonly region: string; readonly country: string; readonly anchor: string; readonly anchors: string;
  readonly exposure: string; readonly flow: string; readonly hazardSeverity: string; readonly inclination: string; readonly inclinationDescription: string;
  readonly landing: string; readonly severity: string; readonly legendTitle: string; readonly legendRappel: string; readonly legendTechnical: string;
  readonly redirectionAnchor: string; readonly ropeStages: string; readonly snakeHazard: string; readonly sideLeft: string; readonly sideRight: string;
  readonly elements: Readonly<Record<ElementType, string>>; readonly values: Readonly<Record<string, string>>;
}
/**
 * Returns shared frozen text, including nested elements and values dictionaries.
 * Return the immutable dictionary for the resolved diagram language.
 * @responsibility computation
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to DEFAULT_LANGUAGE.
 * @returns {DiagramText} Shared frozen localization dictionary; callers must not mutate it.
 */
export function diagramText(language?: string): DiagramText;
/**
 * Look up the localized element label with the vocabulary's fallback behavior.
 * @responsibility computation
 * @param {string} elementType - Declared domain element type used for vocabulary lookup.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to DEFAULT_LANGUAGE.
 * @returns {string} The selected result, including the documented absent-value fallback.
 */
export function elementLabel(elementType: string, language?: string): string;
/**
 * Translate a known categorical value and preserve unrecognized text.
 * @responsibility computation
 * @param {T} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to DEFAULT_LANGUAGE.
 * @returns {T extends string ? string : T} The value value selected or validated above. The selected result, including the documented absent-value fallback.
 */
export function localizeDetailValue<T>(value: T, language?: string): T extends string ? string : T;
/**
 * Resolve supported language names and aliases with the documented English fallback.
 * @responsibility computation
 * @param {unknown} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to DEFAULT_LANGUAGE.
 * @returns {"en" | "es"} Supported en or es dictionary key after alias/fallback resolution.
 */
export function resolveDiagramLanguage(language?: unknown): "en" | "es";
export type SymbolKind = "standard" | "snake" | "hazard";
/**
 * Recognize supported snake-hazard extension values on hazard elements.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function isSnakeHazard(element: ElementView): boolean;
/**
 * Returns a shared frozen profile; unknown names use federation.
 * Return an own-key immutable symbol profile or the default profile for unsupported names.
 * @responsibility computation
 * @param {string} [profileName] - Requested named symbol profile; unsupported names use the default; defaults to DEFAULT_PROFILE.
 * @returns {Readonly<Record<ElementType, string>>} Shared frozen profile, falling back to the default for unsupported names.
 */
export function resolveSymbolProfile(profileName?: string): Readonly<Record<ElementType, string>>;
/**
 * Select a snake-specific code, profile code or identity-based fallback for an element.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @param {string} [profileName] - Requested named symbol profile; unsupported names use the default; defaults to DEFAULT_PROFILE.
 * @returns {string} Selected profile/snake code or the two-character identity fallback.
 */
export function symbolCode(element: ElementView, profileName?: string): string;
/**
 * Select snake, ordinary hazard or standard symbol geometry from the element's declared type.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @returns {SymbolKind} One of snake, hazard or standard, selecting prepared symbol geometry.
 */
export function symbolKind(element: ElementView): SymbolKind;
/**
 * Compute the capped count of visible anchor circles; the full declared count remains available separately.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} At most four visible anchor marks; never the full quantity when an overflow exists.
 */
export function anchorMarkCount(element: ElementView): number;
/**
 * Reserve at least 96 drawing units for details after subtracting label offset and right margin.
 * @responsibility computation
 * @param {number} layoutWidth - Nominal drawing width before final content fitting.
 * @param {number} labelX - Horizontal text origin in drawing units.
 * @returns {number} The result returned by Math.max.
 */
export function detailLineMaxWidth(layoutWidth: number, labelX: number): number;
/**
 * Wrap the legacy detail string into rows while preserving indivisible badges and supported unbounded-width behavior.
 * @responsibility computation
 * @param {string} detail - Unescaped legacy detail text before wrapping and XML encoding.
 * @param {number} [maxWidth] - Available text width in drawing units; compatible helpers accept Infinity for no wrapping; defaults to Number.POSITIVE_INFINITY.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string[][]} The ordered records or values assembled above. The rows value selected or validated above.
 */
export function detailLineRows(detail: string, maxWidth?: number, language?: string): string[][];
export interface TechnicalScale { technicalDeltaY?: number | null; elevation?: { pixelsPerMeter: number } }
export type ElementPosition = Position & { element: ElementView };
/**
 * Compute technical lead, slope and exit coordinates from direction, inclination and owned pixel delta; constrain horizontal run to available space.
 * @responsibility computation
 * @param {ElementPosition} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {ElementView} [element] - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {TechnicalScale | null} [layout] - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to null.
 * @returns {Required<LadderGeometry>} A record containing startX, startY, dropX, bottomX, bottomY, endX, endY.
 */
export function dropLadderGeometry(previous: ElementPosition, node: Position, element?: ElementView, layout?: TechnicalScale | null): Required<LadderGeometry>;
/**
 * Compute technical lead, slope and exit coordinates from direction, inclination and owned pixel delta; constrain horizontal run to available space.
 * @responsibility computation
 * @param {Position} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {TechnicalScale | null} [layout] - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to null.
 * @returns {Required<LadderGeometry>} A record containing startX, startY, dropX, bottomX, bottomY, endX, endY.
 */
export function dropLadderGeometry(previous: Position, node: Position, element: ElementView, layout?: TechnicalScale | null): Required<LadderGeometry>;
/**
 * Join typed detail records using the historical slash-separated string format.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @param {(Position & { elevationMeters?: number }) | null} [node] - Current positioned node, or syntax node when inspecting source code; defaults to null.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Typed detail records joined with the legacy slash separator.
 */
export function formatTopoDetail(element: ElementView, node?: (Position & { elevationMeters?: number }) | null, language?: string): string;
/**
 * Choose boundary labels, technical identity/height text or empty titles for symbol-only element types.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Boundary or technical title, or empty text for symbol-only types.
 */
export function formatTopoLabel(element: ElementView, language?: string): string;
/**
 * Read a supplied typed inclination, defaulting to vertical presentation when absent.
 * @responsibility computation
 * @param {ElementView | null} [element] - Owning route element with its type, identity and declared attributes.
 * @returns {number} The inclination.percent value selected or validated above. The literal 100 for this branch.
 */
export function inclinationPercent(element?: ElementView | null): number;
/**
 * Build two localized legend rows from the selected symbol profile.
 * @responsibility computation
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} [symbology] - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @returns {SymbolEntry[][]} The ordered records or values assembled above.
 */
export function legendSymbolRows(language?: string, symbology?: string): SymbolEntry[][];
/**
 * Recognize rappel, downclimb and climb elements as technical directional motion.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function needsSegmentArrow(element: ElementView): boolean;
/**
 * Compute the first free title baseline after the current title and at least one detail row.
 * @responsibility computation
 * @param {LabelPlacement} placement - Prepared coordinates for a node label, symbol, anchor group or panel.
 * @param {number} detailRowCount - Number of prepared detail rows below the title.
 * @returns {number} The result of the documented comparison or calculation.
 */
export function nextLabelTitleY(placement: LabelPlacement, detailRowCount: number): number;
/**
 * Compute natural label coordinates constrained by the minimum available title baseline.
 * @responsibility computation
 * @param {ElementPosition} node - Current positioned node, or syntax node when inspecting source code.
 * @param {number | null} [minimumTitleY] - Optional earliest available title baseline in drawing units; defaults to null.
 * @returns {LabelPlacement} A record containing labelX, titleY, detailY.
 */
export function nodeLabelPlacement(node: ElementPosition, minimumTitleY?: number | null): LabelPlacement;
/**
 * Read a typed numeric height in meters, returning zero for compatible inputs without one.
 * @responsibility computation
 * @param {ElementView | null} [element] - Owning route element with its type, identity and declared attributes.
 * @returns {number} The height.meters value selected or validated above. The literal 0 for this branch.
 */
export function rappelHeightMeters(element?: ElementView | null): number;
/**
 * Return supplied typed stages or an empty list when absent.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @returns {Measurement[]} The selected result, including the documented absent-value fallback.
 */
export function rappelStagesForElement(element: ElementView): Measurement[];
/**
 * Divide a declared redirection distance by rappel height, using midpoint placement when the compatible input has no height.
 * @responsibility computation
 * @param {Redirection} redirection - Typed metric distance and side for one declared redirection.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} The selected result, including the documented absent-value fallback.
 */
export function redirectionRatio(redirection: Redirection, element: ElementView): number;
/**
 * Select the plural or legacy singular typed redirection list without inventing entries.
 * @responsibility computation
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @returns {Redirection[]} The element.attributes.redirections value selected or validated above. The element.attributes.redirection value selected or validated above. The ordered records or values assembled above.
 */
export function redirectionsForElement(element: ElementView): Redirection[];
/**
 * Prepare anchor marks drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {"left" | "right"} [side] - Declared left/right station or redirection side; defaults to "left".
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderAnchorMarks(node: Position, element: ElementView, theme: Theme, side?: "left" | "right", language?: string): string;
/**
 * Validate original XML text, prepare or reuse legacy detail rows and serialize their positioned drawing records.
 * @responsibility coordinator
 * @param {string} detail - Unescaped legacy detail text before wrapping and XML encoding.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {number} [maxWidth] - Available text width in drawing units; compatible helpers accept Infinity for no wrapping; defaults to Number.POSITIVE_INFINITY.
 * @param {string[][] | null} [rows] - Prepared detail rows in display order; defaults to null.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderDetailLine(detail: string, x: number, y: number, theme: Theme, language?: string, maxWidth?: number, rows?: string[][] | null): string;
/**
 * Prepare direct technical segment drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {ElementPosition} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {ElementView} [element] - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {TechnicalScale | null} [layout] - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to null.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} [idPrefix] - Caller-owned unique SVG namespace; defaults retain standalone-document compatibility.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderDirectTechnicalSegment(previous: ElementPosition, node: Position, theme: Theme, element?: ElementView, layout?: TechnicalScale | null, language?: string, idPrefix?: string): string;
/**
 * Prepare direct technical segment drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Position} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {TechnicalScale | null} [layout] - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to null.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} [idPrefix] - Caller-owned unique SVG namespace; defaults retain standalone-document compatibility.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderDirectTechnicalSegment(previous: Position, node: Position, theme: Theme, element: ElementView, layout?: TechnicalScale | null, language?: string, idPrefix?: string): string;
/**
 * Prepare drop ladder segment drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {ElementPosition} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {ElementView} [element] - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {TechnicalScale | null} [layout] - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to null.
 * @param {string} [idPrefix] - Caller-owned unique SVG namespace; defaults retain standalone-document compatibility.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderDropLadderSegment(previous: ElementPosition, node: Position, theme: Theme, element?: ElementView, language?: string, layout?: TechnicalScale | null, idPrefix?: string): string;
/**
 * Prepare drop ladder segment drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Position} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {TechnicalScale | null} [layout] - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to null.
 * @param {string} [idPrefix] - Caller-owned unique SVG namespace; defaults retain standalone-document compatibility.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderDropLadderSegment(previous: Position, node: Position, theme: Theme, element: ElementView, language?: string, layout?: TechnicalScale | null, idPrefix?: string): string;
/**
 * Prepare drop rungs drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {LadderGeometry} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderDropRungs(geometry: LadderGeometry, theme: Theme): string;
/**
 * Prepare info box drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {RouteView} route - Normalized route or compatible route view used by this operation.
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {Omit<InfoBox, "textLines" | "label"> & Partial<Pick<InfoBox, "textLines" | "label">>} [prepared] - Optional already prepared drawing records; avoids recomputing geometry; defaults to prepareInfoBox(route, layout, language).
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderInfoBox(route: RouteView, layout: RenderLayout, theme: Theme, language?: string, prepared?: Omit<InfoBox, "textLines" | "label"> & Partial<Pick<InfoBox, "textLines" | "label">>): string;
/**
 * Prepare label leader drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {LabelPlacement} placement - Prepared coordinates for a node label, symbol, anchor group or panel.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderLabelLeader(node: Position, placement: LabelPlacement, theme: Theme): string;
/**
 * Prepare legend drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} [symbology] - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @param {Omit<Legend, "drawingRows" | "titleX" | "titleY"> & Partial<Pick<Legend, "drawingRows" | "titleX" | "titleY">>} [prepared] - Optional already prepared drawing records; avoids recomputing geometry; defaults to prepareLegend(layout, language, symbology).
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderLegend(layout: RenderLayout, theme: Theme, language?: string, symbology?: string, prepared?: Omit<Legend, "drawingRows" | "titleX" | "titleY"> & Partial<Pick<Legend, "drawingRows" | "titleX" | "titleY">>): string;
/**
 * Prepare legend row drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {LegendRow} row - One prepared detail or legend row.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderLegendRow(row: LegendRow, x: number, y: number, theme: Theme, language?: string): string;
/**
 * Prepare legend symbol row drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {SymbolEntry[]} entries - Ordered key/value, symbol or source entries for this projection.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderLegendSymbolRow(entries: SymbolEntry[], x: number, y: number, theme: Theme): string;
/**
 * Prepare level badge drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {string} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {BadgeCategory} [category] - Badge or rule category controlling vocabulary and presentation; defaults to "level".
 * @param {Theme} [theme] - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name; defaults to resolveTheme().
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderLevelBadge(value: string, x: number, y: number, language?: string, category?: BadgeCategory, theme?: Theme): string;
/**
 * Prepare node drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {LayoutNode} node - Current positioned node, or syntax node when inspecting source code.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {string} [symbology] - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @param {LabelPlacement} [placement] - Prepared coordinates for a node label, symbol, anchor group or panel; defaults to nodeLabelPlacement(node).
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {NodeRenderOptions} [options] - Operation-specific option record; defaults to an empty record. Carries renderer configuration or the internal placement overrides consumed below.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderNode(node: LayoutNode, theme: Theme, symbology?: string, placement?: LabelPlacement, language?: string, options?: NodeRenderOptions): string;
/**
 * Prepare nodes drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {string} [symbology] - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {PreparedNode[]} [prepared] - Optional already prepared drawing records; avoids recomputing geometry; defaults to prepareNodes(layout, language, symbology).
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderNodes(layout: RenderLayout, theme: Theme, symbology?: string, language?: string, prepared?: PreparedNode[]): string;
/**
 * Prepare rappel stage markers drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {LadderGeometry} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderRappelStageMarkers(geometry: LadderGeometry, element: ElementView, theme: Theme): string;
/**
 * Prepare redirection markers drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {LadderGeometry} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderRedirectionMarkers(geometry: LadderGeometry, element: ElementView, theme: Theme, language?: string): string;
/**
 * Prepare route segments drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} [idPrefix] - Caller-owned unique SVG namespace; defaults retain standalone-document compatibility.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderRouteSegments(layout: RenderLayout, theme: Theme, language?: string, idPrefix?: string): string;
/**
 * Prepare segment labels drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderSegmentLabels(layout: RenderLayout, theme: Theme): string;
/**
 * Prepare station tick drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {ElementPosition} node - Current positioned node, or syntax node when inspecting source code.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderStationTick(node: ElementPosition, theme: Theme): string;
/**
 * Prepare station ticks drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderStationTicks(layout: RenderLayout, theme: Theme): string;
/**
 * Prepare stage boundary drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {LadderGeometry} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {number} ratio - Relative position along a technical path; placement helpers clamp away from endpoints.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderStageBoundary(geometry: LadderGeometry, ratio: number, theme: Theme): string;
/**
 * Prepare symbol marker drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes.
 * @param {string} color - Validated foreground paint value.
 * @param {string} [symbology] - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @param {string} [panelColor] - Validated background/clearance paint value; defaults to "#f6f8fa".
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderSymbolMarker(node: Position, element: ElementView, color: string, symbology?: string, panelColor?: string, language?: string): string;
/**
 * Prepare terrain profile drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderTerrainProfile(layout: RenderLayout, theme: Theme): string;
/**
 * Prepare water segments drawing records and delegate their SVG serialization; preserve the compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Theme} theme - Resolved renderer color tokens; theme selection helpers instead accept the light/dark name.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderWaterSegments(layout: RenderLayout, theme: Theme): string;
/**
 * Recognize canonical or localized level text and return its canonical level, otherwise null.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} [language] - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {"dry" | "low" | "medium" | "high" | "critical" | null} Null when no matching value or problem exists. The result of the documented comparison or calculation.
 */
export function resolveLevelValue(value: unknown, language?: string): "dry" | "low" | "medium" | "high" | "critical" | null;
/**
 * Apply language, locale and Spanish-profile precedence before resolving the supported output language.
 * @responsibility computation
 * @param {RenderOptions} [options] - Operation-specific option record; defaults to an empty record. Carries renderer configuration or the internal placement overrides consumed below.
 * @returns {"en" | "es"} Supported language key after explicit language, locale and symbol-profile precedence.
 */
export function resolveRenderLanguage(options?: RenderOptions): "en" | "es";
/**
 * Format the destination element's declared traverse measurement as connection text.
 * @responsibility computation
 * @param {Position} previous - Previous positioned node or element in the compatibility helper.
 * @param {ElementPosition} node - Current positioned node, or syntax node when inspecting source code.
 * @returns {string} The traverse value selected or validated above.
 */
export function segmentLabel(previous: Position, node: ElementPosition): string;
/**
 * Place a segment label just above the rounded midpoint of two nodes.
 * @responsibility computation
 * @param {Position} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @returns {Position} A record containing x, y.
 */
export function segmentLabelPosition(previous: Position, node: Position): Position;
/**
 * Resolve the legacy connection's single technical owner; reject ambiguous two-event connections and require canonical segments instead.
 * @responsibility computation
 * @param {ElementPosition} previous - Previous positioned node or element in the compatibility helper.
 * @param {ElementPosition} node - Current positioned node, or syntax node when inspecting source code.
 * @returns {ElementView | null} The selected result, including the documented absent-value fallback.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function segmentTechnicalElement(previous: ElementPosition, node: ElementPosition): ElementView | null;
/**
 * Resolve the owned technical pixel delta, with compatible elevation-scale and endpoint fallbacks for direct helper callers.
 * @responsibility computation
 * @param {ElementPosition} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {ElementView} [element] - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {TechnicalScale | null} [layout] - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to null.
 * @returns {number} The result of the documented comparison or calculation.
 */
export function technicalLineVerticalDelta(previous: ElementPosition, node: Position, element?: ElementView, layout?: TechnicalScale | null): number;
/**
 * Resolve the owned technical pixel delta, with compatible elevation-scale and endpoint fallbacks for direct helper callers.
 * @responsibility computation
 * @param {Position} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {TechnicalScale | null} [layout] - Positioned route geometry in drawing units, including nodes and canonical segments; defaults to null.
 * @returns {number} The result of the documented comparison or calculation.
 */
export function technicalLineVerticalDelta(previous: Position, node: Position, element: ElementView, layout?: TechnicalScale | null): number;
/**
 * Interpolate a straight technical line at a ratio clamped to 0.05–0.95 and round to drawing coordinates.
 * @responsibility computation
 * @param {LadderGeometry} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {number} ratio - Relative position along a technical path; placement helpers clamp away from endpoints.
 * @returns {Position} A record containing x, y.
 */
export function technicalLinePoint(geometry: LadderGeometry, ratio: number): Position;
/**
 * Return zero when the legend is disabled or the classic legend reservation otherwise.
 * @responsibility computation
 * @param {RenderOptions} [options] - Operation-specific option record; defaults to an empty record. Carries renderer configuration or the internal placement overrides consumed below.
 * @returns {number} The selected result, including the documented absent-value fallback.
 */
export function topoLegendHeight(options?: RenderOptions): number;
/**
 * Build the classic schematic terrain polygon from positioned route points, including empty-layout fallback geometry.
 * @responsibility computation
 * @param {RenderLayout} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
export function terrainProfilePath(layout: RenderLayout): string;
/**
 * Build a schematic connection path between positioned nodes with the technical lead shape when applicable.
 * @responsibility computation
 * @param {ElementPosition} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {ElementView} [element] - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
export function routeSegmentPath(previous: ElementPosition, node: Position, element?: ElementView): string;
/**
 * Build a schematic connection path between positioned nodes with the technical lead shape when applicable.
 * @responsibility computation
 * @param {Position} previous - Previous positioned node or element in the compatibility helper.
 * @param {Position} node - Current positioned node, or syntax node when inspecting source code.
 * @param {ElementView} element - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
export function routeSegmentPath(previous: Position, node: Position, element: ElementView): string;
