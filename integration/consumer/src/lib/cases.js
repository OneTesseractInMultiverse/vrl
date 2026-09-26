export const SOURCES = {
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
  if (url.searchParams.has("style")) props.options.style = url.searchParams.get("style");
  if (url.searchParams.has("multiple")) {
    props.options.idPrefix = "left";
    props.companion = { source: SOURCES[name], options: { legend: false, idPrefix: "right", theme: "dark" } };
  }
  return props;
}
