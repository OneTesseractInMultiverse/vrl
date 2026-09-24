export const DETAIL_BADGE_TOKENS = {
  level: ["levelBadge", "levelBadgeText"],
  flow: ["flowBadge", "flowBadgeText"],
  exposure: ["exposureBadge", "exposureBadgeText"],
  hazardSeverity: ["hazardSeverityBadge", "hazardSeverityBadgeText"],
  inclination: ["inclinationBadge", "inclinationBadgeText"]
};

export function detailBadgeStyle(category, theme) {
  const tokens = DETAIL_BADGE_TOKENS[category];
  return { fill: theme[tokens[0]], text: theme[tokens[1]] };
}

export function themeSafeStroke(color) {
  return color === "" ? "#111111" : color;
}
