/**
 * Collect serialized chunks in document order while enforcing a shared output limit before the final join.
 * @responsibility computation
 * @param {Iterable<string>} chunks - Lazily serialized layers or elements, including all markup and whitespace.
 * @param {number} maximum - Maximum complete document length in UTF-16 code units.
 * @returns {string} The complete SVG document.
 * @throws {RangeError} Adding a chunk would exceed the inclusive output limit.
 */
export function joinSvgDocument(chunks, maximum = 8 * 1024 * 1024) {
  const parts = [];
  let length = 0;
  for (const chunk of chunks) {
    length += chunk.length;
    if (length > maximum) throw new RangeError(`SVG output exceeds ${maximum} UTF-16 code units.`);
    parts.push(chunk);
  }
  return parts.join("");
}
