import { declaredDistanceBelowWalkSum } from "../domain/route-distance.js";
import { codedDiagnostic } from "../domain/diagnostics.js";
import { fieldReference, metadataSource } from "../domain/source-references.js";

/**
 * Translate the domain's partial-distance comparison into a located nonblocking warning.
 * Called only after semantic validation has no errors; both source quantities remain unchanged.
 * @responsibility coordinator
 * @param {Object} ast - Field-validated raw route AST with metadata, elements and an optional parser source map.
 * @returns {Object[]} Empty when no contradiction exists, otherwise one warning at the total's value span or fallback line 1, column 1.
 */
export function validateRouteDistance(ast) {
  if (!declaredDistanceBelowWalkSum(ast.elements, ast.metadata)) return [];
  return [codedDiagnostic("VRL_TOTAL_DISTANCE_BELOW_WALK_SUM", "validation", "warning",
    "Declared total distance is smaller than the sum of recorded walk distances.",
    fieldReference(metadataSource(ast.sourceMap), "total_distance", { line: 1, column: 1 }),
    "Review the declared total and walk distances; neither value has been replaced.")];
}
