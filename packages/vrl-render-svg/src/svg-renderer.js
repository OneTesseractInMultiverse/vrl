import { resolveTheme } from "./theme.js";
import {
  elementColorToken,
  formatElementDetail,
  formatElementTitle,
  formatMeasurement
} from "./element-formatters.js";
import { diagramText, localizeDetailValue, resolveDiagramLanguage } from "./locale.js";
import { resolveSymbolProfile, symbolCode, symbolKind } from "./symbol-registry.js";
import { escapeXml } from "./xml.js";

const TOPO_LEGEND_HEIGHT = 156;
const TOPO_LEGEND_RECT_HEIGHT = 124;
const DETAIL_FONT_SIZE = 10;
const DETAIL_LINE_HEIGHT = 14;
const DETAIL_SEPARATOR_GAP = 4;
const LEGEND_FONT_SIZE = 9;
const STANDARD_SYMBOL_CODE_Y_OFFSET = 15;
const LEVEL_VALUES = ["dry", "low", "medium", "high", "critical"];
const SYMBOL_ONLY_LABEL_TYPES = new Set(["walk", "pool", "hazard", "note"]);
const DETAIL_BADGE_TOKENS = {
  level: ["levelBadge", "levelBadgeText"],
  flow: ["flowBadge", "flowBadgeText"],
  exposure: ["exposureBadge", "exposureBadgeText"],
  hazardSeverity: ["hazardSeverityBadge", "hazardSeverityBadgeText"],
  inclination: ["inclinationBadge", "inclinationBadgeText"]
};
const DETAIL_BADGE_LABELS = {
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

export function renderTopoSvg(route, layout, options = {}) {
  const theme = resolveTheme(options.theme, options.themeTokens);
  const language = resolveRenderLanguage(options);
  const text = diagramText(language);
  const height = layout.height + topoLegendHeight(options);
  const nodes = renderNodes(layout, theme, options.symbology, language);
  const terrainProfile = renderTerrainProfile(layout, theme);
  const waterSegments = renderWaterSegments(layout, theme);
  const routeSegments = renderRouteSegments(layout, theme, language);
  const segmentLabels = renderSegmentLabels(layout, theme);
  const stationTicks = renderStationTicks(layout, theme);
  const infoBox = renderInfoBox(route, layout, theme, language);
  const legend = options.legend === false ? "" : renderLegend(layout, theme, language, options.symbology);

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${layout.width} ${height}" width="${layout.width}" height="${height}" style="max-width: 100%; height: auto;">
  <title>${escapeXml(route.name)} ${escapeXml(text.topo)}</title>
  <desc>${escapeXml(text.schematicDescription)} ${escapeXml(route.name)}.</desc>
  <defs>
    <marker id="vrl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L7,3 z" fill="${theme.routeLine}"/>
    </marker>
  </defs>
  <rect width="${layout.width}" height="${height}" fill="${theme.background}"/>
  ${terrainProfile}
  ${infoBox}
  ${waterSegments}
  ${routeSegments}
  ${segmentLabels}
  ${stationTicks}
  ${nodes}
  ${legend}
</svg>`;
}

export function resolveRenderLanguage(options = {}) {
  return resolveDiagramLanguage(options.language ?? options.locale ?? (options.symbology === "spanish" ? "es" : "en"));
}

export function renderNodes(layout, theme, symbology = "federation", language = "en") {
  let nextTitleY = null;

  return layout.nodes.map((node) => {
    const placement = nodeLabelPlacement(node, nextTitleY);
    const title = formatTopoLabel(node.element, language);
    const detail = formatTopoDetail(node.element, node, language);
    const maxDetailWidth = detailLineMaxWidth(layout.width, placement.labelX);
    const detailRows = detailLineRows(detail, maxDetailWidth, language);
    const hasLabelText = title !== "" || detailRows.length > 0;
    nextTitleY = hasLabelText ? nextLabelTitleY(placement, detailRows.length) : nextTitleY;
    return renderNode(node, theme, symbology, placement, language, { detail, detailRows, maxDetailWidth, title });
  }).join("");
}

export function renderTerrainProfile(layout, theme) {
  return `<path class="vrl-terrain-profile" d="${terrainProfilePath(layout)}" fill="${theme.terrain}"/>`;
}

export function topoLegendHeight(options = {}) {
  return options.legend === false ? 0 : TOPO_LEGEND_HEIGHT;
}

export function renderLegend(layout, theme, language = "en", symbology = "federation") {
  const text = diagramText(language);
  const x = 24;
  const y = layout.height + 16;
  const width = Math.max(320, layout.width - 48);
  const columnGap = 24;
  const columnWidth = Math.round((width - columnGap - 28) / 2);
  const symbolRows = legendSymbolRows(language, symbology);
  const rows = [
    { kind: "text", value: text.legendRappel },
    { kind: "text", value: text.legendTechnical },
    { kind: "badges", category: "flow", label: text.flow, values: ["dry", "low", "medium", "high"] },
    { kind: "badges", category: "exposure", label: text.exposure, values: ["low", "medium", "high"] },
    { kind: "badges", category: "hazardSeverity", label: text.hazardSeverity, values: ["low", "medium", "high", "critical"] },
    { kind: "badges", category: "inclination", label: text.inclination, values: ["80%"], description: text.inclinationDescription }
  ];

  return `<g class="vrl-legend" aria-label="${escapeXml(text.legendTitle)}">
    <rect x="${x}" y="${y}" width="${width}" height="${TOPO_LEGEND_RECT_HEIGHT}" rx="4" fill="${theme.panel}" stroke="${theme.routeLine}" stroke-width="1"/>
    <text x="${x + 14}" y="${y + 22}" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="${theme.text}">${escapeXml(text.legendTitle)}</text>
    ${symbolRows.map((entries, index) => renderLegendRow({ kind: "symbols", entries }, x + 14, y + 42 + (index * 16), theme, language)).join("")}
    ${rows.map((row, index) => {
      const column = index < 3 ? 0 : 1;
      const rowIndex = index % 3;
      const textX = x + 14 + (column * (columnWidth + columnGap));
      const textY = y + 80 + (rowIndex * 16);
      return renderLegendRow(row, textX, textY, theme, language);
    }).join("")}
  </g>`;
}

export function renderLegendRow(row, x, y, theme, language = "en") {
  if (row.kind === "symbols") {
    return renderLegendSymbolRow(row.entries, x, y, theme);
  }

  if (row.kind === "badges") {
    const label = `${row.label}:`;
    const labelWidth = estimatedTextWidth(label, LEGEND_FONT_SIZE);
    const badgeX = x + labelWidth + 5;
    const badges = renderLevelBadges(row.values, badgeX, y - 1, language, row.category, theme);
    const description = row.description === undefined
      ? ""
      : renderPlainDetailText(` ${row.description}`, badgeX + detailBadgeListWidth(row.values, row.category, language), y, theme, LEGEND_FONT_SIZE);
    return `${renderPlainDetailText(label, x, y, theme, LEGEND_FONT_SIZE)}${badges}${description}`;
  }

  return `<text class="vrl-legend-row" x="${x}" y="${y}" font-family="system-ui, sans-serif" font-size="${LEGEND_FONT_SIZE}" fill="${theme.mutedText}">${escapeXml(row.value)}</text>`;
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

export function renderLegendSymbolRow(entries, x, y, theme) {
  let cursor = x;

  return `<g class="vrl-legend-symbol-row">${entries.map(([code, label]) => {
    const codeText = String(code);
    const labelText = String(label);
    const markup = `<text class="vrl-legend-symbol-entry" x="${cursor}" y="${y}" font-family="system-ui, sans-serif" font-size="${LEGEND_FONT_SIZE}" fill="${theme.mutedText}">
      <tspan font-weight="800" fill="${theme.text}">${escapeXml(codeText)}</tspan><tspan> = ${escapeXml(labelText)}</tspan>
    </text>`;
    cursor += estimatedTextWidth(`${codeText} = ${labelText}`, LEGEND_FONT_SIZE) + 20;
    return markup;
  }).join("")}</g>`;
}

export function terrainProfilePath(layout) {
  if (layout.nodes.length === 0) {
    return `M 0 ${layout.height} L ${layout.width} ${layout.height} L ${layout.width} ${layout.height - 54} L 0 ${layout.height - 34} Z`;
  }

  const first = layout.nodes[0];
  const last = layout.nodes[layout.nodes.length - 1];
  const surface = layout.nodes.map((node) => `${node.x + 10} ${node.y + 14}`).join(" L ");

  return `M 0 ${layout.height} L 0 ${first.y + 44} L ${Math.max(0, first.x - 58)} ${first.y + 34} L ${surface} L ${layout.width} ${last.y + 54} L ${layout.width} ${layout.height} Z`;
}

export function renderInfoBox(route, layout, theme, language = "en") {
  const metadata = route.metadata ?? {};
  const x = layout.width - 282;
  const elevation = layout.elevation;
  const text = diagramText(language);

  return `<g class="vrl-info-box" aria-label="${escapeXml(text.routeSummary)}">
    <rect x="${x}" y="26" width="240" height="122" fill="#86a844" stroke="${theme.routeLine}" stroke-width="2"/>
    <text x="${x + 120}" y="50" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="${theme.text}">${escapeXml(route.name).toUpperCase()}</text>
    <text x="${x + 120}" y="74" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${theme.text}">${escapeXml(text.difficulty)}: ${escapeXml(metadata.difficulty ?? text.noData)}</text>
    <text x="${x + 120}" y="94" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${theme.text}">${escapeXml(text.elevationChange)}: ${escapeXml(elevationSummary(elevation, language))}</text>
    <text x="${x + 120}" y="114" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${theme.text}">${escapeXml(text.region)}: ${escapeXml(metadata.region ?? text.noData)}</text>
    <text x="${x + 120}" y="134" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${theme.text}">${escapeXml(text.country)}: ${escapeXml(metadata.country ?? text.noData)}</text>
  </g>`;
}

export function renderWaterSegments(layout, theme) {
  return layout.nodes
    .filter((node) => node.element.type === "pool")
    .map((node) => `<path class="vrl-water-run" d="M ${node.x - 28} ${node.y + 4} C ${node.x - 10} ${node.y + 12}, ${node.x + 12} ${node.y + 12}, ${node.x + 34} ${node.y + 2}" fill="none" stroke="${theme.water}" stroke-width="6" stroke-linecap="round"/>`)
    .join("");
}

export function renderRouteSegments(layout, theme, language = "en") {
  return layout.nodes.slice(1).map((node, index) => {
    const previous = layout.nodes[index];
    const technicalElement = segmentTechnicalElement(previous, node);

    if (technicalElement !== null && (technicalElement.attributes.shape ?? "ladder") === "ladder") {
      return renderDropLadderSegment(previous, node, theme, technicalElement, language, layout);
    }

    if (technicalElement !== null) {
      return renderDirectTechnicalSegment(previous, node, theme, technicalElement, layout);
    }

    const path = routeSegmentPath(previous, node, previous.element);

    return `<path class="vrl-route-segment" d="${path}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
  }).join("");
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

