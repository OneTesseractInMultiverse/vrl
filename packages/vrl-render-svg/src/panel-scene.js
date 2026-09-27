import { annotationLegendEntries, selectiveSymbols } from "./annotation-icons.js";
import { softTerrainText } from "./soft-terrain-text.js";
import { diagramText } from "./locale.js";
import { bounds, textEnvelopeWidth } from "./scene-bounds.js";
import { legendSymbolRows, elevationSummary, estimatedTextWidth, detailBadgeListWidth, detailBadgeWidth, LEGEND_FONT_SIZE } from "./presentation.js";
import { placePlainText, prepareLevelBadge } from "./detail-layout.js";

/**
 * Prepare localized route-summary text and panel dimensions using current declared summary semantics.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {number} y - Vertical position in SVG drawing units; defaults to 26.
 * @returns {unknown} The result returned by placeInfoBox.
 */
export function prepareInfoBox(route, layout, language, y = 26) {
  const text = diagramText(language);
  const metadata = { ...route.extensions, ...route.metadata };
  const lines = [String(route.name).toUpperCase(), `${text.difficulty}: ${metadata.difficulty ?? text.noData}`,
    `${text.elevationChange}: ${elevationSummary(layout.elevation, language)}`,
    `${text.region}: ${metadata.region ?? text.noData}`, `${text.country}: ${metadata.country ?? text.noData}`];
  const width = Math.max(240, lines.reduce(/**
   * Apply Math.max to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {number} max - Largest extent found so far in drawing units.
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The result returned by Math.max.
   */ (max, value, index) => Math.max(max, textEnvelopeWidth(value, index === 0 ? 14 : 12) + 28), 0));
  const x = Math.max(24, layout.width - width - 42);
  return placeInfoBox({ x, y, width, height: 122, lines, bounds: bounds(x, y, x + width, y + 122, 3) }, language);
}

/**
 * Prepare localized symbol and badge explanations, including the selected style's schematic conventions.
 * @responsibility computation
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} symbology - Symbol profile name used for element codes and legend entries.
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts; defaults to "classic".
 * @param {string} symbols - Symbol presentation; defaults to classic. Annotation and minimal modes reserve identical icon space.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function prepareLegend(layout, language, symbology, style = "classic", symbols = "classic") {
  const text = diagramText(language);
  const symbolRows = legendSymbolRows(language, symbology).map(/**
   * Project kind, entries into the record required by legendSymbolRows(language, symbology).map.
   * @responsibility computation
   * @param {Array} entries - Ordered symbol code/label pairs or positioned legend-symbol records.
   * @returns {Object} A record containing kind, entries.
   */ (entries) => ({ kind: "symbols", entries }));
  const rows = [
    { kind: "text", value: text.legendRappel },
    { kind: "text", value: text.legendTechnical },
    { kind: "badges", category: "flow", label: text.flow, values: ["dry", "low", "medium", "high"] },
    { kind: "badges", category: "exposure", label: text.exposure, values: ["low", "medium", "high"] },
    { kind: "badges", category: "hazardSeverity", label: text.hazardSeverity, values: ["low", "medium", "high", "critical"] },
    { kind: "badges", category: "inclination", label: text.inclination, values: ["80%"], description: text.inclinationDescription }
  ];
  const firstWidth = Math.max(...rows.slice(0, 3).map(/**
   * Apply legendRowWidth to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
   * @returns {unknown} The result returned by legendRowWidth.
   */ (row) => legendRowWidth(row, language)));
  const secondWidth = Math.max(...rows.slice(3).map(/**
   * Apply legendRowWidth to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
   * @returns {unknown} The result returned by legendRowWidth.
   */ (row) => legendRowWidth(row, language)));
  const symbolsWidth = Math.max(...symbolRows.map(/**
   * Apply legendRowWidth to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
   * @returns {unknown} The result returned by legendRowWidth.
   */ (row) => legendRowWidth(row, language)));
  const width = Math.max(320, layout.width - 48, firstWidth + secondWidth + 52, symbolsWidth + 28, textEnvelopeWidth(text.legendTitle, 12) + 28);
  const x = 24;
  const y = layout.height + 16;
  const placedRows = [
    ...symbolRows.map(/**
     * Project row, x, y into the record required by symbolRows.map.
     * @responsibility computation
     * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
     * @param {number} index - Zero-based position in the current ordered collection.
     * @returns {Object} A record containing row, x, y.
     */ (row, index) => ({ row, x: x + 14, y: y + 42 + index * 16 })),
    ...rows.map(/**
     * Project row, x, y into the record required by rows.map.
     * @responsibility computation
     * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
     * @param {number} index - Zero-based position in the current ordered collection.
     * @returns {Object} A record containing row, x, y.
     */ (row, index) => ({ row, x: x + 14 + (index < 3 ? 0 : firstWidth + 24), y: y + 80 + index % 3 * 16 }))
  ];
  const legend = placeLegend({ x, y, width, height: 124, title: text.legendTitle, rows: placedRows, bounds: bounds(x, y, x + width, y + 124, 3) }, language);
  const styled = style === "soft-terrain" ? withStyleNotes(legend, language) : legend;
  return selectiveSymbols(symbols) ? withAnnotationLegend(styled, language, symbols) : styled;
}

