import { contourObstacles } from "./annotation-icons.js";
import { prepareSoftTerrain, prepareSoftPools } from "./soft-terrain-geometry.js";
import { softTerrainText } from "./soft-terrain-text.js";
import { resolveSvgIdentifiers } from "./svg-identifiers.js";
import { anchorCountDescription } from "./anchor-presentation.js";
import { diagramText } from "./locale.js";
import { validateRenderLayout, validateRenderOptions } from "./render-options.js";
import { bounds, unionBounds, textBounds, fitSceneBounds } from "./scene-bounds.js";
import { technicalAnnotationDescription, terrainProfilePath, resolveRenderLanguage } from "./presentation.js";
import { prepareNodes } from "./node-scene.js";
import { prepareInfoBox, prepareLegend } from "./panel-scene.js";
import { prepareRouteSegments, prepareWaterSegments, prepareSegmentLabels, prepareStationTicks } from "./segment-scene.js";

/**
 * Validate render inputs, resolve style/language/IDs, prepare layers and panels, then fit complete bounds
 * without changing the route or layout. Prepare once: fitting and serialization consume the same presentation
 * records.
 * @responsibility coordinator
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {Object} options - Renderer settings: style, theme/tokens, language/locale, symbology, legend and caller-owned idPrefix; defaults to an empty record. Carries renderer configuration or the internal placement overrides consumed below.
 * @returns {Object} Renderer-owned scene containing style, identifiers, layers, panels, conservative bounds and fitted viewBox.
 */

export function computeTopoScene(route, layout, options = {}) {
  validateRenderOptions(options);
  const identifiers = resolveSvgIdentifiers(options.idPrefix);
  validateRenderLayout(layout);
  const language = resolveRenderLanguage(options);
  const style = options.style ?? "classic";
  const terrain = style === "soft-terrain" ? prepareSoftTerrain(layout) : null;
  const pools = style === "soft-terrain" ? prepareSoftPools(layout) : [];
  const segments = prepareRouteSegments(layout, language, style);
  const segmentLabels = prepareSegmentLabels(layout);
  const obstacles = [...layout.nodes.map(/**
   * Reserve the node symbol, station ticks, anchor marks and their clearance strokes.
   * @responsibility computation
   * @param {Object} node - Positioned route node supplying the symbol origin.
   * @returns {Object} Conservative node envelope in scene coordinates.
   */ node => bounds(node.x - 44, node.y - 32, node.x + 40, node.y + 32)),
    ...segmentLabels.map(/**
     * Reserve the measured envelope of a centered technical segment label.
     * @responsibility computation
     * @param {Object} item - Prepared segment text and its centered baseline coordinates.
     * @returns {Object} Conservative text bounds at the rendered ten-unit font size.
     */ item => textBounds(item.text, item.x, item.y, 10, "middle")), ...segmentBounds(segments), ...contourObstacles(terrain?.contourPoints ?? []), ...pools.map(/**
   * Read the complete prepared pool envelope for annotation clearance.
   * @responsibility computation
   * @param {Object} pool - Prepared pool shape with its owner and complete bounds.
   * @returns {Object} Existing complete pool envelope, including its stroke.
   */ pool => pool.bounds)];
  const nodes = prepareNodes(layout, language, options.symbology, style, options.symbols, obstacles);
  const contentBounds = unionBounds([
    (terrain?.bounds ?? terrainBounds(layout)), ...pools.map(/**
     * Project pool.bounds from the current record.
     * @responsibility computation
     * @param {unknown} pool - Prepared symbolic pool record retaining its owner and dry-state cues.
     * @returns {unknown} The pool.bounds value selected or validated above.
     */ pool => pool.bounds), ...nodeBounds(nodes), ...segmentBounds(segments),
    ...segmentLabels.map(/**
     * Apply textBounds to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {unknown} The result returned by textBounds.
     */ (item) => textBounds(item.text, item.x, item.y, 10, "middle"))
  ]);
  const infoBox = prepareInfoBox(route, layout, language, contentBounds.minY - 160);
  const legend = options.legend === false ? null : prepareLegend({ ...layout, height: Math.max(layout.height, contentBounds.maxY + 12) }, language, options.symbology, style, options.symbols);
  const sceneBounds = unionBounds([contentBounds, infoBox.bounds, ...(legend === null ? [] : [legend.bounds])]);
  return { style, terrain, pools, identifiers, language, title: `${route.name} ${diagramText(language).topo}`, description: sceneDescription(route, layout, language) + (style === "soft-terrain" ? ` ${softTerrainText(language).schematic}` : ""),
    nodes, segments, segmentLabels, terrainPath: terrainProfilePath(layout), waterPaths: prepareWaterSegments(layout), stationTicks: prepareStationTicks(layout),
    infoBox, legend, contentBounds, bounds: sceneBounds, viewBox: fitSceneBounds(sceneBounds, layout.width, layout.height) };
}