export function renderDropLadderSegment(previous, node, theme, element = previous.element, language = "en", layout = null) {
  const geometry = dropLadderGeometry(previous, node, element, layout);

  return `<g class="vrl-drop-ladder">
    <path class="vrl-route-segment vrl-drop-lead" d="M ${geometry.startX} ${geometry.startY} L ${geometry.dropX} ${geometry.startY}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="vrl-route-segment vrl-drop-slope" d="M ${geometry.dropX} ${geometry.startY} L ${geometry.bottomX} ${geometry.bottomY}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#vrl-arrow)"/>
    ${renderDropRungs(geometry, theme)}
    ${renderRappelStageMarkers(geometry, element, theme)}
    ${renderRedirectionMarkers(geometry, element, theme, language)}
    <path class="vrl-route-segment vrl-drop-exit" d="M ${geometry.bottomX} ${geometry.bottomY} L ${geometry.endX} ${geometry.endY}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

export function renderDirectTechnicalSegment(previous, node, theme, element = previous.element, layout = null) {
  const geometry = dropLadderGeometry(previous, node, element, layout);

  return `<g class="vrl-drop-direct">
    <path class="vrl-route-segment vrl-drop-lead" d="M ${geometry.startX} ${geometry.startY} L ${geometry.dropX} ${geometry.startY}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="vrl-route-segment vrl-drop-slope" d="M ${geometry.dropX} ${geometry.startY} L ${geometry.bottomX} ${geometry.bottomY}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#vrl-arrow)"/>
    <path class="vrl-route-segment vrl-drop-exit" d="M ${geometry.bottomX} ${geometry.bottomY} L ${geometry.endX} ${geometry.endY}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
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
  const height = rappelHeightMeters(element);
  const pixelsPerMeter = layout?.elevation?.pixelsPerMeter;

  if (height > 0 && typeof pixelsPerMeter === "number") {
    const direction = node.y >= previous.y ? 1 : -1;
    return direction * Math.max(1, Math.round(height * (inclinationPercent(element) / 100) * pixelsPerMeter));
  }

  return node.y - previous.y;
}

