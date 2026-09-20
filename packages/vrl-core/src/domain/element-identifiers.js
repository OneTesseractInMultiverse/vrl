const ID_PREFIXES = {
  start: "S",
  exit: "E",
  walk: "W",
  rappel: "R",
  downclimb: "D",
  climb: "C",
  pool: "P",
  hazard: "H",
  note: "N"
};

/** Identifiers share one case-sensitive namespace across all route elements. */
export function elementIdentifierProblems(elements) {
  const firstById = new Map();
  const problems = [];
  for (const element of elements) {
    if (element.id === null || element.id === undefined) continue;
    const problem = identifierProblem(element, firstById);
    if (problem !== null) problems.push(problem);
    else firstById.set(element.id, element);
  }
  return problems;
}

function identifierProblem(element, firstById) {
  if (typeof element.id !== "string" || element.id.trim() === "") {
    return { element, first: null, message: "An explicit element identifier must be a non-blank string." };
  }
  if (firstById.has(element.id)) {
    return { element, first: firstById.get(element.id), message: `Duplicate element identifier "${element.id}".` };
  }
  return null;
}

/** Reserve the whole collection before allocating; counters belong to this call's owner. */
export function allocateElementIdentifiers(elements, counters = {}) {
  const problems = elementIdentifierProblems(elements);
  if (problems.length > 0) throw new RangeError(problems[0].message);
  const reservedIds = new Set(elements.map((element) => element.id));
  return elements.map((element) => allocateIdentifier(element, counters, reservedIds));
}

function allocateIdentifier(element, counters, reservedIds) {
  let sequence = (counters[element.type] ?? 0) + 1;
  let id = element.id;
  if (id === null || id === undefined) {
    id = `${ID_PREFIXES[element.type]}${sequence}`;
    while (reservedIds.has(id)) {
      sequence += 1;
      id = `${ID_PREFIXES[element.type]}${sequence}`;
    }
  }
  counters[element.type] = sequence;
  reservedIds.add(id);
  return id;
}
