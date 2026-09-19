/** Conservative geometry envelopes, independent of SVG serialization and browser APIs. */
export function bounds(minX, minY, maxX, maxY, padding = 0) {
  const result = { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding };
  Object.values(result).forEach(requireSceneNumber);
  return result;
}

export function unionBounds(items) {
  return items.reduce((result, item) => result === null ? item : bounds(
    Math.min(result.minX, item.minX), Math.min(result.minY, item.minY),
    Math.max(result.maxX, item.maxX), Math.max(result.maxY, item.maxY)
  ), null) ?? bounds(0, 0, 0, 0);
}

/** Reserve 1.25 em per UTF-16 unit for bold wide glyphs and font fallback. */
export function textEnvelopeWidth(value, fontSize) {
  return String(value).length * fontSize * 1.25;
}

export function textBounds(value, x, y, fontSize, anchor = "start") {
  const width = textEnvelopeWidth(value, fontSize);
  const left = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  return bounds(left, y - fontSize * 1.5, left + width, y + fontSize * 0.75, 3);
}

export function fitSceneBounds(content, minimumWidth, minimumHeight) {
  const x = Math.floor(Math.min(0, content.minX - 12));
  const y = Math.floor(Math.min(0, content.minY - 12));
  const right = Math.ceil(Math.max(minimumWidth, content.maxX + 12));
  const bottom = Math.ceil(Math.max(minimumHeight, content.maxY + 12));
  const viewBox = { x, y, width: right - x, height: bottom - y };
  Object.values(viewBox).forEach(requireSceneNumber);
  return viewBox;
}

function requireSceneNumber(value) {
  if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
    throw new RangeError("Complete diagram bounds must be finite with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.");
  }
}