/**
 * Estimate a legend row's width from its symbol entries, badge labels or text.
 * @responsibility computation
 * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {unknown} The result returned by row.entries.reduce. The result returned by textEnvelopeWidth. The result of the documented comparison or calculation.
 */
function legendRowWidth(row, language) {
  if (row.kind === "symbols") {
    let cursor = 0;
    return row.entries.reduce(/**
     * Accumulate a conservative right text extent while advancing the local symbol-row cursor by estimated glyph
     * widths.
     * @responsibility computation
     * @param {unknown} right - Right comparison record, or greatest right extent when reducing geometry.
     * @param {Array} input2 - Ordered tuple destructured into the separately documented members below.
     * @param {unknown} input2[0] - Tuple member bound as code: the ordered input consumed below.
     * @param {unknown} input2[1] - Tuple member bound as label: the ordered input consumed below.
     * @returns {unknown} The result returned by Math.max.
     */ (right, [code, label]) => {
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

/**
 * Place summary lines at centered horizontal coordinates with deterministic vertical spacing.
 * @responsibility computation
 * @param {unknown} lines - Ordered source or summary text lines.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {number} width - Available horizontal extent in drawing units.
 * @returns {Array} The result returned by lines.map.
 */
function infoTextLines(lines, x, y, width) {
  return lines.map(/**
   * Project text, x, y, fontSize, heading into the record required by lines.map.
   * @responsibility computation
   * @param {unknown} text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Object} A record containing text, x, y, fontSize, heading.
   */ (text, index) => ({ text, x: x + width / 2, y: index === 0 ? y + 24 : y + 48 + (index - 1) * 20,
    fontSize: index === 0 ? 14 : 12, heading: index === 0 }));
}

/**
 * Convert a legend row into positioned text, symbol or badge drawing records.
 * @responsibility computation
 * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {Object} A record containing kind, entries. A record containing kind, label, badges, description. A record containing kind, text, x, y, fontSize.
 */
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

/**
 * Lay out symbol-code and label pairs in a legend row using estimated text widths.
 * @responsibility computation
 * @param {Array} entries - Ordered symbol code/label pairs or positioned legend-symbol records.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @returns {Array} The result returned by entries.map.
 */
export function legendSymbolPlacements(entries, x, y) {
  let cursor = x;
  return entries.map(/**
   * Place one code/label pair at the current legend cursor and advance it by estimated text width and spacing.
   * @responsibility computation
   * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
   * @param {unknown} input1[0] - Tuple member bound as code: the ordered input consumed below.
   * @param {unknown} input1[1] - Tuple member bound as label: the ordered input consumed below.
   * @returns {unknown} The item value selected or validated above.
   */ ([code, label]) => {
    const item = { code: String(code), label: String(label), x: cursor, y, fontSize: LEGEND_FONT_SIZE };
    cursor += estimatedTextWidth(`${item.code} = ${item.label}`, LEGEND_FONT_SIZE) + 20;
    return item;
  });
}

/**
 * Position localized badge values consecutively with fixed inter-badge gaps.
 * @responsibility computation
 * @param {Array} values - Ordered values or supplied component props consumed by this operation.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} category - Badge category selecting supported vocabulary and theme tokens.
 * @returns {Array} The result returned by values.map.
 */
function legendBadgePlacements(values, x, y, language, category) {
  let cursor = x;
  return values.map(/**
   * Place a localized badge and advance the legend cursor by its width and fixed gap.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @returns {unknown} The badge value selected or validated above.
   */ (value) => {
    const badge = prepareLevelBadge(value, cursor, y, language, category);
    cursor += detailBadgeWidth(value, category, language) + 4;
    return badge;
  });
}

/**
 * Attach final summary-text coordinates to a prepared information panel. Complete historical panel records at
 * the public helper boundary.
 * @responsibility computation
 * @param {unknown} info - Prepared route information panel.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {Object} A record containing the supplied fields, label, textLines.
 */

export function placeInfoBox(info, language) {
  return { ...info, label: diagramText(language).routeSummary, textLines: infoTextLines(info.lines, info.x, info.y, info.width) };
}

/**
 * Attach title and row coordinates to a prepared legend panel.
 * @responsibility computation
 * @param {unknown} legend - Prepared legend panel and row records.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {Object} A record containing the supplied fields, titleX, titleY, drawingRows.
 */
export function placeLegend(legend, language) {
  return { ...legend, titleX: legend.x + 14, titleY: legend.y + 22,
    drawingRows: legend.rows.map(/**
     * Apply prepareLegendRow to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {unknown} The result returned by prepareLegendRow.
     */ (item) => prepareLegendRow(item.row, item.x, item.y, language)) };
}

/**
 * Extend the legend with localized soft-terrain interpretation notes and the space they require.
 * @responsibility computation
 * @param {unknown} legend - Prepared legend panel and row records.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {Object} A record containing the supplied fields, width, height, styleNotes, bounds.
 */
function withStyleNotes(legend, language) {
  const notes = softTerrainText(language).legend;
  const width = notes.reduce(/**
   * Apply Math.max to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {number} maximum - Inclusive numeric channel maximum; percentages use their supported percentage bound.
   * @param {unknown} line - Physical source line or one-based line number, as used by the enclosing scanner.
   * @returns {unknown} The result returned by Math.max.
   */ (maximum, line) => Math.max(maximum, textEnvelopeWidth(line, 9) + 28), legend.width);
  const height = legend.height + 38;
  return { ...legend, width, height,
    styleNotes: notes.map(/**
     * Apply placePlainText to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} line - Physical source line or one-based line number, as used by the enclosing scanner.
     * @param {number} index - Zero-based position in the current ordered collection.
     * @returns {unknown} The result returned by placePlainText.
     */ (line, index) => placePlainText(line, legend.x + 14, legend.y + legend.height + 12 + index * 14, 9, 0)),
    bounds: bounds(legend.x, legend.y, legend.x + width, legend.y + height, 3) };
}

/**
 * Add a two-row pilot key with identical label coordinates and bounds in icon and minimal modes.
 * @responsibility computation
 * @param {Object} legend - Existing prepared legend with owned dimensions and text.
 * @param {string} language - Resolved diagram language.
 * @param {string} symbols - Annotation presentation selecting visible or hidden pictograms.
 * @returns {Object} Expanded owned legend; existing rows and input records are unchanged.
 */
function withAnnotationLegend(legend, language, symbols) {
  const entries = annotationLegendEntries(language);
  const column = Math.max(...entries.map(/**
   * Compute the conservative text-and-icon width required by this legend entry.
   * @responsibility computation
   * @param {Array} entry - Canonical pilot ID and its localized legend label.
   * @returns {number} Required drawing-unit width, including the pictogram gutter.
   */ entry => textEnvelopeWidth(entry[1], 10) + 52));
  const width = Math.max(legend.width, column * 3 + 28);
  const height = legend.height + 70;
  const annotationEntries = entries.map(/**
   * Position one legend entry with a reserved 24-unit pictogram slot and adjacent text, keeping both modes aligned.
   * @responsibility computation
   * @param {Array} input1 - Canonical pilot ID and localized label pair.
   * @param {string} input1[0] - Icon registry ID used when pictograms are visible.
   * @param {string} input1[1] - Localized meaning retained in both presentations.
   * @param {number} index - Pilot position determining its column and row.
   * @returns {Object} Positioned plain text and a visible icon record or null.
   */ ([id, label], index) => {
    const x = legend.x + 14 + index % 3 * column, y = legend.y + legend.height + 10 + Math.floor(index / 3) * 30;
    return { icon: symbols === "annotations" ? { id, x, y, size: 24 } : null,
      text: placePlainText(label, x + 32, y + 16, 10, 0) };
  });
  return { ...legend, width, height, annotationEntries, bounds: bounds(legend.x, legend.y, legend.x + width, legend.y + height, 3) };
}
