import {
  elevationResidual,
  isAnnotation,
  routeElevationProfile,
  routeTraversal,
  technicalElementIndexesBetween,
  technicalVerticalMeters
} from "../domain/traversal.js";
import { validateGeometry } from "../validation/validate-geometry.js";
import { assertFiniteNumber, validateLayoutOptions } from "./options.js";
import { requireNumericData, requireSupportedNumber } from "../domain/numeric-policy.js";

export { routeElevationProfile, technicalVerticalMeters } from "../domain/traversal.js";

const ELEMENT_WEIGHTS = {
  start: 0.7,
  exit: 0.7,
  walk: 0.9,
  swim: 0.9,
  rappel: 1.25,
  downclimb: 1,
  climb: 1,
  pool: 0.85,
  hazard: 0.9,
  note: 0.7
};

/**
 * Select elevation-based or weighted layout after resolving whether both endpoint elevations exist.
 * @responsibility coordinator
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @returns {Object} Finite schematic or elevation-aware layout with positioned points, nodes, annotations and owned segments.
 */
export function computeVerticalLayout(route, options = {}) {
  return hasElevationProfile(route) ? computeElevationLayout(route, options) : computeWeightedLayout(route, validateLayoutOptions(options));
}

/**
 * Validate geometry, derive traversal, compute weighted positions and assemble the schematic layout.
 * @responsibility coordinator
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @returns {Object} Finite schematic layout whose screen geometry preserves technical direction.
 */
function computeWeightedLayout(route, options) {
  requireConsistentGeometry(route);
  const traversal = routeTraversal(route);
  const points = weightedPoints(route, traversal, options);
  return assembleLayout(route, traversal, shiftPoints(points, options.marginY ?? 108), options);
}

/**
 * Assign type-weighted vertical spacing and horizontal progression while preserving canonical ascent and
 * descent directions.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} traversal - Canonical points, directed segments and annotation ownership.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @returns {Array} The result returned by traversal.points.map.
 */
function weightedPoints(route, traversal, options) {
  const top = options.marginY ?? 108;
  const spacing = options.baseSpacing ?? 68;
  const scale = resolveHorizontalScale(options.horizontalScale);
  let x = options.spineX ?? 96;
  let y = top;
  return traversal.points.map(/**
   * Advance local horizontal/vertical cursors for each incoming segment and retain the point's identity with
   * rounded schematic coordinates.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Object} A record containing the supplied fields, x, y.
   */ (point, index) => {
    if (index > 0) {
      const segment = traversal.segments[index - 1];
      const element = spacingElement(route, point, segment);
      x += horizontalProgress(element) * scale;
      y += spacing * elementVisualWeight(element) * (segment.direction === "up" ? -1 : 1);
    }
    return { ...point, x: Math.round(x), y: Math.round(y) };
  });
}

/**
 * Choose the element that owns a point or its incoming technical segment for schematic spacing.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} point - Positioned route point in drawing coordinates.
 * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
 * @returns {unknown} The route.elements.point.elementIndex ?? segment.elementIndex value selected or validated above.
 */
function spacingElement(route, point, segment) {
  return route.elements[point.elementIndex ?? segment.elementIndex];
}

/**
 * Validate configuration and geometry, resolve endpoint constraints, position traversal points, enforce
 * readable gaps and assemble layout.
 * @responsibility coordinator
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} options - Operation-specific option record; defaults to an empty record. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @returns {Object} Finite layout retaining declared endpoint elevations and technical changes; readable pixel gaps may be exaggerated.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function computeElevationLayout(route, options = {}) {
  options = validateLayoutOptions(options);
  requireConsistentGeometry(route);
  const profile = routeElevationProfile(route);
  if (profile === null) throw new RangeError("An elevation layout requires entrance and exit elevations.");
  const traversal = routeTraversal(route);
  const deltas = computeElevationDeltas(route, traversal, profile);
  const points = elevationPoints(route, traversal, deltas, options, profile);
  const spaced = applyMinimumNodeGap(points, options.minNodeGap ?? 68, options.marginY ?? 108);
  return assembleLayout(route, traversal, spaced, options, { ...profile, pixelsPerMeter: options.pixelsPerMeter ?? 5.5 });
}

/**
 * Accumulate physical elevations from segment deltas and project them into pixel coordinates, preserving the
 * exact exit endpoint.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} traversal - Canonical points, directed segments and annotation ownership.
 * @param {Array} deltas - Signed per-segment elevation deltas in meters.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @param {Object} profile - Complete endpoint profile with entranceMeters, exitMeters and totalChangeMeters.
 * @returns {Array} The result returned by points.map.
 */
