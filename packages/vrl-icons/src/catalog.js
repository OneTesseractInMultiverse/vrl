// Authoring source. Generated SVGs and manifest.json must be rebuilt with npm run icons:build.
/**
 * Wrap original authoring path data without rewriting its geometry.
 * @responsibility computation
 * @param {string} d - Original trusted SVG path data.
 * @returns {Object} Owned path record retaining the exact path string.
 */
const path = (d) => ({ d });
/**
 * Compute an original two-arc closed circle within the shared 32-unit canvas.
 * @responsibility computation
 * @param {number} x - Horizontal coordinate in the shared icon canvas.
 * @param {number} y - Vertical coordinate in the shared icon canvas.
 * @param {number} r - Circle radius in authoring units.
 * @returns {Object} Path record centered at the supplied coordinates.
 */
const circle = (x, y, r) => path(`M ${x - r} ${y} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`);
const waves = path("M 4 21 q 3 -3 6 0 t 6 0 t 6 0 t 6 0 M 4 26 q 3 -3 6 0 t 6 0 t 6 0 t 6 0");
const triangle = path("M 16 3 30 28 H 2 Z");
const cloud = path("M 8 21 a 5 5 0 0 1 -1 -10 a 8 8 0 0 1 15 -2 a 6 6 0 0 1 2 12 Z");
const tree = path("M 16 3 9 11 h 4 l -7 8 h 8 v 9 h 4 v -9 h 8 l -7 -8 h 4 Z");

export const categories = [
  { id: "vertical-progression", label: "Vertical progression" },
  { id: "aquatic-obstacles", label: "Aquatic obstacles" },
  { id: "terrain-features", label: "Terrain features" },
  { id: "anchors-equipment", label: "Anchors and equipment" },
  { id: "hazards-warnings", label: "Hazards and warnings" },
  { id: "environment-conditions", label: "Environment and conditions" },
  { id: "route-information", label: "Route information" },
  { id: "difficulty", label: "Difficulty (illustrative)" },
  { id: "diagram-line-styles", label: "Diagram line styles" }
];

/**
 * Construct one authoring definition from original geometry and optional line or difficulty metadata.
 * @responsibility computation
 * @param {string} id - Exact canonical icon registry identifier.
 * @param {string} label - Human-readable name retained without localization inference.
 * @param {string} description - Explanation of the depicted feature and its limits.
 * @param {Object[]} paths - Original path records in drawing order.
 * @param {Object} extra - Optional authoring metadata, defaulting to an empty record.
 * @returns {Object} Owned icon definition; caller-supplied paths are retained until registry freezing.
 */
function icon(id, label, description, paths, extra = {}) {
  return { id, label, description, origin: "poster-taxonomy", paths, ...extra };
}

