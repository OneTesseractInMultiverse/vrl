import { DETAIL_BADGE_TOKENS } from "./badge-style.js";
import { detailRecordsForElement, detailRecordText } from "./detail-content.js";
export { anchorMarkCount, anchorSummary, anchorLabel } from "./anchor-presentation.js";
import { technicalElementIndexesBetween, technicalVerticalMeters } from "@subvertic/vrl-core";
import { formatElementTitle, formatMeasurement } from "./element-formatters.js";
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

/**
 * Apply language, locale and Spanish-profile precedence before resolving the supported output language.
 * @responsibility computation
 * @param {Object} options - Renderer settings: style, theme/tokens, language/locale, symbology, legend and caller-owned idPrefix; defaults to an empty record. Carries renderer configuration or the internal placement overrides consumed below.
 * @returns {string} Supported language key after explicit language, locale and symbol-profile precedence.
 */
export function resolveRenderLanguage(options = {}) {
  return resolveDiagramLanguage(options.language ?? options.locale ?? (options.symbology === "spanish" ? "es" : "en"));
}

/**
 * Return a sorted node copy by y, placing progression nodes before attached annotations on ties.
 * @responsibility computation
 * @param {Array} nodes - Prepared or positioned route nodes retaining their element ownership and drawing coordinates.
 * @returns {Array} The result returned by [...nodes].sort.
 */