function elevationPoints(route, traversal, deltas, options, profile) {
  const scale = resolveHorizontalScale(options.horizontalScale);
  const pixelsPerMeter = options.pixelsPerMeter ?? 5.5;
  let x = options.spineX ?? 96;
  let elevation = profile.entranceMeters;
  const points = traversal.points.map(/**
   * Accumulate horizontal position and physical elevation from owned segment deltas, pinning the final point to
   * the declared exit elevation.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Object} A record containing the supplied fields, x, elevationMeters, direction.
   */ (point, index) => {
    if (index > 0) {
      x += horizontalProgress(spacingElement(route, point, traversal.segments[index - 1])) * scale;
      elevation -= deltas[index - 1];
      // Consistency has been checked; avoid accumulated roundoff at the boundary.
      if (index === traversal.points.length - 1) elevation = profile.exitMeters;
    }
    return { ...point, x: Math.round(x), elevationMeters: elevation, direction: traversal.segments[index - 1]?.direction ?? null };
  });
  const highest = points.reduce(/**
   * Apply Math.max to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {unknown} The result returned by Math.max.
   */ (value, point) => Math.max(value, point.elevationMeters), Math.max(profile.entranceMeters, profile.exitMeters));
  return points.map(/**
   * Project existing fields, y into the record required by points.map.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {Object} A record containing the supplied fields, y.
   */ (point) => ({
    ...point,
    y: Math.round((options.marginY ?? 108) + (highest - point.elevationMeters) * pixelsPerMeter)
  }));
}

/**
 * Attach normalized elements, positioned annotations and segments to the complete finite layout record.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} traversal - Canonical points, directed segments and annotation ownership.
 * @param {Array} positions - Prepared physical-point drawing coordinates.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @param {Object} elevation - Optional resolved endpoint elevation profile with drawing scale.
 * @returns {Object} Complete layout with canvas dimensions, spine, nodes, points and positioned segments.
 */
