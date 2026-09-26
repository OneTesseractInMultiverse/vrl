const DEFAULT_LANGUAGE = "en";

const LANGUAGE_ALIASES = Object.freeze({
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  english: "en",
  es: "es",
  "es-es": "es",
  "es-cr": "es",
  spanish: "es",
  espanol: "es"
});

const DIAGRAM_TEXT = Object.freeze({
  en: Object.freeze({
    routeSummary: "Route summary",
    schematicDescription: "Vertical Route Language schematic for",
    topo: "topo",
    noData: "no data",
    difficulty: "Difficulty",
    elevationChange: "Elevation change",
    region: "Region",
    country: "Country",
    anchor: "anchor",
    anchors: "anchors",
    exposure: "exposure",
    flow: "flow",
    hazardSeverity: "hazard severity",
    inclination: "inclination",
    inclinationDescription: "percent of vertical change",
    landing: "landing",
    severity: "severity",
    legendTitle: "Legend",
    legendRappel: "Rappel: rope / anchors / landing / flow / inclination",
    legendTechnical: "Downclimb/climb: height / exposure / landing / inclination",
    redirectionAnchor: "Redirection anchor",
    ropeStages: "Rope stages",
    snakeHazard: "Snake hazard",
    sideLeft: "L",
    sideRight: "R",
    elements: Object.freeze({
      start: "Start",
      exit: "Exit",
      walk: "Walk",
      rappel: "Rappel",
      downclimb: "Downclimb",
      climb: "Climb",
      pool: "Pool",
      hazard: "Hazard",
      note: "Note"
    }),
    values: Object.freeze({})
  }),
  es: Object.freeze({
    routeSummary: "Resumen de ruta",
    schematicDescription: "Esquema VRL para",
    topo: "topo",
    noData: "sin dato",
    difficulty: "Dificultad",
    elevationChange: "Desnivel",
    region: "Region",
    country: "Pais",
    anchor: "anclaje",
    anchors: "anclajes",
    exposure: "exposicion",
    flow: "flujo",
    hazardSeverity: "severidad de peligro",
    inclination: "inclinacion",
    inclinationDescription: "porcentaje de desnivel vertical",
    landing: "llegada",
    severity: "severidad",
    legendTitle: "Leyenda",
    legendRappel: "Rapel: cuerda / anclajes / llegada / flujo / inclinacion",
    legendTechnical: "Destrepe/escalada: altura / exposicion / llegada / inclinacion",
    redirectionAnchor: "Anclaje de desvio",
    ropeStages: "Tramos de cuerda",
    snakeHazard: "Peligro de serpientes",
    sideLeft: "izq",
    sideRight: "der",
    elements: Object.freeze({
      start: "Inicio",
      exit: "Salida",
      walk: "Aproximacion",
      rappel: "Rapel",
      downclimb: "Destrepe",
      climb: "Escalada",
      pool: "Poza",
      hazard: "Peligro",
      note: "Nota"
    }),
    values: Object.freeze({
      bolts: "parabolts",
      chaos: "caos",
      critical: "critico",
      dam: "represa",
      deep: "profunda",
      dry: "seco",
      fixed: "fijo",
      floor: "suelo",
      gallery: "galeria",
      high: "alto",
      ledge: "repisa",
      low: "bajo",
      medium: "medio",
      mixed: "mixto",
      natural: "natural",
      pool: "poza",
      removable: "removible",
      shallow: "poco profunda",
      snake: "serpiente",
      snake_area: "zona de serpientes",
      snake_dense_area: "zona densa de serpientes",
      swift_water: "agua activa",
      thread: "puente de roca",
      trail: "sendero",
      tree: "arbol",
      unknown: "desconocido"
    })
  })
});

/**
 * Resolve supported language names and aliases with the documented English fallback.
 * @responsibility computation
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to DEFAULT_LANGUAGE.
 * @returns {string} Supported en or es dictionary key after alias/fallback resolution.
 */
export function resolveDiagramLanguage(language = DEFAULT_LANGUAGE) {
  if (typeof language !== "string") {
    return DEFAULT_LANGUAGE;
  }

  const alias = language.toLowerCase();
  return Object.hasOwn(LANGUAGE_ALIASES, alias) ? LANGUAGE_ALIASES[alias] : DEFAULT_LANGUAGE;
}

/**
 * Return the immutable dictionary for the resolved diagram language.
 * @responsibility computation
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to DEFAULT_LANGUAGE.
 * @returns {Object} Shared frozen localization dictionary; callers must not mutate it.
 */
export function diagramText(language = DEFAULT_LANGUAGE) {
  return DIAGRAM_TEXT[resolveDiagramLanguage(language)];
}

/**
 * Look up the localized element label with the vocabulary's fallback behavior.
 * @responsibility computation
 * @param {unknown} elementType - Declared domain element type used for vocabulary lookup.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to DEFAULT_LANGUAGE.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
export function elementLabel(elementType, language = DEFAULT_LANGUAGE) {
  const text = diagramText(language);
  return Object.hasOwn(text.elements, elementType) ? text.elements[elementType] : elementType;
}

/**
 * Translate a known categorical value and preserve unrecognized text.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @param {string} language - Requested diagram language; supported dictionaries resolve through the localization policy; defaults to DEFAULT_LANGUAGE.
 * @returns {unknown} The value value selected or validated above. The selected result, including the documented absent-value fallback.
 */
export function localizeDetailValue(value, language = DEFAULT_LANGUAGE) {
  if (typeof value !== "string") {
    return value;
  }

  const text = diagramText(language);
  return Object.hasOwn(text.values, value) ? text.values[value] : value;
}
