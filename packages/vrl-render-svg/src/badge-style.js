export const DETAIL_BADGE_TOKENS = {
  level: ["levelBadge", "levelBadgeText"],
  flow: ["flowBadge", "flowBadgeText"],
  exposure: ["exposureBadge", "exposureBadgeText"],
  hazardSeverity: ["hazardSeverityBadge", "hazardSeverityBadgeText"],
  inclination: ["inclinationBadge", "inclinationBadgeText"]
};

/**
 * Resolve category-specific badge fill and text tokens from the caller's theme.
 * @responsibility computation
 * @param {string} category - Badge category selecting supported vocabulary and theme tokens.
 * @param {Object} theme - Resolved theme record mapping semantic token names to supported paint strings.
 * @returns {Object} Category-specific fill and text paints from the resolved theme.
 */
export function detailBadgeStyle(category, theme) {
  const tokens = DETAIL_BADGE_TOKENS[category];
  return { fill: theme[tokens[0]], text: theme[tokens[1]] };
}

/**
 * Retain the supplied color, using #111111 only when it is empty; no contrast calculation is performed.
 * @responsibility computation
 * @param {string} color - Validated foreground paint value.
 * @returns {string} The supplied color unchanged, except empty text uses the #111111 fallback.
 */
export function themeSafeStroke(color) {
  return color === "" ? "#111111" : color;
}
