import { assertOptionsRecord, createTraversal } from "@subvertic/vrl-core";
import { diagramText, elementLabel } from "./locale.js";
import { resolveRenderLanguage } from "./presentation.js";
import { descriptionText, descriptionValue, descriptionSide } from "./description-text.js";

/**
 * Project normalized source facts into ordered localized text independently of layout, theme, icons or SVG.
 * @responsibility coordinator
 * @param {Object} route - Valid normalized route or compatible view; core remains responsible for semantic validation.
 * @param {Object} options - Language/locale selection using the renderer fallback policy; defaults to an empty record.
 * @returns {Object} Owned title, introduction, metadata, ordered element entries and plain-text description; no input is mutated.
 * @throws {TypeError} Options are not a plain record or the supplied route is not a compatible normalized view.
 */
export function describeRoute(route, options = {}) {
  assertOptionsRecord(options, "Description options");
  const language = resolveRenderLanguage(options);
  const traversal = route.traversal ?? createTraversal(route.elements);
  return routeDescription(route, traversal, language);
}

/**
 * Compute the complete ordered text projection using the resolved language and canonical traversal.
 * @responsibility computation
 * @param {Object} route - Compatible normalized route whose fields remain caller-owned.
 * @param {Object} traversal - Domain-owned movement segments and annotation associations.
 * @param {string} language - Resolved presentation language.
 * @returns {Object} Owned description records with complete plain text and explicit empty-route state.
 */
function routeDescription(route, traversal, language) {
  const words = descriptionText(language);
  const technical = new Map(), annotations = new Map();
  for (const segment of traversal.segments) if (segment.kind === "technical") technical.set(segment.elementIndex, segment);
  for (const item of traversal.annotations) annotations.set(item.elementIndex, item.pointIndex);
  const metadata = describeFields(route.metadata, route.extensions, language);
  const entries = [];
  for (const [index, element] of route.elements.entries()) entries.push(describeElement(element, index, technical.get(index), annotations.get(index), language));
  const title = `${route.name} ${diagramText(language).topo}`;
  const parts = [words.introduction, ...metadata];
  for (const entry of entries) parts.push(`${entry.elementIndex + 1}. ${entry.title}. ${entry.facts.join(". ")}${entry.facts.length === 0 ? "" : "."}`.trim());
  if (entries.length === 0) parts.push(words.empty);
  return { title, language, introduction: words.introduction, metadata, entries, empty: entries.length === 0 ? words.empty : null, text: parts.join("\n") };
}

/**
 * Describe one element with canonical movement/annotation ownership and explicit unknown critical measurements.
 * @responsibility computation
 * @param {Object} element - Normalized source element with attributes and optional extension strings.
 * @param {number} elementIndex - Original source position, retained independently of physical progression.
 * @param {Object|undefined} technical - Domain-owned technical segment, absent for other elements.
 * @param {number|null|undefined} pointIndex - Canonical annotation boundary; null is unattached and undefined is not an annotation.
 * @param {string} language - Resolved description language.
 * @returns {Object} Owned element identity, canonical annotation reference and ordered literal facts.
 */
function describeElement(element, elementIndex, technical, pointIndex, language) {
  const words = descriptionText(language);
  const attributes = { ...element.attributes };
  const facts = [];
  if (technical !== undefined) {
    facts.push(`${words.fields.direction}: ${words[technical.direction]}`, `${words.fields.delta}: ${descriptionValue(technical.verticalDeltaMeters === null ? null : {meters:technical.verticalDeltaMeters}, language)}`);
    if (attributes.height === undefined) attributes.height = null;
  }
  if (element.type === "rappel") for (const field of ["rope", "anchor", "anchor_count"]) if (attributes[field] === undefined) attributes[field] = null;
  if (element.type === "walk" && attributes.distance === undefined) attributes.distance = null;
  if (element.type === "pool") facts.push(`${words.fields.depth}: ${words.unknown}`);
  if (pointIndex !== undefined) facts.push(pointIndex === null ? words.unattached : `${words.boundary}: ${pointIndex + 1}`);
  for (const fact of describeFields(attributes, element.extensions, language)) facts.push(fact);
  const title = `${elementLabel(element.type, language)} ${element.id}${element.label == null || element.label === element.id ? "" : ` (${element.label})`}`;
  return { elementIndex, id: element.id, type: element.type, pointIndex: pointIndex ?? null, title, facts };
}

/**
 * Format all normalized fields in a stable key order, keeping extension values literal and explicitly marked.
 * @responsibility computation
 * @param {Object|undefined} attributes - Normalized attributes or metadata; absent records are empty.
 * @param {Object|undefined} extensions - Authored extension strings; normalized attributes take precedence for compatible legacy views.
 * @param {string} language - Resolved description language.
 * @returns {string[]} Localized field labels and complete values; unfamiliar fields are preserved without new domain semantics.
 */
function describeFields(attributes, extensions, language) {
  const words = descriptionText(language), fields = { ...extensions, ...attributes }, facts = [];
  for (const key of Object.keys(fields).sort()) {
    const known = Object.hasOwn(words.fields, key) && (Object.hasOwn(attributes ?? {}, key) || ["note", "text", "type"].includes(key));
    const value = known && key === "station" ? descriptionSide(fields[key], language) : descriptionValue(fields[key], language, ["note", "text"].includes(key) || !known);
    const label = known ? words.fields[key] : `${words.additional} "${key}"`;
    facts.push(`${label}: ${value}`);
  }
  return facts;
}
