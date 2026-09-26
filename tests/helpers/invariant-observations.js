import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";

/**
 * Independently traverse nested values cycle-safely and collect paths to nonfinite numbers for invariant
 * assertions. Independent walks inspect public values; no production geometry/validation helpers.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {unknown} path - Filesystem path, JSON pointer or prepared SVG path as specified by this helper; defaults to "$".
 * @param {unknown} seen - Invocation-local visited-object set used to terminate cycles; defaults to new Set().
 * @returns {unknown} The selected result, including the documented absent-value fallback. The ordered records or values assembled above. The result returned by Object.entries(value).flatMap.
 */

export function nonfinitePaths(value, path = "$", seen = new Set()) {
  if (typeof value === "number") return Number.isFinite(value) ? [] : [path];
  if (value === null || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  return Object.entries(value).flatMap(/**
   * Apply nonfinitePaths to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
   * @param {unknown} input1[0] - Tuple member bound as key: Own-property key, metadata key or configured loader result key.
   * @param {unknown} input1[1] - Tuple member bound as child: Current child node or record during recursive traversal.
   * @returns {unknown} The result returned by nonfinitePaths.
   */ ([key, child]) => nonfinitePaths(child, `${path}.${key}`, seen));
}

/**
 * Parse renderer output with the independent strict XML parser and surface structural errors.
 * @responsibility coordinator
 * @param {unknown} markup - Serialized SVG or framework markup to parse or inspect.
 * @returns {unknown} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 * @throws {SyntaxError} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function xmlDocument(markup) {
  // The renderer emits no CDATA/DTD. The parser accepts bare ampersands, so check
  // the emitted entity grammar independently before inspecting its DOM.
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/.test(markup)) throw new SyntaxError("Unescaped XML entity reference.");
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
}

/**
 * Select parsed SVG elements containing the requested class token.
 * @responsibility computation
 * @param {unknown} document - Independent parsed XML document, or the browser DOM in consumer checks.
 * @param {unknown} className - CSS class token used for wrapper styling or DOM selection.
 * @returns {Array} The result returned by Array.from(document.getElementsByTagName("*")).filter.
 */
export function byClass(document, className) {
  return Array.from(document.getElementsByTagName("*")).filter(/**
   * Evaluate the selection condition element.getAttribute("class")?.split(" ").includes(className).
   * @responsibility computation
   * @param {Element} element - Parsed SVG DOM element observed independently of renderer internals.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ element => element.getAttribute("class")?.split(" ").includes(className));
}

/**
 * Project technical owner, direction and signed-delta facts for comparison with independently declared events.
 * @responsibility computation
 * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
 * @returns {Array} The result returned by result.model.traversal.segments.filter(segment => segment.kind === "technical").map.
 */
export function technicalFacts(result) {
  return result.model.traversal.segments.filter(/**
   * Evaluate the selection condition segment.kind === "technical".
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ segment => segment.kind === "technical").map(/**
   * Project the current entry into an ordered tuple for result.model.traversal.segments.filter(segment =>
   * segment.kind === "technical").map.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {Array} The ordered records or values assembled above.
   */ segment =>
    [result.model.elements[segment.elementIndex].id, segment.direction, segment.verticalDeltaMeters]);
}

/**
 * Project physical points and segment ownership without display-specific geometry.
 * @responsibility computation
 * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
 * @returns {Array} The result returned by result.layout.points.map.
 */
export function progressionFacts(result) {
  return result.layout.points.map(/**
   * Project the current entry into an ordered tuple for result.layout.points.map.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {Array} The ordered records or values assembled above.
   */ point => [point.element?.id ?? null, point.x, point.y, point.elevationMeters]);
}

/**
 * Find prepared scene envelopes extending outside the declared viewBox.
 * @responsibility computation
 * @param {Object} scene - Complete renderer-owned scene with positioned primitives, IDs and fitted viewBox.
 * @returns {Array} The projected records or text described above, retaining collection order and the documented empty-value behavior.
 */
export function clippedBounds(scene) {
  const { x, y, width, height } = scene.viewBox;
  return [scene.contentBounds, scene.infoBox.bounds, scene.legend?.bounds, scene.bounds].filter(Boolean)
    .filter(/**
     * Evaluate the selection condition box.minX < x || box.minY < y || box.maxX > x + width || box.maxY > y +
     * height.
     * @responsibility computation
     * @param {unknown} box - SVG viewBox rectangle used for independent containment checks.
     * @returns {unknown} The result of the documented comparison or calculation.
     */ box => box.minX < x || box.minY < y || box.maxX > x + width || box.maxY > y + height);
}

/**
 * Project blocking status, diagnostics and cleared derived outputs for failure assertions.
 * @responsibility computation
 * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
 * @returns {Object} A record containing ok, model, layout, json.
 */
export function failureState(result) {
  return { ok: result.ok, model: result.model, layout: result.layout, json: result.json };
}

export const BLOCKED = { ok: false, model: null, layout: null, json: null };
