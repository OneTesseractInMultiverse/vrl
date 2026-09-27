import { declarationReference, fieldReference, metadataSource } from "../domain/source-references.js";
import { codedDiagnostic } from "../domain/diagnostics.js";
import { hasElevationResidual, routeElevationProfile, routeTraversal } from "../domain/traversal.js";
import { invalidNumberPath } from "../domain/numeric-policy.js";
import { validateBoundaries } from "./validate-boundaries.js";

/**
 * Check numeric leaves and boundaries, then classify missing technical heights and endpoint consistency before
 * layout; return warnings or blocking geometry diagnostics.
 * @responsibility coordinator
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} sourceMap - Parser-owned source ranges; may be absent for programmatic input.
 * @returns {Array} Ordered numeric/boundary/geometry diagnostics; absent heights may be warnings without endpoint constraints.
 */
export function validateGeometry(route, sourceMap) {
  const invalid = invalidNumberPath(route, "Route");
  if (invalid !== null) {
    return [codedDiagnostic("VRL_GEOMETRY_NUMERIC_RANGE", "geometry", "error", `${invalid} is outside the supported numeric range.`, declarationReference(sourceMap?.route), "Use finite numeric values with absolute magnitude no greater than Number.MAX_SAFE_INTEGER.")];
  }
  const boundaryDiagnostics = validateBoundaries(route.elements, sourceMap?.elements);
  if (boundaryDiagnostics.length > 0) return boundaryDiagnostics;
  const traversal = routeTraversal(route);
  const profile = routeElevationProfile(route);
  const missing = traversal.segments.filter(/**
   * Evaluate the selection condition segment.kind === "technical" && segment.verticalDeltaMeters === null.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {unknown} The result of the documented comparison or calculation.
   */ (segment) => segment.kind === "technical" && segment.verticalDeltaMeters === null);
  const diagnostics = missing.map(/**
   * Locate and classify one unmeasured technical height against the optional complete elevation profile.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {Object} Located warning for schematic output, or blocking error for a complete measured profile.
   */ (segment) => unmeasuredHeightDiagnostic(route.elements[segment.elementIndex], sourceMap?.elements?.[segment.elementIndex], profile));
  if (profile === null || missing.length > 0 || !hasElevationResidual(route)) return diagnostics;
  const hasConnections = traversal.segments.some(/**
   * Evaluate the selection condition segment.kind === "connection".
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (segment) => segment.kind === "connection");
  return [...diagnostics, codedDiagnostic(
    hasConnections ? "VRL_GEOMETRY_ELEVATIONS_ESTIMATED" : "VRL_GEOMETRY_ELEVATIONS_INCONSISTENT", "geometry", hasConnections ? "warning" : "error",
    hasConnections ? "Intermediate elevations are underdetermined; remaining elevation is distributed schematically across connections."
      : "Declared technical motion is inconsistent with entrance and exit elevations.",
    fieldReference(metadataSource(sourceMap), "exit_elevation", sourceMap?.route?.span?.start),
    hasConnections ? "Treat intermediate elevations as estimates; technical heights and directions are preserved."
      : "Correct the elevations or technical measurements; technical segments cannot absorb residual elevation."
  )];
}

/**
 * Preserve absent-height diagnostics while locating explicit uncertainty on its authored value.
 * @responsibility computation
 * @param {Object} element - Normalized owner of a technical segment with null vertical delta.
 * @param {Object|undefined} source - Optional parser source map for this element, including attribute spans.
 * @param {Object|null} profile - Complete endpoint profile, or null when schematic output is permitted.
 * @returns {Object} Geometry diagnostic; complete endpoint profiles require known technical heights.
 */
function unmeasuredHeightDiagnostic(element, source, profile) {
  const explicit = element.attributes.height === "unknown";
  return codedDiagnostic(
    explicit ? "VRL_GEOMETRY_HEIGHT_UNKNOWN" : "VRL_GEOMETRY_HEIGHT_REQUIRED", "geometry", profile === null ? "warning" : "error",
    explicit ? "Technical elevation is undetermined because height is explicitly unknown." : "Technical elevation is undetermined because height is missing.",
    explicit ? fieldReference(source, "height", element.sourceLocation) : declarationReference(source, element.sourceLocation),
    explicit ? "Retain unknown for schematic output; a complete elevation profile requires a measured height, never an inferred value."
      : "Supply a height; without an elevation profile this feature is drawn schematically."
  );
}
