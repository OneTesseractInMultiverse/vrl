import { serializeAnnotationIcon, serializeIconMarker } from "./icon-serializer.js";
import { assertXmlCharacters, escapeXml } from "./xml.js";
import { svgAttribute, svgPaint } from "./attributes.js";
import { detailBadgeStyle, themeSafeStroke } from "./badge-style.js";

// Serialization consumes placed records. It never receives route/layout inputs or a locale.

/**
 * Serialize the prepared scene layers, scoped definitions and accessibility text into a complete SVG document
 * using the resolved theme.
 * @responsibility coordinator
 * @param {Object} scene - Complete renderer-owned scene with positioned primitives, IDs and fitted viewBox.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeTopoScene(scene, theme) {
  const { viewBox } = scene;
  const terrainProfile = scene.style === "soft-terrain" ? serializeSoftTerrain(scene.terrain, theme) : serializeTerrain(scene.terrainPath, theme);
  const nodes = scene.nodes.map(/**
   * Apply serializeNode to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The result returned by serializeNode.
   */ (item) => serializeNode(item.drawing, theme)).join("");
  const waterSegments = scene.style === "soft-terrain" ? serializeSoftPools(scene.pools, theme) : serializeWaterSegments(scene.waterPaths, theme);
  const routeSegments = serializeRouteSegments(scene.segments, theme, scene.identifiers);
  const segmentLabels = serializeSegmentLabels(scene.segmentLabels, theme);
  const stationTicks = scene.stationTicks.map(/**
   * Apply serializeStationTick to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The result returned by serializeStationTick.
   */ (item) => serializeStationTick(item, theme)).join("");
  const infoBox = serializeInfoBox(scene.infoBox, theme, scene.style === "soft-terrain");
  const legend = scene.legend === null ? "" : serializeLegend(scene.legend, theme);
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" viewBox="${svgAttribute(viewBox.x)} ${svgAttribute(viewBox.y)} ${svgAttribute(viewBox.width)} ${svgAttribute(viewBox.height)}" width="${svgAttribute(viewBox.width)}" height="${svgAttribute(viewBox.height)}" style="max-width: 100%; height: auto;">
  <title>${escapeXml(scene.title)}</title>
  <desc>${escapeXml(scene.description)}</desc>
  <defs>
    <marker id="${svgAttribute(scene.identifiers.arrow)}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth">
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

