import { poolReferenceProblems } from "../domain/pool-references.js";
import { codedDiagnostic } from "../domain/diagnostics.js";
import { fieldReference, identifierReference } from "../domain/source-references.js";

/**
 * Translate domain association problems into source-located blocking diagnostics after local validation.
 * @responsibility coordinator
 * @param {Object} ast - Raw route with valid fields/unique IDs and optional parser provenance; never mutated.
 * @returns {Object[]} Ordered missing/wrong-type diagnostics; wrong types retain the target as related context.
 */
export function validatePoolReferences(ast) {
  return poolReferenceProblems(ast.elements).map(/**
   * Attach parser ranges to one classified domain problem without changing its meaning.
   * @responsibility computation
   * @param {Object} problem - Domain problem containing owner index, exact reference and optional target index.
   * @returns {Object} One located validation diagnostic with a concrete repair suggestion.
   */ problem => poolReferenceDiagnostic(problem, ast));
}

/**
 * Build one reference diagnostic with a field span and optional wrong-target declaration reference.
 * @responsibility computation
 * @param {Object} problem - Classified missing/type problem produced by the domain after field validation.
 * @param {Object} ast - Original raw elements and optional aligned source map used only for locations.
 * @returns {Object} Blocking diagnostic; absent provenance uses the existing source-location fallback.
 */
function poolReferenceDiagnostic(problem, ast) {
  const source = fieldReference(ast.sourceMap?.elements?.[problem.elementIndex], "pool_ref", ast.elements[problem.elementIndex].sourceLocation);
  const related = problem.targetIndex === null ? [] : [{ message: "Referenced non-pool declaration",
    ...identifierReference(ast.sourceMap?.elements?.[problem.targetIndex], ast.elements[problem.targetIndex].sourceLocation) }];
  const code = problem.kind === "missing" ? "VRL_REFERENCE_TARGET_MISSING" : "VRL_REFERENCE_TARGET_TYPE";
  const message = problem.kind === "missing" ? `Pool reference "${problem.reference}" has no explicitly identified target.`
    : `Pool reference "${problem.reference}" must name a pool element.`;
  return codedDiagnostic(code, "validation", "error", message, source,
    "Declare a unique explicit pool ID and reference its exact spelling, or omit pool_ref.", related);
}
