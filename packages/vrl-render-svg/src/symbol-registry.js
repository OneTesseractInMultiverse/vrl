const DEFAULT_PROFILE = "federation";

const SYMBOL_PROFILES = {
  federation: {
    start: "IN",
    exit: "OUT",
    walk: "M",
    rappel: "R",
    downclimb: "D",
    climb: "C",
    pool: "V",
    hazard: "!",
    note: "i"
  },
  french: {
    start: "DEP",
    exit: "SORT",
    walk: "M",
    rappel: "R",
    downclimb: "D",
    climb: "C",
    pool: "V",
    hazard: "!",
    note: "i"
  },
  spanish: {
    start: "INI",
    exit: "FIN",
    walk: "A",
    rappel: "R",
    downclimb: "D",
    climb: "C",
    pool: "P",
    hazard: "!",
    note: "i"
  }
};

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

export function resolveSymbolProfile(profileName = DEFAULT_PROFILE) {
  return SYMBOL_PROFILES[profileName] ?? SYMBOL_PROFILES[DEFAULT_PROFILE];
}

export function symbolCode(element, profileName = DEFAULT_PROFILE) {
  if (isSnakeHazard(element)) {
    return "SN";
  }

  const profile = resolveSymbolProfile(profileName);
  return profile[element.type] ?? fallbackSymbolCode(element);
}

export function isSnakeHazard(element) {
  return element.type === "hazard" && SNAKE_HAZARD_TYPES.has(element.attributes.type);
}

export function symbolKind(element) {
  if (isSnakeHazard(element)) {
    return "snake";
  }

  if (element.type === "hazard") {
    return "hazard";
  }

  return "standard";
}

function fallbackSymbolCode(element) {
  if (element.id === null || element.id === undefined) {
    return "?";
  }

  return element.id.slice(0, 2).toUpperCase();
}
