import { computeTopoScene, prepareNodes, prepareInfoBox, prepareLegend, stagePlacements, redirectionPlacements } from "./topo-scene.js";
import {
  DETAIL_FONT_SIZE,
  DETAIL_LINE_HEIGHT,
  DETAIL_SEPARATOR_GAP,
  LEGEND_FONT_SIZE,
  STANDARD_SYMBOL_CODE_Y_OFFSET,
  terrainProfilePath,
  technicalAnnotationDescription,
  routeSegmentPath,
  dropLadderGeometry,
  technicalLinePoint,
  technicalBottomY,
  segmentLabel,
  segmentLabelPosition,
  stationTickLine,
  nodeLabelPlacement,
  anchorMarkCount,
  formatTopoLabel,
  formatTopoDetail,
  detailLineRows,
  needsSegmentArrow,
  themeSafeStroke,
  detailBadgePart,
  detailBadgeListWidth,
  detailBadgeWidth,
  resolveBadgeValue,
  detailBadgeStyle,
  estimatedTextWidth,
  levelBadgeWidth,
  anchorLabel
} from "./presentation.js";
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
import { resolveTheme } from "./theme.js";
import { elementColorToken, formatElementTitle } from "./element-formatters.js";
import { diagramText } from "./locale.js";
import { symbolCode, symbolKind } from "./symbol-registry.js";
import { assertXmlCharacters, escapeXml } from "./xml.js";
import { svgAttribute, svgPaint } from "./attributes.js";
import { validateRenderOptions } from "./render-options.js";

