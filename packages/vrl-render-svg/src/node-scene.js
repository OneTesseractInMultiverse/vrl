import { resolveElementIconId } from "@subvertic/vrl-icons/semantics";
import { annotationIconId, annotationClearanceX, placeAnnotationIcon, selectiveSymbols } from "./annotation-icons.js";
import { elementAttribute } from "./route-data.js";
import { scenePath } from "./scene-path.js";
import { softTerrainText } from "./soft-terrain-text.js";
import { anchorMarkPlacements, anchorSummary } from "./anchor-presentation.js";
import { detailRecordsForElement, detailRecordText } from "./detail-content.js";
import { detailRecordRows, placeDetailRows, legacyDetailRecord } from "./detail-layout.js";
import { elementColorToken, formatElementTitle } from "./element-formatters.js";
import { diagramText, localizeDetailValue } from "./locale.js";
import { symbolCode, symbolKind } from "./symbol-registry.js";
import {
  nodesInVisualOrder, nodeLabelPlacement, formatTopoLabel, formatTopoDetail, detailLineMaxWidth, nextLabelTitleY,
  detailLineRows, STANDARD_SYMBOL_CODE_Y_OFFSET
} from "./presentation.js";

/**
 * Prepare default nodes in visual order and selective annotations in source order, carrying forward the next free label baseline to avoid overlapping detail
 * blocks.
 * @responsibility coordinator
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} symbology - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts; defaults to "classic".
 * @param {string} symbols - Symbol presentation; defaults to classic. Annotation and minimal modes reserve identical icon space.
 * @param {Object[]} obstacles - Prepared protected geometry envelopes; defaults to an empty collection.
 * @returns {Array} Owned prepared nodes in the selected visual or source order, retaining canonical element ownership.
 */
export function prepareNodes(layout, language, symbology = "federation", style = "classic", symbols = "classic", obstacles = []) {
  let nextTitleY = null;
  return (selectiveSymbols(symbols) ? layout.nodes : nodesInVisualOrder(layout.nodes)).map(/**
   * Prepare one node at the next available title baseline and carry its occupied detail height forward.
   * @responsibility coordinator
   * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
   * @returns {unknown} The prepared value selected or validated above.
   */ (node) => {
    const prepared = preparePlacedNode(node, nodeLabelPlacement(node, nextTitleY), layout, language, symbology, style, symbols, obstacles);
    const { placement, drawing } = prepared;
    if (drawing.title !== "" || drawing.details.length > 0) nextTitleY = nextLabelTitleY(placement, drawing.details.length);
    return prepared;
  });
}

/**
 * Prepare a node and rewrap labels after each rightward move until symbol envelopes and the selective icon
 * gutter clear protected geometry. Inputs remain unchanged.
 * @responsibility coordinator
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} initialPlacement - Initial title/detail coordinates before iterative symbol clearance.
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} symbology - Symbol profile name used for element codes and legend entries.
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts.
 * @param {string} symbols - Symbol presentation; defaults to classic. Annotation and minimal modes reserve identical icon space.
 * @param {Object[]} obstacles - Prepared protected geometry envelopes; defaults to an empty collection.
 * @returns {Object} A record containing node, placement, title, detail, maxDetailWidth, detailRows, drawing.
 */
