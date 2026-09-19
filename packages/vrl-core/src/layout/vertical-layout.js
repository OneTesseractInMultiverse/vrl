import {
  elevationResidual,
  routeElevationProfile,
  routeTraversal,
  technicalElementIndexesBetween,
  technicalVerticalMeters
} from "../domain/traversal.js";
import { validateGeometry } from "../validation/validate-geometry.js";

export { routeElevationProfile, technicalVerticalMeters } from "../domain/traversal.js";

const ELEMENT_WEIGHTS = {
  start: 0.7,
  exit: 0.7,
  walk: 0.9,
  rappel: 1.25,
  downclimb: 1,
  climb: 1,
  pool: 0.85,
  hazard: 0.9,
  note: 0.7
};

export function computeVerticalLayout(route, options = {}) {
  return hasElevationProfile(route) ? computeElevationLayout(route, options) : computeWeightedLayout(route, options);
}

function computeWeightedLayout(route, options) {
  const traversal = routeTraversal(route);
  const points = weightedPoints(route, traversal, options);
  return assembleLayout(route, traversal, shiftPoints(points, options.marginY ?? 108), options);
}

function weightedPoints(route, traversal, options) {
  const top = options.marginY ?? 108;
  const spacing = options.baseSpacing ?? 68;
  const scale = resolveHorizontalScale(options.horizontalScale);
  let x = options.spineX ?? 96;
  let y = top;
  return traversal.points.map((point, index) => {
    if (index > 0) {
      const segment = traversal.segments[index - 1];
      const element = spacingElement(route, point, segment);
      x += horizontalProgress(element) * scale;
      y += spacing * elementVisualWeight(element) * (segment.direction === "up" ? -1 : 1);
    }
    return { ...point, x: Math.round(x), y: Math.round(y) };
  });
}

function spacingElement(route, point, segment) {
  return route.elements[point.elementIndex ?? segment.elementIndex];
}

export function computeElevationLayout(route, options = {}) {
  requireConsistentGeometry(route);
  const profile = routeElevationProfile(route);
  if (profile === null) throw new RangeError("An elevation layout requires entrance and exit elevations.");
  const traversal = routeTraversal(route);
  const deltas = computeElevationDeltas(route, traversal, profile);
  const points = elevationPoints(route, traversal, deltas, options, profile);
  const spaced = applyMinimumNodeGap(points, options.minNodeGap ?? 68, options.marginY ?? 108);
  return assembleLayout(route, traversal, spaced, options, { ...profile, pixelsPerMeter: options.pixelsPerMeter ?? 5.5 });
}

function elevationPoints(route, traversal, deltas, options, profile) {
  const scale = resolveHorizontalScale(options.horizontalScale);
  const pixelsPerMeter = options.pixelsPerMeter ?? 5.5;
  let x = options.spineX ?? 96;
  let elevation = profile.entranceMeters;
  const points = traversal.points.map((point, index) => {
    if (index > 0) {
      x += horizontalProgress(spacingElement(route, point, traversal.segments[index - 1])) * scale;
      elevation -= deltas[index - 1];
    }
    return { ...point, x: Math.round(x), elevationMeters: elevation, direction: traversal.segments[index - 1]?.direction ?? null };
  });
  const highest = points.reduce((value, point) => Math.max(value, point.elevationMeters), Math.max(profile.entranceMeters, profile.exitMeters));
  return points.map((point) => ({
    ...point,
    y: Math.round((options.marginY ?? 108) + (highest - point.elevationMeters) * pixelsPerMeter)
  }));
}

function assembleLayout(route, traversal, positions, options, elevation) {
  const top = options.marginY ?? 108;
  const points = positions.map((point) => ({
    ...point,
    id: point.elementIndex === null ? null : route.elements[point.elementIndex].id,
    element: point.elementIndex === null ? null : route.elements[point.elementIndex]
  }));
  const bottomY = points.reduce((max, point) => Math.max(max, point.y), top);
  return {
    width: options.width ?? 640,
    height: Math.round(bottomY + (options.marginBottom ?? 64)),
    spine: { x: options.spineX ?? 96, y1: top, y2: bottomY },
    ...(elevation === undefined ? {} : { elevation }),
    nodes: points.filter((point) => point.elementIndex !== null),
    points,
    segments: traversal.segments.map((segment) => positionSegment(route, segment, points, elevation))
  };
}

