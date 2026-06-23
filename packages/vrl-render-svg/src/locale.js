const DEFAULT_LANGUAGE = "en";

const LANGUAGE_ALIASES = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  english: "en",
  es: "es",
  "es-es": "es",
  "es-cr": "es",
  spanish: "es",
  espanol: "es"
};

const DIAGRAM_TEXT = {
  en: {
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
    snakeHazard: "Snake hazard",
    sideLeft: "L",
    sideRight: "R",
    elements: {
      start: "Start",
      exit: "Exit",
      walk: "Walk",
      rappel: "Rappel",
      downclimb: "Downclimb",
      climb: "Climb",
      pool: "Pool",
      hazard: "Hazard",
      note: "Note"
    },
    values: {}
  },
  es: {
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
    snakeHazard: "Peligro de serpientes",
    sideLeft: "izq",
    sideRight: "der",
    elements: {
      start: "Inicio",
      exit: "Salida",
      walk: "Aproximacion",
      rappel: "Rapel",
      downclimb: "Destrepe",
      climb: "Escalada",
      pool: "Poza",
      hazard: "Peligro",
      note: "Nota"
    },
    values: {
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
    }
  }
};

export function resolveDiagramLanguage(language = DEFAULT_LANGUAGE) {
  if (typeof language !== "string") {
    return DEFAULT_LANGUAGE;
  }

  return LANGUAGE_ALIASES[language.toLowerCase()] ?? DEFAULT_LANGUAGE;
}

export function diagramText(language = DEFAULT_LANGUAGE) {
  return DIAGRAM_TEXT[resolveDiagramLanguage(language)];
}

export function elementLabel(elementType, language = DEFAULT_LANGUAGE) {
  const text = diagramText(language);
  return text.elements[elementType] ?? elementType;
}

export function localizeDetailValue(value, language = DEFAULT_LANGUAGE) {
  if (typeof value !== "string") {
    return value;
  }

  const text = diagramText(language);
  return text.values[value] ?? value;
}
