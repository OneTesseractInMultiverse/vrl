import { computeTopoScene } from "./topo-scene.js";
import { prepareNodes, prepareNode, labelLeaderPath, prepareAnchorMarks, symbolPlacement } from "./node-scene.js";
import { prepareInfoBox, prepareLegend, prepareLegendRow, legendSymbolPlacements, placeInfoBox, placeLegend } from "./panel-scene.js";
import {
  prepareRouteSegments, prepareTechnicalSegment, rungPlacements, stagePlacements, stageBoundaryPlacement,
  redirectionPlacements, prepareSegmentLabels, prepareWaterSegments, prepareStationTicks, stationTickPlacement
} from "./segment-scene.js";
import { placeDetailRows, legacyDetailRecord, prepareLevelBadge } from "./detail-layout.js";
import { nodeLabelPlacement, detailLineRows, terrainProfilePath } from "./presentation.js";
import * as svg from "./svg-serializer.js";
import { resolveTheme } from "./theme.js";
import { assertXmlCharacters } from "./xml.js";
import { validateRenderOptions } from "./render-options.js";

export {
  resolveRenderLanguage,
  topoLegendHeight,
  legendSymbolRows,
  terrainProfilePath,
  routeSegmentPath,
  dropLadderGeometry,
  technicalLineVerticalDelta,
  technicalLinePoint,
  redirectionRatio,
  redirectionsForElement,
  rappelStagesForElement,
  rappelHeightMeters,
  segmentLabel,
  segmentLabelPosition,
  nodeLabelPlacement,
  detailLineMaxWidth,
  nextLabelTitleY,
  anchorMarkCount,
  formatTopoLabel,
  formatTopoDetail,
  detailLineRows,
  resolveLevelValue,
  needsSegmentArrow,
  segmentTechnicalElement,
  inclinationPercent
} from "./presentation.js";

export function renderTopoSvg(route, layout, options = {}) {
  validateRenderOptions(options);
  const theme = resolveTheme(options.theme, options.themeTokens);
  return svg.serializeTopoScene(computeTopoScene(route, layout, options), theme);
}

export function renderNodes(layout, theme, symbology = "federation", language = "en", prepared = prepareNodes(layout, language, symbology)) {
  return prepared.map(({ node, placement, ...labels }) => renderNode(node, theme, symbology, placement, language, labels)).join("");
}

export function renderTerrainProfile(layout, theme) {
  return svg.serializeTerrain(terrainProfilePath(layout), theme);
}

export function renderLegend(layout, theme, language = "en", symbology = "federation", prepared = prepareLegend(layout, language, symbology)) {
  return svg.serializeLegend(prepared.drawingRows === undefined ? placeLegend(prepared, language) : prepared, theme);
}

export function renderLegendRow(row, x, y, theme, language = "en") {
  return svg.serializeLegendRow(prepareLegendRow(row, x, y, language), theme);
}

export function renderLegendSymbolRow(entries, x, y, theme) {
  return svg.serializeLegendSymbols(legendSymbolPlacements(entries, x, y), theme);
}

export function renderInfoBox(route, layout, theme, language = "en", prepared = prepareInfoBox(route, layout, language)) {
  return svg.serializeInfoBox(prepared.textLines === undefined ? placeInfoBox(prepared, language) : prepared, theme);
}

export function renderWaterSegments(layout, theme) {
  return svg.serializeWaterSegments(prepareWaterSegments(layout), theme);
}

export function renderRouteSegments(layout, theme, language = "en") {
  return svg.serializeRouteSegments(prepareRouteSegments(layout, language), theme);
}

export function renderDropLadderSegment(previous, node, theme, element = previous.element, language = "en", layout = null) {
  return svg.serializeTechnicalSegment(prepareTechnicalSegment(previous, node, element, language, layout, "ladder"), theme);
}

export function renderDirectTechnicalSegment(previous, node, theme, element = previous.element, layout = null, language = "en") {
  return svg.serializeTechnicalSegment(prepareTechnicalSegment(previous, node, element, language, layout, "direct"), theme);
}

export function renderDropRungs(geometry, theme) {
  return svg.serializeRungs(rungPlacements(geometry), theme);
}

export function renderRappelStageMarkers(geometry, element, theme) {
  return svg.serializeStages(stagePlacements(geometry, element), theme);
}

export function renderStageBoundary(geometry, ratio, theme) {
  return svg.serializeStageBoundary(stageBoundaryPlacement(geometry, ratio), theme);
}

export function renderRedirectionMarkers(geometry, element, theme, language = "en") {
  return svg.serializeRedirections(redirectionPlacements(geometry, element, language), theme);
}

export function renderSegmentLabels(layout, theme) {
  return svg.serializeSegmentLabels(prepareSegmentLabels(layout), theme);
}

export function renderStationTicks(layout, theme) {
  return prepareStationTicks(layout).map((item) => svg.serializeStationTick(item, theme)).join("");
}

export function renderStationTick(node, theme) {
  return svg.serializeStationTick(stationTickPlacement(node), theme);
}

export function renderNode(node, theme, symbology = "federation", placement = nodeLabelPlacement(node), language = "en", options = {}) {
  return svg.serializeNode(options.drawing ?? prepareNode(node, symbology, placement, language, options), theme);
}

export function renderLabelLeader(node, placement, theme) {
  return svg.serializeLabelLeader(labelLeaderPath(node, placement), theme);
}

export function renderAnchorMarks(node, element, theme, side = "left", language = "en") {
  return svg.serializeAnchorMarks(prepareAnchorMarks(node, element, side, language), theme);
}

export function renderSymbolMarker(node, element, color, symbology = "federation", panelColor = "#f6f8fa", language = "en") {
  return svg.serializeSymbol(symbolPlacement(node, element, symbology, language), color, panelColor);
}

export function renderDetailLine(detail, x, y, theme, language = "en", maxWidth = Number.POSITIVE_INFINITY, rows = null) {
  assertXmlCharacters(detail);
  if (detail === "") return "";
  const records = (rows ?? detailLineRows(detail, maxWidth, language)).map((row) => row.map((part) => legacyDetailRecord(part, language)));
  return svg.serializeDetails(placeDetailRows(records, x, y), theme);
}

export function renderLevelBadge(value, x, y, language = "en", category = "level", theme = resolveTheme()) {
  return svg.serializeBadge(prepareLevelBadge(value, x, y, language, category), theme);
}