function assembleLayout(route, traversal, positions, options, elevation) {
  const top = options.marginY ?? 108;
  const points = positions.map(/**
   * Project existing fields, id, element into the record required by positions.map.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {Object} A record containing the supplied fields, id, element.
   */ (point) => ({
    ...point,
    id: point.elementIndex === null ? null : route.elements[point.elementIndex].id,
    element: point.elementIndex === null ? null : route.elements[point.elementIndex]
  }));
  const annotations = positionAnnotations(route, traversal.annotations ?? [], points, options);
  const nodes = [...points.filter(/**
   * Evaluate the selection condition point.elementIndex !== null.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (point) => point.elementIndex !== null), ...annotations]
    .sort(/**
     * Compute ordering with left.elementIndex - right.elementIndex; negative, zero and positive values select the
     * comparison order.
     * @responsibility computation
     * @param {unknown} left - Left comparison record in the requested ordering.
     * @param {unknown} right - Right comparison record, or greatest right extent when reducing geometry.
     * @returns {number} The result of the documented comparison or calculation.
     */ (left, right) => left.elementIndex - right.elementIndex);
  const bottomY = points.reduce(/**
   * Apply Math.max to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {number} max - Largest extent found so far in drawing units.
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {unknown} The result returned by Math.max.
   */ (max, point) => Math.max(max, point.y), top);
  const contentBottom = annotations.reduce(/**
   * Apply Math.max to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {number} max - Largest extent found so far in drawing units.
   * @param {unknown} node - Current positioned node, or syntax node when inspecting source code.
   * @returns {unknown} The result returned by Math.max.
   */ (max, node) => Math.max(max, node.y), bottomY);
  return requireNumericData({
    width: options.width ?? 640,
    height: Math.round(contentBottom + (options.marginBottom ?? 64)),
    spine: { x: options.spineX ?? 96, y1: top, y2: bottomY },
    ...(elevation === undefined ? {} : { elevation }),
    nodes,
    points,
    segments: traversal.segments.map(/**
     * Apply positionSegment to the supplied arguments; retain the callee's return and failure behavior.
     * @responsibility computation
     * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
     * @returns {unknown} The result returned by positionSegment.
     */ (segment) => positionSegment(route, segment, points, elevation))
  }, "Layout");
}

/**
 * Offset annotations from their reached physical point with deterministic per-boundary stacking.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Array} annotations - Standalone annotations with reached-boundary references.
 * @param {Array} points - Ordered physical route points with their positions.
 * @param {Object} options - Operation-specific option record; must be supplied by the calling coordinator. Supports width, spineX, margins, spacing, horizontal scale and pixels per meter.
 * @returns {Array} The result returned by annotations.map.
 */
function positionAnnotations(route, annotations, points, options) {
  const counts = new Map();
  return annotations.map(/**
   * Place an annotation left of its reached boundary and advance the per-boundary stacking count without
   * changing physical motion.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {unknown} input1.elementIndex - Zero-based source element index.
   * @param {unknown} input1.pointIndex - Zero-based reached physical boundary index.
   * @returns {Object} A record containing elementIndex, id, element, anchorPointIndex, x, y, the supplied fields.
   */ ({ elementIndex, pointIndex }) => {
    const anchor = points[pointIndex] ?? { x: options.spineX ?? 96, y: options.marginY ?? 108 };
    const offset = counts.get(pointIndex) ?? 0;
    counts.set(pointIndex, offset + 1);
    const element = route.elements[elementIndex];
    return {
      elementIndex, id: element.id, element, anchorPointIndex: pointIndex,
      x: anchor.x - 32, y: anchor.y + offset * 36,
      ...(anchor.elevationMeters === undefined ? {} : { elevationMeters: anchor.elevationMeters })
    };
  });
}

/**
 * Attach positioned endpoints and the technical owner's pixel delta to a canonical segment.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
 * @param {Array} points - Ordered physical route points with their positions.
 * @param {Object} elevation - Optional resolved endpoint elevation profile with drawing scale.
 * @returns {Object} A record containing the supplied fields, start, end, element, technicalDeltaY.
 */
function positionSegment(route, segment, points, elevation) {
  return {
    ...segment,
    start: points[segment.from],
    end: points[segment.to],
    element: segment.elementIndex === null ? null : route.elements[segment.elementIndex],
    technicalDeltaY: segmentPixelDelta(segment, points, elevation)
  };
}

/**
 * Compute a signed technical pixel span from physical change or schematic endpoints; connections return null.
 * @responsibility computation
 * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
 * @param {Array} points - Ordered physical route points with their positions.
 * @param {Object} elevation - Optional resolved endpoint elevation profile with drawing scale.
 * @returns {?number} Signed screen-y technical span, or null for a connection.
 */
function segmentPixelDelta(segment, points, elevation) {
  if (segment.kind !== "technical") return null;
  if (elevation === undefined) return points[segment.to].y - points[segment.from].y;
  const length = Math.max(1, Math.round(Math.abs(segment.verticalDeltaMeters) * elevation.pixelsPerMeter));
  return segment.direction === "up" ? -length : length;
}

/**
 * Translate point positions so their minimum y meets the top margin without changing relative geometry.
 * @responsibility computation
 * @param {Array} points - Ordered physical route points with their positions.
 * @param {number} top - Top margin or minimum y in drawing units.
 * @returns {unknown} The selected result, including the documented absent-value fallback.
 */
function shiftPoints(points, top) {
  const minY = points.reduce(/**
   * Apply Math.min to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {number} min - Smallest extent found so far in drawing units.
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {unknown} The result returned by Math.min.
   */ (min, point) => Math.min(min, point.y), top);
  const shiftY = top - minY;
  return shiftY === 0 ? points : points.map(/**
   * Project existing fields, y into the record required by points.map.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @returns {Object} A record containing the supplied fields, y.
   */ (point) => ({ ...point, y: point.y + shiftY }));
}

/**
 * Expand adjacent gaps in their declared direction and shift into the top margin; physical elevation metadata
 * remains unchanged.
 * @responsibility computation
 * @param {Array} nodes - Ordered positioned route points whose y coordinates are examined or adjusted.
 * @param {number} minNodeGap - Minimum readable vertical gap in drawing units; defaults to 0.
 * @param {number} top - Top margin or minimum y in drawing units; defaults to 0.
 * @returns {unknown} The result returned by requireNumericData.
 */
export function applyMinimumNodeGap(nodes, minNodeGap = 0, top = 0) {
  if (minNodeGap <= 0 || nodes.length < 2) return requireNumericData(nodes, "Layout points");
  const adjusted = [nodes[0]];
  for (let index = 1; index < nodes.length; index += 1) {
    const previousOriginal = nodes[index - 1];
    const previousAdjusted = adjusted[index - 1];
    const node = nodes[index];
    const descends = node.direction === "up" ? false : node.direction === "down" ? true : node.y >= previousOriginal.y;
    const requiredGap = Math.max(minNodeGap, Math.abs(node.y - previousOriginal.y));
    const y = descends ? Math.max(node.y, previousAdjusted.y + requiredGap) : Math.min(node.y, previousAdjusted.y - requiredGap);
    adjusted.push({ ...node, y });
  }
  return requireNumericData(shiftPoints(adjusted, top), "Layout points");
}

/**
 * Report whether both endpoint elevations can form an elevation profile.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function hasElevationProfile(route) {
  return routeElevationProfile(route) !== null;
}

/**
 * Require consistent geometry and compute directed per-segment elevation changes when a profile exists.
 * @responsibility coordinator
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @returns {number[]} Per-segment signed descent values in meters, or an empty list without a complete profile.
 */
export function elevationSegmentDeltas(route) {
  const profile = routeElevationProfile(route);
  if (profile === null) return [];
  requireConsistentGeometry(route);
  const traversal = routeTraversal(route);
  return computeElevationDeltas(route, traversal, profile);
}

/**
 * Run geometry validation and throw the first blocking error while allowing warnings.
 * @responsibility coordinator
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @returns {void} Completes the documented operation; no return value is consumed.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
function requireConsistentGeometry(route) {
  const errors = validateGeometry(route).filter(/**
   * Evaluate the selection condition diagnostic.severity === "error".
   * @responsibility computation
   * @param {unknown} diagnostic - Structured diagnostic with kind, severity, message and source location.
   * @returns {boolean} The result of the documented comparison or calculation.
   */ (diagnostic) => diagnostic.severity === "error");
  if (errors.length > 0) throw new RangeError(errors[0].message);
}

