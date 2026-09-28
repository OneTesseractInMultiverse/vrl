export const ID_PREFIXES = Object.freeze({
  start: "S",
  exit: "E",
  walk: "W",
  swim: "SW",
  rappel: "R",
  downclimb: "D",
  climb: "C",
  pool: "P",
  hazard: "H",
  note: "N"
});

/**
 * Recognize a supported route element type from the domain vocabulary.
 * @responsibility computation
 * @param {unknown} type - Declared element or record discriminator.
 * @returns {unknown} The result returned by Object.hasOwn.
 */
export function isElementType(type) {
  return Object.hasOwn(ID_PREFIXES, type);
}
