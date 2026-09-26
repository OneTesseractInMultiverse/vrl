import { curvedTechnicalPath, curvedTechnicalPoint, validateSoftSegment } from "./soft-terrain-geometry.js";
import { scenePath } from "./scene-path.js";
import { diagramText } from "./locale.js";
import {
  dropLadderGeometry, routeSegmentPath, technicalLinePoint, technicalBottomY, technicalLabelDirection,
  rappelStagesForElement, redirectionsForElement, redirectionRatio, redirectionLabel, formatMeters,
  segmentLabel, segmentLabelPosition, stationTickLine, needsSegmentArrow
} from "./presentation.js";

/**
 * Require canonical positioned segments and prepare them in traversal order for the chosen style.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts; defaults to "classic".
 * @returns {Array} The result returned by layout.segments.map.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
export function prepareRouteSegments(layout, language, style = "classic") {
  if (!Array.isArray(layout.segments)) {
    throw new TypeError("Route rendering requires layout.segments; recompute the layout with computeVerticalLayout.");
  }
  return layout.segments.map(/**
   * Apply prepareRouteSegment to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {unknown} The result returned by prepareRouteSegment.
   */ (segment) => prepareRouteSegment(segment, language, style));
}

/**
 * Select connection or technical preparation and validate soft-style direction before computing its shape.
 * @responsibility coordinator
 * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts.
 * @returns {unknown} A record containing kind, path, start, end. The result returned by prepareTechnicalSegment.
 */
function prepareRouteSegment(segment, language, style) {
  if (segment.element === null) return { kind: "connection", path: routeSegmentPath(segment.start, segment.end, segment.start.element), start: segment.start, end: segment.end };
  if (style === "soft-terrain") validateSoftSegment(segment);
  return prepareTechnicalSegment(segment.start, segment.end, segment.element, language, segment,
    style === "soft-terrain" ? "curve" : (segment.element.attributes.shape ?? "ladder") === "ladder" ? "ladder" : "direct");
}

/**
 * Compute technical geometry and combine owned paths, optional rungs, stages and redirections using the
 * style's point interpolator.
 * @responsibility coordinator
 * @param {Object} previous - Previous positioned route point with x/y and compatible owning element.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {Object|null} layout - Owned technical segment with technicalDeltaY, or compatible elevation.pixelsPerMeter scale; null uses endpoint geometry.
 * @param {unknown} shape - Technical drawing shape: ladder, direct or curve.
 * @returns {Object} A record containing kind, ownerId, shape, geometry, paths, rungs, stages, redirections.
 */
export function prepareTechnicalSegment(previous, node, element, language, layout, shape) {
  const geometry = dropLadderGeometry(previous, node, element, layout);
  const pointAt = shape === "curve" ? curvedTechnicalPoint : technicalLinePoint;
  return { kind: "technical", ownerId: element.id, shape, geometry, paths: technicalPaths(geometry, shape),
    rungs: shape === "ladder" ? rungPlacements(geometry) : [],
    stages: stagePlacements(geometry, element, pointAt), redirections: redirectionPlacements(geometry, element, language, pointAt) };
}

/**
 * Build lead, slope/curve and exit path strings from prepared technical coordinates.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {unknown} shape - Technical drawing shape: ladder, direct or curve.
 * @returns {Object} A record containing lead, slope, exit.
 */
function technicalPaths(geometry, shape) {
  return {
    lead: scenePath`M ${geometry.startX} ${geometry.startY} L ${geometry.dropX} ${geometry.startY}`,
    slope: shape === "curve" ? curvedTechnicalPath(geometry) : scenePath`M ${geometry.dropX} ${geometry.startY} L ${geometry.bottomX} ${geometry.bottomY}`,
    exit: scenePath`M ${geometry.bottomX} ${geometry.bottomY} L ${geometry.endX} ${geometry.endY}`
  };
}

/**
 * Place one to five perpendicular rung strokes on the classic technical line according to its drawn length.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @returns {unknown} The result returned by Array.from.
 */
export function rungPlacements(geometry) {
  const bottomY = technicalBottomY(geometry);
  const dropHeight = Math.abs(bottomY - geometry.startY);
  const count = dropHeight < 18 ? 1 : Math.max(2, Math.min(5, Math.floor(dropHeight / 22)));
  const slopeX = (geometry.bottomX ?? geometry.dropX) - geometry.dropX;
  const slopeY = bottomY - geometry.startY;
  const length = Math.hypot(slopeX, slopeY) || 1;
  const normalX = -slopeY / length;
  const normalY = slopeX / length;
  return Array.from({ length: count }, /**
   * Place a rung at an evenly spaced interior ratio with endpoints perpendicular to the technical line.
   * @responsibility computation
   * @param {unknown} _ - Required callback placeholder; intentionally unused.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Object} A record containing x1, y1, x2, y2.
   */ (_, index) => {
    const progress = (index + 1) / (count + 1);
    const x = geometry.dropX + slopeX * progress;
    const y = geometry.startY + slopeY * progress;
    return { x1: Math.round(x + normalX * 7), y1: Math.round(y + normalY * 7),
      x2: Math.round(x - normalX * 7), y2: Math.round(y - normalY * 7) };
  });
}

/**
 * Place each declared stage label at its proportional midpoint and internal boundaries at cumulative stage
 * ratios.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {Function} pointAt - Pure path interpolator accepting geometry and a ratio; defaults to technicalLinePoint.
 * @returns {Array} The result returned by stages.map.
 */
