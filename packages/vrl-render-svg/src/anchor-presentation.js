import { formatElementTitle } from "./element-formatters.js";
import { diagramText } from "./locale.js";

const MAX_ANCHOR_MARKS = 4;

/**
 * Read a positive safe-integer declared anchor count without applying the visual cap; missing or invalid
 * quantities return zero.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} Positive safe-integer declared quantity, or zero when unavailable.
 */

function actualAnchorCount(element) {
  const value = element.attributes.anchor_count;
  if (typeof value !== "number" && typeof value !== "string") return 0;
  const count = Number(value);
  return Number.isSafeInteger(count) && count > 0 ? count : 0;
}

/**
 * Compute the capped count of visible anchor circles; the full declared count remains available separately.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} At most four visible anchor marks; never the full quantity when an overflow exists.
 */
export function anchorMarkCount(element) {
  return visibleAnchorCount(actualAnchorCount(element));
}

/**
 * Limit anchor-circle glyphs to four without changing the declared quantity.
 * @responsibility computation
 * @param {number} count - Number of generated records or declared anchors; visual caps do not alter declared quantities.
 * @returns {number} The supplied count capped at four visible glyphs.
 */
function visibleAnchorCount(count) {
  return Math.min(count, MAX_ANCHOR_MARKS);
}

/**
 * Format the full declared anchor quantity with localized singular/plural text, or empty text when unknown.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Full declared quantity and localized anchor wording, or empty text when unknown.
 */
export function anchorSummary(element, language = "en") {
  const count = actualAnchorCount(element);
  return count === 0 ? "" : `${count} ${anchorLabel(count, language)}`;
}

/**
 * Choose localized singular or plural anchor wording for a numeric quantity.
 * @responsibility computation
 * @param {number} count - Number of generated records or declared anchors; visual caps do not alter declared quantities.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Localized singular anchor or plural anchors label.
 */
export function anchorLabel(count, language = "en") {
  const text = diagramText(language);
  return count === 1 ? text.anchor : text.anchors;
}

/**
 * Position up to four anchor circles and an overflow count beside a node, retaining the uncapped quantity.
 * @responsibility computation
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} side - Declared left/right station or redirection side; defaults to "left".
 * @returns {Object} A record containing count, marks, overflow.
 */

export function anchorMarkPlacements(node, element, side = "left") {
  const count = actualAnchorCount(element);
  const visibleCount = visibleAnchorCount(count);
  const direction = side === "left" ? -1 : 1;
  return {
    count,
    marks: Array.from({ length: visibleCount }, /**
     * Project x, y into the record required by Array.from.
     * @responsibility computation
     * @param {unknown} _ - Required callback placeholder; intentionally unused.
     * @param {number} index - Zero-based position in the current ordered collection.
     * @returns {Object} A record containing x, y.
     */ (_, index) => ({ x: node.x + direction * (14 + index * 8), y: node.y - 24 })),
    overflow: count > visibleCount ? {
      text: `+${count - visibleCount}`, x: node.x + direction * 47, y: node.y - 21,
      fontSize: 9, anchor: direction === -1 ? "end" : "start"
    } : null
  };
}

/**
 * Build accessible prose containing every declared anchor quantity and its owning element.
 * @responsibility computation
 * @param {Object} layout - Positioned route geometry in drawing units, including nodes and canonical segments.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {string} Space-separated accessible sentences retaining each element's full anchor quantity.
 */
export function anchorCountDescription(layout, language) {
  return layout.nodes.flatMap(/**
   * Describe one element's full anchor count, omitting the sentence when the count is unknown.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {Object} input1.element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ ({ element }) => {
    const summary = anchorSummary(element, language);
    return summary === "" ? [] : [`${formatElementTitle(element, language)}: ${summary}.`];
  }).join(" ");
}
