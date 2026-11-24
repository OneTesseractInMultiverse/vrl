/**
 * Map a coordinate to an endpoint (odd cell) or the gap containing it (even cell).
 * Separate cells preserve closed-interval contact, including a single-point obstacle.
 * @responsibility computation
 * @param {Float64Array} endpoints - Distinct vertical coordinates in ascending order.
 * @param {number} y - Scene coordinate to locate.
 * @returns {number} Zero-based cell, including exterior gaps before and after the endpoints.
 */
function verticalCell(endpoints, y) {
  let low = 0, high = endpoints.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (endpoints[middle] < y) low = middle + 1;
    else high = middle;
  }
  return 2 * low + Number(endpoints[low] === y);
}

/**
 * Cover a closed leaf range with disjoint segment-tree nodes, taking at most two per level.
 * @responsibility computation
 * @param {number} left - Tree position of the first included leaf.
 * @param {number} right - Tree position of the last included leaf.
 * @returns {Generator<number>} Tree positions whose spans exactly partition the requested range.
 */
function* coveringNodes(left, right) {
  while (left <= right) {
    if (left % 2 === 1) yield left++;
    if (right % 2 === 0) yield right--;
    left = Math.floor(left / 2);
    right = Math.floor(right / 2);
  }
}

/**
 * Index the greatest right edge over each vertical span in O(n log n) time and O(n) space.
 * @responsibility computation
 * @param {Object[]} envelopes - Scene-owned bounds with finite minY, maxY and maxX.
 * @returns {Object} Sorted endpoints, first leaf position and maximum right edge for every tree node.
 */
export function createClearanceIndex(envelopes) {
  const coordinates = new Set();
  for (const envelope of envelopes) {
    coordinates.add(envelope.minY);
    coordinates.add(envelope.maxY);
  }
  const endpoints = Float64Array.from(coordinates).sort();
  const firstLeaf = 2 ** Math.ceil(Math.log2(2 * endpoints.length + 1));
  const maxima = new Float64Array(2 * firstLeaf).fill(-Infinity);
  for (const { minY, maxY, maxX } of envelopes) {
    const left = firstLeaf + verticalCell(endpoints, minY);
    const right = firstLeaf + verticalCell(endpoints, maxY);
    for (const node of coveringNodes(left, right)) maxima[node] = Math.max(maxima[node], maxX);
  }
  // Every leaf inherits the largest edge covering its whole cell.
  for (let node = 2; node < maxima.length; node += 1) {
    maxima[node] = Math.max(maxima[node], maxima[Math.floor(node / 2)]);
  }
  // Internal nodes now summarize the largest edge anywhere in their span.
  for (let node = firstLeaf - 1; node > 0; node -= 1) {
    maxima[node] = Math.max(maxima[2 * node], maxima[2 * node + 1]);
  }
  return { endpoints, firstLeaf, maxima };
}

/**
 * Find the greatest right edge of any envelope touching a label block in O(log n) time.
 * @responsibility computation
 * @param {Object} index - Precomputed vertical cells and their segment-tree maxima.
 * @param {number} top - Inclusive upper edge of the label block.
 * @param {number} bottom - Inclusive lower edge of the label block.
 * @returns {number} Rightmost edge in drawing units, or negative infinity when the span is clear.
 */
export function rightmostEdge(index, top, bottom) {
  const left = index.firstLeaf + verticalCell(index.endpoints, top);
  const right = index.firstLeaf + verticalCell(index.endpoints, bottom);
  let edge = -Infinity;
  for (const node of coveringNodes(left, right)) edge = Math.max(edge, index.maxima[node]);
  return edge;
}
