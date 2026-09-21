export const LONG_ROUTE = ['route "Long route"', 'start "Entry"', ...Array.from({ length: 12 }, () => 'walk distance=1m'), 'exit "Finish"'].join("\n");
export const DETAILS = 'rappel height=30m rope=60m anchor=bolts anchor_count=4 station=left stages=10m+20m redirection=15m:left traverse=1000m';
export const DENSE = ['route "Dense"', 'start', 'rappel height=30m rope=60m', ...Array.from({ length: 30 }, (_, index) => `note "${index} Check the weather and current conditions before descending"`), 'hazard type=snake severity=critical', 'exit'].join("\n");

export const CASES = [
  ["twelve walks and exit", LONG_ROUTE, {}, {}],
  ["narrow requested width", LONG_ROUTE, { width: 120 }, {}],
  ["wide horizontal spacing", LONG_ROUTE, { horizontalScale: 4 }, {}],
  ["tight horizontal spacing", LONG_ROUTE, { horizontalScale: 0.05, baseSpacing: 10 }, {}],
  ["long labels without spaces", `route "Labels"\nstart "${"W".repeat(300)}"\nexit "${"M".repeat(200)}"`, {}, {}],
  ["long unbroken annotation", `route "Notes"\nstart\nexit\nnote "${"W".repeat(600)}"`, { width: 100 }, {}],
  ["long route name and metadata", `route "${"W".repeat(200)}"\nmetadata region="${"M".repeat(200)}" country="${"Large country ".repeat(30)}"\nstart\nexit`, {}, {}],
  ["wide Unicode labels", 'route "Cañón"\nstart "入口 🧗🌊 ＷＷＷＷＷＷＷＷ"\nexit "Fin 水"\nnote "Peligro & condiciones <variables>"', { width: 80 }, {}],
  ["dense annotations", DENSE, { width: 140, marginBottom: 0 }, {}],
  ["zero origin and margins", `route "Edges"\n${DETAILS}\npool type=deep\nexit`, { spineX: 0, marginY: 0, marginBottom: 0 }, {}],
  ["leading climb", 'route "Climb"\nclimb height=10m\nexit', { marginY: 0 }, {}],
  ["trailing descent", `route "Descent"\nstart\n${DETAILS}`, {}, {}],
  ["adjacent down and up", `route "Up and down"\nmetadata entrance_elevation=100m exit_elevation=75m\n${DETAILS}\nclimb height=5m`, { minNodeGap: 0, pixelsPerMeter: 0.01 }, {}],
  ["larger technical scale", `route "Scale"\nmetadata entrance_elevation=100m exit_elevation=75m\n${DETAILS}\nclimb height=5m`, { pixelsPerMeter: 30 }, {}],
  ["Spanish legend", LONG_ROUTE, { width: 80 }, { language: "es" }],
  ["French symbols", LONG_ROUTE, { width: 80 }, { symbology: "french" }],
  ["dark theme without legend", DENSE, { width: 80 }, { theme: "dark", legend: false }],
  ["anchor overflow at zero origin", 'route "Anchor overflow"\nrappel height=30m rope=60m anchor_count=5', { width: 1, spineX: 0, marginY: 0, marginBottom: 0 }, {}],
  ["maximum anchor count", 'route "Maximum anchors"\nrappel height=30m rope=60m anchor_count=9007199254740991', { width: 1, spineX: 0, marginY: 0, marginBottom: 0 }, { language: "es", theme: "dark", legend: false }],
  ["annotation anchor overflow", 'route "Annotation anchors"\nhazard anchor_count=9007199254740991', { width: 1, spineX: 0, marginY: 0 }, {}],
  ["empty route", 'route "Empty"', { marginY: 0, marginBottom: 0, width: 1 }, {}],
  ["annotation-only route", 'route "Notes"\nnote "A note"\nhazard type=swift_water severity=high', { width: 1, spineX: 0 }, {}],
  ["unknown technical height", 'route "Unknown"\ndownclimb\nexit', {}, {}],
  ...["direct", "slab"].map((shape) => [shape, `route "Shapes"\nstart\n${DETAILS} shape=${shape}\nexit`, { width: 80 }, {}])
];
