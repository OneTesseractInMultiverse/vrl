import { annotationIconId } from "./annotation-icons.js";
import { resolveElementIconId } from "@subvertic/vrl-icons/semantics";
import { detailRecordsForElement, detailRecordText } from "./detail-content.js";
import { formatElementTitle, formatMeasurement } from "./element-formatters.js";
import { elementAttribute } from "./route-data.js";
import { localizeDetailValue } from "./locale.js";
import { rappelStagesForElement, redirectionsForElement, redirectionLabel, redirectionSideSuffix, formatMeters } from "./presentation.js";

const EN = Object.freeze({ intro: "Schematic, not to scale. Read sections top to bottom and match continuation letters.", section: "Section", next: "Continue to section", previous: "From section", drop: "Physical height", station: "Station", stage: "Stage", redirection: "Redirection", distance: "Walking distance compressed", elevation: "Elevation", delta: "Vertical change", unknown: "unknown", empty: "No route elements", legend: "Reading the rows", schematic: "Schematic sections, read top to bottom. Matching letter pairs continue the same route; row breaks are not route events. Curves and walking lengths are not to scale.", key: "Arrow: traversal direction. Short ticks: stage boundaries. Diamonds: redirections. Double ticks: station side. Zigzag: compressed walking distance. Text retains declared facts and counts." });
const ES = Object.freeze({ intro: "Esquema sin escala. Lea los tramos de arriba abajo y siga las letras de continuacion.", section: "Tramo", next: "Continua al tramo", previous: "Desde el tramo", drop: "Altura fisica", station: "Reunion", stage: "Etapa", redirection: "Desviador", distance: "Distancia a pie comprimida", elevation: "Elevacion", delta: "Cambio vertical", unknown: "desconocido", empty: "Sin elementos", legend: "Lectura de las filas", schematic: "Tramos esquematicos, de arriba abajo. Las letras emparejadas continuan la misma ruta; los saltos de fila no son eventos. Curvas y distancias a pie no estan a escala.", key: "Flecha: sentido de progresion. Trazos cortos: limites de etapas. Rombos: desviadores. Trazos dobles: lado de reunion. Zigzag: distancia a pie comprimida. El texto conserva los datos y cantidades declarados." });

/**
 * Select the immutable row-layout vocabulary after the ordinary renderer language resolution.
 * @responsibility computation
 * @param {string} language - Resolved en or es language.
 * @returns {Object} Localized continuation, measurement and schematic wording.
 */
export function rowVocabulary(language) { return language === "es" ? ES : EN; }

/**
 * Construct one literal fact record without deriving meaning from its formatted text.
 * @responsibility computation
 * @param {string} text - Full fact text before wrapping.
 * @param {number|null} elementIndex - Owning source element or null for document-level text.
 * @param {boolean} heading - Whether this record uses the larger heading font; defaults to false.
 * @param {string|null} icon - Optional exact icon identity; defaults to null.
 * @returns {Object} New immutable-by-convention presentation input.
 */
export function rowFact(text, elementIndex = null, heading = false, icon = null) { return { text, elementIndex, heading, icon }; }

/**
 * Project an element's full visible facts and technical associations, using existing formatting and canonical measurements.
 * @responsibility computation
 * @param {Object} element - Original normalized element, never modified.
 * @param {Object} node - Its positioned core node, retaining optional physical elevation.
 * @param {number} index - Source element index used to preserve association through wrapping.
 * @param {string} language - Resolved display language.
 * @param {string} symbols - Symbol mode; minimal reserves the same pilot gutter as annotations.
 * @returns {Object[]} Source-ordered title, details, station, stage and redirection facts.
 */
export function rowElementFacts(element, node, index, language, symbols) {
  const words = rowVocabulary(language);
  const pilot = symbols === "annotations" || symbols === "minimal" ? annotationIconId(element) : null;
  const primary = symbols === "icons" ? resolveElementIconId({ ...element, attributes: { ...element.extensions, ...element.attributes } }) : null;
  const kind = element.type === "hazard" ? elementAttribute(element, "type") : undefined;
  const title = formatElementTitle(element, language) + (element.label != null && element.label !== element.id ? ` [${element.id}]` : "") + (kind === undefined ? "" : `: ${localizeDetailValue(kind, language)}`);
  const result = [rowFact(title, index, true, primary ?? (element.type === "rappel" ? null : pilot))];
  if (["rappel", "downclimb", "climb"].includes(element.type)) result.push(rowFact(`${words.drop}: ${formatMeasurement(element.attributes.height) || words.unknown}`, index));
  const details = detailRecordsForElement(element, node, language, "soft-terrain");
  for (const [position, record] of details.entries()) result.push(rowFact(detailRecordText(record), index, false, element.type === "rappel" && position === 1 ? pilot : null));
  if (element.attributes.station !== undefined) result.push(rowFact(`${words.station}: ${redirectionSideSuffix(element.attributes.station, language)}`, index));
  for (const [position, stage] of rappelStagesForElement(element).entries()) result.push(rowFact(`${words.stage} ${position + 1}: ${formatMeters(stage)}`, index));
  for (const [position, redirection] of redirectionsForElement(element).entries()) result.push(rowFact(`${words.redirection} ${position + 1}: ${redirectionLabel(redirection, language)}`, index));
  if (element.type === "walk") result.push(rowFact(`${words.distance}: ${formatMeasurement(element.attributes.distance) || words.unknown}`, index));
  if (typeof node.elevationMeters === "number" && element.type !== "start" && element.type !== "exit") result.push(rowFact(`${words.elevation}: ${node.elevationMeters}m`, index));
  return result;
}