export function renderTopoSvg(route, layout, options = {}) {
  validateRenderOptions(options);
  const theme = resolveTheme(options.theme, options.themeTokens);
  const scene = computeTopoScene(route, layout, options);
  const { language, viewBox } = scene;
  const text = diagramText(language);
  const description = [`${text.schematicDescription} ${route.name}.`, technicalAnnotationDescription(layout, language)].filter(Boolean).join(" ");
  const nodes = renderNodes(layout, theme, options.symbology, language, scene.nodes);
  const terrainProfile = renderTerrainProfile(layout, theme);
  const waterSegments = renderWaterSegments(layout, theme);
  const routeSegments = renderRouteSegments(layout, theme, language);
  const segmentLabels = renderSegmentLabels(layout, theme);
  const stationTicks = renderStationTicks(layout, theme);
  const infoBox = renderInfoBox(route, layout, theme, language, scene.infoBox);
  const legend = scene.legend === null ? "" : renderLegend(layout, theme, language, options.symbology, scene.legend);

  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="${svgAttribute(viewBox.x)} ${svgAttribute(viewBox.y)} ${svgAttribute(viewBox.width)} ${svgAttribute(viewBox.height)}" width="${svgAttribute(viewBox.width)}" height="${svgAttribute(viewBox.height)}" style="max-width: 100%; height: auto;">
  <title>${escapeXml(route.name)} ${escapeXml(text.topo)}</title>
  <desc>${escapeXml(description)}</desc>
  <defs>
    <marker id="vrl-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
      <path d="M0,0 L0,6 L7,3 z" fill="${svgPaint(theme.routeLine)}"/>
    </marker>
  </defs>
  <rect x="${svgAttribute(viewBox.x)}" y="${svgAttribute(viewBox.y)}" width="${svgAttribute(viewBox.width)}" height="${svgAttribute(viewBox.height)}" fill="${svgPaint(theme.background)}"/>
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

export function renderNodes(layout, theme, symbology = "federation", language = "en", prepared = prepareNodes(layout, language)) {
  return prepared.map(({ node, placement, ...labels }) => renderNode(node, theme, symbology, placement, language, labels)).join("");
}

export function renderTerrainProfile(layout, theme) {
  return `<path class="vrl-terrain-profile" d="${svgAttribute(terrainProfilePath(layout))}" fill="${svgPaint(theme.terrain)}"/>`;
}

export function renderLegend(layout, theme, language = "en", symbology = "federation", prepared = prepareLegend(layout, language, symbology)) {
  const { x, y, width, height, title, rows } = prepared;
  return `<g class="vrl-legend" aria-label="${svgAttribute(title)}">
    <rect x="${svgAttribute(x)}" y="${svgAttribute(y)}" width="${svgAttribute(width)}" height="${svgAttribute(height)}" rx="4" fill="${svgPaint(theme.panel)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1"/>
    <text x="${svgAttribute(x + 14)}" y="${svgAttribute(y + 22)}" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="${svgPaint(theme.text)}">${escapeXml(title)}</text>
    ${rows.map((item) => renderLegendRow(item.row, item.x, item.y, theme, language)).join("")}
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

  return `<text class="vrl-legend-row" x="${svgAttribute(x)}" y="${svgAttribute(y)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(LEGEND_FONT_SIZE)}" fill="${svgPaint(theme.mutedText)}">${escapeXml(row.value)}</text>`;
}

export function renderLegendSymbolRow(entries, x, y, theme) {
  let cursor = x;

  return `<g class="vrl-legend-symbol-row">${entries.map(([code, label]) => {
    const codeText = String(code);
    const labelText = String(label);
    const markup = `<text class="vrl-legend-symbol-entry" x="${svgAttribute(cursor)}" y="${svgAttribute(y)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(LEGEND_FONT_SIZE)}" fill="${svgPaint(theme.mutedText)}">
      <tspan font-weight="800" fill="${svgPaint(theme.text)}">${escapeXml(codeText)}</tspan><tspan> = ${escapeXml(labelText)}</tspan>
    </text>`;
    cursor += estimatedTextWidth(`${codeText} = ${labelText}`, LEGEND_FONT_SIZE) + 20;
    return markup;
  }).join("")}</g>`;
}

export function renderInfoBox(route, layout, theme, language = "en", prepared = prepareInfoBox(route, layout, language)) {
  const { x, y, width, height, lines } = prepared;
  return `<g class="vrl-info-box" aria-label="${svgAttribute(diagramText(language).routeSummary)}">
    <rect x="${svgAttribute(x)}" y="${svgAttribute(y)}" width="${svgAttribute(width)}" height="${svgAttribute(height)}" fill="#86a844" stroke="${svgPaint(theme.routeLine)}" stroke-width="2"/>
    <text x="${svgAttribute(x + width / 2)}" y="${svgAttribute(y + 24)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="900" fill="${svgPaint(theme.text)}">${escapeXml(lines[0])}</text>
    ${lines.slice(1).map((line, index) => `<text x="${svgAttribute(x + width / 2)}" y="${svgAttribute(y + 48 + index * 20)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" fill="${svgPaint(theme.text)}">${escapeXml(line)}</text>`).join("")}
  </g>`;
}

export function renderWaterSegments(layout, theme) {
  return layout.nodes
    .filter((node) => node.element.type === "pool")
    .map((node) => `<path class="vrl-water-run" d="M ${svgAttribute(node.x - 28)} ${svgAttribute(node.y + 4)} C ${svgAttribute(node.x - 10)} ${svgAttribute(node.y + 12)}, ${svgAttribute(node.x + 12)} ${svgAttribute(node.y + 12)}, ${svgAttribute(node.x + 34)} ${svgAttribute(node.y + 2)}" fill="none" stroke="${svgPaint(theme.water)}" stroke-width="6" stroke-linecap="round"/>`)
    .join("");
}

export function renderRouteSegments(layout, theme, language = "en") {
  if (!Array.isArray(layout.segments)) {
    throw new TypeError("Route rendering requires layout.segments; recompute the layout with computeVerticalLayout.");
  }
  return layout.segments.map((segment) => renderRouteSegment(segment, theme, language)).join("");
}

function renderRouteSegment(segment, theme, language) {
  if (segment.element === null) return renderConnectionSegment(segment, theme);
  if ((segment.element.attributes.shape ?? "ladder") === "ladder") {
    return renderDropLadderSegment(segment.start, segment.end, theme, segment.element, language, segment);
  }
  return renderDirectTechnicalSegment(segment.start, segment.end, theme, segment.element, segment, language);
}

function renderConnectionSegment(segment, theme) {
  const path = routeSegmentPath(segment.start, segment.end, segment.start.element);
  return `<path class="vrl-route-segment" d="${svgAttribute(path)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export function renderDropLadderSegment(previous, node, theme, element = previous.element, language = "en", layout = null) {
  return renderTechnicalSegment(previous, node, theme, element, language, layout, "ladder");
}

export function renderDirectTechnicalSegment(previous, node, theme, element = previous.element, layout = null, language = "en") {
  return renderTechnicalSegment(previous, node, theme, element, language, layout, "direct");
}

function renderTechnicalSegment(previous, node, theme, element, language, layout, shape) {
  const geometry = dropLadderGeometry(previous, node, element, layout);
  const decorations = [
    shape === "ladder" ? renderDropRungs(geometry, theme) : "",
    renderRappelStageMarkers(geometry, element, theme),
    renderRedirectionMarkers(geometry, element, theme, language)
  ].join("\n    ");
  return renderTechnicalSegmentMarkup(geometry, theme, shape, decorations);
}

function renderTechnicalSegmentMarkup(geometry, theme, shape, decorations) {
  return `<g class="vrl-drop-${svgAttribute(shape)}">
    <path class="vrl-route-segment vrl-drop-lead" d="M ${svgAttribute(geometry.startX)} ${svgAttribute(geometry.startY)} L ${svgAttribute(geometry.dropX)} ${svgAttribute(geometry.startY)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="vrl-route-segment vrl-drop-slope" d="M ${svgAttribute(geometry.dropX)} ${svgAttribute(geometry.startY)} L ${svgAttribute(geometry.bottomX)} ${svgAttribute(geometry.bottomY)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#vrl-arrow)"/>
    ${decorations}
    <path class="vrl-route-segment vrl-drop-exit" d="M ${svgAttribute(geometry.bottomX)} ${svgAttribute(geometry.bottomY)} L ${svgAttribute(geometry.endX)} ${svgAttribute(geometry.endY)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
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
    return `<line class="vrl-drop-rung" x1="${svgAttribute(x1)}" y1="${svgAttribute(y1)}" x2="${svgAttribute(x2)}" y2="${svgAttribute(y2)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.5" stroke-linecap="round"/>`;
  }).join("");
}

export function renderRappelStageMarkers(geometry, element, theme) {
  return stagePlacements(geometry, element).map((item) => {
    const boundary = item.boundaryRatio === null ? "" : renderStageBoundary(geometry, item.boundaryRatio, theme);
    return `${boundary}<text class="vrl-rappel-stage-label" x="${svgAttribute(item.x)}" y="${svgAttribute(item.y)}" text-anchor="${svgAttribute(item.anchor)}" font-family="system-ui, sans-serif" font-size="9" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(item.text)}</text>`;
  }).join("");
}

export function renderStageBoundary(geometry, ratio, theme) {
  const point = technicalLinePoint(geometry, ratio);
  return `<line class="vrl-rappel-stage-boundary" x1="${svgAttribute(point.x - 8)}" y1="${svgAttribute(point.y)}" x2="${svgAttribute(point.x + 8)}" y2="${svgAttribute(point.y)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.5" stroke-linecap="round"/>`;
}

export function renderRedirectionMarkers(geometry, element, theme, language = "en") {
  const text = diagramText(language);
  return redirectionPlacements(geometry, element, language).map(({ point, x, y, text: label, anchor }) => {
    return `<g class="vrl-redirection-anchor" aria-label="${svgAttribute(text.redirectionAnchor)} ${svgAttribute(label)}">
      <path d="M ${svgAttribute(point.x)} ${svgAttribute(point.y - 6)} L ${svgAttribute(point.x + 6)} ${svgAttribute(point.y)} L ${svgAttribute(point.x)} ${svgAttribute(point.y + 6)} L ${svgAttribute(point.x - 6)} ${svgAttribute(point.y)} Z" fill="${svgPaint(theme.panel)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.4"/>
      <text x="${svgAttribute(x)}" y="${svgAttribute(y)}" text-anchor="${svgAttribute(anchor)}" font-family="system-ui, sans-serif" font-size="8" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(label)}</text>
    </g>`;
  }).join("");
}

export function renderSegmentLabels(layout, theme) {
  return layout.nodes.slice(1).map((node, index) => {
    const previous = layout.nodes[index];
    const label = segmentLabel(previous, node);

    if (label === "") {
      return "";
    }

    const position = segmentLabelPosition(previous, node);
    return `<text class="vrl-segment-label" x="${svgAttribute(position.x)}" y="${svgAttribute(position.y)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(label)}</text>`;
  }).join("");
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

  return `<g class="vrl-station-tick vrl-station-tick-clearance" stroke="${svgPaint(theme.panel)}" stroke-width="5" stroke-linecap="round">
      <line x1="${svgAttribute(lineA.x1)}" y1="${svgAttribute(lineA.y1)}" x2="${svgAttribute(lineA.x2)}" y2="${svgAttribute(lineA.y2)}"/>
      <line x1="${svgAttribute(lineB.x1)}" y1="${svgAttribute(lineB.y1)}" x2="${svgAttribute(lineB.x2)}" y2="${svgAttribute(lineB.y2)}"/>
    </g><g class="vrl-station-tick" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.5" stroke-linecap="round">
      <line x1="${svgAttribute(lineA.x1)}" y1="${svgAttribute(lineA.y1)}" x2="${svgAttribute(lineA.x2)}" y2="${svgAttribute(lineA.y2)}"/>
      <line x1="${svgAttribute(lineB.x1)}" y1="${svgAttribute(lineB.y1)}" x2="${svgAttribute(lineB.x2)}" y2="${svgAttribute(lineB.y2)}"/>
    </g>`;
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
    : `<text x="${svgAttribute(placement.labelX)}" y="${svgAttribute(placement.titleY)}" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(title)}</text>`;
  const labelLeader = titleLine === "" && detailLine === "" ? "" : renderLabelLeader(node, placement, theme);

  return `<g class="vrl-node vrl-node-${svgAttribute(element.type)}" aria-label="${svgAttribute(formatElementTitle(element, language))}">
    ${anchorMarks}
    ${marker}
    ${labelLeader}
    ${titleLine}
    ${detailLine}
  </g>`;
}