const groups = [
  [
    icon("rappel", "Rappel", "Rope descent past a vertical edge.", [path("M 3 4 h 6 v 24 M 25 3 v 25 M 17 12 l 5 4 3 -5 M 17 12 l -3 8 6 3 -2 6 M 14 20 l -4 4"), circle(18, 7, 2)]),
    icon("guided-rappel", "Guided rappel", "Rope descent with a separate diagonal guide line.", [path("M 3 4 h 6 v 24 M 24 3 v 17 M 12 29 29 8 M 17 12 l 5 4 2 -5 M 17 12 l -3 8 6 3 -2 6"), circle(18, 7, 2)]),
    icon("downclimb", "Downclimb", "Downward climbing movement without a depicted rappel rope.", [path("M 3 4 h 5 v 11 h 6 v 10 h 6 M 17 11 l -5 4 6 3 -2 7 M 16 12 l 5 4 M 26 18 v 11 m -3 -3 3 3 3 -3"), circle(18, 6, 2)]),
    icon("climb", "Climb", "Upward climbing movement; called up-climb in the reference poster.", [path("M 3 28 h 8 v -8 h 7 v -9 h 5 M 13 12 l -3 7 5 3 -2 6 M 13 12 l 5 3 3 -6 M 26 16 V 3 m -3 3 3 -3 3 3"), circle(12, 7, 2)]),
    icon("handline", "Handline", "Horizontal rope used as a handline.", [path("M 3 28 16 22 h 13 M 5 9 29 16 M 29 12 v 8 M 12 13 l 5 3 4 -2 M 12 13 v 9 l -5 6 M 12 21 l 6 6"), circle(11, 5, 2)]),
    icon("fixed-ladder", "Fixed ladder", "Fixed ladder between rock walls.", [path("M 10 3 v 26 M 22 3 v 26 M 10 8 h 12 M 10 14 h 12 M 10 20 h 12 M 10 26 h 12 M 3 5 l 2 11 -2 11 M 29 5 l -2 11 2 11")]),
    icon("via-ferrata", "Via ferrata", "Fixed protection cable and climbing rungs.", [path("M 8 28 14 4 h 10 M 18 9 h 8 M 16 16 h 8 M 14 23 h 8 M 4 26 9 14 12 10"), circle(10, 6, 2)]),
    icon("walk", "Walk", "Progression on foot.", [circle(17, 5, 2), path("M 15 10 l -3 8 6 4 3 7 M 15 10 l 5 5 5 1 M 14 12 l -6 5 M 12 18 l -3 7 -4 3")], { origin: "vrl-extension" })
  ],
  [
    icon("pool", "Pool", "A pool with unspecified depth.", [path("M 3 5 v 22 M 29 5 v 22"), waves]),
    icon("deep-pool", "Deep pool", "Pool explicitly described as deep; no numeric depth is implied.", [path("M 3 4 v 20 q 13 8 26 0 V 4 M 6 10 q 3 -3 6 0 t 6 0 t 6 0 M 16 15 v 11 m -4 -4 4 4 4 -4")]),
    icon("waterfall", "Waterfall", "Water flowing over a vertical edge.", [path("M 3 4 h 5 q 5 0 5 7 v 10 q 0 7 7 7 M 12 3 q 6 0 6 9 v 8 q 0 6 6 7 M 20 3 q 4 4 4 12 v 5 q 0 5 5 5")]),
    icon("natural-slide", "Natural slide", "Sloping rock chute carrying water.", [path("M 3 6 h 5 q 5 0 8 9 t 13 9 M 3 12 q 5 -1 8 7 t 13 10 M 14 5 q 5 3 7 9 t 8 5")]),
    icon("siphon", "Siphon", "Submerged passage beneath a rock roof.", [path("M 3 4 h 17 l 9 8 v 7 h -9 v -9 H 3 M 8 14 l 4 3 -4 3"), waves]),
    icon("swim", "Swim", "Swimming section.", [circle(24, 14, 3), path("M 6 18 l 7 -5 5 4 M 13 13 l 4 -8 6 2"), waves]),
    icon("shallow-pool", "Shallow pool", "Pool explicitly described as shallow; no numeric depth is implied.", [path("M 3 8 v 16 q 13 5 26 0 V 8 M 5 17 q 3 -3 6 0 t 6 0 t 6 0 M 13 12 h 6")], { origin: "vrl-extension" }),
    icon("dry-pool", "Dry pool", "Dry basin with no water shown.", [path("M 3 8 v 13 q 13 13 26 0 V 8 M 9 25 l 5 -5 3 4 5 -3")], { origin: "vrl-extension" })
  ],
  [
    icon("narrow-section", "Narrow section", "Constricted canyon passage.", [path("M 3 3 h 7 l 4 10 -3 8 2 8 H 3 M 29 3 h -7 l -4 10 3 8 -2 8 h 10")]),
    icon("open-canyon", "Open canyon", "Wide canyon passage.", [path("M 3 3 h 3 l 3 12 -2 14 H 3 M 29 3 h -3 l -3 12 2 14 h 4")]),
    icon("boulder-field", "Boulder field", "Accumulation of boulders or rock chaos.", [path("M 4 17 10 14 15 21 11 28 3 26 Z M 17 15 22 12 29 18 27 25 19 27 15 22 Z M 9 4 16 3 19 9 14 13 7 10 Z")]),
    icon("exposed-traverse", "Exposed traverse", "Traverse above a drop.", [path("M 3 25 26 16 v 13 M 14 12 l -3 7 7 1 3 5 M 11 19 l -5 6 M 14 12 l 6 3 6 -5"), circle(15, 6, 2)]),
    icon("cave-tunnel", "Cave or tunnel", "Passage through a cave or tunnel.", [path("M 3 28 C 4 2 28 2 29 28 H 22 C 23 12 9 12 10 28 Z")]),
    icon("natural-bridge", "Natural bridge", "Rock bridge spanning an opening.", [path("M 3 7 q 13 4 26 0 v 21 h -7 c 0 -16 -12 -16 -12 0 H 3 Z")]),
    icon("log-jam", "Log jam", "Accumulated logs obstructing the channel.", [path("M 4 5 28 24 25 28 2 9 Z M 19 4 23 6 9 29 5 26 Z M 3 20 l 26 -8 1 4 -26 8 Z")])
  ],
  [
    icon("bolt", "Bolt", "Bolt and hanger; condition and strength are unspecified.", [circle(16, 7, 4), circle(16, 23, 6), path("M 13 11 v 6 M 19 11 v 6")]),
    icon("natural-anchor", "Natural anchor", "Sling around a natural feature; suitability is unspecified.", [path("M 5 22 9 7 17 4 25 13 28 24 Z M 6 17 q 10 8 20 0 M 11 22 v 5 q 5 4 10 0 v -5")]),
    icon("rock-horn", "Rock horn", "Rock horn available as an anchor feature.", [path("M 4 27 Q 12 20 10 4 Q 20 8 19 19 L 26 13 Q 30 26 22 28 Z M 8 21 q 10 7 18 0")]),
    icon("tree", "Tree", "Tree anchor feature; condition is unspecified.", [tree]),
    icon("boulder", "Boulder", "Single boulder anchor feature.", [path("M 3 23 7 11 17 5 27 13 29 25 20 28 7 27 Z M 7 19 q 10 8 21 -1")]),
    icon("rappel-station", "Rappel station", "Two connected anchor points and a master point.", [circle(6, 6, 3), circle(26, 6, 3), circle(16, 26, 3), path("M 7 9 16 23 25 9 M 9 6 q 7 5 14 0")]),
    icon("fixed-rope", "Fixed rope", "Rope fixed between two points.", [circle(4, 23, 2), circle(28, 7, 2), path("M 4 25 v 4 M 28 9 v 6 M 6 22 Q 24 23 27 9")])
  ],
  [
    icon("falling-rocks", "Falling rocks", "Potential falling rock hazard.", [triangle, path("M 15 11 18 10 20 13 17 15 Z M 11 18 15 17 17 21 13 23 Z M 22 19 l 3 5 M 9 24 h 2")]),
    icon("flash-flood-risk", "Flash flood risk", "Potential sudden rise in water level.", [triangle, path("M 16 21 V 12 m -3 3 3 -3 3 3 M 8 24 q 2 -2 4 0 t 4 0 t 4 0 t 4 0")]),
    icon("slippery", "Slippery", "Slippery footing hazard.", [triangle, circle(18, 11, 1.5), path("M 16 15 l -5 2 7 3 5 -2 M 18 20 l -4 5 M 14 16 l 5 -1 M 7 25 h 3")]),
    icon("strong-current", "Strong current", "Strong or swift water current.", [triangle, path("M 8 24 q 2 -2 4 0 t 4 0 t 4 0 t 4 0 M 9 20 h 13 m -4 -3 4 3 -4 3 M 13 15 h 6")]),
    icon("undercut", "Undercut", "Water extending beneath an undercut rock wall.", [triangle, path("M 16 10 l 6 12 h -6 v -7 h -4 M 8 25 q 2 -2 4 0 t 4 0 t 4 0 t 4 0")]),
    icon("poor-anchor", "Poor anchor", "Reported anchor concern requiring explicit route notes.", [triangle, circle(16, 13, 2), path("M 16 15 v 3 l -3 2 M 19 20 l -3 2 v 3 M 10 16 22 24")]),
    icon("lightning-risk", "Lightning risk", "Potential lightning hazard.", [triangle, path("M 18 9 12 18 h 5 l -2 7 7 -11 h -6 Z")]),
    icon("warning", "Warning", "Unspecified hazard; consult the accompanying route text.", [triangle, path("M 16 12 v 7"), circle(16, 24, 0.75)], { origin: "vrl-extension" }),
    icon("snake", "Snake hazard", "VRL tropical extension: reported snake presence.", [triangle, path("M 10 24 c 12 0 12 -5 5 -5 s -4 -7 4 -5 M 19 14 l 2 -2")], { origin: "vrl-extension" })
  ],
  [
    icon("sunny", "Sunny", "Sunny conditions.", [circle(16, 16, 6), path("M 16 2 v 4 M 16 26 v 4 M 2 16 h 4 M 26 16 h 4 M 6 6 l 3 3 M 23 23 l 3 3 M 6 26 l 3 -3 M 23 9 l 3 -3")]),
    icon("cloudy", "Cloudy", "Cloud cover.", [cloud]),
    icon("rain", "Rain", "Rain conditions.", [cloud, path("M 10 25 l -2 4 M 18 25 l -2 4 M 26 25 l -2 4")]),
    icon("snow-ice", "Snow or ice", "Snow or ice conditions.", [path("M 16 2 v 28 M 4 9 28 23 M 4 23 28 9 M 12 4 l 4 4 4 -4 M 12 28 l 4 -4 4 4 M 4 14 l 6 -1 -1 -6 M 23 25 l -1 -6 6 -1 M 4 18 l 6 1 -1 6 M 23 7 l -1 6 6 1")]),
    icon("cold", "Cold", "Cold conditions; no measured temperature is implied.", [path("M 10 20 V 6 a 4 4 0 0 1 8 0 v 14 a 6 6 0 1 1 -8 0 M 14 17 v 7 M 23 8 h 6"), circle(14, 24, 2)]),
    icon("hot", "Hot", "Hot conditions; no measured temperature is implied.", [path("M 10 20 V 6 a 4 4 0 0 1 8 0 v 14 a 6 6 0 1 1 -8 0 M 14 9 v 15 M 23 8 h 6 M 26 5 v 6"), circle(14, 24, 2)]),
    icon("vegetation", "Vegetation", "Vegetation along the route.", [path("M 16 29 Q 1 24 3 5 Q 17 8 16 23 Q 17 8 29 5 Q 31 24 16 29 M 8 12 16 29 24 12")]),
    icon("wildlife", "Wildlife", "Wildlife presence.", [circle(5, 14, 2.5), circle(12, 7, 2.5), circle(21, 7, 2.5), circle(28, 14, 2.5), path("M 16 16 c -4 0 -4 4 -7 6 s -1 7 3 6 q 4 -2 8 0 c 4 1 6 -4 3 -6 s -3 -6 -7 -6 Z")])
  ],
  [
    icon("start", "Start", "Route start or entrance.", [circle(16, 16, 12), path("M 13 10 22 16 13 22 Z")]),
    icon("finish", "Finish", "Route finish or exit.", [circle(16, 16, 12), path("M 11 11 h 10 v 10 H 11 Z")]),
    icon("waypoint", "Waypoint", "Identified point on a route.", [circle(16, 16, 12), circle(16, 16, 4)]),
    icon("distance", "Distance", "Distance measurement; value and unit supplied separately.", [path("M 3 16 h 26 M 8 11 l -5 5 5 5 M 24 11 l 5 5 -5 5 M 12 13 v 6 M 20 13 v 6")]),
    icon("elevation-change", "Elevation change", "Vertical elevation difference; value and unit supplied separately.", [path("M 10 28 V 4 m -5 5 5 -5 5 5 M 22 4 v 24 m -5 -5 5 5 5 -5")]),
    icon("time", "Time", "Duration or time; value supplied separately.", [circle(16, 16, 12), path("M 16 8 v 8 l 6 4")]),
    icon("note", "Note", "Additional route information.", [circle(16, 16, 12), circle(16, 9, 1), path("M 13 15 h 3 v 9 M 12 24 h 8")], { origin: "vrl-extension" })
  ],
  ["easy", "moderate", "difficult", "very-difficult", "extreme"].map(/**
   * Construct an illustrative difficulty pictogram with the captured number of bars; no route-grade conversion occurs.
   * @responsibility computation
   * @param {string} name - Canonical definition name from the captured authoring list.
   * @param {number} index - Zero-based illustrative difficulty level.
   * @returns {Object} Authored icon definition containing the corresponding bar count.
   */ (name, index) => icon(
    `difficulty-${name}`,
    `Illustrative difficulty: ${name.replaceAll("-", " ")}`,
    `Illustrative level ${index + 1} of 5, not an official canyon grade or hazard severity.`,
    [circle(16, 16, 13), ...Array.from({ length: index + 1 }, /**
     * Place one original difficulty bar at its indexed horizontal offset.
     * @responsibility computation
     * @param {unknown} _ - Unused array-construction callback argument.
     * @param {number} bar - Zero-based difficulty bar within its illustrative level.
     * @returns {Object} Trusted vertical SVG path record at the selected horizontal offset.
     */ (_, bar) => path(`M ${8 + bar * 4} 21 v -10`))],
    { illustrativeLevel: index + 1 }
  )),
  [
    icon("rappel-line", "Rappel line", "Dashed rope line; apply the lineStyle metadata to a diagram path.", [path("M 3 16 H 29")], { lineStyle: { strokeWidth: 2, strokeDasharray: "6 3", strokeLinecap: "butt" } }),
    icon("water-flow-line", "Water flow line", "Dash-dot water-flow line; direction must be indicated by the diagram.", [path("M 3 16 H 29")], { lineStyle: { strokeWidth: 2, strokeDasharray: "6 3 1 3", strokeLinecap: "round" } }),
    icon("approach-trail-line", "Approach trail line", "Dotted approach trail.", [path("M 3 16 H 29")], { lineStyle: { strokeWidth: 2, strokeDasharray: "1 4", strokeLinecap: "round" } }),
    icon("escape-route-line", "Escape route line", "Long-dash escape route; route availability must be documented separately.", [path("M 3 16 H 29")], { lineStyle: { strokeWidth: 2, strokeDasharray: "10 4", strokeLinecap: "butt" } })
  ]
];

