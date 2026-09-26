import { resolveAttributeIconId, resolveElementIconId } from "@subvertic/vrl-icons/semantics";
import { elementAttribute } from "./route-data.js";
import { bounds } from "./scene-bounds.js";
import { DETAIL_LINE_HEIGHT } from "./presentation.js";

/**
 * Recognize the two annotation presentations that share reserved icon space and full factual text.
 * @responsibility computation
 * @param {string|undefined} symbols - Requested symbol presentation.
 * @returns {boolean} Whether annotation placement is required, independently of pictogram visibility.
 */
export function selectiveSymbols(symbols) {
  return symbols === "annotations" || symbols === "minimal";
}

/**
 * Resolve only the five pilot roles from explicit structured attributes, never prose or translated text.
 * @responsibility computation
 * @param {Object} element - Normalized element, including extension-backed hazard type when supplied.
 * @returns {string|null} Canonical start, finish, bolt, tree or slippery ID; null for absent or unsupported facts.
 */
export function annotationIconId(element) {
  if (element.type === "start" || element.type === "exit") return resolveElementIconId(element);
  if (element.type === "rappel") {
    const id = resolveAttributeIconId("anchor", element.attributes.anchor);
    return id === "bolt" || id === "tree" ? id : null;
  }
  return element.type === "hazard" && elementAttribute(element, "type") === "slippery" ? "slippery" : null;
}

/**
 * Place a decorative 24-unit pictogram beside its owning access, anchor or hazard annotation.
 * @responsibility computation
 * @param {string|null} id - Selected pilot ID; null yields no placement.
 * @param {Object} placement - Text baselines and left text origin, already clear of protected geometry.
 * @param {number} precedingRows - Detail rows before the anchor label; negative selects the title baseline.
 * @returns {Object|null} Owned icon record with a conservative full-stroke envelope, or null.
 */
export function placeAnnotationIcon(id, placement, precedingRows) {
  if (id === null) return null;
  const x = placement.labelX - 32;
  const y = (precedingRows < 0 ? placement.titleY : placement.detailY + precedingRows * DETAIL_LINE_HEIGHT) - 18;
  return { id, x, y, size: 24, bounds: bounds(x - 1, y - 1, x + 25, y + 25) };
}

/**
 * Move a complete annotation block right until its reserved icon gutter clears all overlapping geometry.
 * @responsibility computation
 * @param {Object[]} obstacles - Conservative geometry and technical-text bounds prepared by the scene coordinator.
 * @param {Object} placement - Candidate text origin and baselines.
 * @param {number} bottom - Last occupied vertical coordinate including text and icon strokes.
 * @returns {number} Monotonic text x with a 40-unit reserve to the right of every overlapping obstacle.
 */
export function annotationClearanceX(obstacles, placement, bottom) {
  let x = placement.labelX;
  for (const obstacle of obstacles) {
    if (obstacle.maxY >= placement.titleY - 24 && obstacle.minY <= bottom) x = Math.max(x, obstacle.maxX + 40);
  }
  return x;
}

/**
 * Reserve each terrain contour edge with its stroke, leaving empty regions available for annotations.
 * @responsibility computation
 * @param {Object[]} points - Ordered contour coordinates prepared by the terrain owner.
 * @returns {Object[]} Conservative segment envelopes; an empty contour yields no obstacles.
 */
export function contourObstacles(points) {
  const result = [];
  for (let index = 1; index < points.length; index += 1) {
    const first = points[index - 1], second = points[index];
    result.push(bounds(Math.min(first.x, second.x), Math.min(first.y, second.y), Math.max(first.x, second.x), Math.max(first.y, second.y), 2));
  }
  return result;
}

/**
 * Describe the selected pictograms using shared pilot meanings while retaining fixed legend geometry in minimal mode.
 * @responsibility computation
 * @param {string} language - Resolved en or es display language.
 * @returns {Array[]} Ordered icon IDs and localized meanings; quantities always remain in route text.
 */
export function annotationLegendEntries(language) {
  const labels = language === "es"
    ? ["Inicio del acceso", "Fin del acceso", "Pernos: cantidad en texto", "Anclaje en árbol", "Suelo resbaladizo"]
    : ["Access start", "Access finish", "Bolts: count in text", "Tree anchor", "Slippery footing"];
  return ["start", "finish", "bolt", "tree", "slippery"].map(/**
   * Pair the canonical pilot ID with its corresponding localized legend meaning.
   * @responsibility computation
   * @param {string} id - Exact canonical icon registry identifier.
   * @param {number} index - Zero-based position in the ordered collection.
   * @returns {Array} Ordered comparison or mapping tuple.
   */ (id, index) => [id, labels[index]]);
}
