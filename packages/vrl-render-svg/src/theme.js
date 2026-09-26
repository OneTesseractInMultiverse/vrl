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

/**
 * Validate light/dark selection and overrides, then produce an owned resolved token record without mutating
 * frozen defaults.
 * @responsibility coordinator
 * @param {string} theme - Supported theme name, light or dark; defaults to "light".
 * @param {unknown} overrides - Caller-supplied values replacing the corresponding defaults; defaults to {}.
 * @returns {Object} Owned validated theme-token record; frozen shared defaults remain unchanged.
 * @throws {TypeError} An input does not satisfy the required type or shape.
 */
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

/**
 * Require known theme-token names and supported paint values while returning a new record.
 * @responsibility computation
 * @param {Object} tokens - Own-key theme override record; unknown names and unsupported paint values are rejected.
 * @returns {Object} New own-key record of validated paint values.
 */
function validateThemeTokens(tokens) {
  return Object.fromEntries(Object.entries(tokens).map(/**
   * Validate one known theme token and return its name with a supported paint value.
   * @responsibility computation
   * @param {Array} input1 - Ordered tuple destructured into the separately documented members below.
   * @param {unknown} input1[0] - Tuple member bound as name: selected field or entry name.
   * @param {unknown} input1[1] - Tuple member bound as value: value paired with its own key.
   * @returns {Array} The ordered records or values assembled above.
   * @throws {TypeError} An input does not satisfy the required type or shape.
   */ ([name, value]) => {
    if (!Object.hasOwn(LIGHT_THEME, name)) throw new TypeError(`Unknown theme token "${name}".`);
    return [name, validatePaint(value)];
  }));
}