export function renderLabelLeader(node, placement, theme) {
  if (Math.abs(placement.titleY - (node.y - 9)) < 6) {
    return "";
  }

  return `<path class="vrl-label-leader" d="M ${svgAttribute(node.x + 12)} ${svgAttribute(node.y - 2)} L ${svgAttribute(placement.labelX - 8)} ${svgAttribute(placement.titleY - 4)}" fill="none" stroke="${svgPaint(theme.mutedText)}" stroke-width="1" stroke-linecap="round" stroke-dasharray="3 3"/>`;
}

export function renderAnchorMarks(node, element, theme, side = "left", language = "en") {
  const count = anchorMarkCount(element);
  if (count === 0) {
    return "";
  }

  const direction = side === "left" ? -1 : 1;

  return `<g class="vrl-anchor-marks" aria-label="${svgAttribute(count)} ${svgAttribute(anchorLabel(count, language))}">
    ${Array.from({ length: count }, (_, index) => {
      const x = node.x + (direction * (14 + (index * 8)));
      const y = node.y - 24;
      return `<circle cx="${svgAttribute(x)}" cy="${svgAttribute(y)}" r="3" fill="${svgPaint(theme.panel)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.4"/>`;
    }).join("")}
  </g>`;
}

export function renderSymbolMarker(node, element, color, symbology = "federation", panelColor = "#f6f8fa", language = "en") {
  const code = escapeXml(symbolCode(element, symbology));

  if (symbolKind(element) === "snake") {
    return `<g class="vrl-symbol vrl-symbol-snake" aria-label="${svgAttribute(diagramText(language).snakeHazard)}">
      <path class="vrl-symbol-clearance" d="M ${svgAttribute(node.x - 9)} ${svgAttribute(node.y + 8)} C ${svgAttribute(node.x - 2)} ${svgAttribute(node.y - 10)}, ${svgAttribute(node.x + 4)} ${svgAttribute(node.y + 10)}, ${svgAttribute(node.x + 10)} ${svgAttribute(node.y - 8)}" fill="none" stroke="${svgPaint(panelColor)}" stroke-width="7" stroke-linecap="round"/>
      <path d="M ${svgAttribute(node.x - 9)} ${svgAttribute(node.y + 8)} C ${svgAttribute(node.x - 2)} ${svgAttribute(node.y - 10)}, ${svgAttribute(node.x + 4)} ${svgAttribute(node.y + 10)}, ${svgAttribute(node.x + 10)} ${svgAttribute(node.y - 8)}" fill="none" stroke="${svgPaint(color)}" stroke-width="3" stroke-linecap="round"/>
      <text x="${svgAttribute(node.x)}" y="${svgAttribute(node.y + 20)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="${svgPaint(color)}" stroke="${svgPaint(panelColor)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${code}</text>
    </g>`;
  }

  if (symbolKind(element) === "hazard") {
    return `<g class="vrl-symbol vrl-symbol-hazard">
      <path class="vrl-symbol-clearance" d="M ${svgAttribute(node.x)} ${svgAttribute(node.y - 12)} L ${svgAttribute(node.x - 11)} ${svgAttribute(node.y + 11)} L ${svgAttribute(node.x + 11)} ${svgAttribute(node.y + 11)} Z" fill="${svgPaint(panelColor)}" stroke="${svgPaint(panelColor)}" stroke-width="2"/>
      <path d="M ${svgAttribute(node.x)} ${svgAttribute(node.y - 9)} L ${svgAttribute(node.x - 8)} ${svgAttribute(node.y + 8)} L ${svgAttribute(node.x + 8)} ${svgAttribute(node.y + 8)} Z" fill="#d53a2f" stroke="${svgPaint(themeSafeStroke(color))}" stroke-width="1"/>
    </g>`;
  }

  return `<g class="vrl-symbol vrl-symbol-standard">
    <circle class="vrl-symbol-clearance" cx="${svgAttribute(node.x)}" cy="${svgAttribute(node.y)}" r="8" fill="${svgPaint(panelColor)}" stroke="${svgPaint(panelColor)}" stroke-width="2"/>
    <circle cx="${svgAttribute(node.x)}" cy="${svgAttribute(node.y)}" r="4" fill="#8fb04b" stroke="${svgPaint(themeSafeStroke(color))}" stroke-width="1"/>
    <text x="${svgAttribute(node.x)}" y="${svgAttribute(node.y - STANDARD_SYMBOL_CODE_Y_OFFSET)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="${svgPaint(themeSafeStroke(color))}" stroke="${svgPaint(panelColor)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${code}</text>
  </g>`;
}

