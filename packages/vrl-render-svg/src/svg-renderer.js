import { resolveSvgIdentifiers } from "./svg-identifiers.js";
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

/**
 * Resolve theme, prepare the full scene and serialize accessible SVG; invalid configuration or numeric/XML
 * data propagates as an exception.
 * @responsibility coordinator
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Object} options - Renderer settings: style, theme/tokens, language/locale, symbology, legend and caller-owned idPrefix; defaults to an empty record. Carries renderer configuration or the internal placement overrides consumed below.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderTopoSvg(route, layout, options = {}) {
  validateRenderOptions(options);
  const theme = resolveTheme(options.theme, options.themeTokens);
  return svg.serializeTopoScene(computeTopoScene(route, layout, options), theme);
}

/**
 * Prepare nodes drawing records and delegate their SVG serialization; preserve the compatibility helper's
 * defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {string} symbology - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {unknown} prepared - Optional already prepared drawing records; avoids recomputing geometry; defaults to prepareNodes(layout, language, symbology).
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderNodes(layout, theme, symbology = "federation", language = "en", prepared = prepareNodes(layout, language, symbology)) {
  return prepared.map(/**
   * Apply renderNode to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {Object} input1.node - Positioned route point with x/y and its owning normalized element when required.
   * @param {Object} input1.placement - Prepared coordinates for a node label, symbol, anchor group or panel.
   * @param {unknown} input1.labels - Ordered rendered labels projected for comparison.
   * @returns {unknown} The result returned by renderNode.
   */ ({ node, placement, ...labels }) => renderNode(node, theme, symbology, placement, language, labels)).join("");
}

/**
 * Prepare terrain profile drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderTerrainProfile(layout, theme) {
  return svg.serializeTerrain(terrainProfilePath(layout), theme);
}

/**
 * Prepare legend drawing records and delegate their SVG serialization; preserve the compatibility helper's
 * defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} symbology - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @param {unknown} prepared - Optional already prepared drawing records; avoids recomputing geometry; defaults to prepareLegend(layout, language, symbology).
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderLegend(layout, theme, language = "en", symbology = "federation", prepared = prepareLegend(layout, language, symbology)) {
  return svg.serializeLegend(prepared.drawingRows === undefined ? placeLegend(prepared, language) : prepared, theme);
}

/**
 * Prepare legend row drawing records and delegate their SVG serialization; preserve the compatibility helper's
 * defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderLegendRow(row, x, y, theme, language = "en") {
  return svg.serializeLegendRow(prepareLegendRow(row, x, y, language), theme);
}

/**
 * Prepare legend symbol row drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Array} entries - Ordered symbol code/label pairs or positioned legend-symbol records.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderLegendSymbolRow(entries, x, y, theme) {
  return svg.serializeLegendSymbols(legendSymbolPlacements(entries, x, y), theme);
}

/**
 * Prepare info box drawing records and delegate their SVG serialization; preserve the compatibility helper's
 * defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {unknown} prepared - Optional already prepared drawing records; avoids recomputing geometry; defaults to prepareInfoBox(route, layout, language).
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderInfoBox(route, layout, theme, language = "en", prepared = prepareInfoBox(route, layout, language)) {
  return svg.serializeInfoBox(prepared.textLines === undefined ? placeInfoBox(prepared, language) : prepared, theme);
}

/**
 * Prepare water segments drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderWaterSegments(layout, theme) {
  return svg.serializeWaterSegments(prepareWaterSegments(layout), theme);
}

/**
 * Prepare route segments drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} idPrefix - Caller-owned unique SVG namespace; defaults retain standalone-document compatibility.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderRouteSegments(layout, theme, language = "en", idPrefix) {
  return svg.serializeRouteSegments(prepareRouteSegments(layout, language), theme, resolveSvgIdentifiers(idPrefix));
}

/**
 * Prepare drop ladder segment drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} previous - Previous positioned route point with x/y and compatible owning element.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {Object} element - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {Object|null} layout - Owned technical segment with technicalDeltaY, or compatible elevation.pixelsPerMeter scale; null uses endpoint geometry; defaults to null.
 * @param {string} idPrefix - Caller-owned unique SVG namespace; defaults retain standalone-document compatibility.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderDropLadderSegment(previous, node, theme, element = previous.element, language = "en", layout = null, idPrefix) {
  return svg.serializeTechnicalSegment(prepareTechnicalSegment(previous, node, element, language, layout, "ladder"), theme, resolveSvgIdentifiers(idPrefix));
}

/**
 * Prepare direct technical segment drawing records and delegate their SVG serialization; preserve the
 * compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} previous - Previous positioned route point with x/y and compatible owning element.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {Object} element - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {Object|null} layout - Owned technical segment with technicalDeltaY, or compatible elevation.pixelsPerMeter scale; null uses endpoint geometry; defaults to null.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} idPrefix - Caller-owned unique SVG namespace; defaults retain standalone-document compatibility.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderDirectTechnicalSegment(previous, node, theme, element = previous.element, layout = null, language = "en", idPrefix) {
  return svg.serializeTechnicalSegment(prepareTechnicalSegment(previous, node, element, language, layout, "direct"), theme, resolveSvgIdentifiers(idPrefix));
}

/**
 * Prepare drop rungs drawing records and delegate their SVG serialization; preserve the compatibility helper's
 * defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderDropRungs(geometry, theme) {
  return svg.serializeRungs(rungPlacements(geometry), theme);
}

/**
 * Prepare rappel stage markers drawing records and delegate their SVG serialization; preserve the
 * compatibility helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderRappelStageMarkers(geometry, element, theme) {
  return svg.serializeStages(stagePlacements(geometry, element), theme);
}

/**
 * Prepare stage boundary drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {number} ratio - Relative position along a technical path; placement helpers clamp away from endpoints.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderStageBoundary(geometry, ratio, theme) {
  return svg.serializeStageBoundary(stageBoundaryPlacement(geometry, ratio), theme);
}

/**
 * Prepare redirection markers drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderRedirectionMarkers(geometry, element, theme, language = "en") {
  return svg.serializeRedirections(redirectionPlacements(geometry, element, language), theme);
}

/**
 * Prepare segment labels drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderSegmentLabels(layout, theme) {
  return svg.serializeSegmentLabels(prepareSegmentLabels(layout), theme);
}

/**
 * Prepare station ticks drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderStationTicks(layout, theme) {
  return prepareStationTicks(layout).map(/**
   * Apply svg.serializeStationTick to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The result returned by svg.serializeStationTick.
   */ (item) => svg.serializeStationTick(item, theme)).join("");
}

