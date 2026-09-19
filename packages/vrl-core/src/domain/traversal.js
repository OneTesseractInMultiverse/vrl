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

export function createTraversal(elements) {
  const points = [];
  const segments = [];

  for (let index = 0; index < elements.length; index += 1) {
    const owners = technicalElementIndexesBetween(elements, index);
    if (index === 0 && owners.length > 0) points.push({ elementIndex: null });
    if (owners.length === 2) {
      points.push({ elementIndex: null });
      segments.push(createSegment(points.length - 2, owners[0], elements));
    }
    points.push({ elementIndex: index });
    if (points.length > 1) {
      segments.push(createSegment(points.length - 2, owners.at(-1) ?? null, elements));
    }
  }

  if (isDescent(elements.at(-1))) {
    points.push({ elementIndex: null });
    segments.push(createSegment(points.length - 2, elements.length - 1, elements));
  }

  return { points, segments };
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
  return (meters ?? 0) * (percent / 100);
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
  return { entranceMeters, exitMeters, totalChangeMeters: entranceMeters - exitMeters };
}

/** Requires complete endpoint elevations and measured technical segments. */
export function elevationResidual(route, profile) {
  const declaredDelta = routeTraversal(route).segments.reduce((sum, segment) => sum + segment.verticalDeltaMeters, 0);
  return profile.totalChangeMeters + declaredDelta;
}

export function hasElevationResidual(route) {
  const profile = routeElevationProfile(route);
  const segments = routeTraversal(route).segments;
  const technicalMagnitude = segments.reduce((sum, segment) => sum + Math.abs(segment.verticalDeltaMeters), 0);
  const scale = Math.max(1, Math.abs(profile.entranceMeters), Math.abs(profile.exitMeters), technicalMagnitude);
  const tolerance = Number.EPSILON * 16 * scale * (segments.length + 1);
  return Math.abs(elevationResidual(route, profile)) > tolerance;
}
