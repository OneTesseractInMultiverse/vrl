import { requireNumericData, requireSupportedNumber } from "./numeric-policy.js";

/**
 * Select technical owners between neighboring source elements while preserving descent-before-ascent order.
 * Technical ownership is a domain rule, independent of drawing coordinates.
 * @responsibility computation
 * @param {Array} elements - Route elements in source order.
 * @param {number} index - Zero-based position in the current ordered collection.
 * @returns {unknown} The indexes value selected or validated above.
 */

export function technicalElementIndexesBetween(elements, index) {
  const indexes = [];
  if (isDescent(elements[index - 1])) indexes.push(index - 1);
  if (elements[index]?.type === "climb") indexes.push(index);
  return indexes;
}

/**
 * Recognize rappel and downclimb elements as downward technical events.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The result of the documented comparison or calculation.
 */
export function isDescent(element) {
  return element?.type === "rappel" || element?.type === "downclimb";
}

/**
 * Classify notes and hazards as annotations that do not add physical progression segments. Notes and hazards
 * describe the route without adding physical progression.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {unknown} The result of the documented comparison or calculation.
 */

export function isAnnotation(element) {
  return element.type === "note" || element.type === "hazard";
}

/**
 * Construct physical progression from route elements and attach standalone annotations to their reached
 * boundaries.
 * @responsibility coordinator
 * @param {Array} elements - Route elements in source order.
 * @returns {Object} Canonical points, directed segments and annotations retaining original element ownership.
 */
export function createTraversal(elements) {
  const progression = progressionEntries(elements);
  const { points, segments } = createProgression(progression, elements);
  const annotations = attachAnnotations(elements, points);
  return { points, segments, annotations };
}

/**
 * Retain source indexes while removing standalone annotations from physical progression.
 * @responsibility computation
 * @param {Array} elements - Route elements in source order.
 * @returns {Array} The result returned by elements.map((element, elementIndex) => ({ element, elementIndex })).filter.
 */
function progressionEntries(elements) {
  return elements.map(/**
   * Project element, elementIndex into the record required by elements.map.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @param {unknown} elementIndex - Zero-based source element index.
   * @returns {Object} A record containing element, elementIndex.
   */ (element, elementIndex) => ({ element, elementIndex }))
    .filter(/**
     * Evaluate the selection condition !isAnnotation(element).
     * @responsibility computation
     * @param {Object} input1 - Input record destructured into the separately documented members below.
     * @param {Object} input1.element - Owning route element with its type, identity and declared attributes.
     * @returns {boolean} The result of the documented comparison or calculation.
     */ ({ element }) => !isAnnotation(element));
}

/**
 * Build canonical points and directed segments, inserting missing technical boundaries without creating route
 * elements.
 * @responsibility computation
 * @param {unknown} progression - Ordered nonannotation entries retaining original element indexes.
 * @param {Array} elements - Route elements in source order.
 * @returns {Object} A record containing points, segments.
 */
function createProgression(progression, elements) {
  const points = [];
  const segments = [];
  const physicalElements = progression.map(/**
   * Project the owning element from an indexed physical progression entry.
   * @responsibility computation
   * @param {Object} input1 - Input record destructured into the separately documented members below.
   * @param {Object} input1.element - Owning route element with its type, identity and declared attributes.
   * @returns {unknown} The element value selected or validated above.
   */ ({ element }) => element);
  for (let index = 0; index < progression.length; index += 1) {
    const owners = technicalElementIndexesBetween(physicalElements, index)
      .map(/**
       * Project progression.owner.elementIndex from the current record.
       * @responsibility computation
       * @param {unknown} owner - Canonical route element owning the observed technical feature.
       * @returns {unknown} The progression.owner.elementIndex value selected or validated above.
       */ (owner) => progression[owner].elementIndex);
    if (index === 0 && owners.length > 0) points.push({ elementIndex: null });
    if (owners.length === 2) {
      points.push({ elementIndex: null });
      segments.push(createSegment(points.length - 2, owners[0], elements));
    }
    points.push({ elementIndex: progression[index].elementIndex });
    if (points.length > 1) {
      segments.push(createSegment(points.length - 2, owners.at(-1) ?? null, elements));
    }
  }
  if (isDescent(physicalElements.at(-1))) {
    points.push({ elementIndex: null });
    segments.push(createSegment(points.length - 2, progression.at(-1).elementIndex, elements));
  }
  return { points, segments };
}