export const icons = groups.flatMap(/**
 * Attach the owning category and deterministic asset path without changing original geometry.
 * @responsibility computation
 * @param {Object[]} group - Ordered authoring definitions in one catalog category.
 * @param {number} index - Category position shared by the category table and definition groups.
 * @returns {Object[]} New definitions with category identity and deterministic asset paths.
 */ (group, index) => group.map(/**
 * Attach the owning category and deterministic asset path without changing original geometry.
 * @responsibility computation
 * @param {Object} entry - Authored icon definition with its original geometry and metadata.
 * @returns {Object} New definition augmented with category identity and its SVG asset path.
 */ (entry) => ({
  ...entry,
  category: categories[index].id,
  asset: `svg/${entry.id}.svg`
})));

// Exact values only: the presentation layer never infers hazards or anchor safety.
export const semanticMappings = {
  elements: { start: "start", exit: "finish", walk: "walk", swim: "swim", rappel: "rappel", downclimb: "downclimb", climb: "climb", pool: "pool", hazard: "warning", note: "note" },
  subtypes: {
    pool: { deep: "deep-pool", shallow: "shallow-pool", swimmer: "swim", dry: "dry-pool", unknown: "pool" },
    hazard: {
      falling_rocks: "falling-rocks", flash_flood: "flash-flood-risk", flash_flood_risk: "flash-flood-risk",
      slippery: "slippery", swift_water: "strong-current", strong_current: "strong-current",
      undercut: "undercut", poor_anchor: "poor-anchor", lightning: "lightning-risk", lightning_risk: "lightning-risk",
      snake: "snake", snakes: "snake", snake_area: "snake", snake_dense_area: "snake",
      serpent: "snake", serpents: "snake", serpiente: "snake", serpientes: "snake"
    }
  },
  attributes: {
    anchor: { bolts: "bolt", natural: "natural-anchor", tree: "tree" },
    landing: { pool: "pool", chaos: "boulder-field", gallery: "cave-tunnel", trail: "walk" }
  }
};
