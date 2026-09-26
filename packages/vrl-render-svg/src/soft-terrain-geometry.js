import { bounds, unionBounds } from "./scene-bounds.js";
import { scenePath } from "./scene-path.js";

/**
 * Reject zero or contradictory technical pixel deltas relative to the canonical up/down direction. The
 * canonical segment owns direction; presentation refuses contradictory supplied geometry.
 * @responsibility computation
 * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
 * @returns {void} Returns normally only when the owned technical delta agrees with canonical direction.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */

export function validateSoftSegment(segment) {
  if (!["up", "down"].includes(segment.direction) || Math.sign(segment.technicalDeltaY) !== (segment.direction === "up" ? -1 : 1)) {
    throw new RangeError("Soft-terrain technical segments require a nonzero pixel delta matching their canonical direction.");
  }
}

/**
 * Compute bounded cubic control points that bow horizontally while preserving monotonic technical vertical
 * motion.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @returns {Array} The ordered records or values assembled above.
 */
export function curveControls(geometry) {
  const dx = geometry.bottomX - geometry.dropX;
  const dy = geometry.bottomY - geometry.startY;
  const bow = (geometry.endX >= geometry.startX ? 1 : -1) * Math.min(12, Math.abs(dy) / 6);
  return [{ x: geometry.dropX + dx / 3 + bow, y: geometry.startY + dy / 3 },
    { x: geometry.dropX + 2 * dx / 3 + bow, y: geometry.startY + 2 * dy / 3 }];
}

/**
 * Build a cubic path from canonical technical start to end, retaining directed traversal order.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function curvedTechnicalPath(geometry) {
  const [first, second] = curveControls(geometry);
  return scenePath`M ${geometry.dropX} ${geometry.startY} C ${first.x} ${first.y} ${second.x} ${second.y} ${geometry.bottomX} ${geometry.bottomY}`;
}

/**
 * Evaluate the soft technical curve at a ratio clamped to 0.05–0.95 for stage and redirection placement.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {number} ratio - Relative position along a technical path; placement helpers clamp away from endpoints.
 * @returns {Object} A record containing x, y.
 */
export function curvedTechnicalPoint(geometry, ratio) {
  const t = Math.max(0.05, Math.min(0.95, ratio));
  const [first, second] = curveControls(geometry);
  const u = 1 - t;
  return { x: u ** 3 * geometry.dropX + 3 * u ** 2 * t * first.x + 3 * u * t ** 2 * second.x + t ** 3 * geometry.bottomX,
    y: geometry.startY + (geometry.bottomY - geometry.startY) * t };
}

/**
 * Build a schematic terrain contour, closed wash and conservative bounds from canonical positioned points.
 * @responsibility computation
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @returns {Object} A record containing contour, fill, bounds.
 */
export function prepareSoftTerrain(layout) {
  const points = layout.points ?? layout.nodes;
  const extent = unionBounds([bounds(0, layout.height, layout.width, layout.height),
    ...points.map(/**
     * Apply bounds to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {Object} point - Positioned route point in drawing coordinates.
     * @returns {unknown} The result returned by bounds.
     */ point => bounds(point.x - 58, point.y, point.x + 34, point.y + 54))]);
  const surface = points.length === 0
    ? [{ x: extent.minX, y: layout.height - 34 }, { x: extent.maxX, y: layout.height - 34 }]
    : [{ x: extent.minX, y: points[0].y + 34 }, ...points.map(/**
     * Project x, y into the record required by points.map.
     * @responsibility computation
     * @param {Object} point - Positioned route point in drawing coordinates.
     * @returns {Object} A record containing x, y.
     */ point => ({ x: point.x + 10, y: point.y + 14 })),
      { x: extent.maxX, y: points.at(-1).y + 34 }];
  const contour = surface.map(/**
   * Start the terrain contour with a move command and append line commands for later points.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (point, index) => index === 0 ? scenePath`M ${point.x} ${point.y}` : scenePath`L ${point.x} ${point.y}`).join(" ");
  return { contour, fill: contour + scenePath` L ${extent.maxX} ${extent.maxY} L ${extent.minX} ${extent.maxY} Z`,
    bounds: unionBounds([extent, ...surface.map(/**
     * Apply bounds to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {Object} point - Positioned route point in drawing coordinates.
     * @returns {unknown} The result returned by bounds.
     */ point => bounds(point.x, point.y, point.x, point.y, 2))]) };
}

/**
 * Prepare symbolic pool basins only for supplied pool nodes.
 * @responsibility computation
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @returns {Array} The result returned by layout.nodes.filter(node => node.element.type === "pool").map.
 */
export function prepareSoftPools(layout) {
  return layout.nodes.filter(/**
   * Evaluate the selection condition node.element.type === "pool".
   * @responsibility computation
   * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ node => node.element.type === "pool").map(softPool);
}

/**
 * Build an owned pool basin and optional wave cue; declared dry state removes water fill and surface without
 * implying depth.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {number} input1.x - Horizontal position in SVG drawing units.
 * @param {number} input1.y - Vertical position in SVG drawing units.
 * @param {Object} input1.element - Owning route element with its type, identity and declared attributes.
 * @returns {Object} A record containing ownerId, dry, basin, surface, bounds.
 */
function softPool({ x, y, element }) {
  const dry = element.attributes.type === "dry" || element.attributes.flow === "dry";
  return { ownerId: element.id, dry,
    basin: scenePath`M ${x - 28} ${y + 2} Q ${x + 3} ${y + 32} ${x + 34} ${y + 2} Z`,
    surface: dry ? null : scenePath`M ${x - 26} ${y + 2} Q ${x - 18} ${y - 2} ${x - 10} ${y + 2} Q ${x - 2} ${y + 6} ${x + 6} ${y + 2} Q ${x + 14} ${y - 2} ${x + 22} ${y + 2} L ${x + 32} ${y + 2}`,
    bounds: bounds(x - 30, y - 4, x + 36, y + 34) };
}
