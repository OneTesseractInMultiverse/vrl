/**
 * Select strict achromatic row paints with high-contrast ink, preserving geometry and all factual text.
 * @responsibility computation
 * @param {Object} theme - Validated ordinary theme; its token inventory is retained in an owned output record.
 * @param {string|undefined} name - Light/default for white paper, or dark for dark-screen use.
 * @returns {Object} Owned black/white paints with a decorative terrain wash and contrasting badge ink.
 */
export function monochromeTheme(theme, name) {
  const dark = name === "dark", paper = dark ? "#111111" : "#ffffff", ink = dark ? "#ffffff" : "#111111";
  const result = {};
  for (const key of Object.keys(theme)) result[key] = key === "background" || key === "panel" || key.endsWith("BadgeText") ? paper : ink;
  result.terrain = dark ? "#333333" : "#dddddd";
  return result;
}
