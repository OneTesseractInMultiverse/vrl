export const ID_PREFIXES = Object.freeze({
  start: "S",
  exit: "E",
  walk: "W",
  rappel: "R",
  downclimb: "D",
  climb: "C",
  pool: "P",
  hazard: "H",
  note: "N"
});

export function isElementType(type) {
  return Object.hasOwn(ID_PREFIXES, type);
}
