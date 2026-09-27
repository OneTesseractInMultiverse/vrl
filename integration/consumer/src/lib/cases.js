export const SOURCES = {
  unknownHeight: 'route "Synthetic unknown height"\nrappel R1 height=unknown rope=20m anchor=bolts',
  unknownRope: 'route "Synthetic unknown rope"\nrappel R1 height=12m rope=unknown anchor=bolts',
  icons: 'route "Synthetic two-rappel canyon"\nstart "Entry"\nrappel R1 height=18m rope=40m anchor=bolts anchor_count=2 station=right\npool P1 type=unknown\nwalk W1 distance=120m\nrappel R2 height=12m rope=30m anchor=tree\nhazard H1 type=slippery note="Slippery landing"\nexit "Exit"',
  valid: 'route "Good route"\nstart\nrappel height=10m rope=20m\nexit',
  warning: 'route "Short rope"\nrappel height=10m rope=5m',
  invalid: 'route "Bad height"\nrappel height=-10m rope=20m',
  changed: 'route "Changed & <route>"\nstart\nwalk distance=5m\nexit'
};

/**
 * Resolve an allowlisted route fixture and display/query settings, assigning distinct namespaces to companion
 * diagrams.
 * @responsibility computation
 * @param {unknown} url - Request URL used to resolve the allowlisted consumer scenario.
 * @returns {unknown} The props value selected or validated above.
 * @throws {Error} The documented operation fails; the original failure is preserved unless explicitly wrapped above.
 */
export function requestProps(url) {
  const name = url.searchParams.get("case") ?? "valid";
  if (!Object.hasOwn(SOURCES, name)) throw new Error(`Unknown route case: ${name}`);
  const props = { source: SOURCES[name], options: { legend: false }, showWarnings: url.searchParams.get("warnings") !== "hide" };
  if (url.searchParams.has("monochrome")) props.options.monochrome = url.searchParams.get("monochrome") === "true";
  if (url.searchParams.has("theme")) props.options.theme = url.searchParams.get("theme");
  if (url.searchParams.has("flow")) props.options.flow = url.searchParams.get("flow");
  if (url.searchParams.has("symbols")) props.options.symbols = url.searchParams.get("symbols");
  if (url.searchParams.has("width")) props.options.layout = { width: Number(url.searchParams.get("width")) };
  if (url.searchParams.has("style")) props.options.style = url.searchParams.get("style");
  if (url.searchParams.has("multiple")) {
    props.options.idPrefix = "left";
    props.companion = { source: SOURCES[name], options: { legend: false, idPrefix: "right", theme: "dark" } };
  }
  return props;
}