export function renderDropRungs(geometry, theme) {
  const bottomY = technicalBottomY(geometry);
  const dropHeight = Math.abs(bottomY - geometry.startY);
  const rungCount = dropHeight < 18 ? 1 : Math.max(2, Math.min(5, Math.floor(dropHeight / 22)));
  const bottomX = geometry.bottomX ?? geometry.dropX;
  const slopeX = bottomX - geometry.dropX;
  const slopeY = bottomY - geometry.startY;
  const slopeLength = Math.hypot(slopeX, slopeY) || 1;
  const normalX = -slopeY / slopeLength;
  const normalY = slopeX / slopeLength;

  return Array.from({ length: rungCount }, (_, index) => {
    const progress = (index + 1) / (rungCount + 1);
    const x = geometry.dropX + (slopeX * progress);
    const y = geometry.startY + (slopeY * progress);
    const x1 = Math.round(x + (normalX * 7));
    const y1 = Math.round(y + (normalY * 7));
    const x2 = Math.round(x - (normalX * 7));
    const y2 = Math.round(y - (normalY * 7));
    return `<line class="vrl-drop-rung" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${theme.routeLine}" stroke-width="1.5" stroke-linecap="round"/>`;
  }).join("");
}

export function renderRappelStageMarkers(geometry, element, theme) {
  const stages = rappelStagesForElement(element);
  if (stages.length === 0) {
    return "";
  }

  const total = stages.reduce((sum, stage) => sum + stage.meters, 0);
  const labelDirection = technicalLabelDirection(geometry);
  const textAnchor = labelDirection === -1 ? "end" : "start";
  let cumulative = 0;

  return stages.map((stage, index) => {
    const midpoint = technicalLinePoint(geometry, (cumulative + (stage.meters / 2)) / total);
    cumulative += stage.meters;
    const boundary = index === stages.length - 1 ? "" : renderStageBoundary(geometry, cumulative / total, theme);

    return `${boundary}<text class="vrl-rappel-stage-label" x="${midpoint.x + (labelDirection * 16)}" y="${midpoint.y - 2}" text-anchor="${textAnchor}" font-family="system-ui, sans-serif" font-size="9" fill="${theme.text}" stroke="${theme.panel}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${formatMeters(stage)}</text>`;
  }).join("");
}

