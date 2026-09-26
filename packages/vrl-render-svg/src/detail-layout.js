import { plainDetail } from "./detail-content.js";
import {
  DETAIL_FONT_SIZE, DETAIL_LINE_HEIGHT, DETAIL_SEPARATOR_GAP,
  detailBadgePart, resolveBadgeValue, estimatedTextWidth, levelBadgeWidth, wrapPlainDetailPart
} from "./presentation.js";

/**
 * Interpret historical formatted detail strings as badges when recognized; typed records bypass this
 * compatibility parsing. Only the historical string API interprets formatted labels.
 * @responsibility computation
 * @param {unknown} part - One text, path-template or color-channel part interpreted by this helper.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */

export function legacyDetailRecord(part, language) {
  const tagged = detailBadgePart(part, language);
  return tagged === null ? plainDetail(part) : { kind: "badge", ...tagged, ...resolveBadgeValue(tagged.value, tagged.category, language) };
}

/**
 * Wrap typed text records into width-bounded rows while keeping badges indivisible and preserving their
 * meaning.
 * @responsibility computation
 * @param {Array} records - Typed detail records in display order.
 * @param {number} maxWidth - Available text width in drawing units; compatible helpers accept Infinity for no wrapping.
 * @returns {unknown} The rows value selected or validated above.
 */
export function detailRecordRows(records, maxWidth) {
  const rows = [];
  let current = [];
  for (const record of records) {
    const parts = wrapRecord(record, maxWidth);
    if (parts.length > 1 && current.length > 0) { rows.push(current); current = []; }
    for (const [index, part] of parts.entries()) {
      if (current.length > 0 && (index > 0 || recordRowWidth([...current, part]) > maxWidth)) {
        rows.push(current); current = [];
      }
      current.push(part);
    }
  }
  if (current.length > 0) rows.push(current);
  return rows;
}

/**
 * Keep badge or fitting records intact and split oversized plain text at word boundaries.
 * @responsibility computation
 * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
 * @param {number} maxWidth - Available text width in drawing units; compatible helpers accept Infinity for no wrapping.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function wrapRecord(record, maxWidth) {
  return record.kind === "badge" || recordWidth(record) <= maxWidth
    ? [record] : wrapPlainDetailPart(record.text, maxWidth).map(plainDetail);
}

/**
 * Sum estimated detail widths and inter-record separators in drawing units.
 * @responsibility computation
 * @param {Array} records - Typed detail records in display order.
 * @returns {unknown} The result returned by records.reduce.
 */
function recordRowWidth(records) {
  return records.reduce(/**
   * Compute width + recordWidth(record) + (index === 0 ? 0 : separatorWidth()).
   * @responsibility computation
   * @param {number} width - Available horizontal extent in drawing units.
   * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (width, record, index) => width + recordWidth(record) + (index === 0 ? 0 : separatorWidth()), 0);
}

/**
 * Estimate the width of a typed text record or its prefix plus badge.
 * @responsibility computation
 * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function recordWidth(record) {
  return record.kind === "text" ? estimatedTextWidth(record.text, DETAIL_FONT_SIZE)
    : estimatedTextWidth(record.prefix, DETAIL_FONT_SIZE) + levelBadgeWidth(record.label);
}

/**
 * Compute the drawing width reserved for a detail separator and its surrounding gaps.
 * @responsibility computation
 * @returns {unknown} The result of the documented comparison or calculation.
 */
function separatorWidth() {
  return estimatedTextWidth(" / ", DETAIL_FONT_SIZE) + DETAIL_SEPARATOR_GAP * 2;
}

/**
 * Position each prepared detail row at a fixed line-height increment from the supplied origin.
 * @responsibility computation
 * @param {Array} rows - Prepared detail rows in display order.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @returns {Array} The result returned by rows.map.
 */
export function placeDetailRows(rows, x, y) {
  return rows.map(/**
   * Apply placeDetailRow to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result returned by placeDetailRow.
   */ (row, index) => placeDetailRow(row, x, y + index * DETAIL_LINE_HEIGHT));
}

/**
 * Advance a local horizontal cursor through detail records and explicit separator glyphs.
 * @responsibility computation
 * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @returns {Array} The result returned by row.flatMap.
 */
function placeDetailRow(row, x, y) {
  let cursor = x;
  return row.flatMap(/**
   * Position a detail record and its optional separator, then advance the row's local horizontal cursor.
   * @responsibility computation
   * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Array} The ordered records or values assembled above.
   */ (record, index) => {
    const separator = index === 0 ? [] : [placePlainText(" / ", cursor + DETAIL_SEPARATOR_GAP, y, DETAIL_FONT_SIZE, 1)];
    if (index > 0) cursor += separatorWidth();
    const items = placeDetailRecord(record, cursor, y);
    cursor += recordWidth(record);
    return [...separator, ...items];
  });
}

/**
 * Position plain text or a prefix and badge without interpreting the underlying route facts.
 * @responsibility computation
 * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @returns {Array} The ordered records or values assembled above.
 */
function placeDetailRecord(record, x, y) {
  if (record.kind === "text") return [placePlainText(record.text, x, y, DETAIL_FONT_SIZE)];
  const prefix = record.prefix === "" ? [] : [placePlainText(record.prefix, x, y, DETAIL_FONT_SIZE)];
  return [...prefix, placeBadge(record, x + estimatedTextWidth(record.prefix, DETAIL_FONT_SIZE), y)];
}

/**
 * Construct a positioned text primitive with font size and clearance-stroke width.
 * @responsibility computation
 * @param {unknown} text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {number} fontSize - Text size in drawing units used for width estimation and placement.
 * @param {number} strokeWidth - Clearance stroke width in drawing units; defaults to 3.
 * @returns {Object} A record containing kind, text, x, y, fontSize, strokeWidth.
 */
export function placePlainText(text, x, y, fontSize, strokeWidth = 3) {
  return { kind: "text", text, x, y, fontSize, strokeWidth };
}

/**
 * Position a fixed-height badge rectangle and centered label relative to a text baseline.
 * @responsibility computation
 * @param {unknown} badge - Resolved badge category, label and optional positioned geometry.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @returns {Object} A record containing the supplied fields, kind, x, y, width, height, textX, textY.
 */
export function placeBadge(badge, x, y) {
  const width = levelBadgeWidth(badge.label);
  return { ...badge, kind: "badge", x, y: y - 12, width, height: 14,
    textX: x + Math.round(width / 2), textY: y - 3 };
}

/**
 * Resolve and position a recognized localized badge, returning null for unsupported values.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} category - Badge category selecting supported vocabulary and theme tokens.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function prepareLevelBadge(value, x, y, language, category) {
  const badge = resolveBadgeValue(value, category, language);
  return badge === null ? null : placeBadge(badge, x, y);
}
