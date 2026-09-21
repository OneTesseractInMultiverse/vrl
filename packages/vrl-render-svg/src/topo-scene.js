import { anchorMarkPlacements } from "./anchor-presentation.js";
import { diagramText } from "./locale.js";
import { symbolCode } from "./symbol-registry.js";
import { validateRenderLayout, validateRenderOptions } from "./render-options.js";
import { bounds, unionBounds, textBounds, textEnvelopeWidth, fitSceneBounds } from "./scene-bounds.js";
import {
  nodesInVisualOrder, nodeLabelPlacement, formatTopoLabel, formatTopoDetail,
  detailLineMaxWidth, detailLineRows, nextLabelTitleY, detailBadgePart, estimatedTextWidth,
  levelBadgeWidth, detailBadgeListWidth, legendSymbolRows, elevationSummary,
  dropLadderGeometry, technicalLinePoint, technicalLabelDirection, rappelStagesForElement,
  redirectionsForElement, redirectionRatio, redirectionLabel, formatMeters,
  segmentLabel, segmentLabelPosition, resolveRenderLanguage
} from "./presentation.js";

/** Prepare once: fitting and serialization consume the same presentation records. */
export function computeTopoScene(route, layout, options = {}) {
  validateRenderOptions(options);
  validateRenderLayout(layout);
  const language = resolveRenderLanguage(options);
  const nodes = prepareNodes(layout, language);
  const contentBounds = unionBounds([
    terrainBounds(layout), ...nodeBounds(nodes, options.symbology, language),
    ...segmentBounds(layout, language), ...segmentLabelBounds(layout)
  ]);
  const infoBox = prepareInfoBox(route, layout, language, contentBounds.minY - 160);
  const legend = options.legend === false ? null : prepareLegend({ ...layout, height: Math.max(layout.height, contentBounds.maxY + 12) }, language, options.symbology);
  const sceneBounds = unionBounds([contentBounds, infoBox.bounds, ...(legend === null ? [] : [legend.bounds])]);
  return { language, nodes, infoBox, legend, contentBounds, bounds: sceneBounds, viewBox: fitSceneBounds(sceneBounds, layout.width, layout.height) };
}

export function prepareNodes(layout, language) {
  let nextTitleY = null;
  return nodesInVisualOrder(layout.nodes).map((node) => {
    const placement = nodeLabelPlacement(node, nextTitleY);
    const title = formatTopoLabel(node.element, language);
    const detail = formatTopoDetail(node.element, node, language);
    const maxDetailWidth = detailLineMaxWidth(layout.width, placement.labelX);
    const detailRows = detailLineRows(detail, maxDetailWidth, language);
    if (title !== "" || detailRows.length > 0) nextTitleY = nextLabelTitleY(placement, detailRows.length);
    return { node, placement, title, detail, maxDetailWidth, detailRows };
  });
}

function nodeBounds(nodes, symbology, language) {
  return nodes.flatMap(({ node, placement, title, detailRows }) => [
    // Symbols, pool curves, station ticks, anchor marks, and their clearance strokes.
    bounds(node.x - 44, node.y - 32, node.x + 40, node.y + 32),
    textBounds(symbolCode(node.element, symbology), node.x, node.y - 15, 9, "middle"),
    textBounds(title, placement.labelX, placement.titleY, 11),
    ...anchorOverflowBounds(node),
    ...detailRows.map((row, index) => detailRowBounds(row, placement.labelX, placement.detailY + index * 14, language))
  ]);
}

function anchorOverflowBounds(node) {
  const overflow = anchorMarkPlacements(node, node.element).overflow;
  return overflow === null ? [] : [textBounds(overflow.text, overflow.x, overflow.y, overflow.fontSize, overflow.anchor)];
}

function detailRowBounds(parts, x, y, language) {
  let cursor = x;
  return unionBounds(parts.flatMap((part, index) => {
    const items = [];
    if (index > 0) {
      items.push(textBounds(" / ", cursor + 4, y, 10));
      cursor += estimatedTextWidth(" / ", 10) + 8;
    }
    const tagged = detailBadgePart(part, language);
    if (tagged === null) {
      items.push(textBounds(part, cursor, y, 10));
      cursor += estimatedTextWidth(part, 10);
    } else {
      items.push(textBounds(tagged.prefix, cursor, y, 10));
      cursor += estimatedTextWidth(tagged.prefix, 10);
      const width = levelBadgeWidth(tagged.label);
      items.push(bounds(cursor, y - 12, cursor + width, y + 2), textBounds(tagged.label, cursor + Math.round(width / 2), y - 3, 8, "middle"));
      cursor += width;
    }
    return items;
  }));
}

function terrainBounds(layout) {
  const points = layout.points ?? layout.nodes;
  return unionBounds([
    bounds(0, Math.min(0, layout.height - 54), layout.width, layout.height),
    ...points.map((point) => bounds(Math.min(0, point.x - 58), point.y, Math.max(layout.width, point.x + 10), point.y + 54))
  ]);
}

