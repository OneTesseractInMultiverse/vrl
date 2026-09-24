import { assertXmlCharacters, escapeXml } from "./xml.js";
import { svgAttribute, svgPaint } from "./attributes.js";
import { detailBadgeStyle, themeSafeStroke } from "./badge-style.js";

// Serialization consumes placed records. It never receives route/layout inputs or a locale.

export function serializeTopoScene(scene, theme) {
  const { viewBox } = scene;
  const terrainProfile = serializeTerrain(scene.terrainPath, theme);
  const nodes = scene.nodes.map((item) => serializeNode(item.drawing, theme)).join("");
  const waterSegments = serializeWaterSegments(scene.waterPaths, theme);
  const routeSegments = serializeRouteSegments(scene.segments, theme);
  const segmentLabels = serializeSegmentLabels(scene.segmentLabels, theme);
  const stationTicks = scene.stationTicks.map((item) => serializeStationTick(item, theme)).join("");
  const infoBox = serializeInfoBox(scene.infoBox, theme);
  const legend = scene.legend === null ? "" : serializeLegend(scene.legend, theme);
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="${svgAttribute(viewBox.x)} ${svgAttribute(viewBox.y)} ${svgAttribute(viewBox.width)} ${svgAttribute(viewBox.height)}" width="${svgAttribute(viewBox.width)}" height="${svgAttribute(viewBox.height)}" style="max-width: 100%; height: auto;">
  <title>${escapeXml(scene.title)}</title>
  <desc>${escapeXml(scene.description)}</desc>
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

export function serializeTerrain(path, theme) {
  return `<path class="vrl-terrain-profile" d="${svgAttribute(path)}" fill="${svgPaint(theme.terrain)}"/>`;
}

export function serializeLegend({ x, y, width, height, title, titleX, titleY, drawingRows }, theme) {
  return `<g class="vrl-legend" aria-label="${svgAttribute(title)}">
    <rect x="${svgAttribute(x)}" y="${svgAttribute(y)}" width="${svgAttribute(width)}" height="${svgAttribute(height)}" rx="4" fill="${svgPaint(theme.panel)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1"/>
    <text x="${svgAttribute(titleX)}" y="${svgAttribute(titleY)}" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="${svgPaint(theme.text)}">${escapeXml(title)}</text>
    ${drawingRows.map((item) => serializeLegendRow(item, theme)).join("")}
  </g>`;
}

export function serializeLegendRow(row, theme) {
  if (row.kind === "symbols") return serializeLegendSymbols(row.entries, theme);
  if (row.kind === "badges") {
    return `${serializePlainText(row.label, theme)}${row.badges.map((badge) => serializeBadge(badge, theme)).join("")}${row.description === null ? "" : serializePlainText(row.description, theme)}`;
  }
  return `<text class="vrl-legend-row" x="${svgAttribute(row.x)}" y="${svgAttribute(row.y)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(row.fontSize)}" fill="${svgPaint(theme.mutedText)}">${escapeXml(row.text)}</text>`;
}

export function serializeLegendSymbols(entries, theme) {
  return `<g class="vrl-legend-symbol-row">${entries.map((item) => `<text class="vrl-legend-symbol-entry" x="${svgAttribute(item.x)}" y="${svgAttribute(item.y)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(item.fontSize)}" fill="${svgPaint(theme.mutedText)}">
      <tspan font-weight="800" fill="${svgPaint(theme.text)}">${escapeXml(item.code)}</tspan><tspan> = ${escapeXml(item.label)}</tspan>
    </text>`).join("")}</g>`;
}

export function serializeInfoBox({ x, y, width, height, label, textLines }, theme) {
  return `<g class="vrl-info-box" aria-label="${svgAttribute(label)}">
    <rect x="${svgAttribute(x)}" y="${svgAttribute(y)}" width="${svgAttribute(width)}" height="${svgAttribute(height)}" fill="#86a844" stroke="${svgPaint(theme.routeLine)}" stroke-width="2"/>
    ${textLines.map((item) => `<text x="${svgAttribute(item.x)}" y="${svgAttribute(item.y)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${svgAttribute(item.fontSize)}"${item.heading ? ' font-weight="900"' : ""} fill="${svgPaint(theme.text)}">${escapeXml(item.text)}</text>`).join("")}
  </g>`;
}

export function serializeWaterSegments(paths, theme) {
  return paths.map((path) => `<path class="vrl-water-run" d="${svgAttribute(path)}" fill="none" stroke="${svgPaint(theme.water)}" stroke-width="6" stroke-linecap="round"/>`).join("");
}

export function serializeRouteSegments(segments, theme) {
  return segments.map((segment) => segment.kind === "connection" ? serializeConnection(segment, theme) : serializeTechnicalSegment(segment, theme)).join("");
}

export function serializeConnection({ path }, theme) {
  return `<path class="vrl-route-segment" d="${svgAttribute(path)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}

export function serializeTechnicalSegment({ shape, paths, rungs, stages, redirections }, theme) {
  const decorations = [serializeRungs(rungs, theme), serializeStages(stages, theme), serializeRedirections(redirections, theme)].join("\n    ");
  return `<g class="vrl-drop-${svgAttribute(shape)}">
    <path class="vrl-route-segment vrl-drop-lead" d="${svgAttribute(paths.lead)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="vrl-route-segment vrl-drop-slope" d="${svgAttribute(paths.slope)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#vrl-arrow)"/>
    ${decorations}
    <path class="vrl-route-segment vrl-drop-exit" d="${svgAttribute(paths.exit)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

export function serializeRungs(rungs, theme) {
  return rungs.map(({ x1, y1, x2, y2 }) => `<line class="vrl-drop-rung" x1="${svgAttribute(x1)}" y1="${svgAttribute(y1)}" x2="${svgAttribute(x2)}" y2="${svgAttribute(y2)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.5" stroke-linecap="round"/>`).join("");
}

export function serializeStages(stages, theme) {
  return stages.map((item) => {
    const boundary = item.boundary === null ? "" : serializeStageBoundary(item.boundary, theme);
    return `${boundary}<text class="vrl-rappel-stage-label" x="${svgAttribute(item.x)}" y="${svgAttribute(item.y)}" text-anchor="${svgAttribute(item.anchor)}" font-family="system-ui, sans-serif" font-size="9" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(item.text)}</text>`;
  }).join("");
}

export function serializeStageBoundary({ x1, y1, x2, y2 }, theme) {
  return `<line class="vrl-rappel-stage-boundary" x1="${svgAttribute(x1)}" y1="${svgAttribute(y1)}" x2="${svgAttribute(x2)}" y2="${svgAttribute(y2)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.5" stroke-linecap="round"/>`;
}

export function serializeRedirections(redirections, theme) {
  return redirections.map(({ path, x, y, text, label, anchor }) => {
    return `<g class="vrl-redirection-anchor" aria-label="${svgAttribute(label)}">
      <path d="${svgAttribute(path)}" fill="${svgPaint(theme.panel)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.4"/>
      <text x="${svgAttribute(x)}" y="${svgAttribute(y)}" text-anchor="${svgAttribute(anchor)}" font-family="system-ui, sans-serif" font-size="8" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text>
    </g>`;
  }).join("");
}

export function serializeSegmentLabels(labels, theme) {
  return labels.map(({ x, y, text }) => `<text class="vrl-segment-label" x="${svgAttribute(x)}" y="${svgAttribute(y)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text>`).join("");
}

export function serializeStationTick([lineA, lineB], theme) {
  return `<g class="vrl-station-tick vrl-station-tick-clearance" stroke="${svgPaint(theme.panel)}" stroke-width="5" stroke-linecap="round">
      <line x1="${svgAttribute(lineA.x1)}" y1="${svgAttribute(lineA.y1)}" x2="${svgAttribute(lineA.x2)}" y2="${svgAttribute(lineA.y2)}"/>
      <line x1="${svgAttribute(lineB.x1)}" y1="${svgAttribute(lineB.y1)}" x2="${svgAttribute(lineB.x2)}" y2="${svgAttribute(lineB.y2)}"/>
    </g><g class="vrl-station-tick" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.5" stroke-linecap="round">
      <line x1="${svgAttribute(lineA.x1)}" y1="${svgAttribute(lineA.y1)}" x2="${svgAttribute(lineA.x2)}" y2="${svgAttribute(lineA.y2)}"/>
      <line x1="${svgAttribute(lineB.x1)}" y1="${svgAttribute(lineB.y1)}" x2="${svgAttribute(lineB.x2)}" y2="${svgAttribute(lineB.y2)}"/>
    </g>`;
}

export function serializeNode(item, theme) {
  assertXmlCharacters(item.detail);
  const marker = serializeSymbol(item.marker, theme[item.colorToken], theme.panel);
  const anchorMarks = serializeAnchorMarks(item.anchors, theme);
  const detailLine = serializeDetails(item.details, theme);
  const titleLine = item.title === "" ? "" : `<text x="${svgAttribute(item.titleX)}" y="${svgAttribute(item.titleY)}" font-family="system-ui, sans-serif" font-size="11" font-weight="700" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(item.title)}</text>`;
  const labelLeader = serializeLabelLeader(item.leader, theme);
  return `<g class="vrl-node vrl-node-${svgAttribute(item.type)}" aria-label="${svgAttribute(item.label)}">
    ${anchorMarks}
    ${marker}
    ${labelLeader}
    ${titleLine}
    ${detailLine}
  </g>`;
}

export function serializeLabelLeader(path, theme) {
  if (path === null) return "";
  return `<path class="vrl-label-leader" d="${svgAttribute(path)}" fill="none" stroke="${svgPaint(theme.mutedText)}" stroke-width="1" stroke-linecap="round" stroke-dasharray="3 3"/>`;
}

export function serializeAnchorMarks(placement, theme) {
  if (placement === null) return "";
  return serializeAnchorMarkGroup(placement, theme);
}

export function serializeAnchorMarkGroup({ marks, overflow, label }, theme) {
  return `<g class="vrl-anchor-marks" aria-label="${svgAttribute(label)}">
    ${marks.map(({ x, y }) => `<circle cx="${svgAttribute(x)}" cy="${svgAttribute(y)}" r="3" fill="${svgPaint(theme.panel)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.4"/>`).join("")}${overflow === null ? "" : serializeAnchorOverflow(overflow, theme)}
  </g>`;
}

export function serializeAnchorOverflow({ text, x, y, fontSize, anchor }, theme) {
  return `<text class="vrl-anchor-overflow" aria-hidden="true" x="${svgAttribute(x)}" y="${svgAttribute(y)}" text-anchor="${svgAttribute(anchor)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(fontSize)}" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text>`;
}

export function serializeSymbol(item, color, panelColor) {
  const code = escapeXml(item.code ?? "");

  if (item.kind === "snake") {
    return `<g class="vrl-symbol vrl-symbol-snake" aria-label="${svgAttribute(item.label)}">
      <path class="vrl-symbol-clearance" d="${svgAttribute(item.path)}" fill="none" stroke="${svgPaint(panelColor)}" stroke-width="7" stroke-linecap="round"/>
      <path d="${svgAttribute(item.path)}" fill="none" stroke="${svgPaint(color)}" stroke-width="3" stroke-linecap="round"/>
      <text x="${svgAttribute(item.textX)}" y="${svgAttribute(item.textY)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="${svgPaint(color)}" stroke="${svgPaint(panelColor)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${code}</text>
    </g>`;
  }

  if (item.kind === "hazard") {
    return `<g class="vrl-symbol vrl-symbol-hazard">
      <path class="vrl-symbol-clearance" d="${svgAttribute(item.clearancePath)}" fill="${svgPaint(panelColor)}" stroke="${svgPaint(panelColor)}" stroke-width="2"/>
      <path d="${svgAttribute(item.path)}" fill="#d53a2f" stroke="${svgPaint(themeSafeStroke(color))}" stroke-width="1"/>
    </g>`;
  }

  return `<g class="vrl-symbol vrl-symbol-standard">
    <circle class="vrl-symbol-clearance" cx="${svgAttribute(item.x)}" cy="${svgAttribute(item.y)}" r="8" fill="${svgPaint(panelColor)}" stroke="${svgPaint(panelColor)}" stroke-width="2"/>
    <circle cx="${svgAttribute(item.x)}" cy="${svgAttribute(item.y)}" r="4" fill="#8fb04b" stroke="${svgPaint(themeSafeStroke(color))}" stroke-width="1"/>
    <text x="${svgAttribute(item.textX)}" y="${svgAttribute(item.textY)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="${svgPaint(themeSafeStroke(color))}" stroke="${svgPaint(panelColor)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${code}</text>
  </g>`;
}

export function serializeDetails(rows, theme) {
  if (rows.length === 0) return "";
  return `<g class="vrl-detail-line">${rows.map((row) => `<g class="vrl-detail-row">${row.map((item) => item.kind === "badge" ? serializeBadge(item, theme) : serializePlainText(item, theme)).join("")}</g>`).join("")}</g>`;
}

export function serializeBadge(badge, theme) {
  if (badge === null) return "";
  const style = detailBadgeStyle(badge.category, theme);
  return `<g class="vrl-level-badge vrl-level-badge-${svgAttribute(badge.className)} vrl-detail-badge vrl-detail-badge-${svgAttribute(badge.category)}">
    <rect x="${svgAttribute(badge.x)}" y="${svgAttribute(badge.y)}" width="${svgAttribute(badge.width)}" height="14" rx="3" fill="${svgPaint(style.fill)}"/>
    <text x="${svgAttribute(badge.textX)}" y="${svgAttribute(badge.textY)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="800" fill="${svgPaint(style.text)}">${escapeXml(badge.label)}</text>
  </g>`;
}

export function serializePlainText({ text, x, y, fontSize, strokeWidth }, theme) {
  return `<text x="${svgAttribute(x)}" y="${svgAttribute(y)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(fontSize)}" fill="${svgPaint(theme.mutedText)}" stroke="${svgPaint(theme.panel)}" stroke-width="${svgAttribute(strokeWidth)}" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text>`;
}
