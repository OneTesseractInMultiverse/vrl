import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";

// Independent inspection of emitted primitives, including inherited strokes and text.
export function documentFor(markup) {
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
}

function inheritedNumber(element, attribute, fallback) {
  for (let current = element; current?.nodeType === 1; current = current.parentNode) {
    if (current.hasAttribute(attribute)) return Number(current.getAttribute(attribute));
  }
  return fallback;
}

export function emittedBounds(element) {
  const value = (name) => Number(element.getAttribute(name));
  const stroke = inheritedNumber(element, "stroke-width", 0) / 2;
  let x1, y1, x2, y2;
  if (element.tagName === "path") {
    const coordinates = (element.getAttribute("d").match(/[-+]?(?:\d*\.)?\d+(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
    const xs = coordinates.filter((_, index) => index % 2 === 0);
    const ys = coordinates.filter((_, index) => index % 2 === 1);
    x1 = Math.min(...xs); x2 = Math.max(...xs); y1 = Math.min(...ys); y2 = Math.max(...ys);
  } else if (element.tagName === "line") {
    x1 = Math.min(value("x1"), value("x2")); x2 = Math.max(value("x1"), value("x2"));
    y1 = Math.min(value("y1"), value("y2")); y2 = Math.max(value("y1"), value("y2"));
  } else if (element.tagName === "circle") {
    x1 = value("cx") - value("r"); x2 = value("cx") + value("r");
    y1 = value("cy") - value("r"); y2 = value("cy") + value("r");
  } else if (element.tagName === "rect") {
    x1 = value("x"); y1 = value("y"); x2 = x1 + value("width"); y2 = y1 + value("height");
  } else {
    const font = inheritedNumber(element, "font-size", 16);
    const text = element.textContent.replace(/\s+/g, " ").trim();
    const width = text.length * font * 1.1;
    const anchor = element.getAttribute("text-anchor");
    x1 = value("x") - (anchor === "middle" ? width / 2 : anchor === "end" ? width : 0);
    x2 = x1 + width; y1 = value("y") - font; y2 = value("y") + font / 2;
  }
  const padding = element.hasAttribute("marker-end") ? 21 : stroke;
  return { minX: x1 - padding, minY: y1 - padding, maxX: x2 + padding, maxY: y2 + padding };
}

function visiblePrimitives(document) {
  return [...document.getElementsByTagName("*")].filter((element) => {
    if (!["path", "line", "circle", "rect", "text"].includes(element.tagName)) return false;
    for (let parent = element.parentNode; parent; parent = parent.parentNode) if (parent.nodeName === "defs") return false;
    return true;
  });
}

export function clippedPrimitives(document) {
  const [x, y, width, height] = document.documentElement.getAttribute("viewBox").split(" ").map(Number);
  return visiblePrimitives(document).flatMap((element) => {
    const item = emittedBounds(element);
    return item.minX < x || item.minY < y || item.maxX > x + width || item.maxY > y + height
      ? [{ tag: element.tagName, class: element.getAttribute("class"), text: element.textContent.slice(0, 50), bounds: item }] : [];
  });
}
