import { elementAttribute } from "./route-data.js";
const DEFAULT_PROFILE = "federation";

const SYMBOL_PROFILES = Object.freeze({
  federation: Object.freeze({
    start: "IN",
    exit: "OUT",
    walk: "M",
    rappel: "R",
    downclimb: "D",
    climb: "C",
    pool: "V",
    hazard: "!",
    note: "i"
  }),
  french: Object.freeze({
    start: "DEP",
    exit: "SORT",
    walk: "M",
    rappel: "R",
    downclimb: "D",
    climb: "C",
    pool: "V",
    hazard: "!",
    note: "i"
  }),
  spanish: Object.freeze({
    start: "INI",
    exit: "FIN",
    walk: "A",
    rappel: "R",
    downclimb: "D",
    climb: "C",
    pool: "P",
    hazard: "!",
    note: "i"
  })
});

const SNAKE_HAZARD_TYPES = new Set([
  "snake",
  "snakes",
  "snake_area",
  "snake_dense_area",
  "serpent",
  "serpents",
  "serpiente",
  "serpientes"
]);

/**
 * Return an own-key immutable symbol profile or the default profile for unsupported names.
 * @responsibility computation
 * @param {string} profileName - Requested named symbol profile; unsupported names use the default; defaults to DEFAULT_PROFILE.
 * @returns {Object} Shared frozen profile, falling back to the default for unsupported names.
 */
export function resolveSymbolProfile(profileName = DEFAULT_PROFILE) {
  return Object.hasOwn(SYMBOL_PROFILES, profileName) ? SYMBOL_PROFILES[profileName] : SYMBOL_PROFILES[DEFAULT_PROFILE];
}

/**
 * Select a snake-specific code, profile code or identity-based fallback for an element.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {string} profileName - Requested named symbol profile; unsupported names use the default; defaults to DEFAULT_PROFILE.
 * @returns {string} Selected profile/snake code or the two-character identity fallback.
 */
export function symbolCode(element, profileName = DEFAULT_PROFILE) {
  if (isSnakeHazard(element)) {
    return "SN";
  }

  const profile = resolveSymbolProfile(profileName);
  return Object.hasOwn(profile, element.type) ? profile[element.type] : fallbackSymbolCode(element);
}

/**
 * Recognize supported snake-hazard extension values on hazard elements.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
export function isSnakeHazard(element) {
  return element.type === "hazard" && SNAKE_HAZARD_TYPES.has(elementAttribute(element, "type"));
}

/**
 * Select snake, ordinary hazard or standard symbol geometry from the element's declared type.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {string} One of snake, hazard or standard, selecting prepared symbol geometry.
 */
export function symbolKind(element) {
  if (isSnakeHazard(element)) {
    return "snake";
  }

  if (element.type === "hazard") {
    return "hazard";
  }

  return "standard";
}

/**
 * Use the first two uppercased identity characters, or a question mark when no identity exists.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The literal "?" for this branch. The result returned by element.id.slice(0, 2).toUpperCase.
 */
function fallbackSymbolCode(element) {
  if (element.id === null || element.id === undefined) {
    return "?";
  }

  return element.id.slice(0, 2).toUpperCase();
}
