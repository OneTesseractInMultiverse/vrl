import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";

// Independent inspection of emitted primitives, including inherited strokes and text.
/**
 * Parse markup with the independent XML parser so assertions observe serialized document structure.
 * @responsibility coordinator
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {unknown} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
export function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
}

/**
 * Resolve a numeric SVG presentation attribute through ancestor elements with an explicit fallback.
 * @responsibility computation
 * @param {Element} element - Parsed SVG DOM element inspected independently of renderer internals.
 * @param {unknown} attribute - SVG presentation attribute name resolved through the element's ancestors.
 * @param {unknown} fallback - Value used when the requested optional field is absent.
 * @returns {unknown} The result returned by Number. The fallback value selected or validated above.
 */
function inheritedNumber(element, attribute, fallback) {
  for (let current = element; current?.nodeType === 1; current = current.parentNode) {
    if (current.hasAttribute(attribute)) return Number(current.getAttribute(attribute));
  }
  return fallback;
}

/**
 * Independently estimate a visible SVG primitive's emitted envelope including relevant stroke geometry.
 * @responsibility computation
 * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
 * @returns {Object} A record containing minX, minY, maxX, maxY.
 */
export function emittedBounds(element) {
  /**
   * Apply Number to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} name - Field, port, fixture or other named subject selected by the surrounding operation.
   * @returns {unknown} The result returned by Number.
   */
  const value = (name) => Number(element.getAttribute(name));
  const stroke = inheritedNumber(element, "stroke-width", 0) / 2;
  let x1, y1, x2, y2;
  if (element.tagName === "path") {
    const coordinates = (element.getAttribute("d").match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
    const xs = coordinates.filter(/**
     * Evaluate the selection condition index % 2 === 0.
     * @responsibility computation
     * @param {unknown} _ - Required callback placeholder; intentionally unused.
     * @param {number} index - Zero-based position in the current ordered collection.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ (_, index) => index % 2 === 0);
    const ys = coordinates.filter(/**
     * Evaluate the selection condition index % 2 === 1.
     * @responsibility computation
     * @param {unknown} _ - Required callback placeholder; intentionally unused.
     * @param {number} index - Zero-based position in the current ordered collection.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ (_, index) => index % 2 === 1);
    x1 = Math.min(...xs); x2 = Math.max(...xs); y1 = Math.min(...ys); y2 = Math.max(...ys);
  } else if (element.tagName === "line") {
    x1 = Math.min(value("x1"), value("x2")); x2 = Math.max(value("x1"), value("x2"));
    y1 = Math.min(value("y1"), value("y2")); y2 = Math.max(value("y1"), value("y2"));
  } else if (element.tagName === "circle") {
    x1 = value("cx") - value("r"); x2 = value("cx") + value("r");
    y1 = value("cy") - value("r"); y2 = value("cy") + value("r");
  } else if (element.tagName === "rect") {
    x1 = value("x"); y1 = value("y"); x2 = x1 + value("width"); y2 = y1 + value("height");
  } else {
    const font = inheritedNumber(element, "font-size", 16);
    const text = element.textContent.replace(/\s+/g, " ").trim();
    let width = text.length * font * 1.1;
    if (element.getAttribute("font-family") === "ui-monospace, monospace") {
      width = 0;
      for (const character of text) width += font * (/^[\x20-\x7e]$/.test(character) ? 0.7 : character.length * 1.1);
    }
    const anchor = element.getAttribute("text-anchor");
    x1 = value("x") - (anchor === "middle" ? width / 2 : anchor === "end" ? width : 0);
    x2 = x1 + width; y1 = value("y") - font; y2 = value("y") + font / 2;
  }
  const padding = element.hasAttribute("marker-end") ? 21 : stroke;
  return { minX: x1 - padding, minY: y1 - padding, maxX: x2 + padding, maxY: y2 + padding };
}

/**
 * Select visible SVG geometry and text while excluding definitions and nonrendered metadata.
 * @responsibility computation
 * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
 * @returns {Array} The result returned by [...document.getElementsByTagName("*")].filter.
 */
function visiblePrimitives(document) {
  return [...document.getElementsByTagName("*")].filter(/**
   * Accept supported visible SVG primitives and reject any primitive nested in definitions.
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {boolean} The literal false for this branch. The literal true for this branch.
   */ (element) => {
    if (!["path", "line", "circle", "rect", "text"].includes(element.tagName)) return false;
    for (let parent = element.parentNode; parent; parent = parent.parentNode) if (parent.nodeName === "defs") return false;
    return true;
  });
}

/**
 * Collect emitted primitives whose independently computed envelopes lie outside the document viewBox.
 * @responsibility computation
 * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
 * @returns {Array} The result returned by visiblePrimitives(document).flatMap.
 */
export function clippedPrimitives(document) {
  const [x, y, width, height] = document.documentElement.getAttribute("viewBox").split(" ").map(Number);
  return visiblePrimitives(document).flatMap(/**
   * Return diagnostic details only when the independently computed primitive envelope escapes the SVG viewBox.
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (element) => {
    const item = emittedBounds(element);
    return item.minX < x || item.minY < y || item.maxX > x + width || item.maxY > y + height
      ? [{ tag: element.tagName, class: element.getAttribute("class"), text: element.textContent.slice(0, 50), bounds: item }] : [];
  });
}
