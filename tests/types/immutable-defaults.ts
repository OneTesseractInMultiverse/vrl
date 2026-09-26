import { DARK_THEME, LIGHT_THEME, diagramText, resolveSymbolProfile, resolveTheme } from "@subvertic/vrl-render-svg";

// @ts-expect-error Exported defaults are frozen shared definitions.
LIGHT_THEME.background = "#fff";
// @ts-expect-error Both exported themes have the same mutation contract.
DARK_THEME.terrain = "#fff";
// @ts-expect-error Symbol profiles cannot be customized by writing global state.
resolveSymbolProfile("spanish").start = "BEGIN";
// @ts-expect-error Top-level localization entries are immutable.
diagramText("es").topo = "Changed";
// @ts-expect-error Nested element labels are also immutable.
diagramText("es").elements.start = "Changed";
// @ts-expect-error Nested translation entries are also immutable.
diagramText("es").values.bolts = "Changed";
// @ts-expect-error Nested dictionaries cannot be replaced.
diagramText("en").values = {};

const localTheme = resolveTheme("light", { terrain: "#abcdef" });
localTheme.background = "#fff";
resolveTheme("dark", LIGHT_THEME);
const localLabels = { ...diagramText("es").elements, start: "Custom start" };
localLabels.start = "New label";
