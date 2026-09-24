import { scenePath } from "./scene-path.js";
import { diagramText } from "./locale.js";
import {
  dropLadderGeometry, routeSegmentPath, technicalLinePoint, technicalBottomY, technicalLabelDirection,
  rappelStagesForElement, redirectionsForElement, redirectionRatio, redirectionLabel, formatMeters,
  segmentLabel, segmentLabelPosition, stationTickLine, needsSegmentArrow
} from "./presentation.js";

export function prepareRouteSegments(layout, language) {
  if (!Array.isArray(layout.segments)) {
    throw new TypeError("Route rendering requires layout.segments; recompute the layout with computeVerticalLayout.");
  }
  return layout.segments.map((segment) => prepareRouteSegment(segment, language));
}

function prepareRouteSegment(segment, language) {
  if (segment.element === null) return { kind: "connection", path: routeSegmentPath(segment.start, segment.end, segment.start.element), start: segment.start, end: segment.end };
  return prepareTechnicalSegment(segment.start, segment.end, segment.element, language, segment,
    (segment.element.attributes.shape ?? "ladder") === "ladder" ? "ladder" : "direct");
}

export function prepareTechnicalSegment(previous, node, element, language, layout, shape) {
  const geometry = dropLadderGeometry(previous, node, element, layout);
  return { kind: "technical", ownerId: element.id, shape, geometry, paths: technicalPaths(geometry),
    rungs: shape === "ladder" ? rungPlacements(geometry) : [],
    stages: stagePlacements(geometry, element), redirections: redirectionPlacements(geometry, element, language) };
}

function technicalPaths(geometry) {
  return {
    lead: scenePath`M ${geometry.startX} ${geometry.startY} L ${geometry.dropX} ${geometry.startY}`,
    slope: scenePath`M ${geometry.dropX} ${geometry.startY} L ${geometry.bottomX} ${geometry.bottomY}`,
    exit: scenePath`M ${geometry.bottomX} ${geometry.bottomY} L ${geometry.endX} ${geometry.endY}`
  };
}

export function rungPlacements(geometry) {
  const bottomY = technicalBottomY(geometry);
  const dropHeight = Math.abs(bottomY - geometry.startY);
  const count = dropHeight < 18 ? 1 : Math.max(2, Math.min(5, Math.floor(dropHeight / 22)));
  const slopeX = (geometry.bottomX ?? geometry.dropX) - geometry.dropX;
  const slopeY = bottomY - geometry.startY;
  const length = Math.hypot(slopeX, slopeY) || 1;
  const normalX = -slopeY / length;
  const normalY = slopeX / length;
  return Array.from({ length: count }, (_, index) => {
    const progress = (index + 1) / (count + 1);
    const x = geometry.dropX + slopeX * progress;
    const y = geometry.startY + slopeY * progress;
    return { x1: Math.round(x + normalX * 7), y1: Math.round(y + normalY * 7),
      x2: Math.round(x - normalX * 7), y2: Math.round(y - normalY * 7) };
  });
}

export function stagePlacements(geometry, element) {
  const stages = rappelStagesForElement(element);
  const total = stages.reduce((sum, stage) => sum + stage.meters, 0);
  const direction = technicalLabelDirection(geometry);
  let cumulative = 0;
  return stages.map((stage, index) => {
    const point = technicalLinePoint(geometry, (cumulative + stage.meters / 2) / total);
    cumulative += stage.meters;
    const boundaryRatio = index === stages.length - 1 ? null : cumulative / total;
    return { x: point.x + direction * 16, y: point.y - 2, text: formatMeters(stage), fontSize: 9,
      anchor: direction === -1 ? "end" : "start", boundaryRatio,
      boundary: boundaryRatio === null ? null : stageBoundaryPlacement(geometry, boundaryRatio) };
  });
}

export function stageBoundaryPlacement(geometry, ratio) {
  const point = technicalLinePoint(geometry, ratio);
  return { x1: point.x - 8, y1: point.y, x2: point.x + 8, y2: point.y };
}

export function redirectionPlacements(geometry, element, language) {
  const direction = -technicalLabelDirection(geometry);
  return redirectionsForElement(element).map((redirection) => {
    const point = technicalLinePoint(geometry, redirectionRatio(redirection, element));
    const text = redirectionLabel(redirection, language);
    return { point, x: point.x + direction * 12, y: point.y + 3, text, fontSize: 8,
      anchor: direction === -1 ? "end" : "start", label: `${diagramText(language).redirectionAnchor} ${text}`,
      path: scenePath`M ${point.x} ${point.y - 6} L ${point.x + 6} ${point.y} L ${point.x} ${point.y + 6} L ${point.x - 6} ${point.y} Z` };
  });
}

export function prepareWaterSegments(layout) {
  return layout.nodes.filter((node) => node.element.type === "pool").map((node) =>
    scenePath`M ${node.x - 28} ${node.y + 4} C ${node.x - 10} ${node.y + 12}, ${node.x + 12} ${node.y + 12}, ${node.x + 34} ${node.y + 2}`);
}

export function prepareSegmentLabels(layout) {
  return layout.nodes.slice(1).map((node, index) => ({
    ...segmentLabelPosition(layout.nodes[index], node), text: segmentLabel(layout.nodes[index], node)
  })).filter((item) => item.text !== "");
}

export function prepareStationTicks(layout) {
  return layout.nodes.filter((node) => needsSegmentArrow(node.element) && node.element.attributes.station !== undefined).map(stationTickPlacement);
}

export function stationTickPlacement(node) {
  const direction = node.element.attributes.station === "right" ? 1 : -1;
  return [stationTickLine(node, direction, 8), stationTickLine(node, direction, 12)];
}
