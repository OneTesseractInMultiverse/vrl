import { requireNumericData, requireSupportedNumber } from "./numeric-policy.js";

/** Technical ownership is a domain rule, independent of drawing coordinates. */
export function technicalElementIndexesBetween(elements, index) {
  const indexes = [];
  if (isDescent(elements[index - 1])) indexes.push(index - 1);
  if (elements[index]?.type === "climb") indexes.push(index);
  return indexes;
}

export function isDescent(element) {
  return element?.type === "rappel" || element?.type === "downclimb";
}

/** Notes and hazards describe the route without adding physical progression. */
export function isAnnotation(element) {
  return element.type === "note" || element.type === "hazard";
}

export function createTraversal(elements) {
  const progression = progressionEntries(elements);
  const { points, segments } = createProgression(progression, elements);
  const annotations = attachAnnotations(elements, points);
  return { points, segments, annotations };
}

function progressionEntries(elements) {
  return elements.map((element, elementIndex) => ({ element, elementIndex }))
    .filter(({ element }) => !isAnnotation(element));
}

function createProgression(progression, elements) {
  const points = [];
  const segments = [];
  const physicalElements = progression.map(({ element }) => element);
  for (let index = 0; index < progression.length; index += 1) {
    const owners = technicalElementIndexesBetween(physicalElements, index)
      .map((owner) => progression[owner].elementIndex);
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

function attachAnnotations(elements, points) {
  const elementPoints = new Map(points.map((point, index) => [point.elementIndex, index]));
  let pointIndex = points.length === 0 ? null : 0;
  const annotations = [];
  elements.forEach((element, elementIndex) => {
    if (isAnnotation(element)) {
      annotations.push({ elementIndex, pointIndex });
    } else {
      pointIndex = elementPoints.get(elementIndex) + (isDescent(element) ? 1 : 0);
    }
  });
  return annotations;
}

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

export function technicalElevationDelta(element) {
  const meters = measurementMeters(element.attributes.height);
  if (meters === null) return null;
  return technicalVerticalMeters(element) * (element.type === "climb" ? 1 : -1);
}

export function technicalVerticalMeters(element) {
  const meters = measurementMeters(element.attributes?.height);
  const inclination = element.attributes?.inclination;
  const percent = typeof inclination === "object" && inclination !== null && typeof inclination.percent === "number"
    ? inclination.percent
    : 100;
  return requireSupportedNumber((meters ?? 0) * (percent / 100), "Technical vertical distance");
}

export function measurementMeters(value) {
  return typeof value === "object" && value !== null && typeof value.meters === "number" ? value.meters : null;
}

export function routeTraversal(route) {
  return route.traversal ?? createTraversal(route.elements);
}

export function routeElevationProfile(route) {
  const entranceMeters = measurementMeters(route.metadata?.entrance_elevation);
  const exitMeters = measurementMeters(route.metadata?.exit_elevation);
  if (entranceMeters === null || exitMeters === null) return null;
  return requireNumericData({ entranceMeters, exitMeters, totalChangeMeters: entranceMeters - exitMeters }, "Elevation profile");
}

/** Requires complete endpoint elevations and measured technical segments. */
export function elevationResidual(route, profile) {
  const declaredDelta = routeTraversal(route).segments.reduce((sum, segment) => sum + segment.verticalDeltaMeters, 0);
  return requireSupportedNumber(profile.totalChangeMeters + declaredDelta, "Elevation residual");
}

export function hasElevationResidual(route) {
  const profile = routeElevationProfile(route);
  const segments = routeTraversal(route).segments;
  if (segments.length === 0) return profile.totalChangeMeters !== 0;
  const technicalMagnitude = requireSupportedNumber(segments.reduce((sum, segment) => sum + Math.abs(segment.verticalDeltaMeters), 0), "Total technical distance");
  const smallestMotion = segments.reduce((smallest, segment) => Math.min(smallest, Math.abs(segment.verticalDeltaMeters) || Infinity), Infinity);
  const scale = Math.max(1, Math.abs(profile.entranceMeters), Math.abs(profile.exitMeters), technicalMagnitude);
  const roundoff = Number.EPSILON * 16 * scale * (segments.length + 1);
  // Boundary calibration must not erase or reverse even the smallest declared motion.
  const tolerance = Math.min(roundoff, smallestMotion / 2);
  return Math.abs(elevationResidual(route, profile)) > tolerance;
}
