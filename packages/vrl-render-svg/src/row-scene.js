import { describeRoute } from "./route-description.js";
import { bounds, unionBounds, fitSceneBounds } from "./scene-bounds.js";
import { validateRowPolicy, rowSections, continuationCode, validateRowExtent } from "./row-policy.js";
import { rowVocabulary, rowFact, rowElementFacts } from "./row-facts.js";
import { placeRowText } from "./row-text.js";
import { rowGeometry, rowTechnical } from "./row-geometry.js";
import { prepareInfoBox } from "./panel-scene.js";
import { annotationLegendEntries } from "./annotation-icons.js";
import { resolveRenderLanguage } from "./presentation.js";
import { resolveSvgIdentifiers } from "./svg-identifiers.js";

/**
 * Coordinate canonical section grouping, readable text placement, complete bounds and deterministic continuation pairs.
 * @responsibility coordinator
 * @param {Object} route - Normalized route, whose records and physical measurements are never modified.
 * @param {Object} layout - Matching canonical core layout with an explicit supported width.
 * @param {Object} options - Validated rendering options; row mode requires soft terrain.
 * @returns {Object} Row scene with independent display coordinates and original canonical ownership records.
 * @throws {RangeError} Constraints or completed scene height exceed the documented resource policy.
 */
export function computeRowScene(route, layout, options) {
  const traversal = validateRowPolicy(route, layout);
  const language = resolveRenderLanguage(options), words = rowVocabulary(language);
  const sections = rowSections(route, traversal);
  const nodes = new Map();
  for (const node of layout.nodes) nodes.set(node.elementIndex, node);
  const records = [rowFact(route.name, null, true), rowFact(words.intro)];
  for (const line of prepareInfoBox(route, layout, language).lines.slice(1)) records.push(rowFact(line));
  if (sections.length === 0) records.push(rowFact(words.empty));
  const header = placeRowText(records, 24, 16, layout.width - 48, false);
  const rows = [];
  let top = header.bottom + 16;
  for (const [index, section] of sections.entries()) {
    const row = prepareRow(section, index, sections.length, route, layout, nodes, options, language, top);
    rows.push(row);
    top = row.bounds.maxY + 24;
  }
  const legend = options.legend === false ? null : prepareRowLegend(language, options.symbols, layout.width, top);
  const envelopes = [header.bounds];
  for (const row of rows) envelopes.push(row.bounds);
  if (legend !== null) envelopes.push(legend.bounds);
  const complete = unionBounds(envelopes);
  const viewBox = fitSceneBounds(complete, layout.width, 0);
  validateRowExtent(viewBox, layout.width);
  const description = describeRoute(route, {language});
  return { flow: "rows", style: "soft-terrain", title: description.title, description: description.text,
    language, identifiers: resolveSvgIdentifiers(options.idPrefix), header, rows, legend,
    traversal, physicalPoints: layout.points, bounds: complete, viewBox };
}

/**
 * Prepare one complete progression section and attach its incoming/outgoing display-only continuation records.
 * @responsibility coordinator
 * @param {Object} section - Source indexes and canonical segment/annotation ownership for this section.
 * @param {number} index - Zero-based section order.
 * @param {number} count - Total section count determining endpoint continuations.
 * @param {Object} route - Normalized source elements.
 * @param {Object} layout - Core points and owned segments with physical deltas.
 * @param {Map} nodes - Core nodes indexed by their source element index.
 * @param {Object} options - Validated symbol options.
 * @param {string} language - Resolved display language.
 * @param {number} top - Absolute top position of this section.
 * @returns {Object} Complete section scene, growing vertically to retain all text and technical details.
 */
function prepareRow(section, index, count, route, layout, nodes, options, language, top) {
  const words = rowVocabulary(language), width = layout.width - 32;
  const incoming = index === 0 ? null : rowContinuation(index - 1, "in", index, top, words);
  const caption = placeRowText([rowFact(`${words.section} ${index + 1}`, null, true)], 24, (incoming === null ? top : incoming.block.bottom + 4), width - 16, false);
  const segments = [];
  let technical = null;
  for (const segmentIndex of section.segmentIndexes) {
    const segment = layout.segments[segmentIndex];
    segments.push(segment);
    if (segment.kind === "technical") technical = rowTechnical(segment, width, caption.bottom, language);
  }
  const element = section.owner === null ? null : route.elements[section.owner];
  const geometry = rowGeometry(technical, element, width, caption.bottom);
  const records = [];
  for (const elementIndex of section.elementIndexes) records.push(...rowElementFacts(route.elements[elementIndex], nodes.get(elementIndex), elementIndex, language, options.symbols));
  for (const segment of segments) if (segment.kind === "technical") records.push(rowFact(`${words.delta}: ${segment.verticalDeltaMeters === null ? words.unknown : `${segment.verticalDeltaMeters}m`}`, segment.elementIndex));
  const details = placeRowText(records, 24, geometry.bounds.maxY + 8, width - 16, options.symbols !== "minimal");
  const outgoing = index === count - 1 ? null : rowContinuation(index, "out", index + 2, details.bottom + 4, words);
  const bottom = (outgoing === null ? details.bottom : outgoing.block.bottom) + 8;
  return { ...section, index, segments, technical, incoming, outgoing, caption, geometry, details,
    bounds: unionBounds([bounds(16, top, layout.width - 16, bottom), geometry.bounds, caption.bounds, details.bounds,
      ...(incoming === null ? [] : [incoming.block.bounds]), ...(outgoing === null ? [] : [outgoing.block.bounds])]) };
}

/**
 * Place one half of a continuation pair with explicit target section and directional wording.
 * @responsibility coordinator
 * @param {number} boundary - Zero-based boundary shared by the outgoing and incoming pair.
 * @param {string} role - in or out, indicating the half of the pair.
 * @param {number} sectionNumber - One-based source/target section printed for the reader.
 * @param {number} top - Absolute top coordinate of the marker text.
 * @param {Object} words - Resolved row vocabulary.
 * @returns {Object} Unambiguous code and a readable block whose fixed width fits every supported canvas.
 */
function rowContinuation(boundary, role, sectionNumber, top, words) {
  const code = continuationCode(boundary);
  const text = `${code} ${role === "out" ? "↓" : "→"} ${role === "out" ? words.next : words.previous} ${sectionNumber}`;
  return { code, role, sectionNumber, block: placeRowText([rowFact(text)], 24, top, 264, false) };
}

/**
 * Wrap a row-specific legend, describing only visible schematic primitives and selected pilot symbols.
 * @responsibility coordinator
 * @param {string} language - Resolved display language.
 * @param {string} symbols - Symbol presentation, including minimal with reserved pilot slots.
 * @param {number} width - Exact document width.
 * @param {number} top - First free vertical coordinate below all sections.
 * @returns {Object} Complete readable legend block with shared text and icon bounds.
 */
function prepareRowLegend(language, symbols, width, top) {
  const words = rowVocabulary(language);
  const records = [rowFact(words.legend, null, true), rowFact(words.key)];
  if (symbols === "annotations" || symbols === "minimal") for (const [id, label] of annotationLegendEntries(language)) records.push(rowFact(label, null, false, id));
  return placeRowText(records, 24, top, width - 48, symbols !== "minimal");
}
