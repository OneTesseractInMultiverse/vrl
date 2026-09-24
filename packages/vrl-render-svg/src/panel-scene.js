import { diagramText } from "./locale.js";
import { bounds, textEnvelopeWidth } from "./scene-bounds.js";
import { legendSymbolRows, elevationSummary, estimatedTextWidth, detailBadgeListWidth, detailBadgeWidth, LEGEND_FONT_SIZE } from "./presentation.js";
import { placePlainText, prepareLevelBadge } from "./detail-layout.js";

export function prepareInfoBox(route, layout, language, y = 26) {
  const text = diagramText(language);
  const metadata = { ...route.extensions, ...route.metadata };
  const lines = [String(route.name).toUpperCase(), `${text.difficulty}: ${metadata.difficulty ?? text.noData}`,
    `${text.elevationChange}: ${elevationSummary(layout.elevation, language)}`,
    `${text.region}: ${metadata.region ?? text.noData}`, `${text.country}: ${metadata.country ?? text.noData}`];
  const width = Math.max(240, lines.reduce((max, value, index) => Math.max(max, textEnvelopeWidth(value, index === 0 ? 14 : 12) + 28), 0));
  const x = Math.max(24, layout.width - width - 42);
  return placeInfoBox({ x, y, width, height: 122, lines, bounds: bounds(x, y, x + width, y + 122, 3) }, language);
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
  return placeLegend({ x, y, width, height: 124, title: text.legendTitle, rows: placedRows, bounds: bounds(x, y, x + width, y + 124, 3) }, language);
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

function infoTextLines(lines, x, y, width) {
  return lines.map((text, index) => ({ text, x: x + width / 2, y: index === 0 ? y + 24 : y + 48 + (index - 1) * 20,
    fontSize: index === 0 ? 14 : 12, heading: index === 0 }));
}

export function prepareLegendRow(row, x, y, language) {
  if (row.kind === "symbols") return { kind: "symbols", entries: legendSymbolPlacements(row.entries, x, y) };
  if (row.kind === "badges") {
    const label = `${row.label}:`;
    const badgeX = x + estimatedTextWidth(label, LEGEND_FONT_SIZE) + 5;
    return { kind: "badges", label: placePlainText(label, x, y, LEGEND_FONT_SIZE),
      badges: legendBadgePlacements(row.values, badgeX, y - 1, language, row.category),
      description: row.description === undefined ? null : placePlainText(` ${row.description}`, badgeX + detailBadgeListWidth(row.values, row.category, language), y, LEGEND_FONT_SIZE) };
  }
  return { kind: "text", text: row.value, x, y, fontSize: LEGEND_FONT_SIZE };
}

export function legendSymbolPlacements(entries, x, y) {
  let cursor = x;
  return entries.map(([code, label]) => {
    const item = { code: String(code), label: String(label), x: cursor, y, fontSize: LEGEND_FONT_SIZE };
    cursor += estimatedTextWidth(`${item.code} = ${item.label}`, LEGEND_FONT_SIZE) + 20;
    return item;
  });
}

function legendBadgePlacements(values, x, y, language, category) {
  let cursor = x;
  return values.map((value) => {
    const badge = prepareLevelBadge(value, cursor, y, language, category);
    cursor += detailBadgeWidth(value, category, language) + 4;
    return badge;
  });
}

/** Complete historical panel records at the public helper boundary. */
export function placeInfoBox(info, language) {
  return { ...info, label: diagramText(language).routeSummary, textLines: infoTextLines(info.lines, info.x, info.y, info.width) };
}

export function placeLegend(legend, language) {
  return { ...legend, titleX: legend.x + 14, titleY: legend.y + 22,
    drawingRows: legend.rows.map((item) => prepareLegendRow(item.row, item.x, item.y, language)) };
}
