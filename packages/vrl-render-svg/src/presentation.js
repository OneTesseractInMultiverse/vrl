import { anchorSummary } from "./anchor-presentation.js";
export { anchorMarkCount, anchorSummary, anchorLabel } from "./anchor-presentation.js";
import { technicalElementIndexesBetween, technicalVerticalMeters } from "@subvertic/core";
import { formatElementDetail, formatElementTitle, formatMeasurement } from "./element-formatters.js";
import { diagramText, localizeDetailValue, resolveDiagramLanguage } from "./locale.js";
import { resolveSymbolProfile } from "./symbol-registry.js";

export const TOPO_LEGEND_HEIGHT = 156;
export const DETAIL_FONT_SIZE = 10;
export const DETAIL_LINE_HEIGHT = 14;
export const DETAIL_SEPARATOR_GAP = 4;
export const LEGEND_FONT_SIZE = 9;
export const STANDARD_SYMBOL_CODE_Y_OFFSET = 15;
export const LEVEL_VALUES = ["dry", "low", "medium", "high", "critical"];
export const SYMBOL_ONLY_LABEL_TYPES = new Set(["walk", "pool", "hazard", "note"]);
export const DETAIL_BADGE_TOKENS = {
  level: ["levelBadge", "levelBadgeText"],
  flow: ["flowBadge", "flowBadgeText"],
  exposure: ["exposureBadge", "exposureBadgeText"],
  hazardSeverity: ["hazardSeverityBadge", "hazardSeverityBadgeText"],
  inclination: ["inclinationBadge", "inclinationBadgeText"]
};
export const DETAIL_BADGE_LABELS = {
  exposure: "exposure",
  exposicion: "exposure",
  flow: "flow",
  flujo: "flow",
  "hazard severity": "hazardSeverity",
  "severidad de peligro": "hazardSeverity",
  severity: "hazardSeverity",
  severidad: "hazardSeverity",
  inclination: "inclination",
  inclinacion: "inclination"
};

export function resolveRenderLanguage(options = {}) {
  return resolveDiagramLanguage(options.language ?? options.locale ?? (options.symbology === "spanish" ? "es" : "en"));
}

export function nodesInVisualOrder(nodes) {
  return [...nodes].sort((left, right) => left.y - right.y
    || Number(Object.hasOwn(left, "anchorPointIndex")) - Number(Object.hasOwn(right, "anchorPointIndex")));
}

export function topoLegendHeight(options = {}) {
  return options.legend === false ? 0 : TOPO_LEGEND_HEIGHT;
}

export function legendSymbolRows(language = "en", symbology = "federation") {
  const text = diagramText(language);
  const profile = resolveSymbolProfile(symbology);
  const entries = [
    [profile.start, text.elements.start],
    [profile.exit, text.elements.exit],
    [profile.walk, text.elements.walk],
    [profile.rappel, text.elements.rappel],
    [profile.downclimb, text.elements.downclimb],
    [profile.climb, text.elements.climb],
    [profile.pool, text.elements.pool],
    [profile.hazard, text.elements.hazard]
  ];

  return [entries.slice(0, 4), entries.slice(4)];
}