function segmentBounds(layout, language) {
  return layout.segments.flatMap((segment) => {
    if (segment.element === null) {
      return [bounds(Math.min(segment.start.x, segment.end.x) - 16, Math.min(segment.start.y, segment.end.y), Math.max(segment.start.x, segment.end.x) + 16, Math.max(segment.start.y, segment.end.y), 4)];
    }
    const geometry = dropLadderGeometry(segment.start, segment.end, segment.element, segment);
    const shapeBounds = bounds(
      Math.min(geometry.startX, geometry.dropX, geometry.bottomX, geometry.endX),
      Math.min(geometry.startY, geometry.bottomY, geometry.endY),
      Math.max(geometry.startX, geometry.dropX, geometry.bottomX, geometry.endX),
      Math.max(geometry.startY, geometry.bottomY, geometry.endY), 24
    );
    const annotations = [...stagePlacements(geometry, segment.element), ...redirectionPlacements(geometry, segment.element, language)];
    return [shapeBounds, ...annotations.map((item) => textBounds(item.text, item.x, item.y, item.fontSize, item.anchor))];
  });
}

function segmentLabelBounds(layout) {
  return layout.nodes.slice(1).map((node, index) => {
    const previous = layout.nodes[index];
    const position = segmentLabelPosition(previous, node);
    return textBounds(segmentLabel(previous, node), position.x, position.y, 10, "middle");
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
    return { x: point.x + direction * 16, y: point.y - 2, text: formatMeters(stage), fontSize: 9,
      anchor: direction === -1 ? "end" : "start", boundaryRatio: index === stages.length - 1 ? null : cumulative / total };
  });
}

export function redirectionPlacements(geometry, element, language) {
  const direction = -technicalLabelDirection(geometry);
  return redirectionsForElement(element).map((redirection) => {
    const point = technicalLinePoint(geometry, redirectionRatio(redirection, element));
    return { point, x: point.x + direction * 12, y: point.y + 3, text: redirectionLabel(redirection, language), fontSize: 8, anchor: direction === -1 ? "end" : "start" };
  });
}

export function prepareInfoBox(route, layout, language, y = 26) {
  const text = diagramText(language);
  const metadata = route.metadata ?? {};
  const lines = [String(route.name).toUpperCase(), `${text.difficulty}: ${metadata.difficulty ?? text.noData}`,
    `${text.elevationChange}: ${elevationSummary(layout.elevation, language)}`,
    `${text.region}: ${metadata.region ?? text.noData}`, `${text.country}: ${metadata.country ?? text.noData}`];
  const width = Math.max(240, lines.reduce((max, value, index) => Math.max(max, textEnvelopeWidth(value, index === 0 ? 14 : 12) + 28), 0));
  const x = Math.max(24, layout.width - width - 42);
  return { x, y, width, height: 122, lines, bounds: bounds(x, y, x + width, y + 122, 3) };
}

export function prepareLegend(layout, language, symbology) {
  const text = diagramText(language);
  const symbolRows = legendSymbolRows(language, symbology).map((entries) => ({ kind: "symbols", entries }));
  const rows = [
    { kind: "text", value: text.legendRappel },
    { kind: "text", value: text.legendTechnical },
    { kind: "badges", category: "flow", label: text.flow, values: ["dry", "low", "medium", "high"] },
    { kind: "badges", category: "exposure", label: text.exposure, values: ["low", "medium", "high"] },
    { kind: "badges", category: "hazardSeverity", label: text.hazardSeverity, values: ["low", "medium", "high", "critical"] },
    { kind: "badges", category: "inclination", label: text.inclination, values: ["80%"], description: text.inclinationDescription }
  ];
  const firstWidth = Math.max(...rows.slice(0, 3).map((row) => legendRowWidth(row, language)));
  const secondWidth = Math.max(...rows.slice(3).map((row) => legendRowWidth(row, language)));
  const symbolsWidth = Math.max(...symbolRows.map((row) => legendRowWidth(row, language)));
  const width = Math.max(320, layout.width - 48, firstWidth + secondWidth + 52, symbolsWidth + 28, textEnvelopeWidth(text.legendTitle, 12) + 28);
  const x = 24;
  const y = layout.height + 16;
  const placedRows = [
    ...symbolRows.map((row, index) => ({ row, x: x + 14, y: y + 42 + index * 16 })),
    ...rows.map((row, index) => ({ row, x: x + 14 + (index < 3 ? 0 : firstWidth + 24), y: y + 80 + index % 3 * 16 }))
  ];
  return { x, y, width, height: 124, title: text.legendTitle, rows: placedRows, bounds: bounds(x, y, x + width, y + 124, 3) };
}

function legendRowWidth(row, language) {
  if (row.kind === "symbols") {
    let cursor = 0;
    return row.entries.reduce((right, [code, label]) => {
      const value = `${code} = ${label}`;
      const end = cursor + textEnvelopeWidth(value, 9);
      cursor += estimatedTextWidth(value, 9) + 20;
      return Math.max(right, end);
    }, 0);
  }
  if (row.kind === "text") return textEnvelopeWidth(row.value, 9);
  const label = `${row.label}:`;
  const badgeX = estimatedTextWidth(label, 9) + 5;
  const badgeWidth = detailBadgeListWidth(row.values, row.category, language);
  return Math.max(textEnvelopeWidth(label, 9), badgeX + badgeWidth + (row.description === undefined ? 0 : textEnvelopeWidth(` ${row.description}`, 9))) + 12;
}
