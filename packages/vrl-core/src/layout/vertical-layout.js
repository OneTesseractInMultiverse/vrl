const ELEMENT_WEIGHTS = {
  start: 0.7,
  exit: 0.7,
  walk: 0.9,
  rappel: 1.25,
  downclimb: 1,
  pool: 0.85,
  hazard: 0.9,
  note: 0.7
};

export function computeVerticalLayout(route, options = {}) {
  const width = options.width ?? 360;
  const spineX = options.spineX ?? 96;
  const top = options.marginY ?? 48;
  const bottom = options.marginBottom ?? 48;
  const baseSpacing = options.baseSpacing ?? 86;
  let cursorY = top;

  const nodes = route.elements.map((element, index) => {
    if (index > 0) {
      cursorY += baseSpacing * elementVisualWeight(element);
    }

    return {
      id: element.id,
      element,
      x: spineX,
      y: Math.round(cursorY)
    };
  });

  const lastY = nodes.length === 0 ? top : nodes[nodes.length - 1].y;

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

export function elementVisualWeight(element) {
  return ELEMENT_WEIGHTS[element.type] ?? 1;
}