/**
 * Serialize prepared terrain as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {string|null} path - Prepared SVG path data; optional leader paths may be null.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeTerrain(path, theme) {
  return `<path class="vrl-terrain-profile" d="${svgAttribute(path)}" fill="${svgPaint(theme.terrain)}"/>`;
}

/**
 * Serialize prepared legend as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {number} input1.x - Horizontal position in SVG drawing units.
 * @param {number} input1.y - Vertical position in SVG drawing units.
 * @param {number} input1.width - Available horizontal extent in drawing units.
 * @param {number} input1.height - Panel height in SVG drawing units.
 * @param {unknown} input1.title - Unescaped title text.
 * @param {unknown} input1.titleX - Title horizontal coordinate.
 * @param {unknown} input1.titleY - Title baseline coordinate.
 * @param {Array} input1.drawingRows - Positioned legend drawing rows.
 * @param {Array} input1.styleNotes - Prepared style interpretation notes.
 * @param {Array} input1.annotationEntries - Optional placed pilot key entries with decorative icons and equivalent text.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeLegend({ x, y, width, height, title, titleX, titleY, drawingRows, styleNotes = [], annotationEntries = [] }, theme) {
  return `<g class="vrl-legend" aria-label="${svgAttribute(title)}">
    <rect x="${svgAttribute(x)}" y="${svgAttribute(y)}" width="${svgAttribute(width)}" height="${svgAttribute(height)}" rx="4" fill="${svgPaint(theme.panel)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1"/>
    <text x="${svgAttribute(titleX)}" y="${svgAttribute(titleY)}" font-family="system-ui, sans-serif" font-size="12" font-weight="800" fill="${svgPaint(theme.text)}">${escapeXml(title)}</text>
    ${drawingRows.map(/**
     * Apply serializeLegendRow to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {unknown} The result returned by serializeLegendRow.
     */ (item) => serializeLegendRow(item, theme)).join("")}${styleNotes.map(/**
     * Apply serializePlainText to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {unknown} The result returned by serializePlainText.
     */ item => serializePlainText(item, theme)).join("")}${annotationEntries.map(/**
      * Serialize a prepared legend pictogram and its adjacent text without changing their coordinates.
      * @responsibility coordinator
      * @param {Object} entry - Positioned text and an optional decorative icon owned by the legend scene.
      * @returns {string} Combined escaped SVG markup, with absent pictograms omitted.
      */ entry => serializeAnnotationIcon(entry.icon, theme.text) + serializePlainText(entry.text, theme)).join("") }
  </g>`;
}

/**
 * Serialize prepared legend row as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeLegendRow(row, theme) {
  if (row.kind === "symbols") return serializeLegendSymbols(row.entries, theme);
  if (row.kind === "badges") {
    return `${serializePlainText(row.label, theme)}${row.badges.map(/**
     * Apply serializeBadge to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {unknown} badge - Resolved badge category, label and optional positioned geometry.
     * @returns {unknown} The result returned by serializeBadge.
     */ (badge) => serializeBadge(badge, theme)).join("")}${row.description === null ? "" : serializePlainText(row.description, theme)}`;
  }
  return `<text class="vrl-legend-row" x="${svgAttribute(row.x)}" y="${svgAttribute(row.y)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(row.fontSize)}" fill="${svgPaint(theme.mutedText)}">${escapeXml(row.text)}</text>`;
}

/**
 * Serialize prepared legend symbols as SVG markup with XML-escaped values and validated paint; consume
 * supplied geometry without performing layout.
 * @responsibility computation
 * @param {Array} entries - Ordered symbol code/label pairs or positioned legend-symbol records.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeLegendSymbols(entries, theme) {
  return `<g class="vrl-legend-symbol-row">${entries.map(/**
   * Serialize one positioned legend code and label with escaped text, coordinates and theme paint.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ (item) => `<text class="vrl-legend-symbol-entry" x="${svgAttribute(item.x)}" y="${svgAttribute(item.y)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(item.fontSize)}" fill="${svgPaint(theme.mutedText)}">
      <tspan font-weight="800" fill="${svgPaint(theme.text)}">${escapeXml(item.code)}</tspan><tspan> = ${escapeXml(item.label)}</tspan>
    </text>`).join("")}</g>`;
}

/**
 * Serialize prepared info box as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {number} input1.x - Horizontal position in SVG drawing units.
 * @param {number} input1.y - Vertical position in SVG drawing units.
 * @param {number} input1.width - Available horizontal extent in drawing units.
 * @param {number} input1.height - Panel height in SVG drawing units.
 * @param {string} input1.label - Unescaped display label supplied by the caller.
 * @param {Array} input1.textLines - Prepared positioned summary text records.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {boolean} softTerrain - Whether the soft style chooses neutral information-panel paint; defaults to false.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeInfoBox({ x, y, width, height, label, textLines }, theme, softTerrain = false) {
  return `<g class="vrl-info-box" aria-label="${svgAttribute(label)}">
    <rect x="${svgAttribute(x)}" y="${svgAttribute(y)}" width="${svgAttribute(width)}" height="${svgAttribute(height)}" fill="${softTerrain ? svgPaint(theme.panel) : "#86a844"}" stroke="${svgPaint(theme.routeLine)}" stroke-width="2"/>
    ${textLines.map(/**
     * Serialize a centered information-panel line, emphasizing only records marked as headings.
     * @responsibility computation
     * @param {unknown} item - Current prepared record or test case.
     * @returns {string} Formatted text retaining the supplied values and ordering.
     */ (item) => `<text x="${svgAttribute(item.x)}" y="${svgAttribute(item.y)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="${svgAttribute(item.fontSize)}"${item.heading ? ' font-weight="900"' : ""} fill="${svgPaint(theme.text)}">${escapeXml(item.text)}</text>`).join("")}
  </g>`;
}

/**
 * Serialize prepared water segments as SVG markup with XML-escaped values and validated paint; consume
 * supplied geometry without performing layout.
 * @responsibility computation
 * @param {string[]} paths - Prepared SVG path strings in display order.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeWaterSegments(paths, theme) {
  return paths.map(/**
   * Serialize a prepared classic water path with validated water paint and rounded stroke caps.
   * @responsibility computation
   * @param {string|null} path - Prepared SVG path data; optional leader paths may be null.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ (path) => `<path class="vrl-water-run" d="${svgAttribute(path)}" fill="none" stroke="${svgPaint(theme.water)}" stroke-width="6" stroke-linecap="round"/>`).join("");
}

/**
 * Serialize prepared route segments as SVG markup with XML-escaped values and validated paint; consume
 * supplied geometry without performing layout.
 * @responsibility computation
 * @param {Array} segments - Route segments in traversal order.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {Object} identifiers - Resolved scoped IDs for SVG definitions and accessible references.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeRouteSegments(segments, theme, identifiers) {
  return segments.map(/**
   * Dispatch each prepared segment to its connection or technical SVG serializer.
   * @responsibility coordinator
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (segment) => segment.kind === "connection" ? serializeConnection(segment, theme) : serializeTechnicalSegment(segment, theme, identifiers)).join("");
}

/**
 * Serialize prepared connection as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {string|null} input1.path - Prepared SVG path data; optional leader paths may be null.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeConnection({ path }, theme) {
  return `<path class="vrl-route-segment" d="${svgAttribute(path)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/**
 * Serialize prepared technical segment as SVG markup with XML-escaped values and validated paint; consume
 * supplied geometry without performing layout.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {unknown} input1.ownerId - Identity of the canonical technical or pool owner.
 * @param {unknown} input1.shape - Technical drawing shape: ladder, direct or curve.
 * @param {Object} input1.paths - Prepared lead, slope and exit path strings.
 * @param {Array} input1.rungs - Prepared rung stroke coordinates.
 * @param {Object[]} input1.stages - Prepared stage labels with positions, text and optional boundary marker coordinates.
 * @param {Array} input1.redirections - Prepared redirection markers and label positions.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @param {Object} identifiers - Resolved scoped IDs for SVG definitions and accessible references.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeTechnicalSegment({ ownerId, shape, paths, rungs, stages, redirections }, theme, identifiers) {
  const width = shape === "curve" ? 2 : 3;
  const owner = shape === "curve" ? ` data-owner-id="${svgAttribute(ownerId)}"` : "";
  const decorations = [serializeRungs(rungs, theme), serializeStages(stages, theme), serializeRedirections(redirections, theme)].join("\n    ");
  return `<g class="vrl-drop-${svgAttribute(shape)}"${owner}>
    <path class="vrl-route-segment vrl-drop-lead" d="${svgAttribute(paths.lead)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>
    <path class="vrl-route-segment vrl-drop-slope" d="${svgAttribute(paths.slope)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" marker-end="url(#${svgAttribute(identifiers.arrow)})"/>
    ${decorations}
    <path class="vrl-route-segment vrl-drop-exit" d="${svgAttribute(paths.exit)}" fill="none" stroke="${svgPaint(theme.routeLine)}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

/**
 * Serialize prepared rungs as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Array} rungs - Prepared rung stroke coordinates.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeRungs(rungs, theme) {
  return rungs.map(/**
   * Serialize one prepared technical rung with escaped endpoints and validated stroke paint.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {number} input1.x1 - First endpoint horizontal coordinate in drawing units.
   * @param {number} input1.y1 - First endpoint vertical coordinate in drawing units.
   * @param {number} input1.x2 - Second endpoint horizontal coordinate in drawing units.
   * @param {number} input1.y2 - Second endpoint vertical coordinate in drawing units.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ ({ x1, y1, x2, y2 }) => `<line class="vrl-drop-rung" x1="${svgAttribute(x1)}" y1="${svgAttribute(y1)}" x2="${svgAttribute(x2)}" y2="${svgAttribute(y2)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.5" stroke-linecap="round"/>`).join("");
}

/**
 * Serialize prepared stages as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Object[]} stages - Prepared stage labels with positions, text and optional boundary marker coordinates.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeStages(stages, theme) {
  return stages.map(/**
   * Serialize a stage's optional internal boundary and positioned length label with clearance stroke.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ (item) => {
    const boundary = item.boundary === null ? "" : serializeStageBoundary(item.boundary, theme);
    return `${boundary}<text class="vrl-rappel-stage-label" x="${svgAttribute(item.x)}" y="${svgAttribute(item.y)}" text-anchor="${svgAttribute(item.anchor)}" font-family="system-ui, sans-serif" font-size="9" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(item.text)}</text>`;
  }).join("");
}

/**
 * Serialize prepared stage boundary as SVG markup with XML-escaped values and validated paint; consume
 * supplied geometry without performing layout.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {number} input1.x1 - First endpoint horizontal coordinate in drawing units.
 * @param {number} input1.y1 - First endpoint vertical coordinate in drawing units.
 * @param {number} input1.x2 - Second endpoint horizontal coordinate in drawing units.
 * @param {number} input1.y2 - Second endpoint vertical coordinate in drawing units.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeStageBoundary({ x1, y1, x2, y2 }, theme) {
  return `<line class="vrl-rappel-stage-boundary" x1="${svgAttribute(x1)}" y1="${svgAttribute(y1)}" x2="${svgAttribute(x2)}" y2="${svgAttribute(y2)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.5" stroke-linecap="round"/>`;
}

/**
 * Serialize prepared redirections as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Array} redirections - Prepared redirection markers and label positions.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeRedirections(redirections, theme) {
  return redirections.map(/**
   * Serialize a redirection diamond, escaped distance/side label and accessible anchor description.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {string|null} input1.path - Prepared SVG path data; optional leader paths may be null.
   * @param {number} input1.x - Horizontal position in SVG drawing units.
   * @param {number} input1.y - Vertical position in SVG drawing units.
   * @param {unknown} input1.text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
   * @param {string} input1.label - Unescaped display label supplied by the caller.
   * @param {unknown} input1.anchor - SVG text alignment: start, middle or end.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ ({ path, x, y, text, label, anchor }) => {
    return `<g class="vrl-redirection-anchor" aria-label="${svgAttribute(label)}">
      <path d="${svgAttribute(path)}" fill="${svgPaint(theme.panel)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.4"/>
      <text x="${svgAttribute(x)}" y="${svgAttribute(y)}" text-anchor="${svgAttribute(anchor)}" font-family="system-ui, sans-serif" font-size="8" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text>
    </g>`;
  }).join("");
}

/**
 * Serialize prepared segment labels as SVG markup with XML-escaped values and validated paint; consume
 * supplied geometry without performing layout.
 * @responsibility computation
 * @param {unknown} labels - Ordered rendered labels projected for comparison.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeSegmentLabels(labels, theme) {
  return labels.map(/**
   * Serialize one positioned traverse label with escaped text and clearance stroke.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {number} input1.x - Horizontal position in SVG drawing units.
   * @param {number} input1.y - Vertical position in SVG drawing units.
   * @param {unknown} input1.text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ ({ x, y, text }) => `<text class="vrl-segment-label" x="${svgAttribute(x)}" y="${svgAttribute(y)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="10" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text>`).join("");
}