/**
 * Associate each standalone annotation with the physical point reached at its source position.
 * @responsibility computation
 * @param {Array} elements - Route elements in source order.
 * @param {Array} points - Ordered physical route points with their positions.
 * @returns {unknown} The annotations value selected or validated above.
 */
function attachAnnotations(elements, points) {
  const elementPoints = new Map(points.map(/**
   * Index the physical boundary by its source element index.
   * @responsibility computation
   * @param {Object} point - Positioned route point in drawing coordinates.
   * @param {number} index - Zero-based position in the current ordered collection.
   * @returns {Array} The ordered records or values assembled above.
   */ (point, index) => [point.elementIndex, index]));
  let pointIndex = points.length === 0 ? null : 0;
  const annotations = [];
  elements.forEach(/**
   * Append annotations at the reached boundary and advance the local boundary index after each progression
   * element, including descents.
   * @responsibility computation
   * @param {Object} element - Owning route element with its type, identity and declared attributes.
   * @param {unknown} elementIndex - Zero-based source element index.
   * @returns {void} Completes the documented operation; no return value is consumed.
   */ (element, elementIndex) => {
    if (isAnnotation(element)) {
      annotations.push({ elementIndex, pointIndex });
    } else {
      pointIndex = elementPoints.get(elementIndex) + (isDescent(element) ? 1 : 0);
    }
  });
  return annotations;
}

/**
 * Construct a connection or technical segment with explicit owner, endpoints, direction and signed elevation
 * change.
 * @responsibility computation
 * @param {unknown} from - Zero-based canonical segment start-point index.
 * @param {unknown} elementIndex - Zero-based source element index.
 * @param {Array} elements - Route elements in source order.
 * @returns {Object} A record containing from, to, elementIndex, kind, direction, verticalDeltaMeters.
 */
function createSegment(from, elementIndex, elements) {
  const element = elements[elementIndex];
  return {
    from,
    to: from + 1,
    elementIndex,
    kind: elementIndex === null ? "connection" : "technical",
    direction: elementIndex === null ? null : element.type === "climb" ? "up" : "down",
    verticalDeltaMeters: elementIndex === null ? 0 : technicalElevationDelta(element)
  };
}

/**
 * Convert a technical height into signed physical elevation change; absent or explicitly unknown height
 * remains null and cannot be filled from rope declarations or diagram coordinates.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {null|number} Signed measured elevation delta, or null for absent/explicitly unknown height.
 */
export function technicalElevationDelta(element) {
  const meters = measurementMeters(element.attributes.height);
  if (meters === null) return null;
  return technicalVerticalMeters(element) * (element.type === "climb" ? 1 : -1);
}

/**
 * Compute vertical meters from declared height and optional inclination percentage without inventing absent
 * measurements.
 * @responsibility computation
 * @param {Object} element - Owning route element with its type, identity and declared attributes.
 * @returns {number} Height times inclination/100 in meters; absent/explicitly unknown height contributes zero only in this compatibility helper. Canonical traversal separately retains null physical motion.
 */
export function technicalVerticalMeters(element) {
  const meters = measurementMeters(element.attributes?.height);
  const inclination = element.attributes?.inclination;
  const percent = typeof inclination === "object" && inclination !== null && typeof inclination.percent === "number"
    ? inclination.percent
    : 100;
  return requireSupportedNumber((meters ?? 0) * (percent / 100), "Technical vertical distance");
}

