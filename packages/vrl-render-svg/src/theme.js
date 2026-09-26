import { assertOptionsRecord } from "@subvertic/vrl-core";
import { validatePaint } from "./paint.js";

export const LIGHT_THEME = Object.freeze({
  background: "#e8f2f2",
  terrain: "#d8d1bb",
  text: "#111111",
  mutedText: "#303030",
  routeLine: "#111111",
  water: "#1479a6",
  hazard: "#b42318",
  warning: "#c77700",
  anchor: "#5865d6",
  rappel: "#4b5563",
  exit: "#16794c",
  panel: "#f6f8fa",
  flowBadge: "#1479a6",
  flowBadgeText: "#ffffff",
  exposureBadge: "#5865d6",
  exposureBadgeText: "#ffffff",
  hazardSeverityBadge: "#b42318",
  hazardSeverityBadgeText: "#ffffff",
  inclinationBadge: "#c77700",
  inclinationBadgeText: "#111111",
  levelBadge: "#4b5563",
  levelBadgeText: "#ffffff"
});

export const DARK_THEME = Object.freeze({
  background: "#14171a",
  terrain: "#2e3129",
  text: "#eef2f5",
  mutedText: "#a8b3bd",
  routeLine: "#c3ccd4",
  water: "#5cc8ff",
  hazard: "#ff8a80",
  warning: "#ffd166",
  anchor: "#a9b3ff",
  rappel: "#d7dde3",
  exit: "#7ee0a7",
  panel: "#1f252b",
  flowBadge: "#5cc8ff",
  flowBadgeText: "#111111",
  exposureBadge: "#a9b3ff",
  exposureBadgeText: "#111111",
  hazardSeverityBadge: "#ff8a80",
  hazardSeverityBadgeText: "#111111",
  inclinationBadge: "#ffd166",
  inclinationBadgeText: "#111111",
  levelBadge: "#d7dde3",
  levelBadgeText: "#111111"
});

export function resolveTheme(theme = "light", overrides = {}) {
  if (theme !== "light" && theme !== "dark") throw new TypeError("Theme must be light or dark.");
  assertOptionsRecord(overrides, "Theme tokens");
  const tokens = validateThemeTokens(overrides);
  const base = theme === "dark" ? DARK_THEME : LIGHT_THEME;
  return validateThemeTokens({
    ...base,
    ...tokens
  });
}

function validateThemeTokens(tokens) {
  return Object.fromEntries(Object.entries(tokens).map(([name, value]) => {
    if (!Object.hasOwn(LIGHT_THEME, name)) throw new TypeError(`Unknown theme token "${name}".`);
    return [name, validatePaint(value)];
  }));
}
