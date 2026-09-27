import { createTraversal } from "@subvertic/vrl-core";

/**
 * Require bounded explicit row constraints and matching canonical layout ownership before allocating presentation records.
 * @responsibility computation
 * @param {Object} route - Normalized route with ordered elements and optional canonical traversal.
 * @param {Object} layout - Validated core layout; rows require canonical points and segments.
 * @returns {Object} Canonical traversal, reused or derived through the public core port.
 * @throws {RangeError} Width, element count, authored text or canonical correspondence exceeds the row policy.
 */
export function validateRowPolicy(route, layout) {
  if (!Number.isInteger(layout.width) || layout.width < 320 || layout.width > 2048) throw new RangeError("Row layout width must be an integer from 320 to 2048.");
  if (route.elements.length > 256 || JSON.stringify(route).length > 100000) throw new RangeError("Row layout supports at most 256 elements and 100000 serialized route characters.");
  const traversal = route.traversal ?? createTraversal(route.elements);
  if (!Array.isArray(layout.points) || layout.points.length !== traversal.points.length || layout.nodes.length !== route.elements.length || layout.segments.length !== traversal.segments.length) {
    throw new RangeError("Row layout requires a complete canonical layout for this route.");
  }
  for (const [index, point] of layout.points.entries()) {
    if (point.elementIndex !== traversal.points[index].elementIndex) throw new RangeError("Row layout point ownership must match canonical traversal.");
  }
  const seen = new Set();
  for (const node of layout.nodes) {
    const expected = route.elements[node.elementIndex];
    if (expected === undefined || seen.has(node.elementIndex) || node.element.id !== expected.id || node.element.type !== expected.type) throw new RangeError("Row layout nodes must identify every route element exactly once.");
    seen.add(node.elementIndex);
  }
  for (const [index, segment] of traversal.segments.entries()) {
    const placed = layout.segments[index];
    if (placed.from !== segment.from || placed.to !== segment.to || placed.elementIndex !== segment.elementIndex || placed.direction !== segment.direction || placed.verticalDeltaMeters !== segment.verticalDeltaMeters) {
      throw new RangeError("Row layout segment ownership must match canonical traversal.");
    }
  }
  return traversal;
}

/**
 * Group each progression element with following annotations, retaining leading annotations in the first complete section.
 * @responsibility computation
 * @param {Object} route - Source-ordered normalized elements.
 * @param {Object} traversal - Canonical annotation ownership supplied by the domain.
 * @returns {Object[]} Sections with ordered source indexes; annotations never create an extra progression section.
 */
export function rowSections(route, traversal) {
  const annotations = new Set();
  for (const item of traversal.annotations) annotations.add(item.elementIndex);
  const sections = [];
  let section = null;
  for (let index = 0; index < route.elements.length; index += 1) {
    if (section === null || !annotations.has(index) && section.owner !== null) {
      section = { owner: null, elementIndexes: [], annotations: [], segmentIndexes: [] };
      sections.push(section);
    }
    if (!annotations.has(index)) section.owner = index;
    section.elementIndexes.push(index);
  }
  const owners = new Map();
  for (const [index, item] of sections.entries()) for (const elementIndex of item.elementIndexes) owners.set(elementIndex, index);
  for (const item of traversal.annotations) sections[owners.get(item.elementIndex)].annotations.push({ ...item });
  for (const [index, segment] of traversal.segments.entries()) {
    const owner = segment.elementIndex ?? traversal.points[segment.to].elementIndex;
    sections[owners.get(owner)].segmentIndexes.push(index);
  }
  return sections;
}

/**
 * Encode a zero-based row boundary as an unambiguous spreadsheet-style label, continuing beyond Z.
 * @responsibility computation
 * @param {number} index - Nonnegative boundary index below the documented section limit.
 * @returns {string} Unique uppercase label A, B, ..., Z, AA, AB, ... .
 */
export function continuationCode(index) {
  let value = index + 1, code = "";
  while (value > 0) {
    value -= 1;
    code = String.fromCharCode(65 + value % 26) + code;
    value = Math.floor(value / 26);
  }
  return code;
}

/**
 * Reject any fitted content that escapes the exact requested width or the finite row height budget.
 * @responsibility computation
 * @param {Object} viewBox - Complete bounds fitted by the shared scene bounds owner.
 * @param {number} width - Validated requested document width.
 * @returns {void} Returns only when no horizontal growth or excessive height would be hidden.
 * @throws {RangeError} Fitted width differs or height exceeds 50000 drawing units.
 */
export function validateRowExtent(viewBox, width) {
  if (viewBox.width !== width || viewBox.height > 50000) throw new RangeError("Row layout content exceeds its fixed width or 50000-unit height constraint.");
}
