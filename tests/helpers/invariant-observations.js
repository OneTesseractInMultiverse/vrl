import { DOMParser, onErrorStopParsing } from "@xmldom/xmldom";

/** Independent walks inspect public values; no production geometry/validation helpers. */
export function nonfinitePaths(value, path = "$", seen = new Set()) {
  if (typeof value === "number") return Number.isFinite(value) ? [] : [path];
  if (value === null || typeof value !== "object" || seen.has(value)) return [];
  seen.add(value);
  return Object.entries(value).flatMap(([key, child]) => nonfinitePaths(child, `${path}.${key}`, seen));
}

export function xmlDocument(markup) {
  // The renderer emits no CDATA/DTD. The parser accepts bare ampersands, so check
  // the emitted entity grammar independently before inspecting its DOM.
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[\da-fA-F]+;)/.test(markup)) throw new SyntaxError("Unescaped XML entity reference.");
  return new DOMParser({ onError: onErrorStopParsing }).parseFromString(markup, "image/svg+xml");
}

export function byClass(document, className) {
  return Array.from(document.getElementsByTagName("*")).filter(element => element.getAttribute("class")?.split(" ").includes(className));
}

export function technicalFacts(result) {
  return result.model.traversal.segments.filter(segment => segment.kind === "technical").map(segment =>
    [result.model.elements[segment.elementIndex].id, segment.direction, segment.verticalDeltaMeters]);
}

export function progressionFacts(result) {
  return result.layout.points.map(point => [point.element?.id ?? null, point.x, point.y, point.elevationMeters]);
}

export function clippedBounds(scene) {
  const { x, y, width, height } = scene.viewBox;
  return [scene.contentBounds, scene.infoBox.bounds, scene.legend?.bounds, scene.bounds].filter(Boolean)
    .filter(box => box.minX < x || box.minY < y || box.maxX > x + width || box.maxY > y + height);
}

export function failureState(result) {
  return { ok: result.ok, model: result.model, layout: result.layout, json: result.json };
}

export const BLOCKED = { ok: false, model: null, layout: null, json: null };
