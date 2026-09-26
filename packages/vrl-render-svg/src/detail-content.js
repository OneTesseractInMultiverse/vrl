import { softTerrainText } from "./soft-terrain-text.js";
import { anchorSummary } from "./anchor-presentation.js";
import { formatElementDetail, formatMeasurement } from "./element-formatters.js";
import { diagramText, localizeDetailValue } from "./locale.js";
import { elementAttribute } from "./route-data.js";

/**
 * Project typed element facts into localized text and badge records; soft style explicitly represents unknown
 * measurements and quantities. Categories come from normalized fields; display text never supplies semantics.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {Object} node - Positioned route point with x/y and its owning normalized element when required; defaults to null.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to "en".
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts; defaults to "classic".
 * @returns {unknown} The ordered records or values assembled above. The result returned by compactDetails.
 */

export function detailRecordsForElement(element, node = null, language = "en", style = "classic") {
  const text = diagramText(language);
  const attributes = element.attributes;
  if ((element.type === "start" || element.type === "exit") && typeof node?.elevationMeters === "number") {
    return [plainDetail(`${node.elevationMeters}m`)];
  }
  if (element.type === "rappel") {
    return compactDetails([
      plainDetail(ropeText(attributes.rope, language, style)), plainDetail(anchorText(element, language, style)),
      landingDetail(attributes.landing, language),
      levelDetail("flow", attributes.flow, text.flow, language), inclinationDetail(attributes.inclination), styleNote(element, style)
    ]);
  }
  if (element.type === "downclimb" || element.type === "climb") {
    return compactDetails([
      plainDetail(formatMeasurement(attributes.height)), levelDetail("exposure", attributes.exposure, text.exposure, language),
      landingDetail(attributes.landing, language), inclinationDetail(attributes.inclination), styleNote(element, style)
    ]);
  }
  if (element.type === "pool" && style === "soft-terrain") {
    return compactDetails([plainDetail(attributes.type === undefined || attributes.type === "unknown"
      ? softTerrainText(language).poolUnknown : localizeDetailValue(attributes.type, language)),
      levelDetail("flow", attributes.flow, text.flow, language), styleNote(element, style)]);
  }
  if (element.type === "hazard") {
    return compactDetails([
      levelDetail("hazardSeverity", attributes.severity, text.severity, language),
      plainDetail(elementAttribute(element, "note") ?? localizeDetailValue(elementAttribute(element, "type"), language) ?? "")
    ]);
  }
  return compactDetails([plainDetail(formatElementDetail(element, language)), element.type === "walk" ? styleNote(element, style) : null]);
}

/**
 * Wrap literal detail text as a typed text record without interpreting user punctuation.
 * @responsibility computation
 * @param {unknown} text - Unescaped text owned by the caller; encoding occurs at the serialization boundary.
 * @returns {Object} A record containing kind, text.
 */
export function plainDetail(text) {
  return { kind: "text", text };
}

/**
 * Project a typed detail record into its readable text representation.
 * @responsibility computation
 * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function detailRecordText(record) {
  return record.kind === "text" ? record.text : `${record.prefix}${record.label}`;
}

/**
 * Remove absent or empty detail records while preserving meaningful records in source order.
 * @responsibility computation
 * @param {Array} records - Typed detail records in display order.
 * @returns {Array} The result returned by records.filter.
 */
function compactDetails(records) {
  return records.filter(/**
   * Evaluate the selection condition record !== null && detailRecordText(record) !== "".
   * @responsibility computation
   * @param {unknown} record - Typed detail record or parsed source entry consumed by this transformation.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (record) => record !== null && detailRecordText(record) !== "");
}

/**
 * Create a localized categorical badge record for a recognized level, or omit unsupported values.
 * @responsibility computation
 * @param {string} category - Badge category selecting supported vocabulary and theme tokens.
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {unknown} prefix - Text prefix or namespace retained before the formatted value.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function levelDetail(category, value, prefix, language) {
  return value === undefined || value === "" ? null : {
    kind: "badge", category, value, className: value, prefix: `${prefix}: `, label: localizeDetailValue(value, language)
  };
}

/**
 * Create a percentage badge from a supplied typed inclination without inferring missing data.
 * @responsibility computation
 * @param {unknown} inclination - Typed percentage inclination, when explicitly supplied.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function inclinationDetail(inclination) {
  return typeof inclination !== "object" || inclination === null ? null : {
    kind: "badge", category: "inclination", value: inclination.percent, className: "inclination", prefix: "", label: `${inclination.percent}%`
  };
}

/**
 * Format a supplied landing description with localized vocabulary.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function landingDetail(value, language) {
  return value === undefined || value === "" ? null : plainDetail(`${diagramText(language).landing}: ${localizeDetailValue(value, language)}`);
}

/**
 * Format supplied rope length, using explicit declared-rope wording for soft terrain.
 * @responsibility computation
 * @param {unknown} rope - Explicitly declared typed rope measurement; no equipment requirement is inferred.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function ropeText(rope, language, style) {
  const value = formatMeasurement(rope);
  return style === "soft-terrain" ? `${softTerrainText(language).rope}: ${value}` : value;
}

/**
 * Format anchor type and complete quantity, explicitly naming an unknown count in soft style.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy.
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function anchorText(element, language, style) {
  const count = anchorSummary(element, language);
  return style === "soft-terrain"
    ? `${localizeDetailValue(element.attributes.anchor ?? "unknown", language)} / ${count || softTerrainText(language).countUnknown}` : count;
}

/**
 * Select the element's additional authored note for the rendering style that displays it.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} style - Renderer style, classic or soft-terrain; does not alter route facts.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function styleNote(element, style) {
  return style === "soft-terrain" ? plainDetail(elementAttribute(element, "note") ?? "") : null;
}
