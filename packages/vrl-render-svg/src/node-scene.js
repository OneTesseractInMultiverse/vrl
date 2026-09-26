import { scenePath } from "./scene-path.js";
import { softTerrainText } from "./soft-terrain-text.js";
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

/**
 * Prepare nodes in visual order, carrying forward the next free label baseline to avoid overlapping detail
 * blocks.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} symbology - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts; defaults to "classic".
 * @returns {Array} The result returned by nodesInVisualOrder(layout.nodes).map.
 */
export function prepareNodes(layout, language, symbology = "federation", style = "classic") {
  let nextTitleY = null;
  return nodesInVisualOrder(layout.nodes).map(/**
   * Prepare one node at the next available title baseline and carry its occupied detail height forward.
   * @responsibility coordinator
   * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
   * @returns {unknown} The prepared value selected or validated above.
   */ (node) => {
    const prepared = preparePlacedNode(node, nodeLabelPlacement(node, nextTitleY), layout, language, symbology, style);
    const { placement, drawing } = prepared;
    if (drawing.title !== "" || drawing.details.length > 0) nextTitleY = nextLabelTitleY(placement, drawing.details.length);
    return prepared;
  });
}

/**
 * Prepare a node and rewrap labels after each required rightward move until soft-style symbol envelopes are
 * clear.
 * @responsibility coordinator
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} initialPlacement - Initial title/detail coordinates before iterative symbol clearance.
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} symbology - Symbol profile name used for element codes and legend entries.
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts.
 * @returns {Object} A record containing node, placement, title, detail, maxDetailWidth, detailRows, drawing.
 */
function preparePlacedNode(node, initialPlacement, layout, language, symbology, style) {
  let placement = initialPlacement;
  for (;;) {
    const maxDetailWidth = detailLineMaxWidth(layout.width, placement.labelX);
    const drawing = prepareNode(node, symbology, placement, language, { maxDetailWidth, style });
    const clearX = style === "soft-terrain" ? symbolClearanceX(layout.nodes, placement, drawing.details.length) : placement.labelX;
    if (clearX === placement.labelX) return { node, placement, title: drawing.title, detail: drawing.detail, maxDetailWidth,
      detailRows: drawing.detailRecords.map(/**
       * Apply row.map to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
       * @returns {Array} The result returned by row.map.
       */ row => row.map(detailRecordText)), drawing };
    placement = { ...placement, labelX: clearX };
  }
}

/**
 * Find the rightmost symbol envelope intersecting a label block's vertical extent; labels only move right.
 * Move only right; each iteration clears another finite symbol envelope before rewrapping.
 * @responsibility computation
 * @param {Array} nodes - Prepared or positioned route nodes retaining their element ownership and drawing coordinates.
 * @param {Object} placement - Prepared coordinates for a node label, symbol, anchor group or panel.
 * @param {number} rowCount - Number of occupied detail rows.
 * @returns {unknown} The result returned by nodes.reduce.
 */

function symbolClearanceX(nodes, placement, rowCount) {
  const top = placement.titleY - 20;
  const bottom = nextLabelTitleY(placement, rowCount);
  return nodes.reduce(/**
   * Retain the current label x unless this node's symbol intersects its vertical extent, then move beyond the
   * symbol's right edge.
   * @responsibility computation
   * @param {number} x - Horizontal position in SVG drawing units.
   * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (x, node) => node.y + 32 < top || node.y - 32 > bottom ? x : Math.max(x, node.x + 44), placement.labelX);
}

/**
 * Assemble title, typed details, leader, symbol and anchor placements into one renderer-owned drawing record.
 * @responsibility coordinator
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {string} symbology - Symbol profile name used for element codes and legend entries.
 * @param {Object} placement - Prepared coordinates for a node label, symbol, anchor group or panel.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {Object} options - Internal node overrides: style, title, detail/detailRows, maxDetailWidth or prepared drawing where supported.
 * @returns {Object} A record containing type, colorToken, label, title, titleX, titleY, detail, detailRecords, details, leader, marker, anchors.
 */
export function prepareNode(node, symbology, placement, language, options) {
  const title = options.title ?? defaultNodeTitle(node.element, language, options.style);
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

/**
 * Choose the topo title and explicitly label missing downclimb height in soft style.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function defaultNodeTitle(element, language, style) {
  return style === "soft-terrain" && element.type === "downclimb" && element.attributes.height === undefined
    ? `${element.id}, ${softTerrainText(language).heightUnknown}` : formatTopoLabel(element, language);
}

/**
 * Resolve legacy overrides or typed detail records and delegate wrapping while retaining the original readable
 * text.
 * @responsibility coordinator
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {Object} options - Internal node overrides: style, title, detail/detailRows, maxDetailWidth or prepared drawing where supported.
 * @returns {Object} A record containing text, rows.
 */
function prepareNodeDetails(node, language, options) {
  if (options.detail != null || options.detailRows != null) {
    const text = options.detail ?? formatTopoDetail(node.element, node, language);
    return { text, rows: text === "" ? [] : (options.detailRows ?? detailLineRows(text, options.maxDetailWidth, language))
      .map(/**
       * Apply row.map to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
       * @returns {Array} The result returned by row.map.
       */ (row) => row.map(/**
       * Apply legacyDetailRecord to the supplied arguments; retain the callee's return and failure behavior.
       * @responsibility computation
       * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
       * @returns {unknown} The result returned by legacyDetailRecord.
       */ (part) => legacyDetailRecord(part, language))) };
  }
  const records = detailRecordsForElement(node.element, node, language, options.style);
  return { text: records.map(detailRecordText).join(" / "), rows: detailRecordRows(records, options.maxDetailWidth ?? Infinity) };
}

/**
 * Connect a displaced label to its owning node; return null when the label remains near its natural position.
 * @responsibility computation
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} placement - Prepared coordinates for a node label, symbol, anchor group or panel.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function labelLeaderPath(node, placement) {
  return Math.abs(placement.titleY - (node.y - 9)) < 6 ? null
    : scenePath`M ${node.x + 12} ${node.y - 2} L ${placement.labelX - 8} ${placement.titleY - 4}`;
}

/**
 * Combine anchor coordinates and accessible quantity text, returning null for absent counts.
 * @responsibility computation
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} side - Declared left/right station or redirection side.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function prepareAnchorMarks(node, element, side, language) {
  const placement = anchorMarkPlacements(node, element, side);
  return placement.count === 0 ? null : { ...placement, label: anchorSummary(element, language) };
}

/**
 * Compute the chosen ordinary, hazard or snake symbol's geometry and text positions from the node.
 * @responsibility computation
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} symbology - Symbol profile name used for element codes and legend entries.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {Object} A record containing kind, code, label, path, textX, textY. A record containing kind, clearancePath, path. A record containing kind, code, x, y, textX, textY.
 */
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
