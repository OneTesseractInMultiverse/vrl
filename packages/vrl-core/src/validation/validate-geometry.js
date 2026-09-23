import { declarationReference, fieldReference, metadataSource } from "../domain/source-references.js";
import { codedDiagnostic } from "../domain/diagnostics.js";
import { hasElevationResidual, routeElevationProfile, routeTraversal } from "../domain/traversal.js";
import { invalidNumberPath } from "../domain/numeric-policy.js";
import { validateBoundaries } from "./validate-boundaries.js";

export function validateGeometry(route, sourceMap) {
  const invalid = invalidNumberPath(route, "Route");
  if (invalid !== null) {
    return [codedDiagnostic("VRL_GEOMETRY_NUMERIC_RANGE", "geometry", "error", `${invalid} is outside the supported numeric range.`, declarationReference(sourceMap?.route), "Use finite numeric values with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.")];
  }
  const boundaryDiagnostics = validateBoundaries(route.elements, sourceMap?.elements);
  if (boundaryDiagnostics.length > 0) return boundaryDiagnostics;
  const traversal = routeTraversal(route);
  const profile = routeElevationProfile(route);
  const missing = traversal.segments.filter((segment) => segment.kind === "technical" && segment.verticalDeltaMeters === null);
  const diagnostics = missing.map((segment) => codedDiagnostic(
    "VRL_GEOMETRY_HEIGHT_REQUIRED", "geometry", profile === null ? "warning" : "error",
    "Technical elevation is undetermined because height is missing.",
    declarationReference(sourceMap?.elements?.[segment.elementIndex], route.elements[segment.elementIndex].sourceLocation),
    "Supply a height; without an elevation profile this feature is drawn schematically."
  ));
  if (profile === null || missing.length > 0 || !hasElevationResidual(route)) return diagnostics;
  const hasConnections = traversal.segments.some((segment) => segment.kind === "connection");
  return [...diagnostics, codedDiagnostic(
    hasConnections ? "VRL_GEOMETRY_ELEVATIONS_ESTIMATED" : "VRL_GEOMETRY_ELEVATIONS_INCONSISTENT", "geometry", hasConnections ? "warning" : "error",
    hasConnections ? "Intermediate elevations are underdetermined; remaining elevation is distributed schematically across connections."
      : "Declared technical motion is inconsistent with entrance and exit elevations.",
    fieldReference(metadataSource(sourceMap), "exit_elevation", sourceMap?.route?.span?.start),
    hasConnections ? "Treat intermediate elevations as estimates; technical heights and directions are preserved."
      : "Correct the elevations or technical measurements; technical segments cannot absorb residual elevation."
  )];
}