export function renderDetailLine(detail, x, y, theme, language = "en", maxWidth = Number.POSITIVE_INFINITY, rows = null) {
  assertXmlCharacters(detail);
  if (detail === "") {
    return "";
  }

  const detailRows = rows ?? detailLineRows(detail, maxWidth, language);
  const markup = detailRows.map((row, index) => renderDetailRow(row, x, y + (index * DETAIL_LINE_HEIGHT), theme, language)).join("");

  return `<g class="vrl-detail-line">${markup}</g>`;
}

export function renderLevelBadge(value, x, y, language = "en", category = "level", theme = resolveTheme()) {
  const badge = resolveBadgeValue(value, category, language);

  if (badge === null) {
    return "";
  }

  const label = badge.label;
  const width = levelBadgeWidth(label);
  const style = detailBadgeStyle(badge.category, theme);

  return `<g class="vrl-level-badge vrl-level-badge-${svgAttribute(badge.className)} vrl-detail-badge vrl-detail-badge-${svgAttribute(badge.category)}">
    <rect x="${svgAttribute(x)}" y="${svgAttribute(y - 12)}" width="${svgAttribute(width)}" height="14" rx="3" fill="${svgPaint(style.fill)}"/>
    <text x="${svgAttribute(x + Math.round(width / 2))}" y="${svgAttribute(y - 3)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="800" fill="${svgPaint(style.text)}">${escapeXml(label)}</text>
  </g>`;
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

function renderPlainDetailText(value, x, y, theme, fontSize, strokeWidth = 3) {
  return `<text x="${svgAttribute(x)}" y="${svgAttribute(y)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(fontSize)}" fill="${svgPaint(theme.mutedText)}" stroke="${svgPaint(theme.panel)}" stroke-width="${svgAttribute(strokeWidth)}" stroke-linejoin="round" paint-order="stroke">${escapeXml(value)}</text>`;
}

function renderLevelBadges(values, x, y, language = "en", category = "level", theme = resolveTheme()) {
  let cursor = x;

  return values.map((value) => {
    const badge = renderLevelBadge(value, cursor, y, language, category, theme);
    cursor += detailBadgeWidth(value, category, language) + 4;
    return badge;
  }).join("");
}