/**
 * Read meters from a typed measurement, retaining the helper's missing-value convention.
 * @responsibility computation
 * @param {unknown} value - Candidate value; accepted shape, missing-value behavior and rejection rules are described above.
 * @returns {number|null} Numeric meters from a typed measurement, or null when no such value exists.
 */
export function measurementMeters(value) {
  return typeof value === "object" && value !== null && typeof value.meters === "number" ? value.meters : null;
}

/**
 * Return an existing canonical traversal or derive one for a compatible caller-built route.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @returns {Object} Existing canonical traversal, or a newly computed compatible traversal.
 */
export function routeTraversal(route) {
  return route.traversal ?? createTraversal(route.elements);
}

/**
 * Construct an endpoint elevation profile only when both typed elevations are available.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @returns {?Object} Finite entrance/exit elevations and their signed total change, or null when either endpoint is absent.
 */
export function routeElevationProfile(route) {
  const entranceMeters = measurementMeters(route.metadata?.entrance_elevation);
  const exitMeters = measurementMeters(route.metadata?.exit_elevation);
  if (entranceMeters === null || exitMeters === null) return null;
  return requireNumericData({ entranceMeters, exitMeters, totalChangeMeters: entranceMeters - exitMeters }, "Elevation profile");
}

/**
 * Compute the endpoint elevation change left after declared technical motion. Requires complete endpoint
 * elevations and measured technical segments.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @param {Object} profile - Complete endpoint profile with entranceMeters, exitMeters and totalChangeMeters.
 * @returns {number} Finite unallocated endpoint change in meters after declared technical motion.
 */

export function elevationResidual(route, profile) {
  const declaredDelta = routeTraversal(route).segments.reduce(/**
   * Compute sum + segment.verticalDeltaMeters.
   * @responsibility computation
   * @param {number} sum - Accumulated numeric sum before processing the current entry.
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (sum, segment) => sum + segment.verticalDeltaMeters, 0);
  return requireSupportedNumber(profile.totalChangeMeters + declaredDelta, "Elevation residual");
}

/**
 * Detect an elevation residual outside a scale-sensitive floating-point tolerance capped below half the
 * smallest technical motion. Requires both endpoint elevations and measured technical segments.
 * @responsibility computation
 * @param {Object} route - Normalized route view containing elements and optional metadata/traversal required by this operation.
 * @returns {boolean} The result of the documented comparison or calculation.
 */
export function hasElevationResidual(route) {
  const profile = routeElevationProfile(route);
  const segments = routeTraversal(route).segments;
  if (segments.length === 0) return profile.totalChangeMeters !== 0;
  const technicalMagnitude = requireSupportedNumber(segments.reduce(/**
   * Compute sum + Math.abs(segment.verticalDeltaMeters).
   * @responsibility computation
   * @param {number} sum - Accumulated numeric sum before processing the current entry.
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {number|string} The + expression's result for these supplied operands.
   */ (sum, segment) => sum + Math.abs(segment.verticalDeltaMeters), 0), "Total technical distance");
  const smallestMotion = segments.reduce(/**
   * Apply Math.min to the supplied arguments; retain the callee's return and failure behavior.
   * @responsibility computation
   * @param {number} smallest - Smallest observed coordinate or extent accumulated so far.
   * @param {Object} segment - Canonical or positioned route segment retaining its technical owner and direction.
   * @returns {unknown} The result returned by Math.min.
   */ (smallest, segment) => Math.min(smallest, Math.abs(segment.verticalDeltaMeters) || Infinity), Infinity);
  const scale = Math.max(1, Math.abs(profile.entranceMeters), Math.abs(profile.exitMeters), technicalMagnitude);
  const roundoff = Number.EPSILON * 16 * scale * (segments.length + 1);
  // Boundary calibration must not erase or reverse even the smallest declared motion.
  const tolerance = Math.min(roundoff, smallestMotion / 2);
  return Math.abs(elevationResidual(route, profile)) > tolerance;
}