/**
 * Prepare station tick drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderStationTick(node, theme) {
  return svg.serializeStationTick(stationTickPlacement(node), theme);
}

/**
 * Prepare node drawing records and delegate their SVG serialization; preserve the compatibility helper's
 * defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {string} symbology - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @param {Object} placement - Prepared coordinates for a node label, symbol, anchor group or panel; defaults to nodeLabelPlacement(node).
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {Object} options - Internal node overrides: style, title, detail/detailRows, maxDetailWidth or prepared drawing where supported; defaults to an empty record. Carries renderer configuration or the internal placement overrides consumed below.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderNode(node, theme, symbology = "federation", placement = nodeLabelPlacement(node), language = "en", options = {}) {
  return svg.serializeNode(options.drawing ?? prepareNode(node, symbology, placement, language, options), theme);
}

/**
 * Prepare label leader drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} placement - Prepared coordinates for a node label, symbol, anchor group or panel.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderLabelLeader(node, placement, theme) {
  return svg.serializeLabelLeader(labelLeaderPath(node, placement), theme);
}

/**
 * Prepare anchor marks drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {unknown} side - Declared left/right station or redirection side; defaults to "left".
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderAnchorMarks(node, element, theme, side = "left", language = "en") {
  return svg.serializeAnchorMarks(prepareAnchorMarks(node, element, side, language), theme);
}

/**
 * Prepare symbol marker drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} color - Validated foreground paint value.
 * @param {string} symbology - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @param {string} panelColor - Validated background/clearance paint value; defaults to "#f6f8fa".
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderSymbolMarker(node, element, color, symbology = "federation", panelColor = "#f6f8fa", language = "en") {
  return svg.serializeSymbol(symbolPlacement(node, element, symbology, language), color, panelColor);
}

/**
 * Validate original XML text, prepare or reuse legacy detail rows and serialize their positioned drawing
 * records.
 * @responsibility coordinator
 * @param {string} detail - Unescaped legacy detail text before wrapping and XML encoding.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {number} maxWidth - Available text width in drawing units; compatible helpers accept Infinity for no wrapping; defaults to Number.POSITIVE_INFINITY.
 * @param {Array} rows - Prepared detail rows in display order; defaults to null.
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderDetailLine(detail, x, y, theme, language = "en", maxWidth = Number.POSITIVE_INFINITY, rows = null) {
  assertXmlCharacters(detail);
  if (detail === "") return "";
  const records = (rows ?? detailLineRows(detail, maxWidth, language)).map(/**
   * Apply row.map to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
   * @returns {Array} The result returned by row.map.
   */ (row) => row.map(/**
   * Apply legacyDetailRecord to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
   * @returns {unknown} The result returned by legacyDetailRecord.
   */ (part) => legacyDetailRecord(part, language)));
  return svg.serializeDetails(placeDetailRows(records, x, y), theme);
}

/**
 * Prepare level badge drawing records and delegate their SVG serialization; preserve the compatibility
 * helper's defaults and propagate validation failures.
 * @responsibility coordinator
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} category - Badge category selecting supported vocabulary and theme tokens; defaults to "level".
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings; defaults to resolveTheme().
 * @returns {string} Serialized SVG markup, with the documented defaults and failure behavior.
 */
export function renderLevelBadge(value, x, y, language = "en", category = "level", theme = resolveTheme()) {
  return svg.serializeBadge(prepareLevelBadge(value, x, y, language, category), theme);
}
