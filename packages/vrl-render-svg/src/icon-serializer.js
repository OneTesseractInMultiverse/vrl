import { renderIconGeometry } from "@subvertic/vrl-icons/svg";
import { svgAttribute, svgPaint } from "./attributes.js";

/**
 * Serialize positioned decorative geometry using only the icon package's public renderer.
 * @responsibility coordinator
 * @param {Object|null} icon - Canonical ID, square size and origin; null produces no markup.
 * @param {string} color - Supported theme paint, validated at the serialization boundary.
 * @returns {string} ID-free hidden SVG group without an opaque backing; unknown IDs or invalid paint propagate.
 */
export function serializeAnnotationIcon(icon, color) {
  if (icon === null) return "";
  const geometry = renderIconGeometry(icon.id);
  return `<g class="vrl-annotation-icon" data-vrl-icon="${svgAttribute(icon.id)}" aria-hidden="true" focusable="false" transform="translate(${svgAttribute(icon.x)} ${svgAttribute(icon.y)}) scale(${svgAttribute(icon.size / 32)})" color="${svgPaint(color)}">${geometry}</g>`;
}

/**
 * Serialize the compatible node-icon presentation, retaining its code and existing opaque clearance square.
 * @responsibility coordinator
 * @param {Object} marker - Prepared icon marker with origin, code and text positions.
 * @param {string} color - Supported foreground paint.
 * @param {string} panelColor - Supported panel paint for the clearance square.
 * @returns {string} Decorative node group preserving exact package geometry and abbreviation text.
 */
export function serializeIconMarker(marker, color, panelColor) {
  return `<g class="vrl-symbol vrl-symbol-icon" aria-hidden="true">
    <rect x="${svgAttribute(marker.x - 14)}" y="${svgAttribute(marker.y - 14)}" width="28" height="28" rx="3" fill="${svgPaint(panelColor)}"/>
    ${serializeAnnotationIcon({ id: marker.id, x: marker.x - 12, y: marker.y - 12, size: 24 }, color)}
    <text x="${svgAttribute(marker.textX)}" y="${svgAttribute(marker.textY)}" text-anchor="middle" font-family="system-ui, sans-serif" font-size="9" font-weight="800" fill="${svgPaint(color)}" stroke="${svgPaint(panelColor)}" stroke-width="3" paint-order="stroke">${svgAttribute(marker.code)}</text>
  </g>`;
}
