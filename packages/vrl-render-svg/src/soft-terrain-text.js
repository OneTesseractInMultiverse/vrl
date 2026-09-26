const EN = Object.freeze({
  rope: "declared rope", countUnknown: "anchor count unknown", poolUnknown: "pool depth unknown", heightUnknown: "height unknown",
  schematic: "Terrain and technical curves are schematic; pool outlines do not measure depth or require swimming.",
  legend: Object.freeze(["Contour and technical curves: schematic; arrows: traversal direction.", "Pool outline: symbolic size; waves: water cue, not flow or depth."])
});
const ES = Object.freeze({
  rope: "cuerda declarada", countUnknown: "numero de anclajes desconocido", poolUnknown: "profundidad de poza desconocida", heightUnknown: "altura desconocida",
  schematic: "El terreno y las curvas tecnicas son esquematicos; las pozas no indican profundidad ni obligan a nadar.",
  legend: Object.freeze(["Contorno y curvas: esquema; flechas: sentido de progresion.", "Poza: tamano simbolico; ondas: agua, no caudal ni profundidad."])
});

export function softTerrainText(language) { return language === "es" ? ES : EN; }
