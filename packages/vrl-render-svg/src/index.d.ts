import type { ElementType, ElementView, LayoutNode, LayoutPoint, Measurement, Position, Redirection, RouteLayout, RouteView } from "@subvertic/core";
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
  theme?: "light" | "dark" | undefined; themeTokens?: Partial<Theme> | undefined;
  language?: string | undefined; locale?: string | undefined; symbology?: string | undefined;
  legend?: boolean | undefined;
}
/** Caller-built layouts may omit points and use nodes as the terrain path. */
export type RenderLayout = Omit<RouteLayout, "points" | "spine"> & { points?: LayoutPoint[]; spine?: RouteLayout["spine"] };
export const LIGHT_THEME: Theme;
export const DARK_THEME: Theme;
export function resolveTheme(theme?: "light" | "dark", overrides?: Partial<Theme>): Theme;
/** Stable SVG facade. Throws for invalid layouts, options, paint or XML characters. */
export function renderTopoSvg(route: RouteView, layout: RenderLayout, options?: RenderOptions): string;
/** Advanced scene inspection; returned records are not a serialized domain model. */
export function computeTopoScene(route: RouteView, layout: RenderLayout, options?: RenderOptions): TopoScene;
export function escapeXml(value: unknown): string;
export function elementColorToken(element: ElementView): keyof Theme;
export function formatElementDetail(element: ElementView, language?: string): string;
export function formatElementTitle(element: ElementView, language?: string): string;
/** null is not a supported measurement argument. */
export function formatMeasurement(measurement: Measurement | string | number | undefined): string;
export interface DiagramText {
  routeSummary: string; schematicDescription: string; topo: string; noData: string; difficulty: string;
  elevationChange: string; region: string; country: string; anchor: string; anchors: string;
  exposure: string; flow: string; hazardSeverity: string; inclination: string; inclinationDescription: string;
  landing: string; severity: string; legendTitle: string; legendRappel: string; legendTechnical: string;
  redirectionAnchor: string; ropeStages: string; snakeHazard: string; sideLeft: string; sideRight: string;
  elements: Record<ElementType, string>; values: Record<string, string>;
}
export function diagramText(language?: string): DiagramText;
export function elementLabel(elementType: string, language?: string): string;
export function localizeDetailValue<T>(value: T, language?: string): T extends string ? string : T;
export function resolveDiagramLanguage(language?: unknown): "en" | "es";
export type SymbolKind = "standard" | "snake" | "hazard";
export function isSnakeHazard(element: ElementView): boolean;
export function resolveSymbolProfile(profileName?: string): Record<ElementType, string>;
export function symbolCode(element: ElementView, profileName?: string): string;
export function symbolKind(element: ElementView): SymbolKind;
export function anchorMarkCount(element: ElementView): number;
export function detailLineMaxWidth(layoutWidth: number, labelX: number): number;
export function detailLineRows(detail: string, maxWidth?: number, language?: string): string[][];
export interface TechnicalScale { technicalDeltaY?: number | null; elevation?: { pixelsPerMeter: number } }
export type ElementPosition = Position & { element: ElementView };
export function dropLadderGeometry(previous: ElementPosition, node: Position, element?: ElementView, layout?: TechnicalScale | null): Required<LadderGeometry>;
export function dropLadderGeometry(previous: Position, node: Position, element: ElementView, layout?: TechnicalScale | null): Required<LadderGeometry>;
export function formatTopoDetail(element: ElementView, node?: (Position & { elevationMeters?: number }) | null, language?: string): string;
export function formatTopoLabel(element: ElementView, language?: string): string;
export function inclinationPercent(element?: ElementView | null): number;
export function legendSymbolRows(language?: string, symbology?: string): SymbolEntry[][];
export function needsSegmentArrow(element: ElementView): boolean;
export function nextLabelTitleY(placement: LabelPlacement, detailRowCount: number): number;
export function nodeLabelPlacement(node: ElementPosition, minimumTitleY?: number | null): LabelPlacement;
export function rappelHeightMeters(element?: ElementView | null): number;
export function rappelStagesForElement(element: ElementView): Measurement[];
export function redirectionRatio(redirection: Redirection, element: ElementView): number;
export function redirectionsForElement(element: ElementView): Redirection[];
export function renderAnchorMarks(node: Position, element: ElementView, theme: Theme, side?: "left" | "right", language?: string): string;
export function renderDetailLine(detail: string, x: number, y: number, theme: Theme, language?: string, maxWidth?: number, rows?: string[][] | null): string;
export function renderDirectTechnicalSegment(previous: ElementPosition, node: Position, theme: Theme, element?: ElementView, layout?: TechnicalScale | null, language?: string): string;
export function renderDirectTechnicalSegment(previous: Position, node: Position, theme: Theme, element: ElementView, layout?: TechnicalScale | null, language?: string): string;
export function renderDropLadderSegment(previous: ElementPosition, node: Position, theme: Theme, element?: ElementView, language?: string, layout?: TechnicalScale | null): string;
export function renderDropLadderSegment(previous: Position, node: Position, theme: Theme, element: ElementView, language?: string, layout?: TechnicalScale | null): string;
export function renderDropRungs(geometry: LadderGeometry, theme: Theme): string;
export function renderInfoBox(route: RouteView, layout: RenderLayout, theme: Theme, language?: string, prepared?: Omit<InfoBox, "textLines" | "label"> & Partial<Pick<InfoBox, "textLines" | "label">>): string;
export function renderLabelLeader(node: Position, placement: LabelPlacement, theme: Theme): string;
export function renderLegend(layout: RenderLayout, theme: Theme, language?: string, symbology?: string, prepared?: Omit<Legend, "drawingRows" | "titleX" | "titleY"> & Partial<Pick<Legend, "drawingRows" | "titleX" | "titleY">>): string;
export function renderLegendRow(row: LegendRow, x: number, y: number, theme: Theme, language?: string): string;
export function renderLegendSymbolRow(entries: SymbolEntry[], x: number, y: number, theme: Theme): string;
export function renderLevelBadge(value: string, x: number, y: number, language?: string, category?: BadgeCategory, theme?: Theme): string;
export function renderNode(node: LayoutNode, theme: Theme, symbology?: string, placement?: LabelPlacement, language?: string, options?: NodeRenderOptions): string;
export function renderNodes(layout: RenderLayout, theme: Theme, symbology?: string, language?: string, prepared?: PreparedNode[]): string;
export function renderRappelStageMarkers(geometry: LadderGeometry, element: ElementView, theme: Theme): string;
export function renderRedirectionMarkers(geometry: LadderGeometry, element: ElementView, theme: Theme, language?: string): string;
export function renderRouteSegments(layout: RenderLayout, theme: Theme, language?: string): string;
export function renderSegmentLabels(layout: RenderLayout, theme: Theme): string;
export function renderStationTick(node: ElementPosition, theme: Theme): string;
export function renderStationTicks(layout: RenderLayout, theme: Theme): string;
export function renderStageBoundary(geometry: LadderGeometry, ratio: number, theme: Theme): string;
export function renderSymbolMarker(node: Position, element: ElementView, color: string, symbology?: string, panelColor?: string, language?: string): string;
export function renderTerrainProfile(layout: RenderLayout, theme: Theme): string;
export function renderWaterSegments(layout: RenderLayout, theme: Theme): string;
export function resolveLevelValue(value: unknown, language?: string): "dry" | "low" | "medium" | "high" | "critical" | null;
export function resolveRenderLanguage(options?: RenderOptions): "en" | "es";
export function segmentLabel(previous: Position, node: ElementPosition): string;
export function segmentLabelPosition(previous: Position, node: Position): Position;
export function segmentTechnicalElement(previous: ElementPosition, node: ElementPosition): ElementView | null;
export function technicalLineVerticalDelta(previous: ElementPosition, node: Position, element?: ElementView, layout?: TechnicalScale | null): number;
export function technicalLineVerticalDelta(previous: Position, node: Position, element: ElementView, layout?: TechnicalScale | null): number;
export function technicalLinePoint(geometry: LadderGeometry, ratio: number): Position;
export function topoLegendHeight(options?: RenderOptions): number;
export function terrainProfilePath(layout: RenderLayout): string;
export function routeSegmentPath(previous: ElementPosition, node: Position, element?: ElementView): string;
export function routeSegmentPath(previous: Position, node: Position, element: ElementView): string;