export function nodesInVisualOrder(nodes) {
  return [...nodes].sort(/**
   * Compute ordering with left.y - right.y || Number(Object.hasOwn(left, "anchorPointIndex")) -
   * Number(Object.hasOwn(right, "anchorPointIndex")); negative, zero and positive values select the comparison
   * order.
   * @responsibility computation
   * @param {unknown} left - Left comparison record in the requested ordering.
   * @param {unknown} right - Right comparison record, or greatest right extent when reducing geometry.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (left, right) => left.y - right.y
    || Number(Object.hasOwn(left, "anchorPointIndex")) - Number(Object.hasOwn(right, "anchorPointIndex")));
}

/**
 * Return zero when the legend is disabled or the classic legend reservation otherwise.
 * @responsibility computation
 * @param {Object} options - Renderer settings: style, theme/tokens, language/locale, symbology, legend and caller-owned idPrefix; defaults to an empty record. Carries renderer configuration or the internal placement overrides consumed below.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function topoLegendHeight(options = {}) {
  return options.legend === false ? 0 : TOPO_LEGEND_HEIGHT;
}

/**
 * Build two localized legend rows from the selected symbol profile.
 * @responsibility computation
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} symbology - Symbol profile name used for element codes and legend entries; defaults to "federation".
 * @returns {Array} The ordered records or values assembled above.
 */
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

/**
 * Build the classic schematic terrain polygon from positioned route points, including empty-layout fallback
 * geometry.
 * @responsibility computation
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
export function terrainProfilePath(layout) {
  const points = layout.points ?? layout.nodes;
  if (points.length === 0) {
    return `M 0 ${layout.height} L ${layout.width} ${layout.height} L ${layout.width} ${layout.height - 54} L 0 ${layout.height - 34} Z`;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const surface = points.map(/**
   * Format one offset route point as a coordinate pair on the classic terrain surface.
   * @responsibility computation
   * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ (node) => `${node.x + 10} ${node.y + 14}`).join(" L ");

  return `M 0 ${layout.height} L 0 ${first.y + 44} L ${Math.max(0, first.x - 58)} ${first.y + 34} L ${surface} L ${layout.width} ${last.y + 54} L ${layout.width} ${layout.height} Z`;
}

/**
 * Build a schematic connection path between positioned nodes with the technical lead shape when applicable.
 * @responsibility computation
 * @param {Object} previous - Previous positioned route point with x/y and compatible owning element.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} element - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @returns {string} Formatted text retaining the supplied values and ordering.
 */
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

/**
 * Compute technical lead, slope and exit coordinates from direction, inclination and owned pixel delta;
 * constrain horizontal run to available space.
 * @responsibility computation
 * @param {Object} previous - Previous positioned route point with x/y and compatible owning element.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} element - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {Object|null} layout - Owned technical segment with technicalDeltaY, or compatible elevation.pixelsPerMeter scale; null uses endpoint geometry; defaults to null.
 * @returns {Object} A record containing startX, startY, dropX, bottomX, bottomY, endX, endY.
 */
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

/**
 * Resolve the owned technical pixel delta, with compatible elevation-scale and endpoint fallbacks for direct
 * helper callers.
 * @responsibility computation
 * @param {Object} previous - Previous positioned route point with x/y and compatible owning element.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} element - Owning route element with its type, identity and declared attributes; defaults to previous.element.
 * @param {Object|null} layout - Owned technical segment with technicalDeltaY, or compatible elevation.pixelsPerMeter scale; null uses endpoint geometry; defaults to null.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
export function technicalLineVerticalDelta(previous, node, element = previous.element, layout = null) {
  if (layout?.technicalDeltaY === undefined && typeof layout?.elevation?.pixelsPerMeter === "number" && technicalVerticalMeters(element) > 0) {
    // Compatibility for custom callers; compiled rendering uses the positioned segment.
    return (node.y >= previous.y ? 1 : -1) * Math.max(1, Math.round(technicalVerticalMeters(element) * layout.elevation.pixelsPerMeter));
  }
  return layout?.technicalDeltaY ?? node.y - previous.y;
}

/**
 * Interpolate a straight technical line at a ratio clamped to 0.05–0.95 and round to drawing coordinates.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @param {number} ratio - Relative position along a technical path; placement helpers clamp away from endpoints.
 * @returns {Object} A record containing x, y.
 */
export function technicalLinePoint(geometry, ratio) {
  const clamped = Math.max(0.05, Math.min(0.95, ratio));
  const bottomX = geometry.bottomX ?? geometry.dropX;
  const bottomY = technicalBottomY(geometry);

  return {
    x: Math.round(geometry.dropX + ((bottomX - geometry.dropX) * clamped)),
    y: Math.round(geometry.startY + ((bottomY - geometry.startY) * clamped))
  };
}

/**
 * Resolve the technical endpoint y with the legacy endY fallback.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
export function technicalBottomY(geometry) {
  return geometry.bottomY ?? geometry.endY;
}

/**
 * Divide a declared redirection distance by rappel height, using midpoint placement when the compatible input
 * has no height.
 * @responsibility computation
 * @param {unknown} redirection - Typed metric distance and side for one declared redirection.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function redirectionRatio(redirection, element) {
  const height = rappelHeightMeters(element);
  return height === 0 ? 0.5 : redirection.distance.meters / height;
}

/**
 * Select the plural or legacy singular typed redirection list without inventing entries.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The element.attributes.redirections value selected or validated above. The element.attributes.redirection value selected or validated above. The ordered records or values assembled above.
 */
export function redirectionsForElement(element) {
  if (Array.isArray(element.attributes.redirections)) {
    return element.attributes.redirections;
  }

  if (Array.isArray(element.attributes.redirection)) {
    return element.attributes.redirection;
  }

  return [];
}

/**
 * Return supplied typed stages or an empty list when absent.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function rappelStagesForElement(element) {
  return Array.isArray(element.attributes.stages) ? element.attributes.stages : [];
}

/**
 * Read a typed numeric height in meters, returning zero for compatible inputs without one.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The height.meters value selected or validated above. The literal 0 for this branch.
 */
export function rappelHeightMeters(element) {
  const height = element?.attributes?.height;
  if (typeof height === "object" && height !== null && typeof height.meters === "number") {
    return height.meters;
  }

  return 0;
}

/**
 * Format the destination element's declared traverse measurement as connection text.
 * @responsibility computation
 * @param {Object} previous - Previous positioned route point with x/y and compatible owning element.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @returns {unknown} The traverse value selected or validated above.
 */
export function segmentLabel(previous, node) {
  const traverse = formatMeasurement(node.element.attributes.traverse);
  return traverse;
}

/**
 * Place a segment label just above the rounded midpoint of two nodes.
 * @responsibility computation
 * @param {Object} previous - Previous positioned route point with x/y and compatible owning element.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @returns {Object} A record containing x, y.
 */
export function segmentLabelPosition(previous, node) {
  return {
    x: Math.round((previous.x + node.x) / 2),
    y: Math.round((previous.y + node.y) / 2) - 7
  };
}

/**
 * Compute one station marker stroke to the selected side of a node.
 * @responsibility computation
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {unknown} direction - Signed drawing direction or canonical up/down direction selected by the caller.
 * @param {number} offsetY - Vertical station-tick offset in drawing units.
 * @returns {Object} A record containing x1, y1, x2, y2.
 */
export function stationTickLine(node, direction, offsetY) {
  return {
    x1: node.x + (direction * 8),
    y1: node.y - offsetY,
    x2: node.x + (direction * 24),
    y2: node.y - offsetY + 6
  };
}

/**
 * Compute natural label coordinates constrained by the minimum available title baseline.
 * @responsibility computation
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {unknown} minimumTitleY - Optional earliest available title baseline in drawing units; defaults to null.
 * @returns {Object} A record containing labelX, titleY, detailY.
 */
export function nodeLabelPlacement(node, minimumTitleY = null) {
  const naturalTitleY = node.y - 9;
  const titleY = Math.max(naturalTitleY, minimumTitleY ?? naturalTitleY);

  return {
    labelX: node.x + labelOffsetX(node.element),
    titleY,
    detailY: titleY + 18
  };
}

/**
 * Reserve at least 96 drawing units for details after subtracting label offset and right margin.
 * @responsibility computation
 * @param {number} layoutWidth - Nominal drawing width before final content fitting.
 * @param {number} labelX - Horizontal text origin in drawing units.
 * @returns {unknown} The result returned by Math.max.
 */
export function detailLineMaxWidth(layoutWidth, labelX) {
  return Math.max(96, layoutWidth - labelX - 24);
}

/**
 * Compute the first free title baseline after the current title and at least one detail row.
 * @responsibility computation
 * @param {Object} placement - Prepared coordinates for a node label, symbol, anchor group or panel.
 * @param {number} detailRowCount - Number of prepared detail rows below the title.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
export function nextLabelTitleY(placement, detailRowCount) {
  const rows = Math.max(1, detailRowCount);
  return placement.titleY + 18 + (rows * DETAIL_LINE_HEIGHT) + 2;
}

/**
 * Choose boundary labels, technical identity/height text or empty titles for symbol-only element types.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Boundary or technical title, or empty text for symbol-only types.
 */
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

/**
 * Join typed detail records using the historical slash-separated string format.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required; defaults to null.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Typed detail records joined with the legacy slash separator.
 */
export function formatTopoDetail(element, node = null, language = "en") {
  return detailRecordsForElement(element, node, language).map(detailRecordText).join(" / ");
}

/**
 * Wrap the legacy detail string into rows while preserving indivisible badges and supported unbounded-width
 * behavior.
 * @responsibility computation
 * @param {string} detail - Unescaped legacy detail text before wrapping and XML encoding.
 * @param {number} maxWidth - Available text width in drawing units; compatible helpers accept Infinity for no wrapping; defaults to Number.POSITIVE_INFINITY.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {unknown} The ordered records or values assembled above. The rows value selected or validated above.
 */
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

/**
 * Recognize canonical or localized level text and return its canonical level, otherwise null.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {unknown} Null when no matching value or problem exists. The result of the documented comparison or calculation.
 */
export function resolveLevelValue(value, language = "en") {
  if (typeof value !== "string") {
    return null;
  }

  return LEVEL_VALUES.find(/**
   * Evaluate the selection condition value === level || value === localizeDetailValue(level, language).
   * @responsibility computation
   * @param {unknown} level - Canonical diagram level candidate.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (level) => value === level || value === localizeDetailValue(level, language)) ?? null;
}

/**
 * Recognize rappel, downclimb and climb elements as technical directional motion.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
export function needsSegmentArrow(element) {
  return element.type === "rappel" || element.type === "downclimb" || element.type === "climb";
}

/**
 * Resolve the legacy connection's single technical owner; reject ambiguous two-event connections and require
 * canonical segments instead.
 * @responsibility computation
 * @param {Object} previous - Previous positioned route point with x/y and compatible owning element.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function segmentTechnicalElement(previous, node) {
  const elements = [previous.element, node.element];
  const indexes = technicalElementIndexesBetween(elements, 1);
  if (indexes.length > 1) throw new RangeError("This connection contains two technical elements; use layout.segments.");
  return indexes.length === 0 ? null : elements[indexes[0]];
}

/**
 * Read a supplied typed inclination, defaulting to vertical presentation when absent.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The inclination.percent value selected or validated above. The literal 100 for this branch.
 */
export function inclinationPercent(element) {
  const inclination = element?.attributes?.inclination;

  if (typeof inclination === "object" && inclination !== null && typeof inclination.percent === "number") {
    return inclination.percent;
  }

  return 100;
}

/**
 * Choose the title's horizontal clearance for technical, hazard or ordinary symbols.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The literal 74 for this branch. The selected result, including the documented absent-value fallback.
 */
export function labelOffsetX(element) {
  if (needsSegmentArrow(element)) {
    return 74;
  }

  return element.type === "hazard" ? 72 : 28;
}

/**
 * Choose the side opposite the technical line's horizontal run for stage-label placement.
 * @responsibility computation
 * @param {Object} geometry - Prepared technical coordinates in SVG drawing units.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function technicalLabelDirection(geometry) {
  const bottomX = geometry.bottomX ?? geometry.dropX;
  return bottomX >= geometry.dropX ? -1 : 1;
}

/**
 * Format available endpoint elevation change and values, or localized missing-data text.
 * @responsibility computation
 * @param {Object} elevation - Optional resolved endpoint elevation profile with drawing scale.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Declared endpoint change and elevations, or localized missing-data text.
 */
export function elevationSummary(elevation, language = "en") {
  if (elevation === undefined) {
    return diagramText(language).noData;
  }

  return `${elevation.totalChangeMeters}m (${elevation.entranceMeters}m-${elevation.exitMeters}m)`;
}

/**
 * Format a typed measurement's meter value with the m suffix.
 * @responsibility computation
 * @param {unknown} measurement - Typed metric measurement containing a numeric meters value.
 * @returns {string} The measurement's meters value followed by m.
 */
export function formatMeters(measurement) {
  return `${measurement.meters}m`;
}

/**
 * Format a declared redirection distance and optional localized side suffix.
 * @responsibility computation
 * @param {unknown} redirection - Typed metric distance and side for one declared redirection.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Declared metric distance with the recognized localized side abbreviation.
 */
export function redirectionLabel(redirection, language = "en") {
  const side = redirectionSideSuffix(redirection.side, language);
  return side === "" ? formatMeters(redirection.distance) : `${formatMeters(redirection.distance)} ${side}`;
}

/**
 * Map left/right to localized abbreviations and omit unsupported side text.
 * @responsibility computation
 * @param {unknown} side - Declared left/right station or redirection side.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Localized left/right abbreviation, or empty text for other sides.
 */
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

/**
 * Keep fitting text and recognized badges intact; delegate oversized plain-text wrapping.
 * @responsibility computation
 * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
 * @param {number} maxWidth - Available text width in drawing units; compatible helpers accept Infinity for no wrapping.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {unknown} The ordered records or values assembled above. The result returned by wrapPlainDetailPart.
 */
export function wrapDetailPart(part, maxWidth, language = "en") {
  if (detailPartWidth(part, language) <= maxWidth || detailBadgePart(part, language) !== null) {
    return [part];
  }

  return wrapPlainDetailPart(part, maxWidth);
}

/**
 * Greedily wrap words by estimated width without splitting a single word or losing all-whitespace input.
 * @responsibility computation
 * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
 * @param {number} maxWidth - Available text width in drawing units; compatible helpers accept Infinity for no wrapping.
 * @returns {unknown} The ordered records or values assembled above. The rows value selected or validated above.
 */
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

/**
 * Sum legacy detail-part widths and separator spacing in drawing units.
 * @responsibility computation
 * @param {unknown} parts - Ordered text or trusted template parts.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {unknown} The result returned by parts.reduce.
 */
export function detailRowWidth(parts, language = "en") {
  const separatorWidth = estimatedTextWidth(" / ", DETAIL_FONT_SIZE) + (DETAIL_SEPARATOR_GAP * 2);
  return parts.reduce(/**
   * Add a legacy detail part's estimated width and a separator only after the first part.
   * @responsibility computation
   * @param {number} width - Available horizontal extent in drawing units.
   * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (width, part, index) => {
    const prefix = index === 0 ? 0 : separatorWidth;
    return width + prefix + detailPartWidth(part, language);
  }, 0);
}

/**
 * Estimate legacy plain-text width or prefix-plus-badge width after category recognition.
 * @responsibility computation
 * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {unknown} The result returned by estimatedTextWidth. The result of the documented comparison or calculation.
 */
export function detailPartWidth(part, language = "en") {
  const tagged = detailBadgePart(part, language);

  if (tagged === null) {
    return estimatedTextWidth(part, DETAIL_FONT_SIZE);
  }

  return estimatedTextWidth(tagged.prefix, DETAIL_FONT_SIZE) + levelBadgeWidth(tagged.label);
}

/**
 * Interpret the final colon-separated legacy value as a supported badge category without changing literal
 * typed-record handling.
 * @responsibility computation
 * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function detailBadgePart(part, language = "en") {
  const separatorIndex = part.lastIndexOf(": ");
  const prefix = separatorIndex === -1 ? "" : part.slice(0, separatorIndex + 2);
  const categoryLabel = separatorIndex === -1 ? "" : part.slice(0, separatorIndex);
  const value = separatorIndex === -1 ? part : part.slice(separatorIndex + 2);
  const category = detailBadgeCategory(categoryLabel, value, language);
  const badge = category === null ? null : resolveBadgeValue(value, category, language);

  return badge === null ? null : { prefix, value, category: badge.category, label: badge.label };
}

/**
 * Sum badge widths and fixed gaps for a category's displayed values.
 * @responsibility computation
 * @param {Array} values - Ordered values or supplied component props consumed by this operation.
 * @param {string} category - Badge category selecting supported vocabulary and theme tokens.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {unknown} The result returned by values.reduce.
 */
export function detailBadgeListWidth(values, category, language = "en") {
  return values.reduce(/**
   * Compute width + detailBadgeWidth(value, category, language) + 4.
   * @responsibility computation
   * @param {number} width - Available horizontal extent in drawing units.
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (width, value) => width + detailBadgeWidth(value, category, language) + 4, 0);
}

/**
 * Compute the width of a supported localized badge label.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} category - Badge category selecting supported vocabulary and theme tokens.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {unknown} The result returned by levelBadgeWidth.
 */
export function detailBadgeWidth(value, category, language = "en") {
  const badge = resolveBadgeValue(value, category, language);
  return levelBadgeWidth(badge.label);
}

/**
 * Resolve a legacy category label, percentage value or level value to a supported badge category.
 * @responsibility computation
 * @param {string} label - Unescaped display label supplied by the caller.
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {unknown} The category value selected or validated above. The literal "inclination" for this branch. The selected result, including the documented absent-value fallback.
 */
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

/**
 * Normalize a supported inclination or categorical badge into category, CSS class and localized label; return
 * null when unrecognized.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} category - Badge category selecting supported vocabulary and theme tokens.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function resolveBadgeValue(value, category, language = "en") {
  const normalizedCategory = DETAIL_BADGE_TOKENS[category] === undefined ? "level" : category;

  if (normalizedCategory === "inclination") {
    const inclination = resolveInclinationBadgeValue(value);
    return inclination === null ? null : { category: normalizedCategory, className: "inclination", label: inclination };
  }

  const level = resolveLevelValue(value, language);
  return level === null ? null : { category: normalizedCategory, className: level, label: localizeDetailValue(level, language) };
}

/**
 * Recognize unsigned decimal percentage text for badge display without validating domain inclination
 * constraints.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {unknown} Null when no matching value or problem exists. The selected result, including the documented absent-value fallback.
 */
export function resolveInclinationBadgeValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return /^\d+(?:\.\d+)?%$/.test(trimmed) ? trimmed : null;
}

/**
 * Trim and lowercase a legacy detail label for category lookup.
 * @responsibility computation
 * @param {string} label - Unescaped display label supplied by the caller.
 * @returns {unknown} The result returned by label.trim().toLowerCase.
 */
export function normalizeDetailLabel(label) {
  return label.trim().toLowerCase();
}

/**
 * Estimate text advance at 0.56 times font size per UTF-16 unit; this is layout estimation, not browser font
 * measurement.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {number} fontSize - Text size in drawing units used for width estimation and placement.
 * @returns {number} Rounded estimated glyph advance in drawing units.
 */
export function estimatedTextWidth(value, fontSize) {
  return Math.round(value.length * fontSize * 0.56);
}

/**
 * Reserve label-based badge width with a fixed padding and 26-unit minimum.
 * @responsibility computation
 * @param {string} label - Unescaped display label supplied by the caller.
 * @returns {number} Label-derived badge width including padding, never below 26 drawing units.
 */
export function levelBadgeWidth(label) {
  return Math.max(26, Math.round(label.length * 5.4) + 12);
}
