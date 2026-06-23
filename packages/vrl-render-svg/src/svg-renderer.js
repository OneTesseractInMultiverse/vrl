import { resolveTheme } from "./theme.js";
import {
  elementColorToken,
  formatElementDetail,
  formatElementTitle,
  formatMeasurement
} from "./element-formatters.js";
import { symbolCode, symbolKind } from "./symbol-registry.js";
import { escapeXml } from "./xml.js";

export function renderTopoSvg(route, layout, options = {}) {
  const theme = resolveTheme(options.theme, options.themeTokens);
  const nodes = layout.nodes.map((node) => renderNode(node, theme, options.symbology)).join("");
  const terrainProfile = renderTerrainProfile(layout, theme);
  const waterSegments = renderWaterSegments(layout, theme);
  const routeSegments = renderRouteSegments(layout, theme);
  const segmentLabels = renderSegmentLabels(layout, theme);
  const stationTicks = renderStationTicks(layout, theme);
  const infoBox = renderInfoBox(route, layout, theme);

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="0 0 ${layout.width} ${layout.height}" width="${layout.width}" height="${layout.height}" style="max-width: 100%; height: auto;">
  <title>${escapeXml(route.name)} topo</title>
  <desc>Vertical Route Language schematic for ${escapeXml(route.name)}.</desc>
  <defs>
    <marker id="vrl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L7,3 z" fill="${theme.routeLine}"/>
    </marker>
  </defs>
  <rect width="${layout.width}" height="${layout.height}" fill="${theme.background}"/>
  ${terrainProfile}
  ${infoBox}
  ${waterSegments}
  ${routeSegments}
  ${segmentLabels}
  ${stationTicks}
  ${nodes}
</svg>`;
}

export function renderTerrainProfile(layout, theme) {
  return `<path class="vrl-terrain-profile" d="${terrainProfilePath(layout)}" fill="${theme.terrain}"/>`;
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

export function renderInfoBox(route, layout, theme) {
  const metadata = route.metadata ?? {};
  const x = layout.width - 282;
  const elevation = layout.elevation;

  return `<g class="vrl-info-box" aria-label="Route summary">
    <rect x="${x}" y="26" width="240" height="122" fill="#86a844" stroke="${theme.routeLine}" stroke-width="2"/>
    <text x="${x + 120}" y="50" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="${theme.text}">${escapeXml(route.name).toUpperCase()}</text>
    <text x="${x + 120}" y="74" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${theme.text}">Dificultad: ${escapeXml(metadata.difficulty ?? "sin dato")}</text>
    <text x="${x + 120}" y="94" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${theme.text}">Desnivel: ${escapeXml(elevationSummary(elevation))}</text>
    <text x="${x + 120}" y="114" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${theme.text}">Región: ${escapeXml(metadata.region ?? "sin dato")}</text>
    <text x="${x + 120}" y="134" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${theme.text}">País: ${escapeXml(metadata.country ?? "sin dato")}</text>
  </g>`;
}

export function renderWaterSegments(layout, theme) {
  return layout.nodes
    .filter((node) => node.element.type === "pool")
    .map((node) => `<path class="vrl-water-run" d="M ${node.x - 28} ${node.y + 4} C ${node.x - 10} ${node.y + 12}, ${node.x + 12} ${node.y + 12}, ${node.x + 34} ${node.y + 2}" fill="none" stroke="${theme.water}" stroke-width="6" stroke-linecap="round"/>`)
    .join("");
}

export function renderRouteSegments(layout, theme) {
  return layout.nodes.slice(1).map((node, index) => {
    const previous = layout.nodes[index];
    const technicalElement = segmentTechnicalElement(previous, node);

    if (technicalElement !== null && (technicalElement.attributes.shape ?? "ladder") === "ladder") {
      return renderDropLadderSegment(previous, node, theme, technicalElement);
    }

    const arrow = technicalElement === null ? "" : ' marker-end="url(#vrl-arrow)"';
    const path = routeSegmentPath(previous, node, technicalElement ?? previous.element);

    return `<path class="vrl-route-segment" d="${path}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"${arrow}/>`;
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

export function renderDropLadderSegment(previous, node, theme, element = previous.element) {
  const geometry = dropLadderGeometry(previous, node, element);

  return `<g class="vrl-drop-ladder">
    <path class="vrl-route-segment vrl-drop-lead" d="M ${geometry.startX} ${geometry.startY} L ${geometry.dropX} ${geometry.startY}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="vrl-route-segment vrl-drop-slope" d="M ${geometry.dropX} ${geometry.startY} L ${geometry.bottomX} ${geometry.endY}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#vrl-arrow)"/>
    ${renderDropRungs(geometry, theme)}
    ${renderRappelStageMarkers(geometry, element, theme)}
    ${renderRedirectionMarkers(geometry, element, theme)}
    <path class="vrl-route-segment vrl-drop-exit" d="M ${geometry.bottomX} ${geometry.endY} L ${geometry.endX} ${geometry.endY}" fill="none" stroke="${theme.routeLine}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

export function dropLadderGeometry(previous, node, element = previous.element) {
  const direction = node.x >= previous.x ? 1 : -1;
  const dropX = previous.x + (direction * 34);
  const verticalDelta = Math.abs(node.y - previous.y);
  const maxRun = Math.max(0, Math.abs(node.x - dropX) - 10);
  const rawRun = Math.round(verticalDelta * ((100 - inclinationPercent(element)) / 100) * 0.8);
  const bottomX = dropX + (direction * Math.min(rawRun, maxRun));

  return {
    startX: previous.x,
    startY: previous.y,
    dropX,
    bottomX,
    endX: node.x,
    endY: node.y
  };
}

export function renderDropRungs(geometry, theme) {
  const dropHeight = Math.abs(geometry.endY - geometry.startY);
  const rungCount = Math.max(2, Math.min(5, Math.floor(dropHeight / 22)));
  const bottomX = geometry.bottomX ?? geometry.dropX;
  const slopeX = bottomX - geometry.dropX;
  const slopeY = geometry.endY - geometry.startY;
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

export function renderRedirectionMarkers(geometry, element, theme) {
  const labelDirection = technicalLabelDirection(geometry);
  const textAnchor = labelDirection === -1 ? "end" : "start";

  return redirectionsForElement(element).map((redirection) => {
    const ratio = redirectionRatio(redirection, element);
    const point = technicalLinePoint(geometry, ratio);
    const label = redirection.side === "unknown" ? formatMeters(redirection.distance) : `${formatMeters(redirection.distance)} ${redirection.side}`;

    return `<g class="vrl-redirection-anchor" aria-label="Redirection anchor ${escapeXml(label)}">
      <path d="M ${point.x} ${point.y - 6} L ${point.x + 6} ${point.y} L ${point.x} ${point.y + 6} L ${point.x - 6} ${point.y} Z" fill="${theme.panel}" stroke="${theme.routeLine}" stroke-width="1.4"/>
      <text x="${point.x + (labelDirection * 12)}" y="${point.y + 3}" text-anchor="${textAnchor}" font-family="system-ui, sans-serif" font-size="8" fill="${theme.text}" stroke="${theme.panel}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(label)}</text>
    </g>`;
  }).join("");
}

export function technicalLinePoint(geometry, ratio) {
  const clamped = Math.max(0.05, Math.min(0.95, ratio));
  const bottomX = geometry.bottomX ?? geometry.dropX;

  return {
    x: Math.round(geometry.dropX + ((bottomX - geometry.dropX) * clamped)),
    y: Math.round(geometry.startY + ((geometry.endY - geometry.startY) * clamped))
  };
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
  const height = element.attributes.height;
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
    .filter((node) => needsSegmentArrow(node.element))
    .map((node) => `<g class="vrl-station-tick vrl-station-tick-clearance" stroke="${theme.panel}" stroke-width="5" stroke-linecap="round">
      <line x1="${node.x - 10}" y1="${node.y - 8}" x2="${node.x + 6}" y2="${node.y - 2}"/>
      <line x1="${node.x - 6}" y1="${node.y - 11}" x2="${node.x + 10}" y2="${node.y - 5}"/>
    </g><g class="vrl-station-tick" stroke="${theme.routeLine}" stroke-width="1.5" stroke-linecap="round">
      <line x1="${node.x - 10}" y1="${node.y - 8}" x2="${node.x + 6}" y2="${node.y - 2}"/>
      <line x1="${node.x - 6}" y1="${node.y - 11}" x2="${node.x + 10}" y2="${node.y - 5}"/>
    </g>`)
    .join("");
}

export function renderNode(node, theme, symbology = "federation") {
  const element = node.element;
  const color = theme[elementColorToken(element)];
  const title = formatTopoLabel(element);
  const detail = formatTopoDetail(element, node);
  const marker = renderSymbolMarker(node, element, color, symbology, theme.panel);
  const anchorMarks = renderAnchorMarks(node, element, theme);
  const labelX = node.x + labelOffsetX(element);

  return `<g class="vrl-node vrl-node-${element.type}" aria-label="${escapeXml(formatElementTitle(element))}">
    ${anchorMarks}
    ${marker}
    <text x="${labelX}" y="${node.y - 9}" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="${theme.text}" stroke="${theme.panel}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(title)}</text>
    <text x="${labelX}" y="${node.y + 14}" font-family="system-ui, sans-serif" font-size="10" fill="${theme.mutedText}" stroke="${theme.panel}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(detail)}</text>
  </g>`;
}

export function renderAnchorMarks(node, element, theme) {
  const count = anchorMarkCount(element);
  if (count === 0) {
    return "";
  }

  return `<g class="vrl-anchor-marks" aria-label="${count} anchors">
    ${Array.from({ length: count }, (_, index) => {
      const x = node.x - 5 + (index * 8);
      const y = node.y - 20;
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

export function renderSymbolMarker(node, element, color, symbology = "federation", panelColor = "#f6f8fa") {
  const code = escapeXml(symbolCode(element, symbology));

  if (symbolKind(element) === "snake") {
    return `<g class="vrl-symbol vrl-symbol-snake" aria-label="Snake hazard">
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
    <text x="${node.x}" y="${node.y - 10}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="${themeSafeStroke(color)}" stroke="${panelColor}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${code}</text>
  </g>`;
}

export function formatTopoLabel(element) {
  if (element.type === "start" || element.type === "exit") {
    return element.label ?? formatElementTitle(element);
  }

  if (needsSegmentArrow(element)) {
    return `${element.id}, ${formatMeasurement(element.attributes.height)}`;
  }

  return formatElementTitle(element);
}

export function formatTopoDetail(element, node = null) {
  if ((element.type === "start" || element.type === "exit") && typeof node?.elevationMeters === "number") {
    return `${node.elevationMeters}m`;
  }

  if (element.type === "rappel") {
    return [formatMeasurement(element.attributes.rope), stageSummary(element), redirectionSummary(element), anchorSummary(element), landingSummary(element), flowSummary(element), inclinationSummary(element)]
      .filter(Boolean)
      .join(" / ");
  }

  if (element.type === "downclimb" || element.type === "climb") {
    return [formatElementDetail(element), landingSummary(element), inclinationSummary(element)]
      .filter(Boolean)
      .join(" / ");
  }

  return formatElementDetail(element);
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
  return needsSegmentArrow(element) ? 46 : 24;
}

function technicalLabelDirection(geometry) {
  const bottomX = geometry.bottomX ?? geometry.dropX;
  return bottomX >= geometry.dropX ? -1 : 1;
}

function elevationSummary(elevation) {
  if (elevation === undefined) {
    return "sin dato";
  }

  return `${elevation.totalChangeMeters}m (${elevation.entranceMeters}m-${elevation.exitMeters}m)`;
}

function anchorSummary(element) {
  const count = anchorMarkCount(element);
  return count === 0 ? "" : `${count} anchors`;
}

function landingSummary(element) {
  return element.attributes.landing === undefined ? "" : element.attributes.landing;
}

function flowSummary(element) {
  return element.attributes.flow === undefined ? "" : element.attributes.flow;
}

function inclinationSummary(element) {
  const inclination = element.attributes.inclination;
  return typeof inclination === "object" && inclination !== null ? `${inclination.percent}%` : "";
}

function stageSummary(element) {
  const stages = rappelStagesForElement(element);
  return stages.length === 0 ? "" : stages.map(formatMeters).join("+");
}

function redirectionSummary(element) {
  const redirections = redirectionsForElement(element);
  if (redirections.length === 0) {
    return "";
  }

  return redirections.length === 1 ? "1 redir" : `${redirections.length} redir`;
}

function formatMeters(measurement) {
  return `${measurement.meters}m`;
}
