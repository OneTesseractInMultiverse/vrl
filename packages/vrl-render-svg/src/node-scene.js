import { scenePath } from "./scene-path.js";
import { anchorMarkPlacements, anchorSummary } from "./anchor-presentation.js";
import { detailRecordsForElement, detailRecordText } from "./detail-content.js";
import { detailRecordRows, placeDetailRows, legacyDetailRecord } from "./detail-layout.js";
import { elementColorToken, formatElementTitle } from "./element-formatters.js";
import { diagramText } from "./locale.js";
import { symbolCode, symbolKind } from "./symbol-registry.js";
import {
  nodesInVisualOrder, nodeLabelPlacement, formatTopoLabel, formatTopoDetail, detailLineMaxWidth, nextLabelTitleY,
  detailLineRows, STANDARD_SYMBOL_CODE_Y_OFFSET
} from "./presentation.js";

export function prepareNodes(layout, language, symbology = "federation") {
  let nextTitleY = null;
  return nodesInVisualOrder(layout.nodes).map((node) => {
    const placement = nodeLabelPlacement(node, nextTitleY);
    const maxDetailWidth = detailLineMaxWidth(layout.width, placement.labelX);
    const drawing = prepareNode(node, symbology, placement, language, { maxDetailWidth });
    if (drawing.title !== "" || drawing.details.length > 0) nextTitleY = nextLabelTitleY(placement, drawing.details.length);
    return { node, placement, title: drawing.title, detail: drawing.detail, maxDetailWidth,
      detailRows: drawing.detailRecords.map((row) => row.map(detailRecordText)), drawing };
  });
}

export function prepareNode(node, symbology, placement, language, options) {
  const title = options.title ?? formatTopoLabel(node.element, language);
  const details = prepareNodeDetails(node, language, options);
  const records = details.rows;
  return { type: node.element.type, colorToken: elementColorToken(node.element),
    label: formatElementTitle(node.element, language), title, titleX: placement.labelX, titleY: placement.titleY,
    detail: details.text,
    detailRecords: records, details: placeDetailRows(records, placement.labelX, placement.detailY),
    leader: title === "" && records.length === 0 ? null : labelLeaderPath(node, placement),
    marker: symbolPlacement(node, node.element, symbology, language),
    anchors: prepareAnchorMarks(node, node.element, "left", language) };
}

function prepareNodeDetails(node, language, options) {
  if (options.detail != null || options.detailRows != null) {
    const text = options.detail ?? formatTopoDetail(node.element, node, language);
    return { text, rows: text === "" ? [] : (options.detailRows ?? detailLineRows(text, options.maxDetailWidth, language))
      .map((row) => row.map((part) => legacyDetailRecord(part, language))) };
  }
  const records = detailRecordsForElement(node.element, node, language);
  return { text: records.map(detailRecordText).join(" / "), rows: detailRecordRows(records, options.maxDetailWidth ?? Infinity) };
}

export function labelLeaderPath(node, placement) {
  return Math.abs(placement.titleY - (node.y - 9)) < 6 ? null
    : scenePath`M ${node.x + 12} ${node.y - 2} L ${placement.labelX - 8} ${placement.titleY - 4}`;
}

export function prepareAnchorMarks(node, element, side, language) {
  const placement = anchorMarkPlacements(node, element, side);
  return placement.count === 0 ? null : { ...placement, label: anchorSummary(element, language) };
}

export function symbolPlacement(node, element, symbology, language) {
  const code = symbolCode(element, symbology);
  const kind = symbolKind(element);
  if (kind === "snake") return { kind, code, label: diagramText(language).snakeHazard,
    path: scenePath`M ${node.x - 9} ${node.y + 8} C ${node.x - 2} ${node.y - 10}, ${node.x + 4} ${node.y + 10}, ${node.x + 10} ${node.y - 8}`,
    textX: node.x, textY: node.y + 20 };
  if (kind === "hazard") return { kind,
    clearancePath: scenePath`M ${node.x} ${node.y - 12} L ${node.x - 11} ${node.y + 11} L ${node.x + 11} ${node.y + 11} Z`,
    path: scenePath`M ${node.x} ${node.y - 9} L ${node.x - 8} ${node.y + 8} L ${node.x + 8} ${node.y + 8} Z` };
  return { kind: "standard", code, x: node.x, y: node.y, textX: node.x, textY: node.y - STANDARD_SYMBOL_CODE_Y_OFFSET };
}
