/**
 * Construct a padded finite rectangular envelope; reject overflow after adding padding. Conservative geometry
 * envelopes, independent of SVG serialization and browser APIs.
 * @responsibility computation
 * @param {number} minX - Minimum horizontal content extent in drawing units.
 * @param {number} minY - Minimum vertical content extent in drawing units.
 * @param {number} maxX - Maximum horizontal content extent in drawing units.
 * @param {number} maxY - Maximum vertical content extent in drawing units.
 * @param {number} padding - Additional envelope clearance in drawing units; defaults to 0.
 * @returns {unknown} The result value selected or validated above.
 */

export function bounds(minX, minY, maxX, maxY, padding = 0) {
  const result = { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding };
  Object.values(result).forEach(requireSceneNumber);
  return result;
}

/**
 * Compute the minimal union of supplied envelopes, returning a zero rectangle for an empty list.
 * @responsibility computation
 * @param {Array} items - Prepared records whose aggregate is computed.
 * @returns {Object} Finite union rectangle, or a zero rectangle for an empty collection.
 */
export function unionBounds(items) {
  return items.reduce(/**
   * Expand the accumulated rectangle to enclose the current bounds, using the first rectangle directly.
   * @responsibility computation
   * @param {unknown} result - Observed compiler, renderer or process result to project or validate.
   * @param {unknown} item - Current prepared record or test case.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (result, item) => result === null ? item : bounds(
    Math.min(result.minX, item.minX), Math.min(result.minY, item.minY),
    Math.max(result.maxX, item.maxX), Math.max(result.maxY, item.maxY)
  ), null) ?? bounds(0, 0, 0, 0);
}

/**
 * Reserve 1.25 em per UTF-16 unit as a conservative envelope for wide glyphs and fallback fonts. Reserve 1.25
 * em per UTF-16 unit for bold wide glyphs and font fallback.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {number} fontSize - Text size in drawing units used for width estimation and placement.
 * @returns {number} Conservative text-envelope width in drawing units, with no browser font lookup.
 */

export function textEnvelopeWidth(value, fontSize) {
  return String(value).length * fontSize * 1.25;
}

/**
 * Compute a conservative text envelope honoring start, middle or end anchoring and clearance stroke.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {number} x - Horizontal position in SVG drawing units.
 * @param {number} y - Vertical position in SVG drawing units.
 * @param {number} fontSize - Text size in drawing units used for width estimation and placement.
 * @param {unknown} anchor - SVG text alignment: start, middle or end; defaults to "start".
 * @returns {Object} Finite conservative text rectangle including anchor alignment and clearance padding.
 */
export function textBounds(value, x, y, fontSize, anchor = "start") {
  const width = textEnvelopeWidth(value, fontSize);
  const left = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  return bounds(left, y - fontSize * 1.5, left + width, y + fontSize * 0.75, 3);
}

/**
 * Expand the SVG viewBox around all content with 12-unit margins while respecting minimum dimensions and
 * finite magnitude limits.
 * @responsibility computation
 * @param {Object} content - Complete minX/minY/maxX/maxY content envelope in drawing units.
 * @param {number} minimumWidth - Minimum output width in drawing units.
 * @param {number} minimumHeight - Minimum output height in drawing units.
 * @returns {Object} Finite x/y/width/height viewBox enclosing content and the minimum requested canvas.
 */
export function fitSceneBounds(content, minimumWidth, minimumHeight) {
  const x = Math.floor(Math.min(0, content.minX - 12));
  const y = Math.floor(Math.min(0, content.minY - 12));
  const right = Math.ceil(Math.max(minimumWidth, content.maxX + 12));
  const bottom = Math.ceil(Math.max(minimumHeight, content.maxY + 12));
  const viewBox = { x, y, width: right - x, height: bottom - y };
  Object.values(viewBox).forEach(requireSceneNumber);
  return viewBox;
}

/**
 * Reject nonfinite or out-of-range derived scene dimensions before serializing SVG.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {void} Returns normally for finite supported drawing coordinates; otherwise throws RangeError.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
function requireSceneNumber(value) {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Complete diagram bounds must be finite with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.");
  }
}
