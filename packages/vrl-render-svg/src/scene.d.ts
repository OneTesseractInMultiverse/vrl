import type { ElementType, LayoutSegment, Traversal, LayoutNode, LayoutPoint, Position } from "@subvertic/vrl-core";
import type { Theme, SymbolPresentation } from "./index.js";

/** Advanced presentation contracts, revision 1; these are not route data interchange schemas. */
export interface Bounds { minX: number; minY: number; maxX: number; maxY: number }
export interface Rectangle extends Position { width: number; height: number }
export interface Line { x1: number; y1: number; x2: number; y2: number }
export interface LabelPlacement { labelX: number; titleY: number; detailY: number }
export interface LadderGeometry {
  startX: number; startY: number; dropX: number; endX: number; endY: number;
  bottomX?: number; bottomY?: number;
}
export interface TextPlacement extends Position { text: string; fontSize: number; anchor: "start" | "end" | "middle" }
export interface PlainText extends Position { kind: "text"; text: string; fontSize: number; strokeWidth: number }
export type BadgeCategory = "flow" | "exposure" | "hazardSeverity" | "inclination" | "level";
export interface BadgeValue { category: BadgeCategory; className: string; label: string }
export interface BadgePlacement extends BadgeValue, Rectangle { kind: "badge"; textX: number; textY: number }
export type DetailRecord = { kind: "text"; text: string } | (BadgeValue & { kind: "badge"; prefix: string; value: string });
export interface AnnotationIcon extends Position { id: string; size: number; bounds?: Bounds }
export type Marker =
  { kind: "icon"; id: string; code: string; x: number; y: number; textX: number; textY: number } |
  { kind: "standard"; code: string; x: number; y: number; textX: number; textY: number }
  | { kind: "snake"; code: string; label: string; path: string; textX: number; textY: number }
  | { kind: "hazard"; clearancePath: string; path: string };
export interface AnchorPlacement { count: number; marks: Position[]; overflow: TextPlacement | null; label: string }
export interface NodeDrawing {
  type: ElementType; colorToken: keyof Theme; label: string; title: string; titleX: number; titleY: number;
  detail: string; detailRecords: DetailRecord[][]; details: (PlainText | BadgePlacement)[][];
  annotationSlot?: (AnnotationIcon & { bounds: Bounds }) | null; annotationIcon?: AnnotationIcon | null;
  leader: string | null; marker: Marker; anchors: AnchorPlacement | null;
}
export interface NodeRenderOptions {
  symbols?: SymbolPresentation | undefined; style?: "classic" | "soft-terrain" | undefined;
  title?: string | undefined; detail?: string | undefined; detailRows?: string[][] | undefined;
  maxDetailWidth?: number | undefined; drawing?: NodeDrawing | undefined;
}
export interface PreparedNode {
  node: LayoutNode; placement: LabelPlacement; title: string; detail: string;
  maxDetailWidth: number; detailRows: string[][]; drawing: NodeDrawing;
}
export interface StagePlacement extends TextPlacement { boundaryRatio: number | null; boundary: Line | null }
export interface RedirectionPlacement extends TextPlacement { point: Position; label: string; path: string }
export type PreparedSegment =
  { kind: "connection"; path: string; start: LayoutPoint; end: LayoutPoint }
  | { kind: "technical"; ownerId: string; shape: "ladder" | "direct" | "curve"; geometry: Required<LadderGeometry>;
      paths: { lead: string; slope: string; exit: string }; rungs: Line[]; stages: StagePlacement[]; redirections: RedirectionPlacement[] };
export type SymbolEntry = [code: string, label: string];
export type LegendRow =
  { kind: "symbols"; entries: SymbolEntry[] }
  | { kind: "text"; value: string }
  | { kind: "badges"; category: BadgeCategory; label: string; values: string[]; description?: string };
export interface LegendSymbol extends Position { code: string; label: string; fontSize: number }
export type LegendDrawingRow =
  { kind: "symbols"; entries: LegendSymbol[] }
  | { kind: "text"; text: string; x: number; y: number; fontSize: number }
  | { kind: "badges"; label: PlainText; badges: (BadgePlacement | null)[]; description: PlainText | null };
export interface InfoBox extends Rectangle {
  lines: string[]; bounds: Bounds; label: string;
  textLines: (Position & { text: string; fontSize: number; heading: boolean })[];
}
export interface Legend extends Rectangle {
  styleNotes?: PlainText[];
  annotationEntries?: { icon: AnnotationIcon | null; text: PlainText }[];
  title: string; rows: (Position & { row: LegendRow })[]; bounds: Bounds;
  titleX: number; titleY: number; drawingRows: LegendDrawingRow[];
}
export interface SoftTerrain { contourPoints: Position[]; contour: string; fill: string; bounds: Bounds }
export interface SoftPool { ownerId: string; dry: boolean; basin: string; surface: string | null; bounds: Bounds }
export interface TopoScene {
  style: "classic" | "soft-terrain"; terrain: SoftTerrain | null; pools: SoftPool[];
  identifiers: { arrow: string };
  language: "en" | "es"; title: string; description: string;
  nodes: PreparedNode[]; segments: PreparedSegment[]; segmentLabels: (Position & { text: string })[];
  terrainPath: string; waterPaths: string[]; stationTicks: Line[][];
  infoBox: InfoBox; legend: Legend | null; contentBounds: Bounds; bounds: Bounds; viewBox: Rectangle;
}

/** Row flow keeps canonical references separate from absolute presentation coordinates. */
export interface RowTextBlock {
  lines: (Position & { text: string; fontSize: number; heading: boolean; elementIndex: number | null })[];
  icons: AnnotationIcon[]; bounds: Bounds; bottom: number;
}
export interface RowContinuation { code: string; role: "in" | "out"; sectionNumber: number; block: RowTextBlock }
export interface RowSection {
  index: number; owner: number | null; elementIndexes: number[]; segmentIndexes: number[];
  annotations: { elementIndex: number; pointIndex: number | null }[];
  segments: LayoutSegment[];
  technical: { segment: LayoutSegment; geometry: Required<LadderGeometry>; path: string; stages: StagePlacement[]; redirections: RedirectionPlacement[] } | null;
  incoming: RowContinuation | null; outgoing: RowContinuation | null;
  caption: RowTextBlock; details: RowTextBlock;
  geometry: { paths: { kind: string; token: keyof Theme; path: string; arrow: boolean }[]; bounds: Bounds };
  bounds: Bounds;
}
export interface RowTopoScene {
  flow: "rows"; style: "soft-terrain"; title: string; description: string; language: "en" | "es";
  identifiers: { arrow: string }; header: RowTextBlock; rows: RowSection[]; legend: RowTextBlock | null;
  traversal: Traversal; physicalPoints: LayoutPoint[]; bounds: Bounds; viewBox: Rectangle;
}
