import { createDiagnostic } from "../domain/diagnostics.js";
import { hasElevationResidual, routeElevationProfile, routeTraversal } from "../domain/traversal.js";
import { invalidNumberPath } from "../domain/numeric-policy.js";

export function validateGeometry(route) {
  const invalid = invalidNumberPath(route, "Route");
  if (invalid !== null) {
    return [createDiagnostic("geometry", "error", `${invalid} is outside the supported numeric range.`, { line: 1, column: 1 }, "Use finite numeric values with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.")];
  }
  const traversal = routeTraversal(route);
  const profile = routeElevationProfile(route);
  const missing = traversal.segments.filter((segment) => segment.kind === "technical" && segment.verticalDeltaMeters === null);
  const diagnostics = missing.map((segment) => createDiagnostic(
    "geometry", profile === null ? "warning" : "error",
    "Technical elevation is undetermined because height is missing.",
    route.elements[segment.elementIndex].sourceLocation,
    "Supply a height; without an elevation profile this feature is drawn schematically."
  ));
  if (profile === null || missing.length > 0 || !hasElevationResidual(route)) return diagnostics;
  const hasConnections = traversal.segments.some((segment) => segment.kind === "connection");
  return [...diagnostics, createDiagnostic(
    "geometry", hasConnections ? "warning" : "error",
    hasConnections ? "Intermediate elevations are underdetermined; remaining elevation is distributed schematically across connections."
      : "Declared technical motion is inconsistent with entrance and exit elevations.",
    { line: 1, column: 1 },
    hasConnections ? "Treat intermediate elevations as estimates; technical heights and directions are preserved."
      : "Correct the elevations or technical measurements; technical segments cannot absorb residual elevation."
  )];
}
