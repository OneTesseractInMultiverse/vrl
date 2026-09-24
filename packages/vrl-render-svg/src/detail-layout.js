import { plainDetail } from "./detail-content.js";
import {
  DETAIL_FONT_SIZE, DETAIL_LINE_HEIGHT, DETAIL_SEPARATOR_GAP,
  detailBadgePart, resolveBadgeValue, estimatedTextWidth, levelBadgeWidth, wrapPlainDetailPart
} from "./presentation.js";

/** Only the historical string API interprets formatted labels. */
export function legacyDetailRecord(part, language) {
  const tagged = detailBadgePart(part, language);
  return tagged === null ? plainDetail(part) : { kind: "badge", ...tagged, ...resolveBadgeValue(tagged.value, tagged.category, language) };
}

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

function wrapRecord(record, maxWidth) {
  return record.kind === "badge" || recordWidth(record) <= maxWidth
    ? [record] : wrapPlainDetailPart(record.text, maxWidth).map(plainDetail);
}

function recordRowWidth(records) {
  return records.reduce((width, record, index) => width + recordWidth(record) + (index === 0 ? 0 : separatorWidth()), 0);
}

function recordWidth(record) {
  return record.kind === "text" ? estimatedTextWidth(record.text, DETAIL_FONT_SIZE)
    : estimatedTextWidth(record.prefix, DETAIL_FONT_SIZE) + levelBadgeWidth(record.label);
}

function separatorWidth() {
  return estimatedTextWidth(" / ", DETAIL_FONT_SIZE) + DETAIL_SEPARATOR_GAP * 2;
}

export function placeDetailRows(rows, x, y) {
  return rows.map((row, index) => placeDetailRow(row, x, y + index * DETAIL_LINE_HEIGHT));
}

function placeDetailRow(row, x, y) {
  let cursor = x;
  return row.flatMap((record, index) => {
    const separator = index === 0 ? [] : [placePlainText(" / ", cursor + DETAIL_SEPARATOR_GAP, y, DETAIL_FONT_SIZE, 1)];
    if (index > 0) cursor += separatorWidth();
    const items = placeDetailRecord(record, cursor, y);
    cursor += recordWidth(record);
    return [...separator, ...items];
  });
}

function placeDetailRecord(record, x, y) {
  if (record.kind === "text") return [placePlainText(record.text, x, y, DETAIL_FONT_SIZE)];
  const prefix = record.prefix === "" ? [] : [placePlainText(record.prefix, x, y, DETAIL_FONT_SIZE)];
  return [...prefix, placeBadge(record, x + estimatedTextWidth(record.prefix, DETAIL_FONT_SIZE), y)];
}

export function placePlainText(text, x, y, fontSize, strokeWidth = 3) {
  return { kind: "text", text, x, y, fontSize, strokeWidth };
}

export function placeBadge(badge, x, y) {
  const width = levelBadgeWidth(badge.label);
  return { ...badge, kind: "badge", x, y: y - 12, width, height: 14,
    textX: x + Math.round(width / 2), textY: y - 3 };
}

export function prepareLevelBadge(value, x, y, language, category) {
  const badge = resolveBadgeValue(value, category, language);
  return badge === null ? null : placeBadge(badge, x, y);
}
