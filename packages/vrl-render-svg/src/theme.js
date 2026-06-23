export const LIGHT_THEME = {
  background: "#ffffff",
  text: "#182026",
  mutedText: "#5d6b76",
  routeLine: "#59656f",
  water: "#1479a6",
  hazard: "#b42318",
  warning: "#c77700",
  anchor: "#5865d6",
  rappel: "#4b5563",
  exit: "#16794c",
  panel: "#f6f8fa"
};

export const DARK_THEME = {
  background: "#14171a",
  text: "#eef2f5",
  mutedText: "#a8b3bd",
  routeLine: "#c3ccd4",
  water: "#5cc8ff",
  hazard: "#ff8a80",
  warning: "#ffd166",
  anchor: "#a9b3ff",
  rappel: "#d7dde3",
  exit: "#7ee0a7",
  panel: "#1f252b"
};

export function resolveTheme(theme = "light", overrides = {}) {
  const base = theme === "dark" ? DARK_THEME : LIGHT_THEME;
  return {
    ...base,
    ...overrides
  };
}