function preparePlacedNode(node, initialPlacement, layout, language, symbology, style, symbols, obstacles) {
  let placement = initialPlacement;
  for (;;) {
    const maxDetailWidth = detailLineMaxWidth(layout.width, placement.labelX);
    const drawing = prepareNode(node, symbology, placement, language, { maxDetailWidth, style, symbols });
    const clearX = placedLabelClearanceX(layout.nodes, placement, drawing.details.length, style, symbols, obstacles);
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
  const selective = selectiveSymbols(options.symbols);
  const title = options.title ?? (selective ? annotationTitle(node.element, language) : defaultNodeTitle(node.element, language, options.style));
  const details = prepareNodeDetails(node, language, options);
  const records = details.rows;
  const slot = selective ? placeAnnotationIcon(annotationIconId(node.element), placement, details.anchorRow ?? -1) : null;
  return { type: node.element.type, colorToken: elementColorToken(node.element),
    label: formatElementTitle(node.element, language), title, titleX: placement.labelX, titleY: placement.titleY,
    detail: details.text,
    detailRecords: records, details: placeDetailRows(records, placement.labelX, placement.detailY),
    leader: title === "" && records.length === 0 ? null : labelLeaderPath(node, placement),
    ...(selective ? { annotationSlot: slot, annotationIcon: options.symbols === "annotations" ? slot : null } : {}),
    marker: symbolPlacement(node, node.element, symbology, language, options.symbols),
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
  const width = options.maxDetailWidth ?? Infinity;
  if (selectiveSymbols(options.symbols)) {
    const groups = records.map(/**
     * Wrap one typed detail independently so an anchor pictogram stays beside its explicit anchor text.
     * @responsibility computation
     * @param {Object} record - Typed detail record whose text or badge meaning is preserved.
     * @returns {Array[]} Wrapped rows for this record alone, preserving its semantic ownership.
     */ record => detailRecordRows([record], width));
    return { text: records.map(detailRecordText).join(" / "), rows: groups.flat(),
      anchorRow: node.element.type === "rappel" ? groups[0].length : -1 };
  }
  return { text: records.map(detailRecordText).join(" / "), rows: detailRecordRows(records, width) };
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
 * @param {string} symbols - Symbol presentation; defaults to classic. Annotation and minimal modes reserve identical icon space.
 * @returns {Object} A record containing kind, code, label, path, textX, textY. A record containing kind, clearancePath, path. A record containing kind, code, x, y, textX, textY.
 */
export function symbolPlacement(node, element, symbology, language, symbols = "classic") {
  if (symbols === "icons") {
    const id = resolveElementIconId({ ...element, attributes: { ...element.extensions, ...element.attributes } });
    if (id !== null) return { kind: "icon", id, code: symbolCode(element, symbology), x: node.x, y: node.y, textX: node.x, textY: node.y - 17 };
  }
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

/**
 * Keep pilot icon meanings explicit in text, including access type and structured hazard kind.
 * @responsibility computation
 * @param {Object} element - Normalized route element and its original labels or extensions.
 * @param {string} language - Resolved display language.
 * @returns {string} Full access/hazard label or ordinary technical title; unknown values are retained literally.
 */
function annotationTitle(element, language) {
  if (element.type === "start" || element.type === "exit") return formatElementTitle(element, language);
  if (element.type === "hazard") {
    const kind = elementAttribute(element, "type");
    return `${formatElementTitle(element, language)}${kind === undefined ? "" : `: ${localizeDetailValue(kind, language)}`}`;
  }
  return defaultNodeTitle(element, language, "soft-terrain");
}

/**
 * Compute the required text origin for node symbols and optional full-stroke annotation gutters.
 * @responsibility computation
 * @param {Object[]} nodes - Positioned symbols whose conservative envelopes are protected.
 * @param {Object} placement - Candidate label origin and baselines.
 * @param {number} rowCount - Wrapped detail-row count determining the occupied vertical extent.
 * @param {string} style - Classic or soft-terrain geometry policy.
 * @param {string} symbols - Selected symbol presentation; only selective modes reserve an annotation gutter.
 * @param {Object[]} obstacles - Scene-owned path, text, contour, pool and node envelopes.
 * @returns {number} Monotonic rightward text coordinate satisfying the selected clearance policy.
 */
function placedLabelClearanceX(nodes, placement, rowCount, style, symbols, obstacles) {
  const symbolX = style === "soft-terrain" ? symbolClearanceX(nodes, placement, rowCount) : placement.labelX;
  return selectiveSymbols(symbols)
    ? Math.max(symbolX + (symbolX > placement.labelX ? 32 : 0), annotationClearanceX(obstacles, placement, nextLabelTitleY(placement, rowCount)))
    : symbolX;
}
