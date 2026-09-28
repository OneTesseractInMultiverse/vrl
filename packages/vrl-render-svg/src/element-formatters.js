import { elementAttribute } from "./route-data.js";
import { softTerrainText } from "./soft-terrain-text.js";
import { diagramText, elementLabel, localizeDetailValue } from "./locale.js";

const ELEMENT_COLOR_TOKENS = {
  start: "exit",
  exit: "exit",
  walk: "routeLine",
  rappel: "rappel",
  downclimb: "anchor",
  climb: "anchor",
  pool: "water",
  hazard: "hazard",
  note: "warning"
};

/**
 * Choose the semantic theme-token name for an element's type.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {string} Semantic theme-token name; unsupported types use routeLine.
 */
export function elementColorToken(element) {
  return ELEMENT_COLOR_TOKENS[element.type] ?? "routeLine";
}

/**
 * Format the element's identity and localized type label without altering its model.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Localized element type with its supplied label or identity when present.
 */
export function formatElementTitle(element, language = "en") {
  const baseLabel = elementLabel(element.type, language);
  const name = element.label ?? element.id;
  return name === null ? baseLabel : `${baseLabel} ${name}`;
}

/**
 * Format supplied element attributes as human-readable detail text, retaining explicit unknown height/rope/depth.
 * Only normalized pool depth is interpreted; historical extension text remains literal documentary data.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @returns {string} Human-readable declared measurements and descriptive attributes, or empty text when the element has no details.
 */
export function formatElementDetail(element, language = "en") {
  if (element.type === "rappel") {
    return [element.attributes.height === "unknown" ? localizeDetailValue("unknown", language) : formatMeasurement(element.attributes.height), element.attributes.rope === "unknown" ? localizeDetailValue("unknown", language) : formatMeasurement(element.attributes.rope), localizeDetailValue(element.attributes.anchor, language)]
      .filter(Boolean)
      .join(" / ");
  }

  if (element.type === "walk") {
    return formatMeasurement(element.attributes.distance);
  }

  if (element.type === "pool" && element.attributes.depth !== undefined) {
    const text = softTerrainText(language);
    return [labeledDetail(text.depth, element.attributes.depth === "unknown" ? localizeDetailValue("unknown", language) : formatMeasurement(element.attributes.depth)),
      labeledDetail(text.poolType, localizeDetailValue(element.attributes.type, language)), elementAttribute(element, "note")]
      .filter(Boolean).join(" / ");
  }

  if (element.type === "downclimb" || element.type === "climb") {
    return [formatMeasurement(element.attributes.height), labeledDetail(diagramText(language).exposure, localizeDetailValue(element.attributes.exposure, language))]
      .filter(Boolean)
      .join(" / ");
  }

  if (element.type === "note") {
    return elementAttribute(element, "text") ?? "";
  }

  if (element.type === "hazard") {
    return [
      labeledDetail(diagramText(language).severity, localizeDetailValue(element.attributes.severity, language)),
      elementAttribute(element, "note") ?? localizeDetailValue(elementAttribute(element, "type"), language)
    ]
      .filter(Boolean)
      .join(" / ");
  }

  return elementAttribute(element, "note") ?? localizeDetailValue(elementAttribute(element, "type"), language) ?? "";
}

/**
 * Format an available typed metric measurement, retaining the helper's empty-text convention for absent
 * values.
 * @responsibility computation
 * @param {unknown} measurement - Typed metric measurement containing a numeric meters value.
 * @returns {string} Numeric meters followed by m for a typed object; nonobject inputs yield empty text.
 */
export function formatMeasurement(measurement) {
  if (typeof measurement !== "object") {
    return "";
  }

  return `${measurement.meters}m`;
}

/**
 * Prefix nonempty detail text with its localized label; omit missing detail values.
 * @responsibility computation
 * @param {string} label - Unescaped display label supplied by the caller.
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {string} Label and nonempty value joined with a colon, or empty text for an absent value.
 */
function labeledDetail(label, value) {
  return value === undefined || value === "" ? "" : `${label}: ${value}`;
}
