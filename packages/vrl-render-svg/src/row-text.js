import { textBounds, textEnvelopeWidth, unionBounds } from "./scene-bounds.js";

/**
 * Wrap literal text into conservative width-bounded fragments without dropping characters or splitting surrogate pairs.
 * @responsibility computation
 * @param {string} text - Authored or localized text; whitespace remains part of the fragments.
 * @param {number} width - Available positive text width in drawing units.
 * @param {number} fontSize - Fixed readable font size, never reduced to fit.
 * @returns {string[]} Ordered fragments whose concatenation equals the input, including empty input.
 * @throws {RangeError} The width cannot contain one complete code point.
 */
export function wrapRowText(text, width, fontSize) {
  const lines = [];
  let line = "";
  for (const character of text) {
    if (textEnvelopeWidth(character, fontSize, "monospace") > width) throw new RangeError("Row text width cannot contain a complete character.");
    if (line !== "" && textEnvelopeWidth(line + character, fontSize, "monospace") > width) {
      const split = line.lastIndexOf(" ") + 1;
      if (split > line.length / 2) { lines.push(line.slice(0, split)); line = line.slice(split); }
      else { lines.push(line); line = ""; }
    }
    line += character;
    if (character === "\n") { lines.push(line); line = ""; }
  }
  if (line !== "" || lines.length === 0) lines.push(line);
  return lines;
}

/**
 * Position wrapped fact records at fixed 14/16-unit fonts, reserving identical icon gutters in both annotation modes.
 * @responsibility coordinator
 * @param {Object[]} records - Ordered text, heading and optional icon records retaining element ownership.
 * @param {number} x - Left edge of the block.
 * @param {number} top - Top of the first line's full envelope.
 * @param {number} width - Complete block width including optional icon space.
 * @param {boolean} visible - Whether reserved pictograms should be painted.
 * @returns {Object} Placed text/icons, conservative bounds and next free vertical coordinate.
 */
export function placeRowText(records, x, top, width, visible) {
  const lines = [], icons = [], envelopes = [];
  let y = top + 28;
  for (const record of records) {
    const fontSize = record.heading ? 16 : 14;
    const gutter = record.icon === null ? 0 : 32;
    const fragments = wrapRowText(record.text, width - gutter - 6, fontSize);
    if (record.icon !== null) {
      const icon = { id: record.icon, x, y: y - 18, size: 24 };
      if (visible) icons.push(icon);
      envelopes.push({ minX: x - 1, minY: y - 19, maxX: x + 25, maxY: y + 7 });
    }
    for (const text of fragments) {
      const line = { text, x: x + gutter, y, fontSize, heading: record.heading, elementIndex: record.elementIndex };
      lines.push(line);
      envelopes.push(textBounds(text, line.x, y, fontSize, "start", "monospace"));
      y += fontSize === 16 ? 28 : 24;
    }
    y += 4;
  }
  return { lines, icons, bounds: unionBounds(envelopes), bottom: y };
}
