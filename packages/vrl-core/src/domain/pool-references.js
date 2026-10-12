/**
 * Classify swim associations against explicit identities without allocating IDs or changing route semantics.
 * Call after field and unique-identity checks; input is raw AST data, not normalized generated identities.
 * @responsibility computation
 * @param {Object[]} elements - Raw elements with valid fields and unique explicit IDs; never mutated.
 * @returns {Object[]} Source-ordered missing/wrong-type problems, with owning and optional target indexes.
 */
export function poolReferenceProblems(elements) {
  const explicit = new Map();
  for (const [index, element] of elements.entries()) if (element.id != null) explicit.set(element.id, index);
  const problems = [];
  for (const [elementIndex, element] of elements.entries()) {
    if (element.type !== "swim" || !Object.hasOwn(element.attributes, "pool_ref")) continue;
    const reference = element.attributes.pool_ref;
    const targetIndex = explicit.get(reference);
    if (targetIndex === undefined) problems.push({ kind: "missing", elementIndex, reference, targetIndex: null });
    else if (elements[targetIndex].type !== "pool") problems.push({ kind: "type", elementIndex, reference, targetIndex });
  }
  return problems;
}

/**
 * Require all authored swim references to resolve before assembling a whole-route normalized model.
 * @responsibility coordinator
 * @param {Object[]} elements - Validated raw elements with unique explicit IDs and syntactically valid fields.
 * @returns {void} Returns normally only when every supplied association names an explicit pool.
 * @throws {RangeError} A reference is missing or names a non-pool element; no input data is modified.
 */
export function requirePoolReferences(elements) {
  const problems = poolReferenceProblems(elements);
  if (problems.length > 0) throw new RangeError(`Invalid swim pool_ref "${problems[0].reference}" (${problems[0].kind}).`);
}