/**
 * Combine the schematic caveat, route name, full anchor quantities and technical annotations into accessible
 * prose.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {string} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
function sceneDescription(route, layout, language) {
  return [`${diagramText(language).schematicDescription} ${route.name}.`, anchorCountDescription(layout, language), technicalAnnotationDescription(layout, language)].filter(Boolean).join(" ");
}

/**
 * Collect conservative symbol, title, anchor-overflow and detail envelopes for prepared nodes.
 * @responsibility computation
 * @param {Array} nodes - Prepared or positioned route nodes retaining their element ownership and drawing coordinates.
 * @returns {Array} The result returned by nodes.flatMap.
 */
function nodeBounds(nodes) {
  return nodes.flatMap(/**
   * Collect conservative envelopes for one node's symbol, title, full anchor overflow and positioned detail
   * primitives.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {Object} input1.node - Positioned route point with x/y and its owning normalized element when required.
   * @param {unknown} input1.drawing - Prepared node primitives and their text/anchor placements.
   * @returns {Array} The ordered records or values assembled above.
   */ ({ node, drawing }) => [
    // Symbols, pool curves, station ticks, anchor marks, and their clearance strokes.
    bounds(node.x - 44, node.y - 32, node.x + 40, node.y + 32),
    ...symbolTextBounds(drawing.marker),
    ...(drawing.annotationSlot === undefined || drawing.annotationSlot === null ? [] : [drawing.annotationSlot.bounds]),
    textBounds(drawing.title, drawing.titleX, drawing.titleY, 11),
    ...anchorOverflowBounds(drawing.anchors),
    ...drawing.details.flatMap(/**
     * Apply row.flatMap to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
     * @returns {Array} The result returned by row.flatMap.
     */ (row) => row.flatMap(detailBounds))
  ]);
}

/**
 * Reserve ordinary or snake symbol-code text bounds; plain hazards have no code text.
 * @responsibility computation
 * @param {unknown} marker - Prepared or parsed symbol/marker record.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function symbolTextBounds(marker) {
  return marker.kind === "hazard" ? [] : [textBounds(marker.code, marker.textX, marker.textY, 9, "middle")];
}

/**
 * Return the overflow label's envelope when present, otherwise no bounds.
 * @responsibility computation
 * @param {unknown} anchors - Prepared anchor placement containing marks and optional overflow text.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function anchorOverflowBounds(anchors) {
  const overflow = anchors?.overflow;
  return overflow === undefined || overflow === null ? [] : [textBounds(overflow.text, overflow.x, overflow.y, overflow.fontSize, overflow.anchor)];
}

/**
 * Compute text or badge-plus-label envelopes from positioned detail primitives.
 * @responsibility computation
 * @param {unknown} item - Current prepared record or test case.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function detailBounds(item) {
  return item.kind === "text" ? [textBounds(item.text, item.x, item.y, item.fontSize)] : [
    bounds(item.x, item.y, item.x + item.width, item.y + item.height),
    textBounds(item.label, item.textX, item.textY, 8, "middle")
  ];
}

/**
 * Enclose classic terrain geometry and its offsets, including ascent excursions outside nominal canvas
 * dimensions.
 * @responsibility computation
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @returns {unknown} The result returned by unionBounds.
 */
function terrainBounds(layout) {
  const points = layout.points ?? layout.nodes;
  return unionBounds([
    bounds(0, Math.min(0, layout.height - 54), layout.width, layout.height),
    ...points.map(/**
     * Apply bounds to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {Object} point - Positioned route point in drawing coordinates.
     * @returns {unknown} The result returned by bounds.
     */ (point) => bounds(Math.min(0, point.x - 58), point.y, Math.max(layout.width, point.x + 10), point.y + 54))
  ]);
}

/**
 * Enclose connection or technical paths and all owned stage/redirection decorations with their clearance
 * strokes.
 * @responsibility computation
 * @param {Array} segments - Route segments in traversal order.
 * @returns {Array} The result returned by segments.flatMap.
 */
function segmentBounds(segments) {
  return segments.flatMap(/**
   * Compute path envelopes and annotation bounds for a connection or its owned technical geometry.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {Array} The ordered records or values assembled above.
   */ (segment) => {
    if (segment.kind === "connection") {
      return [bounds(Math.min(segment.start.x, segment.end.x) - 16, Math.min(segment.start.y, segment.end.y), Math.max(segment.start.x, segment.end.x) + 16, Math.max(segment.start.y, segment.end.y), 4)];
    }
    const geometry = segment.geometry;
    const shapeBounds = bounds(
      Math.min(geometry.startX, geometry.dropX, geometry.bottomX, geometry.endX),
      Math.min(geometry.startY, geometry.bottomY, geometry.endY),
      Math.max(geometry.startX, geometry.dropX, geometry.bottomX, geometry.endX),
      Math.max(geometry.startY, geometry.bottomY, geometry.endY), segment.shape === "curve" ? 36 : 24
    );
    const annotations = [...segment.stages, ...segment.redirections];
    return [shapeBounds, ...annotations.map(/**
     * Apply textBounds to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {unknown} The result returned by textBounds.
     */ (item) => textBounds(item.text, item.x, item.y, item.fontSize, item.anchor))];
  });
}
