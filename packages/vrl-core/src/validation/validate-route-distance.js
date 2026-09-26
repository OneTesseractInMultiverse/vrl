import { declaredDistanceBelowWalkSum } from "../domain/route-distance.js";
import { codedDiagnostic } from "../domain/diagnostics.js";
import { fieldReference, metadataSource } from "../domain/source-references.js";

/** Called only after field validation succeeds; preserve both source quantities. */
export function validateRouteDistance(ast) {
  if (!declaredDistanceBelowWalkSum(ast.elements, ast.metadata)) return [];
  return [codedDiagnostic("VRL_TOTAL_DISTANCE_BELOW_WALK_SUM", "validation", "warning",
    "Declared total distance is smaller than the sum of recorded walk distances.",
    fieldReference(metadataSource(ast.sourceMap), "total_distance", { line: 1, column: 1 }),
    "Review the declared total and walk distances; neither value has been replaced.")];
}