export function terrainProfilePath(layout) {
  const points = layout.points ?? layout.nodes;
  if (points.length === 0) {
    return `M 0 ${layout.height} L ${layout.width} ${layout.height} L ${layout.width} ${layout.height - 54} L 0 ${layout.height - 34} Z`;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const surface = points.map((node) => `${node.x + 10} ${node.y + 14}`).join(" L ");

  return `M 0 ${layout.height} L 0 ${first.y + 44} L ${Math.max(0, first.x - 58)} ${first.y + 34} L ${surface} L ${layout.width} ${last.y + 54} L ${layout.width} ${layout.height} Z`;
}

export function routeSegmentPath(previous, node, element = previous.element) {
  if (needsSegmentArrow(element)) {
    const ledgeX = previous.x + 16;
    const dropY = Math.round((previous.y + node.y) / 2);
    const exitX = node.x - 10;

    return `M ${previous.x} ${previous.y} L ${ledgeX} ${previous.y} L ${exitX} ${dropY} L ${node.x} ${node.y}`;
  }

  const midX = Math.round((previous.x + node.x) / 2);
  const midY = Math.round((previous.y + node.y) / 2);
  const bendX = midX - 12;

  return `M ${previous.x} ${previous.y} L ${bendX} ${midY} L ${node.x} ${node.y}`;
}

export function dropLadderGeometry(previous, node, element = previous.element, layout = null) {
  const direction = node.x >= previous.x ? 1 : -1;
  const dropX = previous.x + (direction * 34);
  const lineDeltaY = technicalLineVerticalDelta(previous, node, element, layout);
  const verticalDelta = Math.abs(lineDeltaY);
  const bottomY = previous.y + lineDeltaY;
  const maxRun = Math.max(0, Math.abs(node.x - dropX) - 10);
  const rawRun = Math.round(verticalDelta * ((100 - inclinationPercent(element)) / 100) * 0.8);
  const bottomX = dropX + (direction * Math.min(rawRun, maxRun));

  return {
    startX: previous.x,
    startY: previous.y,
    dropX,
    bottomX,
    bottomY,
    endX: node.x,
    endY: node.y
  };
}

export function technicalLineVerticalDelta(previous, node, element = previous.element, layout = null) {
  if (layout?.technicalDeltaY === undefined && typeof layout?.elevation?.pixelsPerMeter === "number" && technicalVerticalMeters(element) > 0) {
    // Compatibility for custom callers; compiled rendering uses the positioned segment.
    return (node.y >= previous.y ? 1 : -1) * Math.max(1, Math.round(technicalVerticalMeters(element) * layout.elevation.pixelsPerMeter));
  }
  return layout?.technicalDeltaY ?? node.y - previous.y;
}

export function technicalLinePoint(geometry, ratio) {
  const clamped = Math.max(0.05, Math.min(0.95, ratio));
  const bottomX = geometry.bottomX ?? geometry.dropX;
  const bottomY = technicalBottomY(geometry);

  return {
    x: Math.round(geometry.dropX + ((bottomX - geometry.dropX) * clamped)),
    y: Math.round(geometry.startY + ((bottomY - geometry.startY) * clamped))
  };
}

export function technicalBottomY(geometry) {
  return geometry.bottomY ?? geometry.endY;
}

export function redirectionRatio(redirection, element) {
  const height = rappelHeightMeters(element);
  return height === 0 ? 0.5 : redirection.distance.meters / height;
}

export function redirectionsForElement(element) {
  if (Array.isArray(element.attributes.redirections)) {
    return element.attributes.redirections;
  }

  if (Array.isArray(element.attributes.redirection)) {
    return element.attributes.redirection;
  }

  return [];
}

export function rappelStagesForElement(element) {
  return Array.isArray(element.attributes.stages) ? element.attributes.stages : [];
}

export function technicalAnnotationDescription(layout, language) {
  return layout.segments.filter((segment) => segment.element !== null)
    .map(({ element }) => elementAnnotationDescription(element, language)).filter(Boolean).join(" ");
}

function elementAnnotationDescription(element, language) {
  const text = diagramText(language);
  const stages = rappelStagesForElement(element);
  const details = [
    ...(stages.length === 0 ? [] : [`${text.ropeStages}: ${stages.map(formatMeters).join(" + ")}`]),
    ...redirectionsForElement(element).map((redirection) => `${text.redirectionAnchor} ${redirectionLabel(redirection, language)}`)
  ];
  return details.length === 0 ? "" : `${formatTopoLabel(element, language)}: ${details.join("; ")}.`;
}

export function rappelHeightMeters(element) {
  const height = element?.attributes?.height;
  if (typeof height === "object" && height !== null && typeof height.meters === "number") {
    return height.meters;
  }

  return 0;
}

export function segmentLabel(previous, node) {
  const traverse = formatMeasurement(node.element.attributes.traverse);
  return traverse;
}

export function segmentLabelPosition(previous, node) {
  return {
    x: Math.round((previous.x + node.x) / 2),
    y: Math.round((previous.y + node.y) / 2) - 7
  };
}

export function stationTickLine(node, direction, offsetY) {
  return {
    x1: node.x + (direction * 8),
    y1: node.y - offsetY,
    x2: node.x + (direction * 24),
    y2: node.y - offsetY + 6
  };
}

export function nodeLabelPlacement(node, minimumTitleY = null) {
  const naturalTitleY = node.y - 9;
  const titleY = Math.max(naturalTitleY, minimumTitleY ?? naturalTitleY);

  return {
    labelX: node.x + labelOffsetX(node.element),
    titleY,
    detailY: titleY + 18
  };
}

export function detailLineMaxWidth(layoutWidth, labelX) {
  return Math.max(96, layoutWidth - labelX - 24);
}

export function nextLabelTitleY(placement, detailRowCount) {
  const rows = Math.max(1, detailRowCount);
  return placement.titleY + 18 + (rows * DETAIL_LINE_HEIGHT) + 2;
}

export function formatTopoLabel(element, language = "en") {
  if (element.type === "start" || element.type === "exit") {
    return element.label ?? formatElementTitle(element, language);
  }

  if (needsSegmentArrow(element)) {
    return `${element.id}, ${formatMeasurement(element.attributes.height)}`;
  }

  if (SYMBOL_ONLY_LABEL_TYPES.has(element.type)) {
    return "";
  }

  return formatElementTitle(element, language);
}

export function formatTopoDetail(element, node = null, language = "en") {
  if ((element.type === "start" || element.type === "exit") && typeof node?.elevationMeters === "number") {
    return `${node.elevationMeters}m`;
  }

  if (element.type === "rappel") {
    return [formatMeasurement(element.attributes.rope), anchorSummary(element, language), landingSummary(element, language), flowSummary(element, language), inclinationSummary(element)]
      .filter(Boolean)
      .join(" / ");
  }

  if (element.type === "downclimb" || element.type === "climb") {
    return [formatElementDetail(element, language), landingSummary(element, language), inclinationSummary(element)]
      .filter(Boolean)
      .join(" / ");
  }

  return formatElementDetail(element, language);
}

export function detailLineRows(detail, maxWidth = Number.POSITIVE_INFINITY, language = "en") {
  if (detail === "") {
    return [];
  }

  if (Number.isFinite(maxWidth) === false) {
    return [detail.split(" / ")];
  }

  const rows = [];
  let currentRow = [];

  for (const part of detail.split(" / ")) {
    const wrappedParts = wrapDetailPart(part, maxWidth, language);

    if (wrappedParts.length > 1 && currentRow.length > 0) {
      rows.push(currentRow);
      currentRow = [];
    }

    for (const [index, wrappedPart] of wrappedParts.entries()) {
      if (index > 0 && currentRow.length > 0) {
        rows.push(currentRow);
        currentRow = [];
      }

      if (currentRow.length > 0 && detailRowWidth([...currentRow, wrappedPart], language) > maxWidth) {
        rows.push(currentRow);
        currentRow = [];
      }

      currentRow.push(wrappedPart);
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  return rows;
}

export function resolveLevelValue(value, language = "en") {
  if (typeof value !== "string") {
    return null;
  }

  return LEVEL_VALUES.find((level) => value === level || value === localizeDetailValue(level, language)) ?? null;
}

export function needsSegmentArrow(element) {
  return element.type === "rappel" || element.type === "downclimb" || element.type === "climb";
}

export function segmentTechnicalElement(previous, node) {
  const elements = [previous.element, node.element];
  const indexes = technicalElementIndexesBetween(elements, 1);
  if (indexes.length > 1) throw new RangeError("This connection contains two technical elements; use layout.segments.");
  return indexes.length === 0 ? null : elements[indexes[0]];
}

export function inclinationPercent(element) {
  const inclination = element?.attributes?.inclination;

  if (typeof inclination === "object" && inclination !== null && typeof inclination.percent === "number") {
    return inclination.percent;
  }

  return 100;
}

export function themeSafeStroke(color) {
  return color === "" ? "#111111" : color;
}

export function labelOffsetX(element) {
  if (needsSegmentArrow(element)) {
    return 74;
  }

  return element.type === "hazard" ? 72 : 28;
}

export function technicalLabelDirection(geometry) {
  const bottomX = geometry.bottomX ?? geometry.dropX;
  return bottomX >= geometry.dropX ? -1 : 1;
}

export function elevationSummary(elevation, language = "en") {
  if (elevation === undefined) {
    return diagramText(language).noData;
  }

  return `${elevation.totalChangeMeters}m (${elevation.entranceMeters}m-${elevation.exitMeters}m)`;
}

export function landingSummary(element, language = "en") {
  return element.attributes.landing === undefined ? "" : labeledSummary(diagramText(language).landing, localizeDetailValue(element.attributes.landing, language));
}

export function flowSummary(element, language = "en") {
  return element.attributes.flow === undefined ? "" : labeledSummary(diagramText(language).flow, localizeDetailValue(element.attributes.flow, language));
}

export function inclinationSummary(element) {
  const inclination = element.attributes.inclination;
  return typeof inclination === "object" && inclination !== null ? `${inclination.percent}%` : "";
}

export function formatMeters(measurement) {
  return `${measurement.meters}m`;
}

export function redirectionLabel(redirection, language = "en") {
  const side = redirectionSideSuffix(redirection.side, language);
  return side === "" ? formatMeters(redirection.distance) : `${formatMeters(redirection.distance)} ${side}`;
}

export function redirectionSideSuffix(side, language = "en") {
  const text = diagramText(language);

  if (side === "left") {
    return text.sideLeft;
  }

  if (side === "right") {
    return text.sideRight;
  }

  return "";
}

export function wrapDetailPart(part, maxWidth, language = "en") {
  if (detailPartWidth(part, language) <= maxWidth || detailBadgePart(part, language) !== null) {
    return [part];
  }

  return wrapPlainDetailPart(part, maxWidth);
}

export function wrapPlainDetailPart(part, maxWidth) {
  const words = part.split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [part];
  }

  const rows = [];
  let current = "";

  for (const word of words) {
    const candidate = current === "" ? word : `${current} ${word}`;
    if (current !== "" && estimatedTextWidth(candidate, DETAIL_FONT_SIZE) > maxWidth) {
      rows.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current !== "") {
    rows.push(current);
  }

  return rows;
}

export function detailRowWidth(parts, language = "en") {
  const separatorWidth = estimatedTextWidth(" / ", DETAIL_FONT_SIZE) + (DETAIL_SEPARATOR_GAP * 2);
  return parts.reduce((width, part, index) => {
    const prefix = index === 0 ? 0 : separatorWidth;
    return width + prefix + detailPartWidth(part, language);
  }, 0);
}

export function detailPartWidth(part, language = "en") {
  const tagged = detailBadgePart(part, language);

  if (tagged === null) {
    return estimatedTextWidth(part, DETAIL_FONT_SIZE);
  }

  return estimatedTextWidth(tagged.prefix, DETAIL_FONT_SIZE) + levelBadgeWidth(tagged.label);
}

export function detailBadgePart(part, language = "en") {
  const separatorIndex = part.lastIndexOf(": ");
  const prefix = separatorIndex === -1 ? "" : part.slice(0, separatorIndex + 2);
  const categoryLabel = separatorIndex === -1 ? "" : part.slice(0, separatorIndex);
  const value = separatorIndex === -1 ? part : part.slice(separatorIndex + 2);
  const category = detailBadgeCategory(categoryLabel, value, language);
  const badge = category === null ? null : resolveBadgeValue(value, category, language);

  return badge === null ? null : { prefix, value, category: badge.category, label: badge.label };
}

export function detailBadgeListWidth(values, category, language = "en") {
  return values.reduce((width, value) => width + detailBadgeWidth(value, category, language) + 4, 0);
}

export function detailBadgeWidth(value, category, language = "en") {
  const badge = resolveBadgeValue(value, category, language);
  return levelBadgeWidth(badge.label);
}

export function detailBadgeCategory(label, value, language = "en") {
  const category = DETAIL_BADGE_LABELS[normalizeDetailLabel(label)];

  if (category !== undefined) {
    return category;
  }

  if (resolveInclinationBadgeValue(value) !== null) {
    return "inclination";
  }

  return resolveLevelValue(value, language) === null ? null : "level";
}

export function resolveBadgeValue(value, category, language = "en") {
  const normalizedCategory = DETAIL_BADGE_TOKENS[category] === undefined ? "level" : category;

  if (normalizedCategory === "inclination") {
    const inclination = resolveInclinationBadgeValue(value);
    return inclination === null ? null : { category: normalizedCategory, className: "inclination", label: inclination };
  }

  const level = resolveLevelValue(value, language);
  return level === null ? null : { category: normalizedCategory, className: level, label: localizeDetailValue(level, language) };
}

export function resolveInclinationBadgeValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^\d+(?:\.\d+)?%$/.test(trimmed) ? trimmed : null;
}

export function normalizeDetailLabel(label) {
  return label.trim().toLowerCase();
}

export function detailBadgeStyle(category, theme) {
  const tokens = DETAIL_BADGE_TOKENS[category];
  return { fill: theme[tokens[0]], text: theme[tokens[1]] };
}

export function estimatedTextWidth(value, fontSize) {
  return Math.round(value.length * fontSize * 0.56);
}

export function levelBadgeWidth(label) {
  return Math.max(26, Math.round(label.length * 5.4) + 12);
}

export function labeledSummary(label, value) {
  return value === "" ? "" : `${label}: ${value}`;
}
