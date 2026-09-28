import { localizeDetailValue } from "./locale.js";

const EN = Object.freeze({ introduction: "Schematic route, not to scale. Read elements in order. Rope lengths are supplied declarations, not equipment requirements.", empty: "No route elements.", swim: "swimming", swimDistance: "Swimming distance", unknown: "unknown", additional: "Additional field", boundary: "Annotation at route boundary", unattached: "No physical boundary", down: "descent", up: "ascent", fields: Object.freeze({ height: "Physical height", rope: "Declared rope", distance: "Walking distance", anchor: "Anchor type", anchor_count: "Anchor count", station: "Station", stages: "Rope stages", redirection: "Redirection", redirections: "Redirections", inclination: "Inclination (100% = vertical)", landing: "Landing", exposure: "Exposure", flow: "Flow", type: "Type", severity: "Severity", note: "Note", text: "Text", shape: "Technical shape", depth: "Measured pool depth", direction: "Movement", delta: "Vertical change", entrance_elevation: "Entrance elevation", exit_elevation: "Exit elevation", total_distance: "Declared total distance", total_descent: "Declared total descent", traverse: "Traverse", vertical_gain: "Vertical gain", descent: "Descent" }) });
const ES = Object.freeze({ introduction: "Ruta esquematica, sin escala. Lea los elementos en orden. Las cuerdas son longitudes declaradas, no requisitos de equipo.", empty: "Sin elementos de ruta.", swim: "nado", swimDistance: "Distancia a nado", unknown: "desconocido", additional: "Campo adicional", boundary: "Anotacion en limite de ruta", unattached: "Sin limite fisico", down: "descenso", up: "ascenso", fields: Object.freeze({ height: "Altura fisica", rope: "Cuerda declarada", distance: "Distancia a pie", anchor: "Tipo de anclaje", anchor_count: "Cantidad de anclajes", station: "Reunion", stages: "Tramos de cuerda", redirection: "Desviador", redirections: "Desviadores", inclination: "Inclinacion (100% = vertical)", landing: "Llegada", exposure: "Exposicion", flow: "Flujo", type: "Tipo", severity: "Severidad", note: "Nota", text: "Texto", shape: "Forma tecnica", depth: "Profundidad medida de poza", direction: "Movimiento", delta: "Cambio vertical", entrance_elevation: "Elevacion de entrada", exit_elevation: "Elevacion de salida", total_distance: "Distancia total declarada", total_descent: "Descenso total declarado", traverse: "Travesia", vertical_gain: "Ascenso vertical", descent: "Descenso" }) });

/**
 * Select immutable description vocabulary after shared language resolution.
 * @responsibility computation
 * @param {string} language - Resolved en or es display language.
 * @returns {Object} Shared frozen labels and interpretation caveat.
 */
export function descriptionText(language) { return language === "es" ? ES : EN; }

/**
 * Format a normalized field without interpreting authored prose or treating missing information as zero.
 * @responsibility computation
 * @param {unknown} value - Normalized scalar, measurement, inclination, redirection or ordered list; null/undefined means unknown.
 * @param {string} language - Resolved display language.
 * @param {boolean} literal - Preserve extension prose rather than translating vocabulary; defaults to false.
 * @returns {string} Complete localized value, with metric units and ordered list values retained.
 */
export function descriptionValue(value, language, literal = false) {
  if (value === null || value === undefined) return descriptionText(language).unknown;
  if (Array.isArray(value)) {
    const parts = [];
    for (const item of value) parts.push(descriptionValue(item, language));
    return parts.join("; ");
  }
  if (typeof value === "object") {
    if (typeof value.meters === "number") return `${value.meters}m`;
    if (typeof value.percent === "number") return `${value.percent}%`;
    if (value.distance !== undefined) return `${descriptionValue(value.distance, language)} ${descriptionSide(value.side, language)}`;
    return JSON.stringify(value);
  }
  return literal ? String(value) : localizeDetailValue(String(value), language);
}

/**
 * Spell out sides for prose, retaining supported non-lateral station values without dropping them.
 * @responsibility computation
 * @param {unknown} side - Declared station/redirection value, including center, floor, natural, tree or unknown.
 * @param {string} language - Resolved en or es language.
 * @returns {string} Localized side/value, including explicit unknown when absent.
 */
export function descriptionSide(side, language) {
  if (language === "es" && side === "left") return "izquierda";
  if (language === "es" && side === "right") return "derecha";
  if (language === "es" && side === "center") return "centro";
  return descriptionValue(side, language);
}