/**
 * Preserve technical deltas and distribute residual endpoint elevation only across weighted connections.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} traversal - Canonical points, directed segments and annotation ownership.
 * @param {Object} profile - Complete endpoint profile with entranceMeters, exitMeters and totalChangeMeters.
 * @returns {number[]} Finite per-segment descent values with endpoint residual assigned only to connections.
 */
function computeElevationDeltas(route, traversal, profile) {
  const weights = traversal.segments.map(/**
   * Assign connection residual weight from the destination element; technical segments receive zero.
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (segment) => segment.kind === "connection"
    ? elementVisualWeight(route.elements[traversal.points[segment.to].elementIndex]) : 0);
  const totalWeight = weights.reduce(/**
   * Compute sum + weight.
   * @responsibility computation
   * @param {number} sum - Accumulated numeric sum before processing the current entry.
   * @param {number} weight - Current dimensionless spacing or residual-distribution weight.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (sum, weight) => sum + weight, 0);
  const residual = elevationResidual(route, profile);
  return requireNumericData(traversal.segments.map(/**
   * Compute -segment.verticalDeltaMeters + (totalWeight === 0 ? 0 : residual * weights[index] / totalWeight).
   * @responsibility computation
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (segment, index) => -segment.verticalDeltaMeters
    + (totalWeight === 0 ? 0 : residual * weights[index] / totalWeight)), "Elevation deltas");
}

/**
 * Compute the legacy net descent between adjacent elements, retaining both events when descent is followed by
 * ascent. Compatibility helper: the net change may contain two technical events.
 * @responsibility computation
 * @param {unknown} previous - Previous positioned node or element in the compatibility helper.
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} Finite net descent in meters across the adjacent elements, including both technical events when present.
 */

export function technicalSegmentDelta(previous, element) {
  const elements = [previous, element];
  return requireSupportedNumber(technicalElementIndexesBetween(elements, 1).reduce(/**
   * Compute sum + technicalVerticalMeters(elements[index]) * (elements[index].type === "climb" ? -1 : 1).
   * @responsibility computation
   * @param {number} sum - Accumulated numeric sum before processing the current entry.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (sum, index) =>
    sum + technicalVerticalMeters(elements[index]) * (elements[index].type === "climb" ? -1 : 1), 0), "Combined technical distance");
}

/**
 * Assign legacy residual weights only to nontechnical, nonannotation connections. Compatibility helper;
 * residuals must never be added to technical motion.
 * @responsibility computation
 * @param {Array} elements - Route elements in source order.
 * @param {Array} baseDeltas - Legacy per-connection technical deltas used to exclude technical residual distribution.
 * @returns {Array} The result returned by baseDeltas.map.
 */

export function residualDistributionWeights(elements, baseDeltas) {
  return baseDeltas.map(/**
   * Assign legacy residual weight only to zero-delta connections with no annotation or technical event.
   * @responsibility computation
   * @param {unknown} delta - Signed technical vertical change used by this calculation.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {unknown} The selected result, including the documented absent-value fallback.
   */ (delta, index) => delta === 0
    && !isAnnotation(elements[index]) && !isAnnotation(elements[index + 1])
    && technicalElementIndexesBetween(elements, index + 1).length === 0
    ? elementVisualWeight(elements[index + 1]) : 0);
}

/**
 * Look up a type's schematic spacing weight, defaulting to one for unsupported types.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} Configured schematic spacing weight, or one for an unknown element type.
 */
export function elementVisualWeight(element) {
  return ELEMENT_WEIGHTS[element.type] ?? 1;
}

/**
 * Choose a type-specific horizontal spacing increment in drawing units.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} Type-specific horizontal increment: 44 for rappel, 42 for climb/downclimb, 78 for exit and 58 otherwise.
 */
export function horizontalProgress(element) {
  if (element.type === "rappel") return 44;
  if (element.type === "downclimb" || element.type === "climb") return 42;
  if (element.type === "exit") return 78;
  return 58;
}

/**
 * Validate and return a positive finite horizontal scale within the supported magnitude.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above; defaults to 1.
 * @returns {number} The validated positive finite scale unchanged.
 * @throws {RangeError} A value violates the supported range or domain invariant.
 */
export function resolveHorizontalScale(value = 1) {
  assertFiniteNumber(value, "Horizontal scale");
  if (value <= 0 || value > Number.MAX_SAFE_INTEGER) throw new RangeError("Horizontal scale must be positive and no greater than Number.MAX_SAFE_INTEGER.");
  return value;
}

/**
 * Map climb elements to negative screen-y progression and all other elements to positive progression.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} Negative one for climb and positive one for every other element type.
 */
export function verticalDirection(element) {
  return element.type === "climb" ? -1 : 1;
}
