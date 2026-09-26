export const SOURCES = {
  valid: 'route "Good route"\nstart\nrappel height=10m rope=20m\nexit',
  warning: 'route "Short rope"\nrappel height=10m rope=5m',
  invalid: 'route "Bad height"\nrappel height=-10m rope=20m',
  changed: 'route "Changed & <route>"\nstart\nwalk distance=5m\nexit'
};

export function requestProps(url) {
  const name = url.searchParams.get("case") ?? "valid";
  if (!Object.hasOwn(SOURCES, name)) throw new Error(`Unknown route case: ${name}`);
  const props = { source: SOURCES[name], options: { legend: false }, showWarnings: url.searchParams.get("warnings") !== "hide" };
  if (url.searchParams.has("multiple")) {
    props.options.idPrefix = "left";
    props.companion = { source: SOURCES[name], options: { legend: false, idPrefix: "right", theme: "dark" } };
  }
  return props;
}
