import { bounds, unionBounds } from "./scene-bounds.js";
import { scenePath } from "./scene-path.js";

/** The canonical segment owns direction; presentation refuses contradictory supplied geometry. */
export function validateSoftSegment(segment) {
  if (!["up", "down"].includes(segment.direction) || Math.sign(segment.technicalDeltaY) !== (segment.direction === "up" ? -1 : 1)) {
    throw new RangeError("Soft-terrain technical segments require a nonzero pixel delta matching their canonical direction.");
  }
}

export function curveControls(geometry) {
  const dx = geometry.bottomX - geometry.dropX;
  const dy = geometry.bottomY - geometry.startY;
  const bow = (geometry.endX >= geometry.startX ? 1 : -1) * Math.min(12, Math.abs(dy) / 6);
  return [{ x: geometry.dropX + dx / 3 + bow, y: geometry.startY + dy / 3 },
    { x: geometry.dropX + 2 * dx / 3 + bow, y: geometry.startY + 2 * dy / 3 }];
}

export function curvedTechnicalPath(geometry) {
  const [first, second] = curveControls(geometry);
  return scenePath`M ${geometry.dropX} ${geometry.startY} C ${first.x} ${first.y} ${second.x} ${second.y} ${geometry.bottomX} ${geometry.bottomY}`;
}

export function curvedTechnicalPoint(geometry, ratio) {
  const t = Math.max(0.05, Math.min(0.95, ratio));
  const [first, second] = curveControls(geometry);
  const u = 1 - t;
  return { x: u ** 3 * geometry.dropX + 3 * u ** 2 * t * first.x + 3 * u * t ** 2 * second.x + t ** 3 * geometry.bottomX,
    y: geometry.startY + (geometry.bottomY - geometry.startY) * t };
}

export function prepareSoftTerrain(layout) {
  const points = layout.points ?? layout.nodes;
  const extent = unionBounds([bounds(0, layout.height, layout.width, layout.height),
    ...points.map(point => bounds(point.x - 58, point.y, point.x + 34, point.y + 54))]);
  const surface = points.length === 0
    ? [{ x: extent.minX, y: layout.height - 34 }, { x: extent.maxX, y: layout.height - 34 }]
    : [{ x: extent.minX, y: points[0].y + 34 }, ...points.map(point => ({ x: point.x + 10, y: point.y + 14 })),
      { x: extent.maxX, y: points.at(-1).y + 34 }];
  const contour = surface.map((point, index) => index === 0 ? scenePath`M ${point.x} ${point.y}` : scenePath`L ${point.x} ${point.y}`).join(" ");
  return { contour, fill: contour + scenePath` L ${extent.maxX} ${extent.maxY} L ${extent.minX} ${extent.maxY} Z`,
    bounds: unionBounds([extent, ...surface.map(point => bounds(point.x, point.y, point.x, point.y, 2))]) };
}

export function prepareSoftPools(layout) {
  return layout.nodes.filter(node => node.element.type === "pool").map(softPool);
}

function softPool({ x, y, element }) {
  const dry = element.attributes.type === "dry" || element.attributes.flow === "dry";
  return { ownerId: element.id, dry,
    basin: scenePath`M ${x - 28} ${y + 2} Q ${x + 3} ${y + 32} ${x + 34} ${y + 2} Z`,
    surface: dry ? null : scenePath`M ${x - 26} ${y + 2} Q ${x - 18} ${y - 2} ${x - 10} ${y + 2} Q ${x - 2} ${y + 6} ${x + 6} ${y + 2} Q ${x + 14} ${y - 2} ${x + 22} ${y + 2} L ${x + 32} ${y + 2}`,
    bounds: bounds(x - 30, y - 4, x + 36, y + 34) };
}
