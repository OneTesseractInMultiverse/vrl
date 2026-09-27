import { svgAttribute, svgPaint } from "./attributes.js";
import { escapeXml } from "./xml.js";
import { serializeAnnotationIcon } from "./icon-serializer.js";

/**
 * Serialize the bounded row scene without performing geometry, wrapping or semantic inference.
 * @responsibility coordinator
 * @param {Object} scene - Complete row scene with absolute coordinates and original ownership metadata.
 * @param {Object} theme - Validated renderer paint tokens.
 * @returns {string} Standalone accessible SVG at the requested width, retaining minimum readable text size.
 */
export function serializeRowScene(scene, theme) {
  const v = scene.viewBox;
  let rows = "";
  for (const row of scene.rows) rows += serializeRow(row, scene.identifiers.arrow, theme);
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" lang="${svgAttribute(scene.language)}" xml:lang="${svgAttribute(scene.language)}" aria-labelledby="${svgAttribute(scene.identifiers.title)}" aria-describedby="${svgAttribute(scene.identifiers.description)}" viewBox="${svgAttribute(v.x)} ${svgAttribute(v.y)} ${svgAttribute(v.width)} ${svgAttribute(v.height)}" width="${svgAttribute(v.width)}" height="${svgAttribute(v.height)}" style="max-width: none; min-width: ${svgAttribute(v.width)}px; height: auto;" data-vrl-flow="rows">
<title id="${svgAttribute(scene.identifiers.title)}">${escapeXml(scene.title)}</title><desc id="${svgAttribute(scene.identifiers.description)}">${escapeXml(scene.description)}</desc>
<defs><marker id="${svgAttribute(scene.identifiers.arrow)}" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto" markerUnits="strokeWidth"><path d="M0,0 L0,6 L7,3 z" fill="${svgPaint(theme.routeLine)}"/></marker></defs>
<rect x="${svgAttribute(v.x)}" y="${svgAttribute(v.y)}" width="${svgAttribute(v.width)}" height="${svgAttribute(v.height)}" fill="${svgPaint(theme.background)}"/>
${serializeRowText(scene.header, theme)}${rows}${scene.legend === null ? "" : serializeRowText(scene.legend, theme)}
</svg>`;
}

/**
 * Serialize a complete section and both explicitly owned continuation halves in document reading order.
 * @responsibility coordinator
 * @param {Object} row - Prepared section with caption, schematic strokes and complete source-ordered facts.
 * @param {string} arrow - Document-scoped marker ID supplied by the scene.
 * @param {Object} theme - Validated paint tokens.
 * @returns {string} Escaped section group; logical ownership is retained in data attributes for inspection.
 */
function serializeRow(row, arrow, theme) {
  let paths = "";
  for (const item of row.geometry.paths) paths += `<path class="vrl-row-${svgAttribute(item.kind)}" d="${svgAttribute(item.path)}" fill="${item.kind === "wash" ? svgPaint(theme.terrain) : "none"}" fill-opacity="0.4" stroke="${item.kind === "wash" ? "none" : svgPaint(theme[item.token])}" stroke-width="2"${item.kind === "contour" ? ' stroke-dasharray="4 3"' : ""}${item.arrow ? ` marker-end="url(#${svgAttribute(arrow)})"` : ""}/>`;
  return `<g class="vrl-row" data-section="${svgAttribute(row.index + 1)}" data-elements="${svgAttribute(row.elementIndexes.join(","))}">
${serializeContinuation(row.incoming, theme)}${serializeRowText(row.caption, theme)}${paths}${serializeRowText(row.details, theme)}${serializeContinuation(row.outgoing, theme)}
</g>`;
}

/**
 * Serialize an optional continuation marker with its exact pairing key, role and referenced section.
 * @responsibility coordinator
 * @param {Object|null} marker - Prepared continuation half; null denotes the route endpoint.
 * @param {Object} theme - Validated paint tokens.
 * @returns {string} Empty markup at endpoints, otherwise a labeled continuation group.
 */
function serializeContinuation(marker, theme) {
  return marker === null ? "" : `<g class="vrl-continuation" data-code="${svgAttribute(marker.code)}" data-role="${svgAttribute(marker.role)}" data-section="${svgAttribute(marker.sectionNumber)}">${serializeRowText(marker.block, theme)}</g>`;
}

/**
 * Encode prepared text and decorative pictograms; preserve whitespace used by exact, lossless line wrapping.
 * @responsibility coordinator
 * @param {Object} block - Positioned lines and icons with no unresolved layout inputs.
 * @param {Object} theme - Validated paint tokens.
 * @returns {string} Text at fixed scene font sizes followed by transparent decorative icon geometry.
 */
function serializeRowText(block, theme) {
  let markup = "";
  for (const line of block.lines) markup += `<text x="${svgAttribute(line.x)}" y="${svgAttribute(line.y)}" font-family="ui-monospace, monospace" font-size="${svgAttribute(line.fontSize)}" font-weight="${line.heading ? "700" : "400"}" fill="${svgPaint(theme.text)}" xml:space="preserve"${line.elementIndex === null ? "" : ` data-element="${svgAttribute(line.elementIndex)}"`}>${escapeXml(line.text)}</text>`;
  for (const icon of block.icons) markup += serializeAnnotationIcon(icon, theme.text);
  return markup;
}