/**
 * Serialize prepared station tick as SVG markup with XML-escaped values and validated paint; consume
 * supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
 * @param {unknown} input1[0] - Tuple member bound as lineA: the ordered input consumed below.
 * @param {unknown} input1[1] - Tuple member bound as lineB: the ordered input consumed below.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeStationTick([lineA, lineB], theme) {
  return `<g class="vrl-station-tick vrl-station-tick-clearance" stroke="${svgPaint(theme.panel)}" stroke-width="5" stroke-linecap="round">
      <line x1="${svgAttribute(lineA.x1)}" y1="${svgAttribute(lineA.y1)}" x2="${svgAttribute(lineA.x2)}" y2="${svgAttribute(lineA.y2)}"/>
      <line x1="${svgAttribute(lineB.x1)}" y1="${svgAttribute(lineB.y1)}" x2="${svgAttribute(lineB.x2)}" y2="${svgAttribute(lineB.y2)}"/>
    </g><g class="vrl-station-tick" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.5" stroke-linecap="round">
      <line x1="${svgAttribute(lineA.x1)}" y1="${svgAttribute(lineA.y1)}" x2="${svgAttribute(lineA.x2)}" y2="${svgAttribute(lineA.y2)}"/>
      <line x1="${svgAttribute(lineB.x1)}" y1="${svgAttribute(lineB.y1)}" x2="${svgAttribute(lineB.x2)}" y2="${svgAttribute(lineB.y2)}"/>
    </g>`;
}

/**
 * Serialize prepared node as SVG markup with XML-escaped values and validated paint; consume supplied geometry
 * without performing layout.
 * @responsibility computation
 * @param {unknown} item - Current prepared record or test case.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
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
    ${detailLine}${item.annotationIcon === undefined ? "" : serializeAnnotationIcon(item.annotationIcon, theme[item.colorToken])}
  </g>`;
}

/**
 * Serialize prepared label leader as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {string|null} path - Prepared SVG path data; optional leader paths may be null.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeLabelLeader(path, theme) {
  if (path === null) return "";
  return `<path class="vrl-label-leader" d="${svgAttribute(path)}" fill="none" stroke="${svgPaint(theme.mutedText)}" stroke-width="1" stroke-linecap="round" stroke-dasharray="3 3"/>`;
}

/**
 * Serialize prepared anchor marks as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Object} placement - Prepared coordinates for a node label, symbol, anchor group or panel.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeAnchorMarks(placement, theme) {
  if (placement === null) return "";
  return serializeAnchorMarkGroup(placement, theme);
}

/**
 * Serialize prepared anchor mark group as SVG markup with XML-escaped values and validated paint; consume
 * supplied geometry without performing layout.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {Array} input1.marks - Prepared visible anchor-circle coordinates.
 * @param {unknown} input1.overflow - Optional label describing anchors beyond the visible glyph cap.
 * @param {string} input1.label - Unescaped display label supplied by the caller.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeAnchorMarkGroup({ marks, overflow, label }, theme) {
  return `<g class="vrl-anchor-marks" aria-label="${svgAttribute(label)}">
    ${marks.map(/**
     * Serialize one visible anchor circle; the enclosing record owns total-count and overflow semantics.
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {number} input1.x - Horizontal position in SVG drawing units.
     * @param {number} input1.y - Vertical position in SVG drawing units.
     * @returns {string} Formatted text retaining the supplied values and ordering.
     */ ({ x, y }) => `<circle cx="${svgAttribute(x)}" cy="${svgAttribute(y)}" r="3" fill="${svgPaint(theme.panel)}" stroke="${svgPaint(theme.routeLine)}" stroke-width="1.4"/>`).join("")}${overflow === null ? "" : serializeAnchorOverflow(overflow, theme)}
  </g>`;
}

/**
 * Serialize prepared anchor overflow as SVG markup with XML-escaped values and validated paint; consume
 * supplied geometry without performing layout.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {unknown} input1.text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
 * @param {number} input1.x - Horizontal position in SVG drawing units.
 * @param {number} input1.y - Vertical position in SVG drawing units.
 * @param {number} input1.fontSize - Text size in drawing units used for width estimation and placement.
 * @param {unknown} input1.anchor - SVG text alignment: start, middle or end.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeAnchorOverflow({ text, x, y, fontSize, anchor }, theme) {
  return `<text class="vrl-anchor-overflow" aria-hidden="true" x="${svgAttribute(x)}" y="${svgAttribute(y)}" text-anchor="${svgAttribute(anchor)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(fontSize)}" fill="${svgPaint(theme.text)}" stroke="${svgPaint(theme.panel)}" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text>`;
}

/**
 * Serialize prepared symbol as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {unknown} item - Current prepared record or test case.
 * @param {string} color - Validated foreground paint value.
 * @param {string} panelColor - Validated background/clearance paint value.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeSymbol(item, color, panelColor) {
  if (item.kind === "icon") return serializeIconMarker(item, color, panelColor);
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

/**
 * Serialize prepared details as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Array} rows - Prepared detail rows in display order.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeDetails(rows, theme) {
  if (rows.length === 0) return "";
  return `<g class="vrl-detail-line">${rows.map(/**
   * Serialize a prepared detail row, dispatching typed records to badge or plain-text serialization.
   * @responsibility computation
   * @param {Object|Array} row - Prepared legend row or ordered typed detail records, as selected by this function.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ (row) => `<g class="vrl-detail-row">${row.map(/**
   * Serialize a prepared detail row, dispatching typed records to badge or plain-text serialization.
   * @responsibility computation
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (item) => item.kind === "badge" ? serializeBadge(item, theme) : serializePlainText(item, theme)).join("")}</g>`).join("")}</g>`;
}

/**
 * Serialize prepared badge as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {unknown} badge - Resolved badge category, label and optional positioned geometry.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeBadge(badge, theme) {
  if (badge === null) return "";
  const style = detailBadgeStyle(badge.category, theme);
  return `<g class="vrl-level-badge vrl-level-badge-${svgAttribute(badge.className)} vrl-detail-badge vrl-detail-badge-${svgAttribute(badge.category)}">
    <rect x="${svgAttribute(badge.x)}" y="${svgAttribute(badge.y)}" width="${svgAttribute(badge.width)}" height="14" rx="3" fill="${svgPaint(style.fill)}"/>
    <text x="${svgAttribute(badge.textX)}" y="${svgAttribute(badge.textY)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="800" fill="${svgPaint(style.text)}">${escapeXml(badge.label)}</text>
  </g>`;
}

/**
 * Serialize prepared plain text as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Object} input1 - Input record destructured into the separately documented members below.
 * @param {unknown} input1.text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
 * @param {number} input1.x - Horizontal position in SVG drawing units.
 * @param {number} input1.y - Vertical position in SVG drawing units.
 * @param {number} input1.fontSize - Text size in drawing units used for width estimation and placement.
 * @param {number} input1.strokeWidth - Clearance stroke width in drawing units.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializePlainText({ text, x, y, fontSize, strokeWidth }, theme) {
  return `<text x="${svgAttribute(x)}" y="${svgAttribute(y)}" font-family="system-ui, sans-serif" font-size="${svgAttribute(fontSize)}" fill="${svgPaint(theme.mutedText)}" stroke="${svgPaint(theme.panel)}" stroke-width="${svgAttribute(strokeWidth)}" stroke-linejoin="round" paint-order="stroke">${escapeXml(text)}</text>`;
}

/**
 * Serialize prepared soft terrain as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {unknown} terrain - Prepared soft contour, wash and bounds.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeSoftTerrain(terrain, theme) {
  return `<path class="vrl-terrain-wash" d="${svgAttribute(terrain.fill)}" fill="${svgPaint(theme.terrain)}" fill-opacity="0.45"/>
  <path class="vrl-terrain-contour" d="${svgAttribute(terrain.contour)}" fill="none" stroke="${svgPaint(theme.mutedText)}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
}

/**
 * Serialize prepared soft pools as SVG markup with XML-escaped values and validated paint; consume supplied
 * geometry without performing layout.
 * @responsibility computation
 * @param {Array} pools - Prepared symbolic pool drawing records.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {string} Escaped SVG markup for the prepared drawing records; optional absent primitives serialize to empty text.
 */
export function serializeSoftPools(pools, theme) {
  return pools.map(/**
   * Serialize a symbolic pool basin and optional water surface while retaining owner identity and explicit
   * dry-state styling.
   * @responsibility computation
   * @param {unknown} pool - Prepared symbolic pool record retaining its owner and dry-state cues.
   * @returns {string} Formatted text retaining the supplied values and ordering.
   */ pool => `<g class="vrl-pool-symbol" data-owner-id="${svgAttribute(pool.ownerId)}">
    <path class="vrl-pool-basin" d="${svgAttribute(pool.basin)}" fill="${pool.dry ? "none" : svgPaint(theme.water)}" fill-opacity="0.16" stroke="${svgPaint(pool.dry ? theme.mutedText : theme.water)}" stroke-width="1.5"/>
    ${pool.surface === null ? "" : `<path class="vrl-pool-surface" d="${svgAttribute(pool.surface)}" fill="none" stroke="${svgPaint(theme.water)}" stroke-width="1.5"/>`}
  </g>`).join("");
}