export function renderStageBoundary(geometry, ratio, theme) {
  const point = technicalLinePoint(geometry, ratio);
  return `<line class="vrl-rappel-stage-boundary" x1="${point.x - 8}" y1="${point.y}" x2="${point.x + 8}" y2="${point.y}" stroke="${theme.routeLine}" stroke-width="1.5" stroke-linecap="round"/>`;
}

export function renderRedirectionMarkers(geometry, element, theme, language = "en") {
  const labelDirection = -technicalLabelDirection(geometry);
  const textAnchor = labelDirection === -1 ? "end" : "start";
  const text = diagramText(language);

  return redirectionsForElement(element).map((redirection) => {
    const ratio = redirectionRatio(redirection, element);
    const point = technicalLinePoint(geometry, ratio);
    const label = redirectionLabel(redirection, language);

    return `<g class="vrl-redirection-anchor" aria-label="${escapeXml(text.redirectionAnchor)} ${escapeXml(label)}">
      <path d="M ${point.x} ${point.y - 6} L ${point.x + 6} ${point.y} L ${point.x} ${point.y + 6} L ${point.x - 6} ${point.y} Z" fill="${theme.panel}" stroke="${theme.routeLine}" stroke-width="1.4"/>
      <text x="${point.x + (labelDirection * 12)}" y="${point.y + 3}" text-anchor="${textAnchor}" font-family="system-ui, sans-serif" font-size="8" fill="${theme.text}" stroke="${theme.panel}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(label)}</text>
    </g>`;
  }).join("");
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

function technicalBottomY(geometry) {
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

export function rappelHeightMeters(element) {
  const height = element?.attributes?.height;
  if (typeof height === "object" && height !== null && typeof height.meters === "number") {
    return height.meters;
  }

  return 0;
}

export function renderSegmentLabels(layout, theme) {
  return layout.nodes.slice(1).map((node, index) => {
    const previous = layout.nodes[index];
    const label = segmentLabel(previous, node);

    if (label === "") {
      return "";
    }

    const position = segmentLabelPosition(previous, node);
    return `<text class="vrl-segment-label" x="${position.x}" y="${position.y}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${theme.text}" stroke="${theme.panel}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(label)}</text>`;
  }).join("");
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

export function renderStationTicks(layout, theme) {
  return layout.nodes
    .filter((node) => needsSegmentArrow(node.element) && node.element.attributes.station !== undefined)
    .map((node) => renderStationTick(node, theme))
    .join("");
}

export function renderStationTick(node, theme) {
  const direction = node.element.attributes.station === "right" ? 1 : -1;
  const lineA = stationTickLine(node, direction, 8);
  const lineB = stationTickLine(node, direction, 12);

  return `<g class="vrl-station-tick vrl-station-tick-clearance" stroke="${theme.panel}" stroke-width="5" stroke-linecap="round">
      <line x1="${lineA.x1}" y1="${lineA.y1}" x2="${lineA.x2}" y2="${lineA.y2}"/>
      <line x1="${lineB.x1}" y1="${lineB.y1}" x2="${lineB.x2}" y2="${lineB.y2}"/>
    </g><g class="vrl-station-tick" stroke="${theme.routeLine}" stroke-width="1.5" stroke-linecap="round">
      <line x1="${lineA.x1}" y1="${lineA.y1}" x2="${lineA.x2}" y2="${lineA.y2}"/>
      <line x1="${lineB.x1}" y1="${lineB.y1}" x2="${lineB.x2}" y2="${lineB.y2}"/>
    </g>`;
}

function stationTickLine(node, direction, offsetY) {
  return {
    x1: node.x + (direction * 8),
    y1: node.y - offsetY,
    x2: node.x + (direction * 24),
    y2: node.y - offsetY + 6
  };
}

export function renderNode(node, theme, symbology = "federation", placement = nodeLabelPlacement(node), language = "en", options = {}) {
  const element = node.element;
  const color = theme[elementColorToken(element)];
  const title = options.title ?? formatTopoLabel(element, language);
  const detail = options.detail ?? formatTopoDetail(element, node, language);
  const marker = renderSymbolMarker(node, element, color, symbology, theme.panel, language);
  const anchorMarks = renderAnchorMarks(node, element, theme, "left", language);
  const detailLine = renderDetailLine(detail, placement.labelX, placement.detailY, theme, language, options.maxDetailWidth, options.detailRows);
  const titleLine = title === ""
    ? ""
    : `<text x="${placement.labelX}" y="${placement.titleY}" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="${theme.text}" stroke="${theme.panel}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(title)}</text>`;
  const labelLeader = titleLine === "" && detailLine === "" ? "" : renderLabelLeader(node, placement, theme);

  return `<g class="vrl-node vrl-node-${element.type}" aria-label="${escapeXml(formatElementTitle(element, language))}">
    ${anchorMarks}
    ${marker}
    ${labelLeader}
    ${titleLine}
    ${detailLine}
  </g>`;
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

export function renderLabelLeader(node, placement, theme) {
  if (Math.abs(placement.titleY - (node.y - 9)) < 6) {
    return "";
  }

  return `<path class="vrl-label-leader" d="M ${node.x + 12} ${node.y - 2} L ${placement.labelX - 8} ${placement.titleY - 4}" fill="none" stroke="${theme.mutedText}" stroke-width="1" stroke-linecap="round" stroke-dasharray="3 3"/>`;
}

export function renderAnchorMarks(node, element, theme, side = "left", language = "en") {
  const count = anchorMarkCount(element);
  if (count === 0) {
    return "";
  }

  const direction = side === "left" ? -1 : 1;

  return `<g class="vrl-anchor-marks" aria-label="${count} ${escapeXml(anchorLabel(count, language))}">
    ${Array.from({ length: count }, (_, index) => {
      const x = node.x + (direction * (14 + (index * 8)));
      const y = node.y - 24;
      return `<circle cx="${x}" cy="${y}" r="3" fill="${theme.panel}" stroke="${theme.routeLine}" stroke-width="1.4"/>`;
    }).join("")}
  </g>`;
}

export function anchorMarkCount(element) {
  const count = Number(element.attributes.anchor_count ?? 0);
  if (Number.isInteger(count) === false || count <= 0) {
    return 0;
  }

  return Math.min(count, 4);
}

export function renderSymbolMarker(node, element, color, symbology = "federation", panelColor = "#f6f8fa", language = "en") {
  const code = escapeXml(symbolCode(element, symbology));

  if (symbolKind(element) === "snake") {
    return `<g class="vrl-symbol vrl-symbol-snake" aria-label="${escapeXml(diagramText(language).snakeHazard)}">
      <path class="vrl-symbol-clearance" d="M ${node.x - 9} ${node.y + 8} C ${node.x - 2} ${node.y - 10}, ${node.x + 4} ${node.y + 10}, ${node.x + 10} ${node.y - 8}" fill="none" stroke="${panelColor}" stroke-width="7" stroke-linecap="round"/>
      <path d="M ${node.x - 9} ${node.y + 8} C ${node.x - 2} ${node.y - 10}, ${node.x + 4} ${node.y + 10}, ${node.x + 10} ${node.y - 8}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
      <text x="${node.x}" y="${node.y + 20}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="${color}" stroke="${panelColor}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${code}</text>
    </g>`;
  }

  if (symbolKind(element) === "hazard") {
    return `<g class="vrl-symbol vrl-symbol-hazard">
      <path class="vrl-symbol-clearance" d="M ${node.x} ${node.y - 12} L ${node.x - 11} ${node.y + 11} L ${node.x + 11} ${node.y + 11} Z" fill="${panelColor}" stroke="${panelColor}" stroke-width="2"/>
      <path d="M ${node.x} ${node.y - 9} L ${node.x - 8} ${node.y + 8} L ${node.x + 8} ${node.y + 8} Z" fill="#d53a2f" stroke="${themeSafeStroke(color)}" stroke-width="1"/>
    </g>`;
  }

  return `<g class="vrl-symbol vrl-symbol-standard">
    <circle class="vrl-symbol-clearance" cx="${node.x}" cy="${node.y}" r="8" fill="${panelColor}" stroke="${panelColor}" stroke-width="2"/>
    <circle cx="${node.x}" cy="${node.y}" r="4" fill="#8fb04b" stroke="${themeSafeStroke(color)}" stroke-width="1"/>
    <text x="${node.x}" y="${node.y - STANDARD_SYMBOL_CODE_Y_OFFSET}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="${themeSafeStroke(color)}" stroke="${panelColor}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${code}</text>
  </g>`;
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

export function renderDetailLine(detail, x, y, theme, language = "en", maxWidth = Number.POSITIVE_INFINITY, rows = null) {
  if (detail === "") {
    return "";
  }

  const detailRows = rows ?? detailLineRows(detail, maxWidth, language);
  const markup = detailRows.map((row, index) => renderDetailRow(row, x, y + (index * DETAIL_LINE_HEIGHT), theme, language)).join("");

  return `<g class="vrl-detail-line">${markup}</g>`;
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

export function renderLevelBadge(value, x, y, language = "en", category = "level", theme = resolveTheme()) {
  const badge = resolveBadgeValue(value, category, language);

  if (badge === null) {
    return "";
  }

  const label = badge.label;
  const width = levelBadgeWidth(label);
  const style = detailBadgeStyle(badge.category, theme);

  return `<g class="vrl-level-badge vrl-level-badge-${badge.className} vrl-detail-badge vrl-detail-badge-${badge.category}">
    <rect x="${x}" y="${y - 12}" width="${width}" height="14" rx="3" fill="${style.fill}"/>
    <text x="${x + Math.round(width / 2)}" y="${y - 3}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="800" fill="${style.text}">${escapeXml(label)}</text>
  </g>`;
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
  if (node.element.type === "climb") {
    return node.element;
  }

  if (previous.element.type === "rappel" || previous.element.type === "downclimb") {
    return previous.element;
  }

  return null;
}

export function inclinationPercent(element) {
  const inclination = element?.attributes?.inclination;

  if (typeof inclination === "object" && inclination !== null && typeof inclination.percent === "number") {
    return inclination.percent;
  }

  return 100;
}

function themeSafeStroke(color) {
  return color === "" ? "#111111" : color;
}

function labelOffsetX(element) {
  if (needsSegmentArrow(element)) {
    return 74;
  }

  return element.type === "hazard" ? 72 : 28;
}

function technicalLabelDirection(geometry) {
  const bottomX = geometry.bottomX ?? geometry.dropX;
  return bottomX >= geometry.dropX ? -1 : 1;
}

function elevationSummary(elevation, language = "en") {
  if (elevation === undefined) {
    return diagramText(language).noData;
  }

  return `${elevation.totalChangeMeters}m (${elevation.entranceMeters}m-${elevation.exitMeters}m)`;
}

function anchorSummary(element, language = "en") {
  const count = anchorMarkCount(element);
  return count === 0 ? "" : `${count} ${anchorLabel(count, language)}`;
}

function landingSummary(element, language = "en") {
  return element.attributes.landing === undefined ? "" : labeledSummary(diagramText(language).landing, localizeDetailValue(element.attributes.landing, language));
}

function flowSummary(element, language = "en") {
  return element.attributes.flow === undefined ? "" : labeledSummary(diagramText(language).flow, localizeDetailValue(element.attributes.flow, language));
}

function inclinationSummary(element) {
  const inclination = element.attributes.inclination;
  return typeof inclination === "object" && inclination !== null ? `${inclination.percent}%` : "";
}

function formatMeters(measurement) {
  return `${measurement.meters}m`;
}

function redirectionLabel(redirection, language = "en") {
  const side = redirectionSideSuffix(redirection.side, language);
  return side === "" ? formatMeters(redirection.distance) : `${formatMeters(redirection.distance)} ${side}`;
}

function redirectionSideSuffix(side, language = "en") {
  const text = diagramText(language);

  if (side === "left") {
    return text.sideLeft;
  }

  if (side === "right") {
    return text.sideRight;
  }

  return "";
}

function renderDetailPart(part, x, y, theme, language = "en") {
  const tagged = detailBadgePart(part, language);

  if (tagged === null) {
    const markup = renderPlainDetailText(part, x, y, theme, DETAIL_FONT_SIZE);
    return { markup, nextX: x + estimatedTextWidth(part, DETAIL_FONT_SIZE) };
  }

  const prefixWidth = estimatedTextWidth(tagged.prefix, DETAIL_FONT_SIZE);
  const badgeX = x + prefixWidth;
  const prefixMarkup = tagged.prefix === "" ? "" : renderPlainDetailText(tagged.prefix, x, y, theme, DETAIL_FONT_SIZE);
  const markup = `${prefixMarkup}${renderLevelBadge(tagged.value, badgeX, y, language, tagged.category, theme)}`;

  return { markup, nextX: badgeX + levelBadgeWidth(tagged.label) };
}

function renderDetailRow(parts, x, y, theme, language = "en") {
  let cursor = x;

  return `<g class="vrl-detail-row">${parts.map((part, index) => {
    const separator = index === 0 ? "" : " / ";
    const separatorX = separator === "" ? cursor : cursor + DETAIL_SEPARATOR_GAP;
    const separatorMarkup = separator === "" ? "" : renderPlainDetailText(separator, separatorX, y, theme, DETAIL_FONT_SIZE, 1);
    cursor = separator === "" ? cursor : separatorX + estimatedTextWidth(separator, DETAIL_FONT_SIZE) + DETAIL_SEPARATOR_GAP;

    const rendered = renderDetailPart(part, cursor, y, theme, language);
    cursor = rendered.nextX;
    return `${separatorMarkup}${rendered.markup}`;
  }).join("")}</g>`;
}

function wrapDetailPart(part, maxWidth, language = "en") {
  if (detailPartWidth(part, language) <= maxWidth || detailBadgePart(part, language) !== null) {
    return [part];
  }

  return wrapPlainDetailPart(part, maxWidth);
}

function wrapPlainDetailPart(part, maxWidth) {
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

function detailRowWidth(parts, language = "en") {
  const separatorWidth = estimatedTextWidth(" / ", DETAIL_FONT_SIZE) + (DETAIL_SEPARATOR_GAP * 2);
  return parts.reduce((width, part, index) => {
    const prefix = index === 0 ? 0 : separatorWidth;
    return width + prefix + detailPartWidth(part, language);
  }, 0);
}

function detailPartWidth(part, language = "en") {
  const tagged = detailBadgePart(part, language);

  if (tagged === null) {
    return estimatedTextWidth(part, DETAIL_FONT_SIZE);
  }

  return estimatedTextWidth(tagged.prefix, DETAIL_FONT_SIZE) + levelBadgeWidth(tagged.label);
}

function detailBadgePart(part, language = "en") {
  const separatorIndex = part.lastIndexOf(": ");
  const prefix = separatorIndex === -1 ? "" : part.slice(0, separatorIndex + 2);
  const categoryLabel = separatorIndex === -1 ? "" : part.slice(0, separatorIndex);
  const value = separatorIndex === -1 ? part : part.slice(separatorIndex + 2);
  const category = detailBadgeCategory(categoryLabel, value, language);
  const badge = category === null ? null : resolveBadgeValue(value, category, language);

  return badge === null ? null : { prefix, value, category: badge.category, label: badge.label };
}

function renderPlainDetailText(value, x, y, theme, fontSize, strokeWidth = 3) {
  return `<text x="${x}" y="${y}" font-family="system-ui, sans-serif" font-size="${fontSize}" fill="${theme.mutedText}" stroke="${theme.panel}" stroke-width="${strokeWidth}" stroke-linejoin="round" paint-order="stroke">${escapeXml(value)}</text>`;
}

function renderLevelBadges(values, x, y, language = "en", category = "level", theme = resolveTheme()) {
  let cursor = x;

  return values.map((value) => {
    const badge = renderLevelBadge(value, cursor, y, language, category, theme);
    cursor += detailBadgeWidth(value, category, language) + 4;
    return badge;
  }).join("");
}

function detailBadgeListWidth(values, category, language = "en") {
  return values.reduce((width, value) => width + detailBadgeWidth(value, category, language) + 4, 0);
}

function detailBadgeWidth(value, category, language = "en") {
  const badge = resolveBadgeValue(value, category, language);
  return levelBadgeWidth(badge.label);
}

function detailBadgeCategory(label, value, language = "en") {
  const category = DETAIL_BADGE_LABELS[normalizeDetailLabel(label)];

  if (category !== undefined) {
    return category;
  }

  if (resolveInclinationBadgeValue(value) !== null) {
    return "inclination";
  }

  return resolveLevelValue(value, language) === null ? null : "level";
}

function resolveBadgeValue(value, category, language = "en") {
  const normalizedCategory = DETAIL_BADGE_TOKENS[category] === undefined ? "level" : category;

  if (normalizedCategory === "inclination") {
    const inclination = resolveInclinationBadgeValue(value);
    return inclination === null ? null : { category: normalizedCategory, className: "inclination", label: inclination };
  }

  const level = resolveLevelValue(value, language);
  return level === null ? null : { category: normalizedCategory, className: level, label: localizeDetailValue(level, language) };
}

function resolveInclinationBadgeValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^\d+(?:\.\d+)?%$/.test(trimmed) ? trimmed : null;
}

function normalizeDetailLabel(label) {
  return label.trim().toLowerCase();
}

function detailBadgeStyle(category, theme) {
  const tokens = DETAIL_BADGE_TOKENS[category];
  return { fill: theme[tokens[0]], text: theme[tokens[1]] };
}

function estimatedTextWidth(value, fontSize) {
  return Math.round(value.length * fontSize * 0.56);
}

function levelBadgeWidth(label) {
  return Math.max(26, Math.round(label.length * 5.4) + 12);
}

function labeledSummary(label, value) {
  return value === "" ? "" : `${label}: ${value}`;
}

function anchorLabel(count, language = "en") {
  const text = diagramText(language);
  return count === 1 ? text.anchor : text.anchors;
}