export function stagePlacements(geometry, element, pointAt = technicalLinePoint) {
  const stages = rappelStagesForElement(element);
  const total = stages.reduce(/**
   * Compute sum + stage.meters.
   * @responsibility computation
   * @param {number} sum - Accumulated numeric sum before processing the current entry.
   * @param {unknown} stage - One declared metric stage in source order.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (sum, stage) => sum + stage.meters, 0);
  const direction = technicalLabelDirection(geometry);
  let cumulative = 0;
  return stages.map(/**
   * Position a stage label at its proportional midpoint, advance cumulative stage length and retain the next
   * internal boundary.
   * @responsibility computation
   * @param {unknown} stage - One declared metric stage in source order.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Object} A record containing x, y, text, fontSize, anchor, boundaryRatio, boundary.
   */ (stage, index) => {
    const point = pointAt(geometry, (cumulative + stage.meters / 2) / total);
    cumulative += stage.meters;
    const boundaryRatio = index === stages.length - 1 ? null : cumulative / total;
    return { x: point.x + direction * 16, y: point.y - 2, text: formatMeters(stage), fontSize: 9,
      anchor: direction === -1 ? "end" : "start", boundaryRatio,
      boundary: boundaryRatio === null ? null : stageBoundaryPlacement(geometry, boundaryRatio, pointAt) };
  });
}

/**
 * Center a short horizontal boundary marker on the interpolated technical path point.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {number} ratio - Relative position along a technical path; placement helpers clamp away from endpoints.
 * @param {Function} pointAt - Pure path interpolator accepting geometry and a ratio; defaults to technicalLinePoint.
 * @returns {Object} A record containing x1, y1, x2, y2.
 */
export function stageBoundaryPlacement(geometry, ratio, pointAt = technicalLinePoint) {
  const point = pointAt(geometry, ratio);
  return { x1: point.x - 8, y1: point.y, x2: point.x + 8, y2: point.y };
}

/**
 * Place every supplied redirection at its height ratio with a diamond, localized label and accessible
 * description.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {Function} pointAt - Pure path interpolator accepting geometry and a ratio; defaults to technicalLinePoint.
 * @returns {Array} The result returned by redirectionsForElement(element).map.
 */
export function redirectionPlacements(geometry, element, language, pointAt = technicalLinePoint) {
  const direction = -technicalLabelDirection(geometry);
  return redirectionsForElement(element).map(/**
   * Project a redirection's declared distance onto the selected path and assemble its diamond, label and
   * accessibility text.
   * @responsibility computation
   * @param {unknown} redirection - Typed metric distance and side for one declared redirection.
   * @returns {Object} A record containing point, x, y, text, fontSize, anchor, label, path.
   */ (redirection) => {
    const point = pointAt(geometry, redirectionRatio(redirection, element));
    const text = redirectionLabel(redirection, language);
    return { point, x: point.x + direction * 12, y: point.y + 3, text, fontSize: 8,
      anchor: direction === -1 ? "end" : "start", label: `${diagramText(language).redirectionAnchor} ${text}`,
      path: scenePath`M ${point.x} ${point.y - 6} L ${point.x + 6} ${point.y} L ${point.x} ${point.y + 6} L ${point.x - 6} ${point.y} Z` };
  });
}

/**
 * Compute classic symbolic water paths for pool nodes without representing measured depth or flow.
 * @responsibility computation
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @returns {Array} The result returned by layout.nodes.filter((node) => node.element.type === "pool").map.
 */
export function prepareWaterSegments(layout) {
  return layout.nodes.filter(/**
   * Build a classic pool water curve around the owning node's drawing position.
   * @responsibility computation
   * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (node) => node.element.type === "pool").map(/**
   * Build a classic pool water curve around the owning node's drawing position.
   * @responsibility computation
   * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (node) =>
    scenePath`M ${node.x - 28} ${node.y + 4} C ${node.x - 10} ${node.y + 12}, ${node.x + 12} ${node.y + 12}, ${node.x + 34} ${node.y + 2}`);
}

/**
 * Position nonempty declared traverse labels between neighboring layout nodes.
 * @responsibility computation
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @returns {Array} The result returned by layout.nodes.slice(1).map((node, index) => ({ ...segmentLabelPosition(layout.nodes[index], node), text: segmentLabel(layout.nodes[index], node) })).filter.
 */
export function prepareSegmentLabels(layout) {
  return layout.nodes.slice(1).map(/**
   * Project existing fields, text into the record required by layout.nodes.slice(1).map.
   * @responsibility computation
   * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Object} A record containing the supplied fields, text.
   */ (node, index) => ({
    ...segmentLabelPosition(layout.nodes[index], node), text: segmentLabel(layout.nodes[index], node)
  })).filter(/**
   * Evaluate the selection condition item.text !== "".
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (item) => item.text !== "");
}

/**
 * Select technical nodes with declared station sides and compute their double marker strokes.
 * @responsibility computation
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @returns {Array} The result returned by layout.nodes.filter((node) => needsSegmentArrow(node.element) && node.element.attributes.station !== undefined).map.
 */
export function prepareStationTicks(layout) {
  return layout.nodes.filter(/**
   * Evaluate the selection condition needsSegmentArrow(node.element) && node.element.attributes.station !==
   * undefined.
   * @responsibility computation
   * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (node) => needsSegmentArrow(node.element) && node.element.attributes.station !== undefined).map(stationTickPlacement);
}

/**
 * Construct two station tick lines on the declared right side or compatible left fallback.
 * @responsibility computation
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @returns {Array} The ordered records or values assembled above.
 */
export function stationTickPlacement(node) {
  const direction = node.element.attributes.station === "right" ? 1 : -1;
  return [stationTickLine(node, direction, 8), stationTickLine(node, direction, 12)];
}
