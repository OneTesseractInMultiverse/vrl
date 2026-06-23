const ELEMENT_WEIGHTS = {
  start: 0.7,
  exit: 0.7,
  walk: 0.9,
  rappel: 1.25,
  downclimb: 1,
  climb: 1,
  pool: 0.85,
  hazard: 0.9,
  note: 0.7
};

export function computeVerticalLayout(route, options = {}) {
  if (hasElevationProfile(route)) {
    return computeElevationLayout(route, options);
  }

  return computeWeightedLayout(route, options);
}

function computeWeightedLayout(route, options = {}) {
  const width = options.width ?? 640;
  const spineX = options.spineX ?? 96;
  const top = options.marginY ?? 108;
  const bottom = options.marginBottom ?? 64;
  const baseSpacing = options.baseSpacing ?? 68;
  let cursorX = spineX;
  let cursorY = top;

  const rawNodes = route.elements.map((element, index) => {
    if (index > 0) {
      cursorY += baseSpacing * elementVisualWeight(element) * verticalDirection(element);
      cursorX += horizontalProgress(element);
    }

    return {
      id: element.id,
      element,
      x: Math.round(cursorX),
      y: Math.round(cursorY)
    };
  });
  const minY = Math.min(top, ...rawNodes.map((node) => node.y));
  const shiftY = minY < top ? top - minY : 0;
  const nodes = rawNodes.map((node) => ({
    ...node,
    y: node.y + shiftY
  }));

  const lastY = nodes.length === 0 ? top : Math.max(...nodes.map((node) => node.y));

  return {
    width,
    height: Math.round(lastY + bottom),
    spine: {
      x: spineX,
      y1: top,
      y2: lastY
    },
    nodes
  };
}

export function computeElevationLayout(route, options = {}) {
  const width = options.width ?? 640;
  const spineX = options.spineX ?? 96;
  const top = options.marginY ?? 108;
  const bottom = options.marginBottom ?? 64;
  const pixelsPerMeter = options.pixelsPerMeter ?? 5.5;
  const profile = routeElevationProfile(route);
  const segmentDeltas = elevationSegmentDeltas(route);
  let cursorX = spineX;
  let cursorElevation = profile.entranceMeters;

  const nodesWithElevation = route.elements.map((element, index) => {
    if (index > 0) {
      cursorX += horizontalProgress(element);
      cursorElevation -= segmentDeltas[index - 1];
    }

    return {
      id: element.id,
      element,
      x: Math.round(cursorX),
      elevationMeters: roundMeters(cursorElevation)
    };
  });

  const highestElevation = Math.max(profile.entranceMeters, profile.exitMeters, ...nodesWithElevation.map((node) => node.elevationMeters));
  const nodes = nodesWithElevation.map((node) => ({
    ...node,
    y: Math.round(top + ((highestElevation - node.elevationMeters) * pixelsPerMeter))
  }));
  const lastY = nodes.length === 0 ? top : Math.max(...nodes.map((node) => node.y));

  return {
    width,
    height: Math.round(lastY + bottom),
    spine: {
      x: spineX,
      y1: top,
      y2: lastY
    },
    elevation: {
      ...profile,
      pixelsPerMeter
    },
    nodes
  };
}

export function hasElevationProfile(route) {
  return routeElevationProfile(route) !== null;
}

export function routeElevationProfile(route) {
  const entranceMeters = measurementMeters(route.metadata?.entrance_elevation);
  const exitMeters = measurementMeters(route.metadata?.exit_elevation);

  if (entranceMeters === null || exitMeters === null) {
    return null;
  }

  return {
    entranceMeters,
    exitMeters,
    totalChangeMeters: entranceMeters - exitMeters
  };
}

export function elevationSegmentDeltas(route) {
  const profile = routeElevationProfile(route);
  if (profile === null) {
    return [];
  }

  const baseDeltas = route.elements.slice(1).map((element, index) => technicalSegmentDelta(route.elements[index], element));
  const residual = profile.totalChangeMeters - baseDeltas.reduce((total, delta) => total + delta, 0);
  const weights = residualDistributionWeights(route.elements, baseDeltas);
  const totalWeight = weights.reduce((total, weight) => total + weight, 0);

  if (totalWeight === 0) {
    return baseDeltas;
  }

  return baseDeltas.map((delta, index) => delta + ((residual * weights[index]) / totalWeight));
}

export function technicalSegmentDelta(previous, element) {
  if (previous.type === "rappel" || previous.type === "downclimb") {
    return technicalVerticalMeters(previous);
  }

  if (element.type === "climb") {
    return -technicalVerticalMeters(element);
  }

  return 0;
}

export function technicalVerticalMeters(element) {
  const height = measurementMeters(element.attributes?.height);
  if (height === null) {
    return 0;
  }

  return height * (inclinationPercent(element) / 100);
}

export function residualDistributionWeights(elements, baseDeltas) {
  const nonTechnicalWeights = baseDeltas.map((delta, index) => delta === 0 ? elementVisualWeight(elements[index + 1]) : 0);
  const hasNonTechnicalSegments = nonTechnicalWeights.some((weight) => weight > 0);

  if (hasNonTechnicalSegments) {
    return nonTechnicalWeights;
  }

  return baseDeltas.map((_delta, index) => index === baseDeltas.length - 1 ? 1 : 0);
}

export function elementVisualWeight(element) {
  return ELEMENT_WEIGHTS[element.type] ?? 1;
}

export function horizontalProgress(element) {
  if (element.type === "rappel") {
    return 44;
  }

  if (element.type === "downclimb") {
    return 42;
  }

  if (element.type === "climb") {
    return 42;
  }

  if (element.type === "exit") {
    return 78;
  }

  return 58;
}

export function verticalDirection(element) {
  return element.type === "climb" ? -1 : 1;
}

function inclinationPercent(element) {
  const inclination = element.attributes?.inclination;
  return typeof inclination === "object" && inclination !== null && typeof inclination.percent === "number"
    ? inclination.percent
    : 100;
}

function measurementMeters(value) {
  return typeof value === "object" && value !== null && typeof value.meters === "number"
    ? value.meters
    : null;
}

function roundMeters(value) {
  return Math.round(value * 100) / 100;
}
