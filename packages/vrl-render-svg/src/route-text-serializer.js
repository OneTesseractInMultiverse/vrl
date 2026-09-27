import { escapeXml } from "./xml.js";

/**
 * Encode an ordered route text alternative as ordinary HTML, usable beside an inline or external SVG image.
 * @responsibility computation
 * @param {Object} description - Fully localized description records, including complete ordered source facts.
 * @param {string} id - Caller-namespaced ID for the adjacent text section, distinct from SVG metadata IDs.
 * @returns {string} Escaped HTML with native paragraph/list semantics; no facts are inferred from rendered SVG.
 */
export function serializeRouteText(description, id) {
  let metadata = "", entries = "";
  for (const fact of description.metadata) metadata += `<li>${escapeXml(fact)}</li>`;
  for (const entry of description.entries) {
    let facts = "";
    for (const fact of entry.facts) facts += `<li>${escapeXml(fact)}</li>`;
    entries += `<li><p>${escapeXml(entry.title)}</p><ul>${facts}</ul></li>`;
  }
  return `<section lang="${escapeXml(description.language)}" id="${escapeXml(id)}"><h2>${escapeXml(description.title)}</h2><p>${escapeXml(description.introduction)}</p><ul>${metadata}</ul><ol>${entries}</ol>${description.empty === null ? "" : `<p>${escapeXml(description.empty)}</p>`}</section>`;
}