function positionSegment(route, segment, points, elevation) {
  return {
    ...segment,
    start: points[segment.from],
    end: points[segment.to],
    element: segment.elementIndex === null ? null : route.elements[segment.elementIndex],
    technicalDeltaY: segmentPixelDelta(segment, points, elevation)
  };
}

function segmentPixelDelta(segment, points, elevation) {
  if (segment.kind !== "technical") return null;
  if (elevation === undefined) return points[segment.to].y - points[segment.from].y;
  const length = Math.max(1, Math.round(Math.abs(segment.verticalDeltaMeters) * elevation.pixelsPerMeter));
  return segment.direction === "up" ? -length : length;
}

function shiftPoints(points, top) {
  const minY = points.reduce((min, point) => Math.min(min, point.y), top);
  const shiftY = top - minY;
  return shiftY === 0 ? points : points.map((point) => ({ ...point, y: point.y + shiftY }));
}

export function applyMinimumNodeGap(nodes, minNodeGap = 0, top = 0) {
  if (minNodeGap <= 0 || nodes.length < 2) return nodes;
  const adjusted = [nodes[0]];
  for (let index = 1; index < nodes.length; index += 1) {
    const previousOriginal = nodes[index - 1];
    const previousAdjusted = adjusted[index - 1];
    const node = nodes[index];
    const descends = node.direction === "up" ? false : node.direction === "down" ? true : node.y >= previousOriginal.y;
    const requiredGap = Math.max(minNodeGap, Math.abs(node.y - previousOriginal.y));
    const y = descends ? Math.max(node.y, previousAdjusted.y + requiredGap) : Math.min(node.y, previousAdjusted.y - requiredGap);
    adjusted.push({ ...node, y });
  }
  return shiftPoints(adjusted, top);
}

export function hasElevationProfile(route) {
  return routeElevationProfile(route) !== null;
}

export function elevationSegmentDeltas(route) {
  const profile = routeElevationProfile(route);
  if (profile === null) return [];
  requireConsistentGeometry(route);
  const traversal = routeTraversal(route);
  return computeElevationDeltas(route, traversal, profile);
}

function requireConsistentGeometry(route) {
  const errors = validateGeometry(route).filter((diagnostic) => diagnostic.severity === "error");
  if (errors.length > 0) throw new RangeError(errors[0].message);
}

function computeElevationDeltas(route, traversal, profile) {
  const weights = traversal.segments.map((segment) => segment.kind === "connection"
    ? elementVisualWeight(route.elements[traversal.points[segment.to].elementIndex]) : 0);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const residual = elevationResidual(route, profile);
  return traversal.segments.map((segment, index) => -segment.verticalDeltaMeters
    + (totalWeight === 0 ? 0 : residual * weights[index] / totalWeight));
}

/** Compatibility helper: the net change may contain two technical events. */
export function technicalSegmentDelta(previous, element) {
  const elements = [previous, element];
  return technicalElementIndexesBetween(elements, 1).reduce((sum, index) =>
    sum + technicalVerticalMeters(elements[index]) * (elements[index].type === "climb" ? -1 : 1), 0);
}

/** Compatibility helper; residuals must never be added to technical motion. */
export function residualDistributionWeights(elements, baseDeltas) {
  return baseDeltas.map((delta, index) => delta === 0 ? elementVisualWeight(elements[index + 1]) : 0);
}

export function elementVisualWeight(element) {
  return ELEMENT_WEIGHTS[element.type] ?? 1;
}

export function horizontalProgress(element) {
  if (element.type === "rappel") return 44;
  if (element.type === "downclimb" || element.type === "climb") return 42;
  if (element.type === "exit") return 78;
  return 58;
}

export function resolveHorizontalScale(value = 1) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : 1;
}

export function verticalDirection(element) {
  return element.type === "climb" ? -1 : 1;
}
