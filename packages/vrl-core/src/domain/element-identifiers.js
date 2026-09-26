import { ID_PREFIXES } from "./element-types.js";

/**
 * Find blank, invalid or repeated explicit identifiers in source order using a case-sensitive route-wide
 * namespace. Identifiers share one case-sensitive namespace across all route elements.
 * @responsibility computation
 * @param {Array} elements - Route elements in source order.
 * @returns {unknown} The problems value selected or validated above.
 */

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

/**
 * Classify one explicit identifier against the first accepted declarations; return null when it is valid and
 * unique.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} firstById - Map of first accepted explicit IDs to their owning elements.
 * @returns {Object|null} A record containing element, first, message. Null when no matching value or problem exists.
 */
function identifierProblem(element, firstById) {
  if (typeof element.id !== "string" || element.id.trim() === "") {
    return { element, first: null, message: "An explicit element identifier must be a non-blank string." };
  }
  if (firstById.has(element.id)) {
    return { element, first: firstById.get(element.id), message: `Duplicate element identifier "${element.id}".` };
  }
  return null;
}

/**
 * Reserve every explicit identifier before allocating omitted IDs; mutate the supplied counters and reject
 * invalid or duplicate explicit IDs. Reserve the whole collection before allocating; counters belong to this
 * call's owner.
 * @responsibility computation
 * @param {Array} elements - Route elements in source order.
 * @param {unknown} counters - Caller-owned per-element-type counters, advanced during identifier allocation; defaults to {}.
 * @returns {Array} The result returned by elements.map.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */

export function allocateElementIdentifiers(elements, counters = {}) {
  const problems = elementIdentifierProblems(elements);
  if (problems.length > 0) throw new RangeError(problems[0].message);
  const reservedIds = new Set(elements.map(/**
   * Project element.id from the current record.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The element.id value selected or validated above.
   */ (element) => element.id));
  return elements.map(/**
   * Apply allocateIdentifier to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The result returned by allocateIdentifier.
   */ (element) => allocateIdentifier(element, counters, reservedIds));
}

/**
 * Allocate one collision-free typed identifier and update the caller-owned counters and reserved-ID set.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @param {unknown} counters - Caller-owned per-element-type counters, advanced during identifier allocation.
 * @param {Set<string>} reservedIds - Caller-owned reserved/allocated identity set; the current identifier is added in place.
 * @returns {unknown} The id value selected or validated above.
 */
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
